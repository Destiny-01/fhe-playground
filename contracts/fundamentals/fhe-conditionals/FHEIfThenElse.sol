// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, ebool, euint8, externalEuint8, externalEbool } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE If-Then-Else - Demonstrates if-then-else conditional operations with encrypted conditions
/// @notice This example shows how to perform if-then-else operations on encrypted values based on encrypted boolean conditions.
///         The contract demonstrates conditional logic using FHE.select to implement if-then-else patterns
///         where the condition, true branch, and false branch are all encrypted values.
///         All operations remain encrypted without revealing any values during computation.
contract FHEIfThenElse is ZamaEthereumConfig {
  ebool private _condition;
  euint8 private _trueValue;
  euint8 private _falseValue;
  euint8 private _result;

  // solhint-disable-next-line no-empty-blocks
  constructor() {}

  /// @dev Converts external encrypted boolean condition to internal format and grants contract FHE permissions
  function setCondition(externalEbool inputCondition, bytes calldata inputProof) external {
    _condition = FHE.fromExternal(inputCondition, inputProof);
    FHE.allowThis(_condition);
  }

  /// @dev Converts external encrypted input to internal format and grants contract FHE permissions for true branch value
  function setTrueValue(externalEuint8 inputTrueValue, bytes calldata inputProof) external {
    _trueValue = FHE.fromExternal(inputTrueValue, inputProof);
    FHE.allowThis(_trueValue);
  }

  /// @dev Converts external encrypted input to internal format and grants contract FHE permissions for false branch value
  function setFalseValue(externalEuint8 inputFalseValue, bytes calldata inputProof) external {
    _falseValue = FHE.fromExternal(inputFalseValue, inputProof);
    FHE.allowThis(_falseValue);
  }

  /// @dev Performs if-then-else operation using FHE.select(condition, trueValue, falseValue)
  ///          If condition is true, returns trueValue; if false, returns falseValue.
  ///          All values remain encrypted during the operation.
  function computeIfThenElse() external {
    _result = FHE.select(_condition, _trueValue, _falseValue);

    FHE.allowThis(_result);
    FHE.allow(_result, msg.sender);
  }

  function result() public view returns (euint8) {
    return _result;
  }
}

