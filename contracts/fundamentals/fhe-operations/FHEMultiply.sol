// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint8, externalEuint8 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Multiply - Demonstrates multiplication operations on encrypted values using FHE.mul
/// @notice This example shows how to perform multiplication on encrypted values without decrypting them.
///         The contract demonstrates the basic FHE arithmetic operation by multiplying two encrypted uint8 values.
///         The result remains encrypted and can only be decrypted by users who have been granted FHE permissions.
contract FHEMultiply is ZamaEthereumConfig {
  euint8 private _a;
  euint8 private _b;
  // solhint-disable-next-line var-name-mixedcase
  euint8 private _a_times_b;

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

  /// @dev Performs FHE multiplication on encrypted values using FHE.mul, then grants permissions for result decryption
  ///          The operation is performed entirely on encrypted data without revealing the actual values.
  function computeATimesB() external {
    _a_times_b = FHE.mul(_a, _b);

    FHE.allowThis(_a_times_b);
    FHE.allow(_a_times_b, msg.sender);
  }

  function result() public view returns (euint8) {
    return _a_times_b;
  }
}

