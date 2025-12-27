// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, ebool, euint8, externalEuint8 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Equal - Demonstrates equality comparison operations on encrypted values using FHE.eq
/// @notice This example shows how to compare two encrypted values for equality without decrypting them.
///         The contract demonstrates the FHE comparison operation by checking if two encrypted uint8 values are equal.
///         The result is an encrypted boolean that can only be decrypted by users who have been granted FHE permissions.
contract FHEEqual is ZamaEthereumConfig {
  euint8 private _a;
  euint8 private _b;
  ebool private _a_eq_b;

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

  /// @dev Performs FHE equality comparison using FHE.eq, then grants permissions for result decryption
  ///          The operation compares encrypted values and returns an encrypted boolean result.
  function computeAEqualB() external {
    _a_eq_b = FHE.eq(_a, _b);

    FHE.allowThis(_a_eq_b);
    FHE.allow(_a_eq_b, msg.sender);
  }

  function result() public view returns (ebool) {
    return _a_eq_b;
  }
}

