Example: FHENot

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="FHENot.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, ebool, externalEbool } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Not - Demonstrates NOT boolean logic operations on encrypted boolean values using FHE.not
/// @notice This example shows how to perform NOT operations on encrypted boolean values without decrypting them.
///         The contract demonstrates the FHE boolean logic operation by performing NOT on an encrypted boolean value.
///         The result is an encrypted boolean that can only be decrypted by users who have been granted FHE permissions.
contract FHENot is ZamaEthereumConfig {
  ebool private _a;
  ebool private _not_a;

  // solhint-disable-next-line no-empty-blocks
  constructor() {}

  /// @dev Converts external encrypted input to internal format and grants contract FHE permissions for value a
  function setA(externalEbool inputA, bytes calldata inputProof) external {
    _a = FHE.fromExternal(inputA, inputProof);
    FHE.allowThis(_a);
  }

  /// @dev Performs FHE NOT operation using FHE.not, then grants permissions for result decryption
  ///          The operation performs logical NOT on an encrypted boolean value without revealing it.
  function computeNotA() external {
    _not_a = FHE.not(_a);

    FHE.allowThis(_not_a);
    FHE.allow(_not_a, msg.sender);
  }

  function result() public view returns (ebool) {
    return _not_a;
  }
}


```

{% endtab %}

{% tab title="FHENot.ts" %}

```typescript
import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import { FHENot, FHENot__factory } from "../../../types";
import type { Signers } from "../types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHENot")) as FHENot__factory;
  const fheNot = (await factory.deploy()) as FHENot;
  const fheNot_address = await fheNot.getAddress();

  return { fheNot, fheNot_address };
}

/**
 * This example demonstrates FHE NOT boolean logic operations on encrypted boolean values.
 * It shows how to perform NOT operations and highlights common pitfalls.
 */
describe("FHENot", function () {
  let contract: FHENot;
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
    contractAddress = deployment.fheNot_address;
    contract = deployment.fheNot;
  });

  // ✅ Test should succeed - NOT true = false
  it("!a should succeed when a is true", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    let tx;
    const a = true;

    // @dev Encrypts and sets the boolean value with proper input proof
    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).addBool(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    // @dev Performs NOT operation and grants decryption permission to caller
    tx = await contract.connect(bob).computeNotA();
    await tx.wait();

    const encryptedResult = await contract.result();

    // @dev Decrypts the encrypted boolean result using user decryption
    const clearResult = await fhevm.userDecryptEbool(
      encryptedResult,
      contractAddress,
      bob,
    );

    expect(clearResult).to.equal(!a);
  });

  // ✅ Test should succeed - NOT false = true
  it("!a should succeed when a is false", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    let tx;
    const a = false;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).addBool(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    tx = await contract.connect(bob).computeNotA();
    await tx.wait();

    const encryptedResult = await contract.result();
    const clearResult = await fhevm.userDecryptEbool(
      encryptedResult,
      contractAddress,
      bob,
    );

    // @dev Should return true when input is false
    expect(clearResult).to.equal(true);
  });

  // ❌ Test should fail - missing FHE permissions
  it("should fail when trying to decrypt without permissions", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const a = true;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).addBool(a).encrypt();
    let tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    tx = await contract.connect(bob).computeNotA();
    await tx.wait();

    const encryptedResult = await contract.result();

    // @dev Alice doesn't have permissions because bob called computeNotA()
    await expect(
      fhevm.userDecryptEbool(encryptedResult, contractAddress, signers.alice),
    ).to.be.rejected;
  });
});


```

{% endtab %}

{% endtabs %}
