// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint8, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title View Function Anti-Pattern - Demonstrates why FHE operations cannot be performed in view functions
/// @notice This example shows the common mistake of trying to perform FHE operations inside view functions.
///         View functions cannot execute FHE operations (like FHE.add, FHE.select, etc.) because these require
///         transaction context. View functions can return encrypted values, but cannot perform FHE computations.
///         This contract demonstrates both the incorrect pattern and the correct approach.
contract ViewFunctionAntiPattern is ZamaEthereumConfig {
    euint8 private _a;
    euint8 private _b;
    euint8 private _sum;

    // solhint-disable-next-line no-empty-blocks
    constructor() {}

    /// @dev Sets encrypted value A with proper permissions
    function setA(
        externalEuint8 inputValue,
        bytes calldata inputProof
    ) external {
        _a = FHE.fromExternal(inputValue, inputProof);
        FHE.allowThis(_a);
        FHE.allow(_a, msg.sender);
    }

    /// @dev Sets encrypted value B with proper permissions
    function setB(
        externalEuint8 inputValue,
        bytes calldata inputProof
    ) external {
        _b = FHE.fromExternal(inputValue, inputProof);
        FHE.allowThis(_b);
        FHE.allow(_b, msg.sender);
    }

    /// @dev ❌ ANTI-PATTERN: Attempting FHE operation inside view function
    ///         This will NOT compile - FHE operations cannot be performed in view functions.
    ///         View functions are read-only and cannot execute state-changing FHE computations.
    ///         Uncommenting the line below will cause a compilation error.
    // function computeSumView() external view returns (euint8) {
    //   return FHE.add(_a, _b); // ❌ ERROR: Cannot perform FHE operations in view functions
    // }

    /// @dev ✅ CORRECT PATTERN: Perform FHE operations in non-view function
    ///         FHE operations must be performed in a transaction context (non-view function).
    ///         After computation, the result can be stored and accessed via view functions.
    function computeSum() external {
        _sum = FHE.add(_a, _b);
        FHE.allowThis(_sum);
        FHE.allow(_sum, msg.sender);
    }

    /// @dev ✅ CORRECT PATTERN: View function can return encrypted value (but not compute it)
    ///         View functions CAN return encrypted values that were computed in previous transactions.
    ///         They just cannot perform FHE operations themselves.
    function getSum() external view returns (euint8) {
        return _sum; // ✅ This works - just returning a stored encrypted value
    }

    /// @dev ✅ CORRECT PATTERN: View function can return stored encrypted values
    function getA() external view returns (euint8) {
        return _a;
    }

    /// @dev ✅ CORRECT PATTERN: View function can return stored encrypted values
    function getB() external view returns (euint8) {
        return _b;
    }
}
