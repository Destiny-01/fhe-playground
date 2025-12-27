// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, ebool, externalEbool } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE And - Demonstrates AND boolean logic operations on encrypted boolean values using FHE.and
/// @notice This example shows how to perform AND operations on encrypted boolean values without decrypting them.
///         The contract demonstrates the FHE boolean logic operation by performing AND between two encrypted boolean values.
///         The result is an encrypted boolean that can only be decrypted by users who have been granted FHE permissions.
contract FHEAnd is ZamaEthereumConfig {
  ebool private _a;
  ebool private _b;
  ebool private _a_and_b;

  // solhint-disable-next-line no-empty-blocks
  constructor() {}

  /// @dev Converts external encrypted input to internal format and grants contract FHE permissions for value a
  function setA(externalEbool inputA, bytes calldata inputProof) external {
    _a = FHE.fromExternal(inputA, inputProof);
    FHE.allowThis(_a);
  }

  /// @dev Converts external encrypted input to internal format and grants contract FHE permissions for value b
  function setB(externalEbool inputB, bytes calldata inputProof) external {
    _b = FHE.fromExternal(inputB, inputProof);
    FHE.allowThis(_b);
  }

  /// @dev Performs FHE AND operation using FHE.and, then grants permissions for result decryption
  ///          The operation performs logical AND on encrypted boolean values without revealing them.
  function computeAAndB() external {
    _a_and_b = FHE.and(_a, _b);

    FHE.allowThis(_a_and_b);
    FHE.allow(_a_and_b, msg.sender);
  }

  function result() public view returns (ebool) {
    return _a_and_b;
  }
}

