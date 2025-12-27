// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title User Decrypt Single Value - Demonstrates the FHE user decryption mechanism and highlights common pitfalls
contract UserDecryptSingleValue is ZamaEthereumConfig {
  euint32 private _trivialEuint32;

  // solhint-disable-next-line no-empty-blocks
  constructor() {}

  /// @dev Correctly initializes encrypted value and grants FHE permissions to both contract and caller for user decryption
  function initializeUint32(uint32 value) external {
    _trivialEuint32 = FHE.add(FHE.asEuint32(value), FHE.asEuint32(1));

    FHE.allowThis(_trivialEuint32);
    FHE.allow(_trivialEuint32, msg.sender);
  }

  /// @dev Demonstrates incorrect FHE permission setup - missing allowThis prevents user decryption
  function initializeUint32Wrong(uint32 value) external {
    _trivialEuint32 = FHE.add(FHE.asEuint32(value), FHE.asEuint32(1));

    FHE.allow(_trivialEuint32, msg.sender);
  }

  function encryptedUint32() public view returns (euint32) {
    return _trivialEuint32;
  }
}