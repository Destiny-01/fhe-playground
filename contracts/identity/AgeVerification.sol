// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, ebool, euint8, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Age Verification - Prove age > threshold without revealing actual age
/// @notice This contract demonstrates how to verify that a user's age meets a minimum threshold
///         without revealing their actual age. This is useful for age-restricted services like
///         alcohol sales, gambling platforms, or content access controls.
///         The contract allows users to prove they are above a certain age threshold while
///         keeping their exact age private.
contract AgeVerification is ZamaEthereumConfig {
    // Mapping from user address to their encrypted age
    mapping(address => euint8) private _userAges;

    // Mapping from user address to encrypted eligibility result
    mapping(address => ebool) private _eligibilityResults;

    // Minimum age threshold (e.g., 18, 21, etc.)
    uint8 public immutable minimumAge;

    /// @dev Constructor sets the minimum age threshold
    /// @param _minimumAge The minimum age required (e.g., 18 for adults, 21 for alcohol)
    constructor(uint8 _minimumAge) {
        minimumAge = _minimumAge;
    }

    /// @dev Register a user's encrypted age and compute eligibility
    /// @param encryptedAge The user's age encrypted as euint8
    /// @param inputProof The zero-knowledge proof for the encrypted age
    /// @notice The user's age is stored encrypted and eligibility is computed
    function registerAge(
        externalEuint8 encryptedAge,
        bytes calldata inputProof
    ) external {
        euint8 age = FHE.fromExternal(encryptedAge, inputProof);
        FHE.allowThis(age);
        _userAges[msg.sender] = age;

        // Compute eligibility comparison (age >= minimumAge)
        euint8 minAgeEncrypted = FHE.asEuint8(minimumAge);
        ebool isEligible = FHE.ge(age, minAgeEncrypted);
        FHE.allowThis(isEligible);
        FHE.allow(isEligible, msg.sender);
        _eligibilityResults[msg.sender] = isEligible;
    }

    /// @dev Get the encrypted eligibility result for a user
    /// @param user The address of the user to check
    /// @return The encrypted boolean result (true if user's age >= minimumAge)
    /// @notice Users can decrypt this to verify their eligibility without revealing their age
    function verifyAge(address user) external view returns (ebool) {
        return _eligibilityResults[user];
    }

    /// @dev Get the encrypted age for a user
    /// @param user The address of the user
    /// @return The encrypted age value
    function getEncryptedAge(address user) external view returns (euint8) {
        return _userAges[user];
    }
}
