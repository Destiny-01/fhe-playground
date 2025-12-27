// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint8, externalEuint8 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title State Management Mistakes - Demonstrates common storage/retrieval errors with encrypted data
/// @notice This example shows common mistakes when storing and retrieving encrypted values.
///         Issues include losing permissions when overwriting values, not preserving permissions on updates,
///         and incorrect handling of encrypted state in mappings and arrays.
contract StateManagementMistakes is ZamaEthereumConfig {
  euint8 private _value;
  mapping(uint256 => euint8) private _valueMap;
  euint8[] private _valueArray;

  // solhint-disable-next-line no-empty-blocks
  constructor() {}

  /// @dev ❌ ANTI-PATTERN: Overwriting value without preserving permissions
  ///         When you overwrite an encrypted value, you lose the previous permissions.
  ///         New permissions must be granted for the new value.
  function setValueWrong(externalEuint8 inputValue, bytes calldata inputProof) external {
    _value = FHE.fromExternal(inputValue, inputProof);
    // Missing FHE.allowThis() and FHE.allow() - permissions lost!
  }

  /// @dev ✅ CORRECT PATTERN: Always grant permissions when setting values
  function setValue(externalEuint8 inputValue, bytes calldata inputProof) external {
    _value = FHE.fromExternal(inputValue, inputProof);
    FHE.allowThis(_value);
    FHE.allow(_value, msg.sender);
  }

  /// @dev ❌ ANTI-PATTERN: Updating value without re-granting permissions
  ///         When you modify an encrypted value, you create a new encrypted value.
  ///         The new value needs new permissions, even if the old one had them.
  function updateValueWrong(externalEuint8 increment, bytes calldata inputProof) external {
    euint8 incrementValue = FHE.fromExternal(increment, inputProof);
    _value = FHE.add(_value, incrementValue);
    // Missing FHE.allowThis() and FHE.allow() - new value has no permissions!
  }

  /// @dev ✅ CORRECT PATTERN: Re-grant permissions after any operation that creates new encrypted value
  function updateValue(externalEuint8 increment, bytes calldata inputProof) external {
    euint8 incrementValue = FHE.fromExternal(increment, inputProof);
    _value = FHE.add(_value, incrementValue);
    // Must re-grant permissions for the new encrypted value
    FHE.allowThis(_value);
    FHE.allow(_value, msg.sender);
  }

  /// @dev ❌ ANTI-PATTERN: Storing in mapping without permissions
  function setValueInMapWrong(uint256 key, externalEuint8 inputValue, bytes calldata inputProof) external {
    _valueMap[key] = FHE.fromExternal(inputValue, inputProof);
    // Missing permissions - cannot decrypt later!
  }

  /// @dev ✅ CORRECT PATTERN: Grant permissions when storing in mapping
  function setValueInMap(uint256 key, externalEuint8 inputValue, bytes calldata inputProof) external {
    euint8 value = FHE.fromExternal(inputValue, inputProof);
    FHE.allowThis(value);
    FHE.allow(value, msg.sender);
    _valueMap[key] = value;
  }

  /// @dev ❌ ANTI-PATTERN: Pushing to array without permissions
  function addToArrayWrong(externalEuint8 inputValue, bytes calldata inputProof) external {
    euint8 value = FHE.fromExternal(inputValue, inputProof);
    _valueArray.push(value);
    // Missing permissions!
  }

  /// @dev ✅ CORRECT PATTERN: Grant permissions before storing in array
  function addToArray(externalEuint8 inputValue, bytes calldata inputProof) external {
    euint8 value = FHE.fromExternal(inputValue, inputProof);
    FHE.allowThis(value);
    FHE.allow(value, msg.sender);
    _valueArray.push(value);
  }

  /// @dev Returns the main value
  function getValue() external view returns (euint8) {
    return _value;
  }

  /// @dev Returns value from mapping
  function getValueFromMap(uint256 key) external view returns (euint8) {
    return _valueMap[key];
  }

  /// @dev Returns value from array
  function getValueFromArray(uint256 index) external view returns (euint8) {
    require(index < _valueArray.length, "Index out of bounds");
    return _valueArray[index];
  }

  /// @dev Returns array length
  function getArrayLength() external view returns (uint256) {
    return _valueArray.length;
  }
}

