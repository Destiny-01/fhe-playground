Example: MissingPermissionAntiPattern

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="MissingPermissionAntiPattern.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint8, externalEuint8 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Missing Permission Anti-Pattern - Demonstrates forgetting FHE.allowThis() and consequences
/// @notice This example shows what happens when you forget to call FHE.allowThis() after FHE operations.
///         Without FHE.allowThis(), the contract cannot operate on the encrypted value, and users cannot decrypt it.
///         This contract demonstrates both the incorrect pattern (missing permissions) and the correct pattern.
contract MissingPermissionAntiPattern is ZamaEthereumConfig {
  euint8 private _value;
  euint8 private _wrongValue;

  // solhint-disable-next-line no-empty-blocks
  constructor() {}

  /// @dev ❌ ANTI-PATTERN: Missing FHE.allowThis() - only grants permission to caller
  ///         This will cause decryption to fail because the contract itself doesn't have permission.
  ///         Both FHE.allowThis() and FHE.allow() are required for user decryption to work.
  function setValueWrong(externalEuint8 inputValue, bytes calldata inputProof) external {
    _wrongValue = FHE.fromExternal(inputValue, inputProof);
    // Missing FHE.allowThis(_wrongValue) - this will cause issues!
    FHE.allow(_wrongValue, msg.sender);
  }

  /// @dev ✅ CORRECT PATTERN: Properly grants permissions to both contract and caller
  ///         FHE.allowThis() grants permission to the contract itself.
  ///         FHE.allow() grants permission to the caller for decryption.
  function setValue(externalEuint8 inputValue, bytes calldata inputProof) external {
    _value = FHE.fromExternal(inputValue, inputProof);
    FHE.allowThis(_value); // Required for contract to operate on value
    FHE.allow(_value, msg.sender); // Required for user to decrypt value
  }

  /// @dev Returns the incorrectly set value (will fail decryption)
  function getWrongValue() external view returns (euint8) {
    return _wrongValue;
  }

  /// @dev Returns the correctly set value (will succeed decryption)
  function getValue() external view returns (euint8) {
    return _value;
  }
}


```

{% endtab %}

{% tab title="MissingPermissionAntiPattern.ts" %}

```typescript
import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import { MissingPermissionAntiPattern, MissingPermissionAntiPattern__factory } from "../../../types";
import type { Signers } from "./types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory("MissingPermissionAntiPattern")) as MissingPermissionAntiPattern__factory;
  const missingPermissionAntiPattern = (await factory.deploy()) as MissingPermissionAntiPattern;
  const missingPermissionAntiPattern_address = await missingPermissionAntiPattern.getAddress();

  return { missingPermissionAntiPattern, missingPermissionAntiPattern_address };
}

/**
 * This example demonstrates what happens when you forget FHE.allowThis().
 * Without FHE.allowThis(), the contract cannot operate on encrypted values and users cannot decrypt them.
 */
describe("MissingPermissionAntiPattern", function () {
  let contract: MissingPermissionAntiPattern;
  let contractAddress: string;
  let signers: Signers;

  before(async function () {
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { owner: ethSigners[0], alice: ethSigners[1] };
  });

  beforeEach(async function () {
    const deployment = await deployFixture();
    contractAddress = deployment.missingPermissionAntiPattern_address;
    contract = deployment.missingPermissionAntiPattern;
  });

  // ✅ Test should succeed - correct pattern with FHE.allowThis()
  it("should succeed when FHE.allowThis() is called", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value = 42;

    // Set value with proper permissions (correct pattern)
    const inputValue = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(value).encrypt();
    let tx = await contract.connect(signers.alice).setValue(inputValue.handles[0], inputValue.inputProof);
    await tx.wait();

    const encryptedValue = await contract.connect(signers.alice).getValue();

    // Decryption should succeed because FHE.allowThis() was called
    const clearValue = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      typeof encryptedValue === 'string' ? encryptedValue : ethers.hexlify(encryptedValue),
      contractAddress,
      signers.alice,
    );

    expect(clearValue).to.equal(value);
  });

  // ❌ Test should fail - missing FHE.allowThis()
  it("should fail to decrypt when FHE.allowThis() is missing", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value = 100;

    // Set value without FHE.allowThis() (anti-pattern)
    const inputValue = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(value).encrypt();
    let tx = await contract.connect(signers.alice).setValueWrong(inputValue.handles[0], inputValue.inputProof);
    await tx.wait();

    const encryptedValue = await contract.connect(signers.alice).getWrongValue();

    // Decryption should fail because FHE.allowThis() was not called
    await expect(
      fhevm.userDecryptEuint(FhevmType.euint8, encryptedValue, contractAddress, signers.alice),
    ).to.be.rejected;
  });
});


```

{% endtab %}

{% endtabs %}
