// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, ebool, externalEbool } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Xor - Demonstrates XOR boolean logic operations on encrypted boolean values using FHE.xor
/// @notice This example shows how to perform XOR operations on encrypted boolean values without decrypting them.
///         The contract demonstrates the FHE boolean logic operation by performing XOR between two encrypted boolean values.
///         The result is an encrypted boolean that can only be decrypted by users who have been granted FHE permissions.
contract FHEXor is ZamaEthereumConfig {
  ebool private _a;
  ebool private _b;
  ebool private _a_xor_b;

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

  /// @dev Performs FHE XOR operation using FHE.xor, then grants permissions for result decryption
  ///          The operation performs logical XOR on encrypted boolean values without revealing them.
  function computeAXorB() external {
    _a_xor_b = FHE.xor(_a, _b);

    FHE.allowThis(_a_xor_b);
    FHE.allow(_a_xor_b, msg.sender);
  }

  function result() public view returns (ebool) {
    return _a_xor_b;
  }
}

