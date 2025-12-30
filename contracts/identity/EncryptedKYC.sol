// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, ebool, euint8, euint32, externalEuint8, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Encrypted KYC - Identity attributes with selective disclosure
/// @notice This contract demonstrates how to store and verify Know Your Customer (KYC) identity
///         attributes with selective disclosure. Users can prove they meet specific requirements
///         (e.g., age, residency status, account balance) without revealing all their information.
///         This is useful for financial services, exchanges, or platforms that need to comply
///         with KYC regulations while respecting user privacy.
contract EncryptedKYC is ZamaEthereumConfig {
    /// @dev Structure to hold encrypted KYC attributes
    struct KYCData {
        euint8 age; // User's age
        euint8 residencyStatus; // 0 = non-resident, 1 = resident
        euint32 accountBalance; // Account balance in smallest unit
        bool verified; // Whether KYC has been verified by an authority
    }

    // Mapping from user address to their encrypted KYC data
    mapping(address => KYCData) private _kycData;

    // Mapping from user address to encrypted verification results
    mapping(address => ebool) private _ageResults;
    mapping(address => ebool) private _residencyResults;
    mapping(address => ebool) private _balanceResults;

    // Minimum age requirement for KYC
    uint8 public constant MINIMUM_AGE = 18;

    // Minimum account balance threshold (in smallest unit, e.g., cents)
    uint32 public constant MINIMUM_BALANCE = 10000; // e.g., $100.00

    // solhint-disable-next-line no-empty-blocks
    constructor() {}

    /// @dev Register or update KYC data for a user and compute verification results
    /// @param encryptedAge The user's age encrypted as euint8
    /// @param ageProof The zero-knowledge proof for the encrypted age
    /// @param encryptedResidency The residency status encrypted as euint8 (0 or 1)
    /// @param residencyProof The zero-knowledge proof for the encrypted residency
    /// @param encryptedBalance The account balance encrypted as euint32
    /// @param balanceProof The zero-knowledge proof for the encrypted balance
    /// @notice All attributes are stored encrypted and verification results are computed
    function registerKYCData(
        externalEuint8 encryptedAge,
        bytes calldata ageProof,
        externalEuint8 encryptedResidency,
        bytes calldata residencyProof,
        externalEuint32 encryptedBalance,
        bytes calldata balanceProof
    ) external {
        euint8 age = FHE.fromExternal(encryptedAge, ageProof);
        FHE.allowThis(age);

        euint8 residency = FHE.fromExternal(encryptedResidency, residencyProof);
        FHE.allowThis(residency);

        euint32 balance = FHE.fromExternal(encryptedBalance, balanceProof);
        FHE.allowThis(balance);

        _kycData[msg.sender] = KYCData({
            age: age,
            residencyStatus: residency,
            accountBalance: balance,
            verified: false
        });

        // Compute age requirement result
        euint8 minAge = FHE.asEuint8(MINIMUM_AGE);
        ebool meetsAge = FHE.ge(age, minAge);
        FHE.allowThis(meetsAge);
        FHE.allow(meetsAge, msg.sender);
        _ageResults[msg.sender] = meetsAge;

        // Compute residency result
        euint8 one = FHE.asEuint8(1);
        ebool isCurrResident = FHE.eq(residency, one);
        FHE.allowThis(isCurrResident);
        FHE.allow(isCurrResident, msg.sender);
        _residencyResults[msg.sender] = isCurrResident;

        // Compute balance requirement result
        euint32 minBalance = FHE.asEuint32(MINIMUM_BALANCE);
        ebool meetsBalance = FHE.ge(balance, minBalance);
        FHE.allowThis(meetsBalance);
        FHE.allow(meetsBalance, msg.sender);
        _balanceResults[msg.sender] = meetsBalance;
    }

    /// @dev Mark a user's KYC as verified by an authorized party
    /// @param user The address of the user to verify
    /// @notice Only callable by the contract owner or authorized verifier
    function verifyKYC(address user) external {
        // In a real implementation, you would add access control here
        // For this example, we'll allow anyone to verify (but in production, use role-based access)
        _kycData[user].verified = true;
    }

    /// @dev Get encrypted result for age requirement check
    /// @param user The address of the user to check
    /// @return Encrypted boolean (true if user's age >= MINIMUM_AGE)
    function meetsAgeRequirement(address user) external view returns (ebool) {
        return _ageResults[user];
    }

    /// @dev Get encrypted result for residency check
    /// @param user The address of the user to check
    /// @return Encrypted boolean (true if residencyStatus == 1)
    function isResident(address user) external view returns (ebool) {
        return _residencyResults[user];
    }

    /// @dev Get encrypted result for balance requirement check
    /// @param user The address of the user to check
    /// @return Encrypted boolean (true if accountBalance >= MINIMUM_BALANCE)
    function meetsBalanceRequirement(
        address user
    ) external view returns (ebool) {
        return _balanceResults[user];
    }

    /// @dev Check if a user's KYC has been verified (plain boolean, not encrypted)
    /// @param user The address of the user to check
    /// @return True if KYC has been verified by an authority
    function isVerified(address user) external view returns (bool) {
        return _kycData[user].verified;
    }

    /// @dev Get encrypted KYC data for a user (for testing/verification purposes)
    /// @param user The address of the user
    /// @return age The encrypted age
    /// @return residencyStatus The encrypted residency status
    /// @return accountBalance The encrypted account balance
    /// @return verified Whether KYC has been verified
    function getKYCData(
        address user
    )
        external
        view
        returns (
            euint8 age,
            euint8 residencyStatus,
            euint32 accountBalance,
            bool verified
        )
    {
        KYCData memory data = _kycData[user];
        return (
            data.age,
            data.residencyStatus,
            data.accountBalance,
            data.verified
        );
    }
}
