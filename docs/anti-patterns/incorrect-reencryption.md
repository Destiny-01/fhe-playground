Example: IncorrectReencryption

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="IncorrectReencryption.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint8, externalEuint8 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Incorrect Reencryption - Demonstrates attempting decrypt without proper access
/// @notice This example shows common mistakes when trying to decrypt or reencrypt values without proper permissions.
///         Attempting to decrypt values without the necessary FHE permissions will fail.
///         This contract demonstrates incorrect patterns and the correct approach.
contract IncorrectReencryption is ZamaEthereumConfig {
  euint8 private _value;
  euint8 private _restrictedValue;
  mapping(address => bool) private _authorizedUsers;

  // solhint-disable-next-line no-empty-blocks
  constructor() {}

  /// @dev Sets up a value with proper permissions
  function setValue(externalEuint8 inputValue, bytes calldata inputProof) external {
    _value = FHE.fromExternal(inputValue, inputProof);
    FHE.allowThis(_value);
    FHE.allow(_value, msg.sender);
  }

  /// @dev ❌ ANTI-PATTERN: Attempting to allow decryption without proper setup
  ///         This tries to grant permission after the value is already set, which may not work as expected.
  ///         Permissions should be granted immediately after operations that create new encrypted values.
  function tryDecryptWithoutPermission() external returns (euint8) {
    // This will fail - no permission was granted to msg.sender for _value
    // FHE.allow(_value, msg.sender); // This is too late if not done during setValue
    return _value;
  }

  /// @dev ❌ ANTI-PATTERN: Attempting to decrypt a value that was never granted permission
  ///         If a value is created but permissions are never granted, decryption will fail.
  function setRestrictedValue(externalEuint8 inputValue, bytes calldata inputProof) external {
    _restrictedValue = FHE.fromExternal(inputValue, inputProof);
    FHE.allowThis(_restrictedValue);
    // Intentionally NOT granting permission to caller - this will cause decryption to fail
  }

  /// @dev Attempts to get restricted value - will fail decryption
  function getRestrictedValue() external view returns (euint8) {
    return _restrictedValue;
  }

  /// @dev ✅ CORRECT PATTERN: Grant permission when needed, with proper authorization
  function grantDecryptionPermission(address user) external {
    require(_authorizedUsers[user] || user == msg.sender, "Not authorized");
    FHE.allow(_value, user);
  }

  /// @dev ✅ CORRECT PATTERN: Set value and grant permission in same transaction
  function setValueWithPermission(externalEuint8 inputValue, bytes calldata inputProof, address authorizedUser) external {
    _value = FHE.fromExternal(inputValue, inputProof);
    FHE.allowThis(_value);
    FHE.allow(_value, msg.sender);
    if (authorizedUser != address(0)) {
      FHE.allow(_value, authorizedUser);
    }
  }

  /// @dev Returns the value (will work if permission was granted)
  function getValue() external view returns (euint8) {
    return _value;
  }

  /// @dev Authorize a user for future permission grants
  function authorizeUser(address user) external {
    _authorizedUsers[user] = true;
  }
}


```

{% endtab %}

{% tab title="IncorrectReencryption.ts" %}

```typescript
import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import { IncorrectReencryption, IncorrectReencryption__factory } from "../../../types";
import type { Signers } from "./types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory("IncorrectReencryption")) as IncorrectReencryption__factory;
  const incorrectReencryption = (await factory.deploy()) as IncorrectReencryption;
  const incorrectReencryption_address = await incorrectReencryption.getAddress();

  return { incorrectReencryption, incorrectReencryption_address };
}

/**
 * This example demonstrates incorrect reencryption patterns.
 * Attempting to decrypt values without proper FHE permissions will fail.
 */
describe("IncorrectReencryption", function () {
  let contract: IncorrectReencryption;
  let contractAddress: string;
  let signers: Signers;
  let bob: HardhatEthersSigner;

  before(async function () {
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { owner: ethSigners[0], alice: ethSigners[1] };
    bob = ethSigners[2];
  });

  beforeEach(async function () {
    const deployment = await deployFixture();
    contractAddress = deployment.incorrectReencryption_address;
    contract = deployment.incorrectReencryption;
  });

  // ✅ Test should succeed - correct pattern with proper permissions
  it("should succeed when value has proper permissions", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value = 42;

    const inputValue = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(value).encrypt();
    let tx = await contract.connect(signers.alice).setValue(inputValue.handles[0], inputValue.inputProof);
    await tx.wait();

    const encryptedValue = await contract.connect(signers.alice).getValue();

    const clearValue = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      typeof encryptedValue === 'string' ? encryptedValue : ethers.hexlify(encryptedValue),
      contractAddress,
      signers.alice,
    );

    expect(clearValue).to.equal(value);
  });

  // ❌ Test should fail - attempting decrypt without permission
  it("should fail when trying to decrypt without permission", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value = 100;

    const inputValue = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(value).encrypt();
    let tx = await contract.connect(signers.alice).setValue(inputValue.handles[0], inputValue.inputProof);
    await tx.wait();

    // Bob tries to get value without permission
    const encryptedValue = await contract.connect(bob).tryDecryptWithoutPermission();

    // Decryption should fail because bob doesn't have permission
    await expect(
      fhevm.userDecryptEuint(FhevmType.euint8, encryptedValue, contractAddress, bob),
    ).to.be.rejected;
  });

  // ❌ Test should fail - restricted value without permission
  it("should fail to decrypt restricted value", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value = 75;

    const inputValue = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(value).encrypt();
    let tx = await contract.connect(signers.alice).setRestrictedValue(inputValue.handles[0], inputValue.inputProof);
    await tx.wait();

    const encryptedValue = await contract.connect(signers.alice).getRestrictedValue();

    // Decryption should fail because permission was never granted
    await expect(
      fhevm.userDecryptEuint(FhevmType.euint8, encryptedValue, contractAddress, signers.alice),
    ).to.be.rejected;
  });

  // ✅ Test should succeed - granting permission after setup
  it("should succeed when permission is granted after setup", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value = 200;

    const inputValue = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(value).encrypt();
    let tx = await contract.connect(signers.alice).setValue(inputValue.handles[0], inputValue.inputProof);
    await tx.wait();

    // Authorize bob and grant permission
    tx = await contract.connect(signers.alice).authorizeUser(bob.address);
    await tx.wait();

    tx = await contract.connect(signers.alice).grantDecryptionPermission(bob.address);
    await tx.wait();

    const encryptedValue = await contract.connect(bob).getValue();

    // Now bob can decrypt
    const clearValue = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      typeof encryptedValue === 'string' ? encryptedValue : ethers.hexlify(encryptedValue),
      contractAddress,
      bob,
    );

    expect(clearValue).to.equal(value);
  });

  // ✅ Test should succeed - setting value with permission in same transaction
  it("should succeed when setting value with permission in same transaction", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value = 150;

    const inputValue = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(value).encrypt();
    let tx = await contract.connect(signers.alice).setValueWithPermission(
      inputValue.handles[0],
      inputValue.inputProof,
      bob.address
    );
    await tx.wait();

    const encryptedValue = await contract.connect(bob).getValue();

    // Bob can decrypt because permission was granted during setValueWithPermission
    const clearValue = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      typeof encryptedValue === 'string' ? encryptedValue : ethers.hexlify(encryptedValue),
      contractAddress,
      bob,
    );

    expect(clearValue).to.equal(value);
  });
});


```

{% endtab %}

{% endtabs %}
