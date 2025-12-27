// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint32, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Handle Lifecycle - Demonstrates handle generation, symbolic execution, and lifecycle management
/// @notice This example demonstrates how FHE handles work in FHEVM:
///         - How handles are generated from external encrypted inputs
///         - How handles are converted to internal encrypted values via FHE.fromExternal
///         - How symbolic execution works with handles
///         - The lifecycle of handles from creation to use in operations
///         Handles are temporary references that must be converted to internal encrypted types for operations.
contract FHEHandleLifecycle is ZamaEthereumConfig {
  euint32 private _value1;
  euint32 private _value2;
  euint32 private _result;

  // solhint-disable-next-line no-empty-blocks
  constructor() {}

  /// @dev Demonstrates handle lifecycle: external handle -> internal euint32 via FHE.fromExternal
  ///          The handle is bound to [contract, user] and validated via inputProof
  ///          After conversion, the handle is no longer needed - the internal euint32 is used for operations
  function setValue1(externalEuint32 inputHandle, bytes calldata inputProof) external {
    // Step 1: Handle is received as externalEuint32 (a handle reference)
    // Step 2: FHE.fromExternal validates the handle and converts it to internal euint32
    // Step 3: The internal value can now be used in FHE operations
    _value1 = FHE.fromExternal(inputHandle, inputProof);
    
    // Step 4: Grant permissions for the internal encrypted value
    FHE.allowThis(_value1);
    FHE.allow(_value1, msg.sender);
  }

  /// @dev Demonstrates handle lifecycle for a second value
  function setValue2(externalEuint32 inputHandle, bytes calldata inputProof) external {
    _value2 = FHE.fromExternal(inputHandle, inputProof);
    FHE.allowThis(_value2);
    FHE.allow(_value2, msg.sender);
  }

  /// @dev Demonstrates that operations work on internal encrypted values, not handles
  ///          Once converted from handles, values can be used in FHE operations
  ///          The result is a new internal encrypted value (not a handle)
  function computeResult() external {
    // Operations work on internal euint32 values, not handles
    // The result is a new internal encrypted value
    _result = FHE.add(_value1, _value2);

    FHE.allowThis(_result);
    FHE.allow(_result, msg.sender);
  }

  /// @dev Returns the result - this is an internal encrypted value, not a handle
  function getResult() external view returns (euint32) {
    return _result;
  }

  /// @dev Demonstrates that handles cannot be reused - each handle is single-use
  ///          This function shows that once a handle is converted, it cannot be used again
  function demonstrateHandleSingleUse(externalEuint32 inputHandle, bytes calldata inputProof) external {
    // First conversion - handle is consumed
    euint32 firstValue = FHE.fromExternal(inputHandle, inputProof);
    FHE.allowThis(firstValue);
    
    // Note: The handle cannot be used again - it's been consumed by FHE.fromExternal
    // Attempting to use the same handle again would require a new handle from the client
  }
}

