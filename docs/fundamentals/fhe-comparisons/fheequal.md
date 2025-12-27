Example: FHEEqual

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="FHEEqual.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, ebool, euint8, externalEuint8 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Equal - Demonstrates equality comparison operations on encrypted values using FHE.eq
/// @notice This example shows how to compare two encrypted values for equality without decrypting them.
///         The contract demonstrates the FHE comparison operation by checking if two encrypted uint8 values are equal.
///         The result is an encrypted boolean that can only be decrypted by users who have been granted FHE permissions.
contract FHEEqual is ZamaEthereumConfig {
  euint8 private _a;
  euint8 private _b;
  ebool private _a_eq_b;

  // solhint-disable-next-line no-empty-blocks
  constructor() {}

  /// @dev Converts external encrypted input to internal format and grants contract FHE permissions for value a
  function setA(externalEuint8 inputA, bytes calldata inputProof) external {
    _a = FHE.fromExternal(inputA, inputProof);
    FHE.allowThis(_a);
  }

  /// @dev Converts external encrypted input to internal format and grants contract FHE permissions for value b
  function setB(externalEuint8 inputB, bytes calldata inputProof) external {
    _b = FHE.fromExternal(inputB, inputProof);
    FHE.allowThis(_b);
  }

  /// @dev Performs FHE equality comparison using FHE.eq, then grants permissions for result decryption
  ///          The operation compares encrypted values and returns an encrypted boolean result.
  function computeAEqualB() external {
    _a_eq_b = FHE.eq(_a, _b);

    FHE.allowThis(_a_eq_b);
    FHE.allow(_a_eq_b, msg.sender);
  }

  function result() public view returns (ebool) {
    return _a_eq_b;
  }
}


```

{% endtab %}

{% tab title="FHEEqual.ts" %}

```typescript
import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import { FHEEqual, FHEEqual__factory } from "../../../types";
import type { Signers } from "../types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHEEqual")) as FHEEqual__factory;
  const fheEqual = (await factory.deploy()) as FHEEqual;
  const fheEqual_address = await fheEqual.getAddress();

  return { fheEqual, fheEqual_address };
}

/**
 * This example demonstrates FHE equality comparison operations on encrypted values.
 * It shows how to compare two encrypted values for equality and highlights common pitfalls.
 */
describe("FHEEqual", function () {
  let contract: FHEEqual;
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
    contractAddress = deployment.fheEqual_address;
    contract = deployment.fheEqual;
  });

  // ✅ Test should succeed - values are equal
  it("a == b should succeed when values are equal", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    let tx;
    const a = 42;
    const b = 42; // Equal values

    // @dev Encrypts and sets both values with proper input proofs
    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    // @dev Performs equality comparison and grants decryption permission to caller
    tx = await contract.connect(bob).computeAEqualB();
    await tx.wait();

    const encryptedResult = await contract.result();

    // @dev Decrypts the encrypted boolean result using user decryption
    const clearResult = await fhevm.userDecryptEbool(
      encryptedResult,
      contractAddress,
      bob,
    );

    expect(clearResult).to.equal(a === b);
  });

  // ✅ Test should succeed - values are not equal
  it("a == b should succeed when values are not equal", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    let tx;
    const a = 42;
    const b = 100; // Different values

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    tx = await contract.connect(bob).computeAEqualB();
    await tx.wait();

    const encryptedResult = await contract.result();
    const clearResult = await fhevm.userDecryptEbool(
      encryptedResult,
      contractAddress,
      bob,
    );

    // @dev Should return false when values are not equal
    expect(clearResult).to.equal(false);
  });

  // ❌ Test should fail - missing FHE permissions
  it("should fail when trying to decrypt without permissions", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const a = 50;
    const b = 50;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    let tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    tx = await contract.connect(bob).computeAEqualB();
    await tx.wait();

    const encryptedResult = await contract.result();

    // @dev Alice doesn't have permissions because bob called computeAEqualB()
    await expect(
      fhevm.userDecryptEbool(encryptedResult, contractAddress, signers.alice),
    ).to.be.rejected;
  });
});


```

{% endtab %}

{% endtabs %}
