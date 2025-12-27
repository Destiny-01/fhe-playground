// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint8, externalEuint8 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Incorrect Reencryption - Demonstrates attempting decrypt without proper access
/// @notice This example shows common mistakes when trying to decrypt or reencrypt values without proper permissions.
///         Attempting to decrypt values without the necessary FHE permissions will fail.
///         This contract demonstrates incorrect patterns and the correct approach.
contract IncorrectReencryption is ZamaEthereumConfig {
  euint8 private _value;
  euint8 private _restrictedValue;
  mapping(address => bool) private _authorizedUsers;

  // solhint-disable-next-line no-empty-blocks
  constructor() {}

  /// @dev Sets up a value with proper permissions
  function setValue(externalEuint8 inputValue, bytes calldata inputProof) external {
    _value = FHE.fromExternal(inputValue, inputProof);
    FHE.allowThis(_value);
    FHE.allow(_value, msg.sender);
  }

  /// @dev ❌ ANTI-PATTERN: Attempting to allow decryption without proper setup
  ///         This tries to grant permission after the value is already set, which may not work as expected.
  ///         Permissions should be granted immediately after operations that create new encrypted values.
  function tryDecryptWithoutPermission() external returns (euint8) {
    // This will fail - no permission was granted to msg.sender for _value
    // FHE.allow(_value, msg.sender); // This is too late if not done during setValue
    return _value;
  }

  /// @dev ❌ ANTI-PATTERN: Attempting to decrypt a value that was never granted permission
  ///         If a value is created but permissions are never granted, decryption will fail.
  function setRestrictedValue(externalEuint8 inputValue, bytes calldata inputProof) external {
    _restrictedValue = FHE.fromExternal(inputValue, inputProof);
    FHE.allowThis(_restrictedValue);
    // Intentionally NOT granting permission to caller - this will cause decryption to fail
  }

  /// @dev Attempts to get restricted value - will fail decryption
  function getRestrictedValue() external view returns (euint8) {
    return _restrictedValue;
  }

  /// @dev ✅ CORRECT PATTERN: Grant permission when needed, with proper authorization
  function grantDecryptionPermission(address user) external {
    require(_authorizedUsers[user] || user == msg.sender, "Not authorized");
    FHE.allow(_value, user);
  }

  /// @dev ✅ CORRECT PATTERN: Set value and grant permission in same transaction
  function setValueWithPermission(externalEuint8 inputValue, bytes calldata inputProof, address authorizedUser) external {
    _value = FHE.fromExternal(inputValue, inputProof);
    FHE.allowThis(_value);
    FHE.allow(_value, msg.sender);
    if (authorizedUser != address(0)) {
      FHE.allow(_value, authorizedUser);
    }
  }

  /// @dev Returns the value (will work if permission was granted)
  function getValue() external view returns (euint8) {
    return _value;
  }

  /// @dev Authorize a user for future permission grants
  function authorizeUser(address user) external {
    _authorizedUsers[user] = true;
  }
}

