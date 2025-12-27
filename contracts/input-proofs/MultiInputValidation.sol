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

