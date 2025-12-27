// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint8, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Access Control - Demonstrates FHE.allow vs FHE.allowTransient
/// @notice This example demonstrates the critical difference between FHE.allow and FHE.allowTransient:
///         - FHE.allow: Grants PERSISTENT permission - can decrypt multiple times across multiple transactions
///         - FHE.allowTransient: Grants TEMPORARY permission - can only decrypt during the current transaction
///         After the transaction completes, allowTransient permissions are automatically revoked.
contract FHEAccessControl is ZamaEthereumConfig {
    euint8 private _valueWithAllow; // Value with persistent permission (FHE.allow)
    euint8 private _valueWithAllowTransient; // Value with temporary permission (FHE.allowTransient)

    // solhint-disable-next-line no-empty-blocks
    constructor() {}

    /// @dev ✅ Sets value with FHE.allow - PERSISTENT permission
    ///         This permission persists across transactions. The user can decrypt this value
    ///         multiple times, even in separate transactions, without re-granting permission.
    function setValueWithAllow(
        externalEuint8 inputValue,
        bytes calldata inputProof
    ) external {
        _valueWithAllow = FHE.fromExternal(inputValue, inputProof);
        FHE.allowThis(_valueWithAllow);
        FHE.allow(_valueWithAllow, msg.sender); // ✅ PERSISTENT - can decrypt multiple times
    }

    /// @dev ✅ Sets value with FHE.allowTransient - TEMPORARY permission
    ///         This permission only lasts for the current transaction. After the transaction
    ///         completes, the permission is automatically revoked. Attempting to decrypt
    ///         in a subsequent transaction will fail.
    function setValueWithAllowTransient(
        externalEuint8 inputValue,
        bytes calldata inputProof
    ) external {
        _valueWithAllowTransient = FHE.fromExternal(inputValue, inputProof);
        FHE.allowThis(_valueWithAllowTransient);
        FHE.allowTransient(_valueWithAllowTransient, msg.sender); // ✅ TEMPORARY - only for this transaction
    }

    /// @dev Returns the value with persistent permission (FHE.allow)
    function getValueWithAllow() external view returns (euint8) {
        return _valueWithAllow;
    }

    /// @dev Returns the value with temporary permission (FHE.allowTransient)
    function getValueWithAllowTransient() external view returns (euint8) {
        return _valueWithAllowTransient;
    }
}
