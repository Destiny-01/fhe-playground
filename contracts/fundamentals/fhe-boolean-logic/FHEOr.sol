// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, ebool, externalEbool } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Or - Demonstrates OR boolean logic operations on encrypted boolean values using FHE.or
/// @notice This example shows how to perform OR operations on encrypted boolean values without decrypting them.
///         The contract demonstrates the FHE boolean logic operation by performing OR between two encrypted boolean values.
///         The result is an encrypted boolean that can only be decrypted by users who have been granted FHE permissions.
contract FHEOr is ZamaEthereumConfig {
  ebool private _a;
  ebool private _b;
  ebool private _a_or_b;

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

  /// @dev Performs FHE OR operation using FHE.or, then grants permissions for result decryption
  ///          The operation performs logical OR on encrypted boolean values without revealing them.
  function computeAOrB() external {
    _a_or_b = FHE.or(_a, _b);

    FHE.allowThis(_a_or_b);
    FHE.allow(_a_or_b, msg.sender);
  }

  function result() public view returns (ebool) {
    return _a_or_b;
  }
}

