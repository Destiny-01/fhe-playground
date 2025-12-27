// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint8, externalEuint8 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Gas Limit Pitfalls - Demonstrates FHE operations hitting block gas limits
/// @notice This example shows how FHE operations can consume significant gas, potentially hitting block gas limits.
///         Performing too many FHE operations in a single transaction can cause out-of-gas errors.
///         This contract demonstrates the problem and suggests patterns to avoid it.
contract GasLimitPitfalls is ZamaEthereumConfig {
  euint8[] private _values;
  uint256 private _maxOperations;

  // solhint-disable-next-line no-empty-blocks
  constructor() {
    _maxOperations = 10; // Reasonable limit to avoid gas issues
  }

  /// @dev ❌ ANTI-PATTERN: Performing too many FHE operations in a single transaction
  ///         This can easily exceed block gas limits, especially with complex operations.
  ///         Each FHE operation consumes significant gas, and chaining many together is risky.
  function performManyOperationsWrong(externalEuint8[] calldata inputs, bytes calldata inputProof) external {
    require(inputs.length <= 100, "Too many inputs"); // This could fail due to gas!

    euint8 accumulator = FHE.asEuint8(0);
    
    for (uint256 i = 0; i < inputs.length; i++) {
      euint8 input = FHE.fromExternal(inputs[i], inputProof);
      accumulator = FHE.add(accumulator, input);
      FHE.allowThis(accumulator);
    }

    _values.push(accumulator);
  }

  /// @dev ✅ CORRECT PATTERN: Batch operations with reasonable limits
  ///         Limits the number of operations per transaction to avoid gas issues.
  ///         For large batches, consider splitting across multiple transactions.
  function performManyOperations(externalEuint8[] calldata inputs, bytes calldata inputProof) external {
    require(inputs.length <= _maxOperations, "Too many operations - split into batches");

    euint8 accumulator = FHE.asEuint8(0);
    
    // Note: In a real scenario, you might use a combined proof or individual proofs per input
    // For this example, we use the same proof for all inputs (simplified)
    for (uint256 i = 0; i < inputs.length; i++) {
      euint8 input = FHE.fromExternal(inputs[i], inputProof);
      accumulator = FHE.add(accumulator, input);
    }

    FHE.allowThis(accumulator);
    FHE.allow(accumulator, msg.sender);
    _values.push(accumulator);
  }

  /// @dev ✅ CORRECT PATTERN: Process in smaller chunks
  ///         Allows processing large datasets across multiple transactions.
  function processInChunks(
    externalEuint8[] calldata inputs,
    bytes calldata inputProof,
    uint256 startIndex,
    uint256 chunkSize
  ) external {
    uint256 endIndex = startIndex + chunkSize;
    if (endIndex > inputs.length) {
      endIndex = inputs.length;
    }

    euint8 chunkResult = FHE.asEuint8(0);
    
    for (uint256 i = startIndex; i < endIndex; i++) {
      euint8 input = FHE.fromExternal(inputs[i], inputProof);
      chunkResult = FHE.add(chunkResult, input);
    }

    FHE.allowThis(chunkResult);
    FHE.allow(chunkResult, msg.sender);
    _values.push(chunkResult);
  }

  function getValueCount() external view returns (uint256) {
    return _values.length;
  }

  function getValue(uint256 index) external view returns (euint8) {
    require(index < _values.length, "Index out of bounds");
    return _values[index];
  }
}

