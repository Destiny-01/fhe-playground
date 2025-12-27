// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, ebool, euint8, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Rock-Paper-Scissors - Commit-reveal game with encrypted choices
/// @notice This contract implements a commit-reveal Rock-Paper-Scissors game using encrypted choices.
///         Players commit their encrypted choices (0=Rock, 1=Paper, 2=Scissors) and then both
///         choices are compared to determine the winner without revealing choices until both are committed.
///         This ensures fairness by preventing players from seeing each other's choices before committing.
contract RockPaperScissors is ZamaEthereumConfig {
    /// @notice Counter to assign unique IDs to each game
    uint256 private counter = 0;

    /// @notice Choice values: 0 = Rock, 1 = Paper, 2 = Scissors
    uint8 public constant ROCK = 0;
    uint8 public constant PAPER = 1;
    uint8 public constant SCISSORS = 2;

    /// @notice Structure to store game data
    struct Game {
        /// @notice Player 1 address
        address player1;
        /// @notice Player 2 address
        address player2;
        /// @notice Player 1's encrypted choice (0-2)
        euint8 encryptedChoice1;
        /// @notice Player 2's encrypted choice (0-2)
        euint8 encryptedChoice2;
        /// @notice Whether player 1 has committed
        bool player1Committed;
        /// @notice Whether player 2 has committed
        bool player2Committed;
        /// @notice Whether the game result has been computed
        bool resultComputed;
        /// @notice The winner's address (address(0) for draw, set after computation)
        address winner;
    }

    /// @notice Mapping from game ID to game data
    mapping(uint256 gameId => Game game) public games;

    /// @notice Emitted when a new game is created
    /// @param gameId The unique identifier for the game
    /// @param player1 The address of player 1
    /// @param player2 The address of player 2
    event GameCreated(uint256 indexed gameId, address indexed player1, address indexed player2);

    /// @notice Emitted when a player commits their choice
    /// @param gameId The unique identifier for the game
    /// @param player The address of the player who committed
    event ChoiceCommitted(uint256 indexed gameId, address indexed player);

    /// @notice Emitted when the game result is computed
    /// @param gameId The unique identifier for the game
    /// @param winner The winner's address (address(0) for draw)
    event GameResultComputed(uint256 indexed gameId, address indexed winner);

    /// @dev Creates a new Rock-Paper-Scissors game
    /// @param player1 The address of player 1
    /// @param player2 The address of player 2
    /// @return The game ID
    function createGame(address player1, address player2) external returns (uint256) {
        require(player1 != address(0), "Player1 is address zero");
        require(player2 != address(0), "Player2 is address zero");
        require(player1 != player2, "Players must be different");

        counter++;
        uint256 gameId = counter;

        games[gameId] = Game({
            player1: player1,
            player2: player2,
            encryptedChoice1: FHE.asEuint8(0), // Placeholder
            encryptedChoice2: FHE.asEuint8(0), // Placeholder
            player1Committed: false,
            player2Committed: false,
            resultComputed: false,
            winner: address(0)
        });

        emit GameCreated(gameId, player1, player2);
        return gameId;
    }

    /// @dev Player 1 commits their encrypted choice
    /// @param gameId The ID of the game
    /// @param encryptedChoice The encrypted choice (0=Rock, 1=Paper, 2=Scissors)
    /// @param inputProof The zero-knowledge proof for the encrypted choice
    function commitChoice1(
        uint256 gameId,
        externalEuint8 encryptedChoice,
        bytes calldata inputProof
    ) external {
        require(games[gameId].player1 == msg.sender, "Only player1 can commit");
        require(!games[gameId].player1Committed, "Player1 already committed");

        euint8 choice = FHE.fromExternal(encryptedChoice, inputProof);
        FHE.allowThis(choice);
        FHE.allow(choice, msg.sender);

        games[gameId].encryptedChoice1 = choice;
        games[gameId].player1Committed = true;

        emit ChoiceCommitted(gameId, msg.sender);
    }

    /// @dev Player 2 commits their encrypted choice
    /// @param gameId The ID of the game
    /// @param encryptedChoice The encrypted choice (0=Rock, 1=Paper, 2=Scissors)
    /// @param inputProof The zero-knowledge proof for the encrypted choice
    function commitChoice2(
        uint256 gameId,
        externalEuint8 encryptedChoice,
        bytes calldata inputProof
    ) external {
        require(games[gameId].player2 == msg.sender, "Only player2 can commit");
        require(!games[gameId].player2Committed, "Player2 already committed");

        euint8 choice = FHE.fromExternal(encryptedChoice, inputProof);
        FHE.allowThis(choice);
        FHE.allow(choice, msg.sender);

        games[gameId].encryptedChoice2 = choice;
        games[gameId].player2Committed = true;

        emit ChoiceCommitted(gameId, msg.sender);
    }

    /// @dev Makes both choices publicly decryptable so they can be revealed
    /// @notice Once both players have committed, this function makes the choices
    ///         publicly decryptable, allowing anyone to decrypt and verify the result
    function makeChoicesPublic(uint256 gameId) external {
        require(games[gameId].player1Committed, "Player1 has not committed");
        require(games[gameId].player2Committed, "Player2 has not committed");
        require(!games[gameId].resultComputed, "Result already computed");

        // Make both choices publicly decryptable
        FHE.makePubliclyDecryptable(games[gameId].encryptedChoice1);
        FHE.makePubliclyDecryptable(games[gameId].encryptedChoice2);

        games[gameId].resultComputed = true;

        emit GameResultComputed(gameId, address(0)); // Winner determined after decryption
    }

    /// @dev Verifies decryption proof and determines winner from revealed choices
    /// @param gameId The ID of the game
    /// @param abiEncodedClearChoices The ABI-encoded clear choices (choice1, choice2)
    /// @param decryptionProof The decryption proof from the KMS
    function revealAndDetermineWinner(
        uint256 gameId,
        bytes memory abiEncodedClearChoices,
        bytes memory decryptionProof
    ) external {
        require(games[gameId].resultComputed, "Choices not yet made public");
        require(games[gameId].winner == address(0), "Winner already determined");

        bytes32[] memory cts = new bytes32[](2);
        cts[0] = FHE.toBytes32(games[gameId].encryptedChoice1);
        cts[1] = FHE.toBytes32(games[gameId].encryptedChoice2);

        // Verify the decryption proof
        FHE.checkSignatures(cts, abiEncodedClearChoices, decryptionProof);

        // Decode the clear choices
        (uint8 choice1, uint8 choice2) = abi.decode(abiEncodedClearChoices, (uint8, uint8));

        // Ensure choices are valid (0-2)
        require(choice1 <= 2, "Invalid choice1");
        require(choice2 <= 2, "Invalid choice2");

        // Determine winner based on Rock-Paper-Scissors rules
        address winner;
        if (choice1 == choice2) {
            // Draw
            winner = address(0);
        } else if (
            (choice1 == ROCK && choice2 == SCISSORS) ||
            (choice1 == PAPER && choice2 == ROCK) ||
            (choice1 == SCISSORS && choice2 == PAPER)
        ) {
            // Player 1 wins
            winner = games[gameId].player1;
        } else {
            // Player 2 wins
            winner = games[gameId].player2;
        }

        games[gameId].winner = winner;

        emit GameResultComputed(gameId, winner);
    }

    /// @notice Returns the encrypted choice for player 1
    /// @param gameId The ID of the game
    /// @return The encrypted choice
    function getEncryptedChoice1(uint256 gameId) external view returns (euint8) {
        return games[gameId].encryptedChoice1;
    }

    /// @notice Returns the encrypted choice for player 2
    /// @param gameId The ID of the game
    /// @return The encrypted choice
    function getEncryptedChoice2(uint256 gameId) external view returns (euint8) {
        return games[gameId].encryptedChoice2;
    }

    /// @notice Returns whether both players have committed
    /// @param gameId The ID of the game
    /// @return True if both players have committed
    function areBothCommitted(uint256 gameId) external view returns (bool) {
        return games[gameId].player1Committed && games[gameId].player2Committed;
    }

    /// @notice Returns the winner's address (address(0) for draw or not yet computed)
    /// @param gameId The ID of the game
    /// @return The winner's address
    function getWinner(uint256 gameId) external view returns (address) {
        require(games[gameId].resultComputed, "Result not yet computed");
        return games[gameId].winner;
    }
}

