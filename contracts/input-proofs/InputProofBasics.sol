// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint8, externalEuint8 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Input Proof Basics - Demonstrates what input proofs are, why needed, and how to use correctly
/// @notice This example explains input proofs in FHEVM. Input proofs are zero-knowledge proofs that verify
///         encrypted inputs are cryptographically bound to a specific contract and user pair.
///         They prevent replay attacks and ensure encrypted values can only be used by authorized parties.
contract InputProofBasics is ZamaEthereumConfig {
  euint8 private _value;
  euint8 private _sum;

  // solhint-disable-next-line no-empty-blocks
  constructor() {}

  /// @dev ✅ CORRECT: Using input proof to validate encrypted input
  ///         The inputProof parameter is a zero-knowledge proof that verifies:
  ///         1. The encrypted value (inputValue) is valid
  ///         2. The value is bound to this contract address
  ///         3. The value is bound to the caller's address (msg.sender)
  ///         Without a valid proof, FHE.fromExternal will revert.
  function setValue(externalEuint8 inputValue, bytes calldata inputProof) external {
    // FHE.fromExternal validates the inputProof automatically
    // It will revert if the proof is invalid or doesn't match the contract/user pair
    _value = FHE.fromExternal(inputValue, inputProof);
    
    // After validation, grant permissions for the contract and caller
    FHE.allowThis(_value);
    FHE.allow(_value, msg.sender);
  }

  /// @dev ✅ CORRECT: Using input proof with operations
  ///         Input proofs are required every time you convert an external encrypted value to internal format.
  function addValue(externalEuint8 inputValue, bytes calldata inputProof) external {
    euint8 newValue = FHE.fromExternal(inputValue, inputProof);
    _sum = FHE.add(_sum, newValue);
    
    // Re-grant permissions after operation creates new encrypted value
    FHE.allowThis(_sum);
    FHE.allow(_sum, msg.sender);
  }

  /// @dev Returns the stored value
  function getValue() external view returns (euint8) {
    return _value;
  }

  /// @dev Returns the sum
  function getSum() external view returns (euint8) {
    return _sum;
  }
}

