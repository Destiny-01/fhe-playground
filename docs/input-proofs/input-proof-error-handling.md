Example: InputProofErrorHandling

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="InputProofErrorHandling.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint8, externalEuint8 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Input Proof Error Handling - Demonstrates common validation errors and recovery patterns
/// @notice This example shows how to handle common input proof validation errors.
///         Common errors include: invalid proofs, proofs for wrong contract/user pair,
///         expired proofs, and malformed proof data.
///         This contract demonstrates error handling patterns and recovery strategies.
contract InputProofErrorHandling is ZamaEthereumConfig {
  euint8 private _value;
  mapping(address => euint8) private _userValues;
  uint256 private _operationCount;

  // solhint-disable-next-line no-empty-blocks
  constructor() {}

  /// @dev ✅ CORRECT: Basic input proof validation with error handling
  ///         FHE.fromExternal will revert if the proof is invalid.
  ///         The revert message indicates the type of validation failure.
  function setValueWithValidation(externalEuint8 inputValue, bytes calldata inputProof) external {
    // FHE.fromExternal automatically validates the proof
    // Common errors that cause revert:
    // - Invalid proof format
    // - Proof not bound to this contract address
    // - Proof not bound to msg.sender address
    // - Proof expired or invalid signature
    _value = FHE.fromExternal(inputValue, inputProof);
    
    FHE.allowThis(_value);
    FHE.allow(_value, msg.sender);
    _operationCount++;
  }

  /// @dev ✅ CORRECT: Try-catch pattern for proof validation (if supported)
  ///         Note: Solidity try-catch may not catch all FHE validation errors.
  ///         The best practice is to ensure proofs are valid before calling the contract.
  function setValueWithTryCatch(externalEuint8 inputValue, bytes calldata inputProof) external returns (bool) {
    try this.trySetValue(inputValue, inputProof) {
      return true;
    } catch {
      // Proof validation failed
      return false;
    }
  }

  /// @dev Internal function for try-catch pattern
  function trySetValue(externalEuint8 inputValue, bytes calldata inputProof) external {
    _value = FHE.fromExternal(inputValue, inputProof);
    FHE.allowThis(_value);
    FHE.allow(_value, msg.sender);
  }

  /// @dev ✅ CORRECT: Validating proof before expensive operations
  ///         Check proof validity early to avoid wasting gas on invalid transactions.
  function setValueWithEarlyValidation(
    externalEuint8 inputValue,
    bytes calldata inputProof,
    address expectedUser
  ) external {
    require(msg.sender == expectedUser, "Unauthorized user");
    
    // Proof validation happens here - will revert if invalid
    _value = FHE.fromExternal(inputValue, inputProof);
    
    FHE.allowThis(_value);
    FHE.allow(_value, msg.sender);
  }

  /// @dev ✅ CORRECT: Storing values per user with individual proofs
  ///         Each user provides their own proof for their encrypted value.
  function setUserValue(externalEuint8 inputValue, bytes calldata inputProof) external {
    // Each user's proof is validated independently
    euint8 userValue = FHE.fromExternal(inputValue, inputProof);
    
    FHE.allowThis(userValue);
    FHE.allow(userValue, msg.sender);
    
    _userValues[msg.sender] = userValue;
  }

  /// @dev ✅ CORRECT: Batch validation with individual error handling
  ///         Process multiple inputs, handling each proof validation separately.
  function processMultipleInputs(
    externalEuint8[] calldata inputs,
    bytes[] calldata proofs
  ) external returns (uint256 successCount) {
    require(inputs.length == proofs.length, "Mismatched arrays");
    require(inputs.length <= 5, "Too many inputs");

    successCount = 0;
    euint8 accumulator = FHE.asEuint8(0);

    for (uint256 i = 0; i < inputs.length; i++) {
      // Each proof is validated independently
      // If one fails, the entire transaction reverts
      euint8 input = FHE.fromExternal(inputs[i], proofs[i]);
      accumulator = FHE.add(accumulator, input);
      successCount++;
    }

    _value = accumulator;
    FHE.allowThis(_value);
    FHE.allow(_value, msg.sender);
  }

  /// @dev Returns the main value
  function getValue() external view returns (euint8) {
    return _value;
  }

  /// @dev Returns value for a specific user
  function getUserValue(address user) external view returns (euint8) {
    return _userValues[user];
  }

  /// @dev Returns operation count
  function getOperationCount() external view returns (uint256) {
    return _operationCount;
  }
}


```

{% endtab %}

{% tab title="InputProofErrorHandling.ts" %}

```typescript
import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import { InputProofErrorHandling, InputProofErrorHandling__factory } from "../../../types";
import type { Signers } from "./types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory("InputProofErrorHandling")) as InputProofErrorHandling__factory;
  const inputProofErrorHandling = (await factory.deploy()) as InputProofErrorHandling;
  const inputProofErrorHandling_address = await inputProofErrorHandling.getAddress();

  return { inputProofErrorHandling, inputProofErrorHandling_address };
}

