// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, ebool, euint16, externalEuint16} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Credit Score Check - Verify creditworthiness privately
/// @notice This contract demonstrates how to verify a user's creditworthiness based on their
///         credit score without revealing the actual score. This is useful for lending platforms,
///         rental applications, or financial services that need to assess risk while maintaining
///         user privacy.
///         The contract allows users to prove they meet credit score thresholds for different
///         loan tiers or service levels without exposing their exact credit score.
contract CreditScoreCheck is ZamaEthereumConfig {
    // Mapping from user address to their encrypted credit score
    mapping(address => euint16) private _creditScores;

    // Mapping from user address to encrypted qualification results for each tier
    mapping(address => ebool) private _excellentResults;
    mapping(address => ebool) private _goodResults;
    mapping(address => ebool) private _fairResults;
    mapping(address => ebool) private _minimumResults;

    // Credit score thresholds for different tiers
    uint16 public constant EXCELLENT_THRESHOLD = 750; // Excellent credit
    uint16 public constant GOOD_THRESHOLD = 700; // Good credit
    uint16 public constant FAIR_THRESHOLD = 650; // Fair credit
    uint16 public constant MINIMUM_THRESHOLD = 600; // Minimum acceptable

    // solhint-disable-next-line no-empty-blocks
    constructor() {}

    /// @dev Register a user's encrypted credit score and compute all tier qualifications
    /// @param encryptedScore The user's credit score encrypted as euint16
    /// @param inputProof The zero-knowledge proof for the encrypted score
    /// @notice The credit score is stored encrypted and all tier qualifications are computed
    function registerCreditScore(
        externalEuint16 encryptedScore,
        bytes calldata inputProof
    ) external {
        euint16 score = FHE.fromExternal(encryptedScore, inputProof);
        FHE.allowThis(score);
        _creditScores[msg.sender] = score;

        // Compute all tier qualifications
        euint16 excellentThreshold = FHE.asEuint16(EXCELLENT_THRESHOLD);
        ebool excellent = FHE.ge(score, excellentThreshold);
        FHE.allowThis(excellent);
        FHE.allow(excellent, msg.sender);
        _excellentResults[msg.sender] = excellent;

        euint16 goodThreshold = FHE.asEuint16(GOOD_THRESHOLD);
        ebool good = FHE.ge(score, goodThreshold);
        FHE.allowThis(good);
        FHE.allow(good, msg.sender);
        _goodResults[msg.sender] = good;

        euint16 fairThreshold = FHE.asEuint16(FAIR_THRESHOLD);
        ebool fair = FHE.ge(score, fairThreshold);
        FHE.allowThis(fair);
        FHE.allow(fair, msg.sender);
        _fairResults[msg.sender] = fair;

        euint16 minimumThreshold = FHE.asEuint16(MINIMUM_THRESHOLD);
        ebool minimum = FHE.ge(score, minimumThreshold);
        FHE.allowThis(minimum);
        FHE.allow(minimum, msg.sender);
        _minimumResults[msg.sender] = minimum;
    }

    /// @dev Get encrypted result for excellent credit tier qualification
    /// @param user The address of the user to check
    /// @return Encrypted boolean (true if credit score >= 750)
    function qualifiesForExcellent(address user) external view returns (ebool) {
        return _excellentResults[user];
    }

    /// @dev Get encrypted result for good credit tier qualification
    /// @param user The address of the user to check
    /// @return Encrypted boolean (true if credit score >= 700)
    function qualifiesForGood(address user) external view returns (ebool) {
        return _goodResults[user];
    }

    /// @dev Get encrypted result for fair credit tier qualification
    /// @param user The address of the user to check
    /// @return Encrypted boolean (true if credit score >= 650)
    function qualifiesForFair(address user) external view returns (ebool) {
        return _fairResults[user];
    }

    /// @dev Get encrypted result for minimum credit requirement
    /// @param user The address of the user to check
    /// @return Encrypted boolean (true if credit score >= 600)
    function meetsMinimumRequirement(
        address user
    ) external view returns (ebool) {
        return _minimumResults[user];
    }

    /// @dev Get the encrypted credit score for a user
    /// @param user The address of the user
    /// @return The encrypted credit score value
    function getEncryptedScore(address user) external view returns (euint16) {
        return _creditScores[user];
    }
}
