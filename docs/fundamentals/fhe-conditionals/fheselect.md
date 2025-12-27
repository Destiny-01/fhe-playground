Example: FHESelect

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="FHESelect.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, ebool, euint8, externalEuint8, externalEbool } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Select - Demonstrates ternary/conditional selection operations on encrypted values using FHE.select
/// @notice This example shows how to conditionally select between two encrypted values based on an encrypted boolean condition.
///         The contract demonstrates the FHE conditional operation by using FHE.select to choose between two encrypted uint8 values
///         based on an encrypted boolean condition, all without decrypting any values.
///         The result can only be decrypted by users who have been granted FHE permissions.
contract FHESelect is ZamaEthereumConfig {
  euint8 private _a;
  euint8 private _b;
  ebool private _condition;
  euint8 private _selected;

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

  /// @dev Converts external encrypted boolean condition to internal format and grants contract FHE permissions
  function setCondition(externalEbool inputCondition, bytes calldata inputProof) external {
    _condition = FHE.fromExternal(inputCondition, inputProof);
    FHE.allowThis(_condition);
  }

  /// @dev Performs FHE conditional selection using FHE.select(condition, a, b), then grants permissions for result decryption
  ///          If condition is true, returns a; if false, returns b. All values remain encrypted during the operation.
  function computeSelect() external {
    _selected = FHE.select(_condition, _a, _b);

    FHE.allowThis(_selected);
    FHE.allow(_selected, msg.sender);
  }

  function result() public view returns (euint8) {
    return _selected;
  }
}


```

{% endtab %}

{% tab title="FHESelect.ts" %}

```typescript
import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import { FHESelect, FHESelect__factory } from "../../../types";
import type { Signers } from "../types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHESelect")) as FHESelect__factory;
  const fheSelect = (await factory.deploy()) as FHESelect;
  const fheSelect_address = await fheSelect.getAddress();

  return { fheSelect, fheSelect_address };
}

/**
 * This example demonstrates FHE conditional selection (ternary) operations on encrypted values.
 * It shows how to conditionally select between two encrypted values based on an encrypted boolean condition.
 */
describe("FHESelect", function () {
  let contract: FHESelect;
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
    contractAddress = deployment.fheSelect_address;
    contract = deployment.fheSelect;
  });

  // ✅ Test should succeed - condition is true, selects a
  it("condition ? a : b should succeed when condition is true (selects a)", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    let tx;
    const condition = true;
    const a = 100;
    const b = 50;

    // @dev Encrypts and sets all values with proper input proofs
    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    const inputCondition = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).addBool(condition).encrypt();
    tx = await contract.connect(signers.alice).setCondition(inputCondition.handles[0], inputCondition.inputProof);
    await tx.wait();

    // @dev Performs conditional selection and grants decryption permission to caller
    tx = await contract.connect(bob).computeSelect();
    await tx.wait();

    const encryptedResult = await contract.result();

    // @dev Decrypts the encrypted result using user decryption
    const clearResult = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      encryptedResult,
      contractAddress,
      bob,
    );

    expect(clearResult).to.equal(condition ? a : b);
  });

  // ✅ Test should succeed - condition is false, selects b
  it("condition ? a : b should succeed when condition is false (selects b)", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    let tx;
    const condition = false;
    const a = 100;
    const b = 50;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    const inputCondition = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).addBool(condition).encrypt();
    tx = await contract.connect(signers.alice).setCondition(inputCondition.handles[0], inputCondition.inputProof);
    await tx.wait();

    tx = await contract.connect(bob).computeSelect();
    await tx.wait();

    const encryptedResult = await contract.result();
    const clearResult = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      encryptedResult,
      contractAddress,
      bob,
    );

    // @dev Should return b when condition is false
    expect(clearResult).to.equal(b);
  });

  // ❌ Test should fail - missing FHE permissions
  it("should fail when trying to decrypt without permissions", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const condition = true;
    const a = 100;
    const b = 50;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    let tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    const inputCondition = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).addBool(condition).encrypt();
    tx = await contract.connect(signers.alice).setCondition(inputCondition.handles[0], inputCondition.inputProof);
    await tx.wait();

    tx = await contract.connect(bob).computeSelect();
    await tx.wait();

    const encryptedResult = await contract.result();

    // @dev Alice doesn't have permissions because bob called computeSelect()
    await expect(
      fhevm.userDecryptEuint(FhevmType.euint8, encryptedResult, contractAddress, signers.alice),
    ).to.be.rejected;
  });
});


```

{% endtab %}

{% endtabs %}
