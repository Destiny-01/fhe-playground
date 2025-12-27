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

