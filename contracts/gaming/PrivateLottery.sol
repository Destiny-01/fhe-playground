// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, ebool, euint8, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Private Lottery - Lottery with hidden tickets
/// @notice This contract implements a private lottery where players purchase encrypted tickets
///         and a winning number is drawn using encrypted random generation. Winners are determined
///         by comparing encrypted ticket numbers with the encrypted winning number without revealing
///         the actual ticket values until after the draw.
contract PrivateLottery is ZamaEthereumConfig {
    /// @notice Counter to assign unique IDs to each lottery round
    uint256 private counter = 0;

    /// @notice Maximum ticket number (e.g., 0-99 for a 100-ticket lottery)
    uint8 public constant MAX_TICKET_NUMBER = 99;

    /// @notice Structure to store lottery round data
    struct LotteryRound {
        /// @notice The encrypted winning number
        euint8 encryptedWinningNumber;
        /// @notice Whether the winning number has been drawn
        bool winningNumberDrawn;
        /// @notice Whether the lottery has been closed
        bool closed;
        /// @notice Whether the winning number has been revealed
        bool winningNumberRevealed;
        /// @notice The clear winning number, set after decryption
        uint8 winningNumber;
    }

    /// @notice Structure to store player ticket data
    struct Ticket {
        /// @notice The address that purchased the ticket
        address player;
        /// @notice The encrypted ticket number (0-MAX_TICKET_NUMBER)
        euint8 encryptedTicketNumber;
        /// @notice Whether this ticket is a winner (encrypted boolean)
        ebool isWinner;
        /// @notice Whether the winner status has been computed
        bool winnerComputed;
    }

    /// @notice Mapping from lottery round ID to lottery round data
    mapping(uint256 roundId => LotteryRound round) public rounds;

    /// @notice Mapping from (roundId, ticketId) to ticket data
    mapping(uint256 roundId => mapping(uint256 ticketId => Ticket ticket)) public tickets;

    /// @notice Mapping from round ID to ticket count
    mapping(uint256 roundId => uint256) public ticketCounts;

    /// @notice Emitted when a new lottery round is created
    /// @param roundId The unique identifier for the lottery round
    event LotteryRoundCreated(uint256 indexed roundId);

    /// @notice Emitted when a ticket is purchased
    /// @param roundId The ID of the lottery round
    /// @param ticketId The ID of the ticket
    /// @param player The address that purchased the ticket
    event TicketPurchased(uint256 indexed roundId, uint256 indexed ticketId, address indexed player);

    /// @notice Emitted when the winning number is drawn
    /// @param roundId The ID of the lottery round
    /// @param encryptedWinningNumber The encrypted winning number
    event WinningNumberDrawn(uint256 indexed roundId, euint8 encryptedWinningNumber);

    /// @notice Emitted when the winning number is revealed
    /// @param roundId The ID of the lottery round
    /// @param winningNumber The clear winning number
    event WinningNumberRevealed(uint256 indexed roundId, uint8 winningNumber);

    /// @dev Creates a new lottery round
    /// @return The round ID
    function createLotteryRound() external returns (uint256) {
        counter++;
        uint256 roundId = counter;

        rounds[roundId] = LotteryRound({
            encryptedWinningNumber: FHE.asEuint8(0), // Placeholder
            winningNumberDrawn: false,
            closed: false,
            winningNumberRevealed: false,
            winningNumber: 0
        });

        emit LotteryRoundCreated(roundId);
        return roundId;
    }

    /// @dev Purchases a ticket with an encrypted ticket number
    /// @param roundId The ID of the lottery round
    /// @param encryptedTicketNumber The encrypted ticket number (0-MAX_TICKET_NUMBER)
    /// @param inputProof The zero-knowledge proof for the encrypted ticket number
    /// @return The ticket ID
    function purchaseTicket(
        uint256 roundId,
        externalEuint8 encryptedTicketNumber,
        bytes calldata inputProof
    ) external returns (uint256) {
        require(!rounds[roundId].closed, "Lottery round is closed");
        require(!rounds[roundId].winningNumberDrawn, "Winning number already drawn");

        euint8 ticketNumber = FHE.fromExternal(encryptedTicketNumber, inputProof);
        FHE.allowThis(ticketNumber);
        FHE.allow(ticketNumber, msg.sender);

        uint256 ticketId = ticketCounts[roundId];
        ticketCounts[roundId]++;

        tickets[roundId][ticketId] = Ticket({
            player: msg.sender,
            encryptedTicketNumber: ticketNumber,
            isWinner: FHE.asEbool(false), // Placeholder
            winnerComputed: false
        });

        emit TicketPurchased(roundId, ticketId, msg.sender);
        return ticketId;
    }

    /// @dev Draws the winning number using encrypted random generation
    /// @param roundId The ID of the lottery round
    /// @notice This function generates a random encrypted winning number and makes it publicly decryptable
    function drawWinningNumber(uint256 roundId) external {
        require(!rounds[roundId].closed, "Lottery round is closed");
        require(!rounds[roundId].winningNumberDrawn, "Winning number already drawn");
        require(ticketCounts[roundId] > 0, "No tickets purchased");

        // Generate encrypted random winning number
        euint8 randomWinning = FHE.randEuint8();

        rounds[roundId].encryptedWinningNumber = randomWinning;
        rounds[roundId].winningNumberDrawn = true;

        // Make the winning number publicly decryptable for provable fairness
        FHE.makePubliclyDecryptable(randomWinning);

        emit WinningNumberDrawn(roundId, randomWinning);
    }

    /// @dev Computes winner status for all tickets by comparing with encrypted winning number
    /// @param roundId The ID of the lottery round
    /// @notice This function compares each ticket's encrypted number with the encrypted winning number
    function computeWinners(uint256 roundId) external {
        require(rounds[roundId].winningNumberDrawn, "Winning number not yet drawn");

        euint8 winningNumber = rounds[roundId].encryptedWinningNumber;
        uint256 count = ticketCounts[roundId];

        for (uint256 i = 0; i < count; i++) {
            if (!tickets[roundId][i].winnerComputed) {
                // Compare encrypted ticket number with encrypted winning number
                ebool isMatch = FHE.eq(tickets[roundId][i].encryptedTicketNumber, winningNumber);
                FHE.allowThis(isMatch);
                FHE.allow(isMatch, tickets[roundId][i].player);

                tickets[roundId][i].isWinner = isMatch;
                tickets[roundId][i].winnerComputed = true;
            }
        }

        rounds[roundId].closed = true;
    }

    /// @dev Verifies decryption proof and reveals the winning number
    /// @param roundId The ID of the lottery round
    /// @param abiEncodedClearWinningNumber The ABI-encoded clear winning number
    /// @param decryptionProof The decryption proof from the KMS
    function revealWinningNumber(
        uint256 roundId,
        bytes memory abiEncodedClearWinningNumber,
        bytes memory decryptionProof
    ) external {
        require(rounds[roundId].winningNumberDrawn, "Winning number not yet drawn");
        require(!rounds[roundId].winningNumberRevealed, "Winning number already revealed");

        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(rounds[roundId].encryptedWinningNumber);

        // Verify the decryption proof
        FHE.checkSignatures(cts, abiEncodedClearWinningNumber, decryptionProof);

        // Decode the clear winning number
        uint8 decodedWinning = abi.decode(abiEncodedClearWinningNumber, (uint8));

        // Constrain to valid ticket range
        uint8 winningNumber = decodedWinning % (MAX_TICKET_NUMBER + 1);

        rounds[roundId].winningNumber = winningNumber;
        rounds[roundId].winningNumberRevealed = true;

        emit WinningNumberRevealed(roundId, winningNumber);
    }

    /// @notice Returns the encrypted winning number
    /// @param roundId The ID of the lottery round
    /// @return The encrypted winning number
    function getEncryptedWinningNumber(uint256 roundId) external view returns (euint8) {
        return rounds[roundId].encryptedWinningNumber;
    }

    /// @notice Returns the clear winning number if revealed
    /// @param roundId The ID of the lottery round
    /// @return The clear winning number
    function getWinningNumber(uint256 roundId) external view returns (uint8) {
        require(rounds[roundId].winningNumberRevealed, "Winning number not yet revealed");
        return rounds[roundId].winningNumber;
    }

    /// @notice Returns the encrypted ticket number for a given ticket
    /// @param roundId The ID of the lottery round
    /// @param ticketId The ID of the ticket
    /// @return The encrypted ticket number
    function getEncryptedTicketNumber(uint256 roundId, uint256 ticketId) external view returns (euint8) {
        return tickets[roundId][ticketId].encryptedTicketNumber;
    }

    /// @notice Returns the encrypted winner status for a given ticket
    /// @param roundId The ID of the lottery round
    /// @param ticketId The ID of the ticket
    /// @return The encrypted boolean indicating if the ticket is a winner
    function getEncryptedWinnerStatus(uint256 roundId, uint256 ticketId) external view returns (ebool) {
        require(tickets[roundId][ticketId].winnerComputed, "Winner status not yet computed");
        return tickets[roundId][ticketId].isWinner;
    }

    /// @notice Returns the number of tickets purchased for a round
    /// @param roundId The ID of the lottery round
    /// @return The number of tickets
    function getTicketCount(uint256 roundId) external view returns (uint256) {
        return ticketCounts[roundId];
    }
}