/**
 * This example demonstrates common input proof validation errors and recovery patterns.
 * Common errors include invalid proofs, proofs for wrong contract/user pair, and malformed proof data.
 */
describe("InputProofErrorHandling", function () {
  let contract: InputProofErrorHandling;
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
    contractAddress = deployment.inputProofErrorHandling_address;
    contract = deployment.inputProofErrorHandling;
  });

  // ✅ Test should succeed - valid proof validation
  it("should succeed with valid input proof", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value = 42;

    const input = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(value).encrypt();

    let tx = await contract.connect(signers.alice).setValueWithValidation(input.handles[0], input.inputProof);
    await tx.wait();

    const operationCount = await contract.getOperationCount();
    expect(operationCount).to.equal(1);

    const encryptedValue = await contract.connect(signers.alice).getValue();

    const clearValue = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      typeof encryptedValue === 'string' ? encryptedValue : ethers.hexlify(encryptedValue),
      contractAddress,
      signers.alice,
    );

    expect(clearValue).to.equal(value);
  });

  // ❌ Test should fail - invalid proof
  it("should fail with invalid input proof", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value = 100;

    const input = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(value).encrypt();

    // Use invalid proof
    const invalidProof = "0x1234";

    await expect(
      contract.connect(signers.alice).setValueWithValidation(input.handles[0], invalidProof),
    ).to.be.reverted;
  });

  // ✅ Test should succeed - validating proof before expensive operations
  it("should succeed when validating proof early", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value = 75;

    const input = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(value).encrypt();

    let tx = await contract.connect(signers.alice).setValueWithEarlyValidation(
      input.handles[0],
      input.inputProof,
      signers.alice.address
    );
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

  // ❌ Test should fail - unauthorized user
  it("should fail when user is not authorized", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value = 200;

    const input = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(value).encrypt();

    // Try to set value with wrong expected user
    await expect(
      contract.connect(signers.alice).setValueWithEarlyValidation(
        input.handles[0],
        input.inputProof,
        bob.address // Wrong user!
      ),
    ).to.be.revertedWith("Unauthorized user");
  });

  // ✅ Test should succeed - storing values per user
  it("should succeed when each user provides their own proof", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const valueAlice = 50;
    const valueBob = 100;

    // Alice sets her value
    const inputAlice = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(valueAlice).encrypt();
    let tx = await contract.connect(signers.alice).setUserValue(inputAlice.handles[0], inputAlice.inputProof);
    await tx.wait();

    // Bob sets his value
    const inputBob = await fhevm.createEncryptedInput(contractAddress, bob.address).add8(valueBob).encrypt();
    tx = await contract.connect(bob).setUserValue(inputBob.handles[0], inputBob.inputProof);
    await tx.wait();

    // Verify Alice's value
    const encryptedAlice = await contract.connect(signers.alice).getUserValue(signers.alice.address);
    const clearAlice = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      typeof encryptedAlice === 'string' ? encryptedAlice : ethers.hexlify(encryptedAlice),
      contractAddress,
      signers.alice,
    );
    expect(clearAlice).to.equal(valueAlice);

    // Verify Bob's value
    const encryptedBob = await contract.connect(bob).getUserValue(bob.address);
    const clearBob = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      typeof encryptedBob === 'string' ? encryptedBob : ethers.hexlify(encryptedBob),
      contractAddress,
      bob,
    );
    expect(clearBob).to.equal(valueBob);
  });

  // ✅ Test should succeed - batch validation
  it("should succeed when processing multiple inputs with individual proofs", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const values = [10, 20, 30];
    const handles: any[] = [];
    const proofs: string[] = [];

    // Create multiple inputs with their proofs
    for (const value of values) {
      const input = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(value).encrypt();
      handles.push(input.handles[0]);
      proofs.push(input.inputProof);
    }

    let tx = await contract.connect(signers.alice).processMultipleInputs(handles, proofs);
    await tx.wait();

    const encryptedValue = await contract.connect(signers.alice).getValue();

    const clearValue = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      typeof encryptedValue === 'string' ? encryptedValue : ethers.hexlify(encryptedValue),
      contractAddress,
      signers.alice,
    );

    const expectedSum = values.reduce((a, b) => a + b, 0);
    expect(clearValue).to.equal(expectedSum);
  });

  // ❌ Test should fail - mismatched arrays
  it("should fail when inputs and proofs arrays have different lengths", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const values = [10, 20];
    const handles: any[] = [];
    const proofs: string[] = [];

    for (const value of values) {
      const input = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(value).encrypt();
      handles.push(input.handles[0]);
      proofs.push(input.inputProof);
    }

    // Remove one proof to create mismatch
    proofs.pop();

    await expect(
      contract.connect(signers.alice).processMultipleInputs(handles, proofs),
    ).to.be.revertedWith("Mismatched arrays");
  });
});


```

{% endtab %}

{% endtabs %}
