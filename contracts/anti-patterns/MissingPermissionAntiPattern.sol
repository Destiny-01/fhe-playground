// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint8, externalEuint8 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Missing Permission Anti-Pattern - Demonstrates forgetting FHE.allowThis() and consequences
/// @notice This example shows what happens when you forget to call FHE.allowThis() after FHE operations.
///         Without FHE.allowThis(), the contract cannot operate on the encrypted value, and users cannot decrypt it.
///         This contract demonstrates both the incorrect pattern (missing permissions) and the correct pattern.
contract MissingPermissionAntiPattern is ZamaEthereumConfig {
  euint8 private _value;
  euint8 private _wrongValue;

  // solhint-disable-next-line no-empty-blocks
  constructor() {}

  /// @dev ❌ ANTI-PATTERN: Missing FHE.allowThis() - only grants permission to caller
  ///         This will cause decryption to fail because the contract itself doesn't have permission.
  ///         Both FHE.allowThis() and FHE.allow() are required for user decryption to work.
  function setValueWrong(externalEuint8 inputValue, bytes calldata inputProof) external {
    _wrongValue = FHE.fromExternal(inputValue, inputProof);
    // Missing FHE.allowThis(_wrongValue) - this will cause issues!
    FHE.allow(_wrongValue, msg.sender);
  }

  /// @dev ✅ CORRECT PATTERN: Properly grants permissions to both contract and caller
  ///         FHE.allowThis() grants permission to the contract itself.
  ///         FHE.allow() grants permission to the caller for decryption.
  function setValue(externalEuint8 inputValue, bytes calldata inputProof) external {
    _value = FHE.fromExternal(inputValue, inputProof);
    FHE.allowThis(_value); // Required for contract to operate on value
    FHE.allow(_value, msg.sender); // Required for user to decrypt value
  }

  /// @dev Returns the incorrectly set value (will fail decryption)
  function getWrongValue() external view returns (euint8) {
    return _wrongValue;
  }

  /// @dev Returns the correctly set value (will succeed decryption)
  function getValue() external view returns (euint8) {
    return _value;
  }
}

