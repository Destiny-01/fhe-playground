Example: MultiInputValidation

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="MultiInputValidation.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint8, externalEuint8 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Multi-Input Validation - Demonstrates multiple encrypted inputs with proofs in one transaction
/// @notice This example shows how to handle multiple encrypted inputs in a single transaction.
///         Each encrypted input requires its own input proof, and all proofs must be valid.
///         The proofs can be combined into a single bytes array or provided separately.
contract MultiInputValidation is ZamaEthereumConfig {
  euint8 private _a;
  euint8 private _b;
  euint8 private _result;

  // solhint-disable-next-line no-empty-blocks
  constructor() {}

  /// @dev ✅ CORRECT: Multiple inputs with separate proofs
  ///         Each external encrypted value needs its own input proof.
  ///         All proofs are validated independently and must be valid.
  function setMultipleValues(
    externalEuint8 inputA,
    bytes calldata proofA,
    externalEuint8 inputB,
    bytes calldata proofB
  ) external {
    // Validate and convert first input
    _a = FHE.fromExternal(inputA, proofA);
    FHE.allowThis(_a);
    FHE.allow(_a, msg.sender);

    // Validate and convert second input
    _b = FHE.fromExternal(inputB, proofB);
    FHE.allowThis(_b);
    FHE.allow(_b, msg.sender);
  }

  /// @dev ✅ CORRECT: Multiple inputs used in a single operation
  ///         All inputs must have valid proofs before they can be used in FHE operations.
  function computeSum(
    externalEuint8 inputA,
    bytes calldata proofA,
    externalEuint8 inputB,
    bytes calldata proofB
  ) external {
    // Convert both inputs with their respective proofs
    euint8 a = FHE.fromExternal(inputA, proofA);
    euint8 b = FHE.fromExternal(inputB, proofB);

    // Perform operation on both validated inputs
    _result = FHE.add(a, b);

    // Grant permissions for the result
    FHE.allowThis(_result);
    FHE.allow(_result, msg.sender);
  }

  /// @dev ✅ CORRECT: Processing array of inputs with single combined proof
  ///         When inputs are created together, they can share a single input proof.
  ///         The proof validates all inputs in the batch.
  function processBatch(
    externalEuint8[] calldata inputs,
    bytes calldata combinedProof
  ) external {
    require(inputs.length > 0, "Empty inputs");
    require(inputs.length <= 10, "Too many inputs");

    euint8 accumulator = FHE.asEuint8(0);

    // All inputs in the batch use the same combined proof
    for (uint256 i = 0; i < inputs.length; i++) {
      euint8 input = FHE.fromExternal(inputs[i], combinedProof);
      accumulator = FHE.add(accumulator, input);
    }

    _result = accumulator;
    FHE.allowThis(_result);
    FHE.allow(_result, msg.sender);
  }

  /// @dev Returns value A
  function getA() external view returns (euint8) {
    return _a;
  }

  /// @dev Returns value B
  function getB() external view returns (euint8) {
    return _b;
  }

  /// @dev Returns the computed result
  function getResult() external view returns (euint8) {
    return _result;
  }
}


```

{% endtab %}

{% tab title="MultiInputValidation.ts" %}

```typescript
import {
  FhevmType,
  HardhatFhevmRuntimeEnvironment,
} from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import {
  MultiInputValidation,
  MultiInputValidation__factory,
} from "../../../types";
import type { Signers } from "./types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory(
    "MultiInputValidation"
  )) as MultiInputValidation__factory;
  const multiInputValidation = (await factory.deploy()) as MultiInputValidation;
  const multiInputValidation_address = await multiInputValidation.getAddress();

  return { multiInputValidation, multiInputValidation_address };
}

/**
 * This example demonstrates multiple encrypted inputs with proofs in one transaction.
 * Each encrypted input requires its own input proof, and all proofs must be valid.
 */
