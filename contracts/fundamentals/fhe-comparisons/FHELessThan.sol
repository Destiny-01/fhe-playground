// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, ebool, euint8, externalEuint8 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Less Than - Demonstrates less-than comparison operations on encrypted values using FHE.lt
/// @notice This example shows how to compare two encrypted values to check if one is less than the other without decrypting them.
///         The contract demonstrates the FHE comparison operation by checking if the first encrypted uint8 value is less than the second.
///         The result is an encrypted boolean that can only be decrypted by users who have been granted FHE permissions.
contract FHELessThan is ZamaEthereumConfig {
  euint8 private _a;
  euint8 private _b;
  ebool private _a_lt_b;

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

  /// @dev Performs FHE less-than comparison using FHE.lt, then grants permissions for result decryption
  ///          The operation compares encrypted values and returns an encrypted boolean result.
  function computeALessThanB() external {
    _a_lt_b = FHE.lt(_a, _b);

    FHE.allowThis(_a_lt_b);
    FHE.allow(_a_lt_b, msg.sender);
  }

  function result() public view returns (ebool) {
    return _a_lt_b;
  }
}

