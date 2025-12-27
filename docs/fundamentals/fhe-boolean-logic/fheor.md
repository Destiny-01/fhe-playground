Example: FHEOr

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="FHEOr.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, ebool, externalEbool } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Or - Demonstrates OR boolean logic operations on encrypted boolean values using FHE.or
/// @notice This example shows how to perform OR operations on encrypted boolean values without decrypting them.
///         The contract demonstrates the FHE boolean logic operation by performing OR between two encrypted boolean values.
///         The result is an encrypted boolean that can only be decrypted by users who have been granted FHE permissions.
contract FHEOr is ZamaEthereumConfig {
  ebool private _a;
  ebool private _b;
  ebool private _a_or_b;

  // solhint-disable-next-line no-empty-blocks
  constructor() {}

  /// @dev Converts external encrypted input to internal format and grants contract FHE permissions for value a
  function setA(externalEbool inputA, bytes calldata inputProof) external {
    _a = FHE.fromExternal(inputA, inputProof);
    FHE.allowThis(_a);
  }

  /// @dev Converts external encrypted input to internal format and grants contract FHE permissions for value b
  function setB(externalEbool inputB, bytes calldata inputProof) external {
    _b = FHE.fromExternal(inputB, inputProof);
    FHE.allowThis(_b);
  }

  /// @dev Performs FHE OR operation using FHE.or, then grants permissions for result decryption
  ///          The operation performs logical OR on encrypted boolean values without revealing them.
  function computeAOrB() external {
    _a_or_b = FHE.or(_a, _b);

    FHE.allowThis(_a_or_b);
    FHE.allow(_a_or_b, msg.sender);
  }

  function result() public view returns (ebool) {
    return _a_or_b;
  }
}


```

{% endtab %}

{% tab title="FHEOr.ts" %}

```typescript
import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import { FHEOr, FHEOr__factory } from "../../../types";
import type { Signers } from "../types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHEOr")) as FHEOr__factory;
  const fheOr = (await factory.deploy()) as FHEOr;
  const fheOr_address = await fheOr.getAddress();

  return { fheOr, fheOr_address };
}

/**
 * This example demonstrates FHE OR boolean logic operations on encrypted boolean values.
 * It shows how to perform OR operations and highlights common pitfalls.
 */
describe("FHEOr", function () {
  let contract: FHEOr;
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
    contractAddress = deployment.fheOr_address;
    contract = deployment.fheOr;
  });

  // ✅ Test should succeed - true OR true = true
  it("a || b should succeed when both are true", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    let tx;
    const a = true;
    const b = true;

    // @dev Encrypts and sets both boolean values with proper input proofs
    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).addBool(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).addBool(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    // @dev Performs OR operation and grants decryption permission to caller
    tx = await contract.connect(bob).computeAOrB();
    await tx.wait();

    const encryptedResult = await contract.result();

    // @dev Decrypts the encrypted boolean result using user decryption
    const clearResult = await fhevm.userDecryptEbool(
      encryptedResult,
      contractAddress,
      bob,
    );

    expect(clearResult).to.equal(a || b);
  });

  // ✅ Test should succeed - true OR false = true
  it("a || b should succeed when one is true", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    let tx;
    const a = true;
    const b = false;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).addBool(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).addBool(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    tx = await contract.connect(bob).computeAOrB();
    await tx.wait();

    const encryptedResult = await contract.result();
    const clearResult = await fhevm.userDecryptEbool(
      encryptedResult,
      contractAddress,
      bob,
    );

    // @dev Should return true when at least one operand is true
    expect(clearResult).to.equal(true);
  });

  // ✅ Test should succeed - false OR false = false
  it("a || b should succeed when both are false", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    let tx;
    const a = false;
    const b = false;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).addBool(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).addBool(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    tx = await contract.connect(bob).computeAOrB();
    await tx.wait();

    const encryptedResult = await contract.result();
    const clearResult = await fhevm.userDecryptEbool(
      encryptedResult,
      contractAddress,
      bob,
    );

    // @dev Should return false when both operands are false
    expect(clearResult).to.equal(false);
  });

  // ❌ Test should fail - missing FHE permissions
  it("should fail when trying to decrypt without permissions", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const a = true;
    const b = false;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).addBool(a).encrypt();
    let tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).addBool(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    tx = await contract.connect(bob).computeAOrB();
    await tx.wait();

    const encryptedResult = await contract.result();

    // @dev Alice doesn't have permissions because bob called computeAOrB()
    await expect(
      fhevm.userDecryptEbool(encryptedResult, contractAddress, signers.alice),
    ).to.be.rejected;
  });
});


```

{% endtab %}

{% endtabs %}