describe("MultiInputValidation", function () {
  let contract: MultiInputValidation;
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
    contractAddress = deployment.multiInputValidation_address;
    contract = deployment.multiInputValidation;
  });

  // ✅ Test should succeed - multiple inputs with separate proofs
  it("should succeed with multiple inputs and separate proofs", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const valueA = 10;
    const valueB = 20;

    // Create two separate encrypted inputs with their own proofs
    const inputA = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(valueA)
      .encrypt();
    const inputB = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(valueB)
      .encrypt();

    let tx = await contract
      .connect(signers.alice)
      .setMultipleValues(
        inputA.handles[0],
        inputA.inputProof,
        inputB.handles[0],
        inputB.inputProof
      );
    await tx.wait();

    const encryptedA = await contract.connect(signers.alice).getA();
    const encryptedB = await contract.connect(signers.alice).getB();

    const clearA = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      typeof encryptedA === "string" ? encryptedA : ethers.hexlify(encryptedA),
      contractAddress,
      signers.alice
    );

    const clearB = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      typeof encryptedB === "string" ? encryptedB : ethers.hexlify(encryptedB),
      contractAddress,
      signers.alice
    );

    expect(clearA).to.equal(valueA);
    expect(clearB).to.equal(valueB);
  });

  // ✅ Test should succeed - multiple inputs used in single operation
  it("should succeed when using multiple inputs in a single operation", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const valueA = 15;
    const valueB = 25;

    const inputA = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(valueA)
      .encrypt();
    const inputB = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(valueB)
      .encrypt();

    let tx = await contract
      .connect(signers.alice)
      .computeSum(
        inputA.handles[0],
        inputA.inputProof,
        inputB.handles[0],
        inputB.inputProof
      );
    await tx.wait();

    const encryptedResult = await contract.connect(signers.alice).getResult();

    const clearResult = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      typeof encryptedResult === "string"
        ? encryptedResult
        : ethers.hexlify(encryptedResult),
      contractAddress,
      signers.alice
    );

    expect(clearResult).to.equal(valueA + valueB);
  });

  // ✅ Test should succeed - batch processing with combined proof
  // Note: The FHEVM mock doesn't support creating multiple inputs with a single combined proof.
  // Each createEncryptedInput().encrypt() call creates its own proof. In production, when inputs
  // are created together in a batch, they can share a single combined proof. This test demonstrates
  // the batch processing pattern with a single input (which works) to show the contract's batch
  // functionality. For true combined proofs, inputs must be created together, which the mock doesn't support.
  it("should succeed when processing batch with combined proof", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    // Test with a single input to demonstrate batch processing works
    // In production with true combined proofs, multiple inputs created together would share one proof
    const value = 50;
    const input = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(value)
      .encrypt();

    // Process batch with single input (demonstrates the batch pattern)
    // The contract's processBatch function accepts an array and a combined proof
    const handles = [input.handles[0]];
    let tx = await contract
      .connect(signers.alice)
      .processBatch(handles, input.inputProof);
    await tx.wait();

    const encryptedResult = await contract.connect(signers.alice).getResult();

    const clearResult = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      typeof encryptedResult === "string"
        ? encryptedResult
        : ethers.hexlify(encryptedResult),
      contractAddress,
      signers.alice
    );

    // Verify the result equals the input value (since we only processed one input)
    expect(clearResult).to.equal(value);
  });

  // ❌ Test should fail - mismatched proof
  it("should fail when using wrong proof for input", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const valueA = 10;
    const valueB = 20;

    const inputA = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(valueA)
      .encrypt();
    const inputB = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(valueB)
      .encrypt();

    // Use wrong proof (A's proof for B's input)
    await expect(
      contract.connect(signers.alice).setMultipleValues(
        inputA.handles[0],
        inputA.inputProof,
        inputB.handles[0],
        inputA.inputProof // Wrong proof!
      )
    ).to.be.reverted;
  });
});

```

{% endtab %}

{% endtabs %}
