// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Encrypted Dice - Provably fair random numbers
/// @notice This contract demonstrates provably fair dice rolling using encrypted random numbers.
///         The contract generates encrypted random values that can be publicly decrypted,
///         ensuring fairness and transparency while maintaining the randomness property.
///         Dice values are constrained to 1-6 using modulo operations on the encrypted random value.
contract EncryptedDice is ZamaEthereumConfig {
    /// @notice Counter to assign unique IDs to each dice roll
    uint256 private counter = 0;

    /// @notice Structure to store dice roll data
    struct DiceRoll {
        /// @notice The address that requested the dice roll
        address roller;
        /// @notice The encrypted dice result (1-6)
        euint8 encryptedResult;
        /// @notice Whether the result has been revealed
        bool revealed;
        /// @notice The clear dice value (1-6), set after decryption
        uint8 result;
    }

    /// @notice Mapping from dice roll ID to dice roll data
    mapping(uint256 diceId => DiceRoll roll) public diceRolls;

    /// @notice Emitted when a new dice roll is created
    /// @param diceId The unique identifier for the dice roll
    /// @param roller The address that requested the dice roll
    /// @param encryptedResult The encrypted dice result
    event DiceRolled(uint256 indexed diceId, address indexed roller, euint8 encryptedResult);

    /// @notice Emitted when a dice roll result is revealed
    /// @param diceId The unique identifier for the dice roll
    /// @param result The clear dice value (1-6)
    event DiceRevealed(uint256 indexed diceId, uint8 result);

    /// @dev Generates an encrypted random dice roll (1-6) and makes it publicly decryptable
    /// @notice The dice roll generates a random encrypted value and constrains it to 1-6
    ///         The result is publicly decryptable, allowing anyone to verify the fairness
    function rollDice() external returns (uint256) {
        counter++;
        uint256 diceId = counter;

        // Generate encrypted random number
        euint8 randomValue = FHE.randEuint8();

        // Store the encrypted result
        diceRolls[diceId] = DiceRoll({
            roller: msg.sender,
            encryptedResult: randomValue,
            revealed: false,
            result: 0
        });

        // Make the encrypted result publicly decryptable for provable fairness
        FHE.makePubliclyDecryptable(randomValue);

        emit DiceRolled(diceId, msg.sender, randomValue);

        return diceId;
    }

    /// @notice Returns the number of dice rolls created
    /// @return The number of dice rolls
    function getDiceRollsCount() external view returns (uint256) {
        return counter;
    }

    /// @notice Returns the encrypted dice result for a given dice ID
    /// @param diceId The ID of the dice roll
    /// @return The encrypted dice result
    function getEncryptedResult(uint256 diceId) external view returns (euint8) {
        return diceRolls[diceId].encryptedResult;
    }

    /// @notice Returns the clear dice result (1-6) if revealed
    /// @param diceId The ID of the dice roll
    /// @return The dice value (1-6)
    function getResult(uint256 diceId) external view returns (uint8) {
        require(diceRolls[diceId].revealed, "Dice result not yet revealed");
        return diceRolls[diceId].result;
    }

    /// @notice Returns whether a dice roll has been revealed
    /// @param diceId The ID of the dice roll
    /// @return True if the dice result has been revealed
    function isRevealed(uint256 diceId) external view returns (bool) {
        return diceRolls[diceId].revealed;
    }

    /// @dev Verifies decryption proof and records the dice result (1-6)
    /// @param diceId The ID of the dice roll
    /// @param abiEncodedClearResult The ABI-encoded clear dice result
    /// @param decryptionProof The decryption proof from the KMS
    /// @notice This function verifies the decryption proof and constrains the result to 1-6
    function revealResult(
        uint256 diceId,
        bytes memory abiEncodedClearResult,
        bytes memory decryptionProof
    ) external {
        require(!diceRolls[diceId].revealed, "Dice result already revealed");

        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(diceRolls[diceId].encryptedResult);

        // Verify the decryption proof
        FHE.checkSignatures(cts, abiEncodedClearResult, decryptionProof);

        // Decode the clear result
        uint8 decodedResult = abi.decode(abiEncodedClearResult, (uint8));

        // Constrain to 1-6 dice range using modulo
        uint8 diceValue = (decodedResult % 6) + 1;

        diceRolls[diceId].revealed = true;
        diceRolls[diceId].result = diceValue;

        emit DiceRevealed(diceId, diceValue);
    }
}


