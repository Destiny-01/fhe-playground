// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, ebool, euint8, externalEuint8, externalEbool } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Select - Demonstrates ternary/conditional selection operations on encrypted values using FHE.select
/// @notice This example shows how to conditionally select between two encrypted values based on an encrypted boolean condition.
///         The contract demonstrates the FHE conditional operation by using FHE.select to choose between two encrypted uint8 values
///         based on an encrypted boolean condition, all without decrypting any values.
///         The result can only be decrypted by users who have been granted FHE permissions.
contract FHESelect is ZamaEthereumConfig {
  euint8 private _a;
  euint8 private _b;
  ebool private _condition;
  euint8 private _selected;

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

  /// @dev Converts external encrypted boolean condition to internal format and grants contract FHE permissions
  function setCondition(externalEbool inputCondition, bytes calldata inputProof) external {
    _condition = FHE.fromExternal(inputCondition, inputProof);
    FHE.allowThis(_condition);
  }

  /// @dev Performs FHE conditional selection using FHE.select(condition, a, b), then grants permissions for result decryption
  ///          If condition is true, returns a; if false, returns b. All values remain encrypted during the operation.
  function computeSelect() external {
    _selected = FHE.select(_condition, _a, _b);

    FHE.allowThis(_selected);
    FHE.allow(_selected, msg.sender);
  }

  function result() public view returns (euint8) {
    return _selected;
  }
}

