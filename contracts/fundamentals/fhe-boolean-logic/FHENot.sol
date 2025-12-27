// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, ebool, externalEbool } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Not - Demonstrates NOT boolean logic operations on encrypted boolean values using FHE.not
/// @notice This example shows how to perform NOT operations on encrypted boolean values without decrypting them.
///         The contract demonstrates the FHE boolean logic operation by performing NOT on an encrypted boolean value.
///         The result is an encrypted boolean that can only be decrypted by users who have been granted FHE permissions.
contract FHENot is ZamaEthereumConfig {
  ebool private _a;
  ebool private _not_a;

  // solhint-disable-next-line no-empty-blocks
  constructor() {}

  /// @dev Converts external encrypted input to internal format and grants contract FHE permissions for value a
  function setA(externalEbool inputA, bytes calldata inputProof) external {
    _a = FHE.fromExternal(inputA, inputProof);
    FHE.allowThis(_a);
  }

  /// @dev Performs FHE NOT operation using FHE.not, then grants permissions for result decryption
  ///          The operation performs logical NOT on an encrypted boolean value without revealing it.
  function computeNotA() external {
    _not_a = FHE.not(_a);

    FHE.allowThis(_not_a);
    FHE.allow(_not_a, msg.sender);
  }

  function result() public view returns (ebool) {
    return _not_a;
  }
}

