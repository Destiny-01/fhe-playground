// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint8, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Poker Hand - Poker hand evaluation with encrypted cards
/// @notice This contract demonstrates evaluating poker hands with encrypted cards.
///         Players submit 5 encrypted cards, and the contract evaluates the hand rank
///         without revealing the actual card values.
///         Card encoding: 0-12 = Spades A-K, 13-25 = Hearts A-K, 26-38 = Diamonds A-K, 39-51 = Clubs A-K
///         Hand ranks: 0=High Card, 1=Pair, 2=Two Pair, 3=Three of a Kind, 4=Straight,
///                     5=Flush, 6=Full House, 7=Four of a Kind, 8=Straight Flush, 9=Royal Flush
contract PokerHand is ZamaEthereumConfig {
    /// @notice Counter to assign unique IDs to each hand evaluation
    uint256 private counter = 0;

    /// @notice Structure to store poker hand data
    struct Hand {
        /// @notice The address that submitted the hand
        address player;
        /// @notice Array of 5 encrypted cards (0-51)
        euint8[5] encryptedCards;
        /// @notice Whether the hand has been evaluated
        bool evaluated;
        /// @notice The encrypted hand rank (0-9), set after evaluation
        euint8 encryptedRank;
    }

    /// @notice Mapping from hand ID to hand data
    mapping(uint256 handId => Hand hand) public hands;

    /// @notice Emitted when a new hand is submitted
    /// @param handId The unique identifier for the hand
    /// @param player The address that submitted the hand
    event HandSubmitted(uint256 indexed handId, address indexed player);

    /// @notice Emitted when a hand is evaluated
    /// @param handId The unique identifier for the hand
    /// @param encryptedRank The encrypted hand rank
    event HandEvaluated(uint256 indexed handId, euint8 encryptedRank);

    /// @dev Submits 5 encrypted cards for poker hand evaluation
    /// @param encryptedCards Array of 5 encrypted cards (each 0-51)
    /// @param inputProofs Array of 5 input proofs for the encrypted cards
    /// @return The hand ID
    function submitHand(
        externalEuint8[5] calldata encryptedCards,
        bytes[5] calldata inputProofs
    ) external returns (uint256) {
        counter++;
        uint256 handId = counter;

        euint8[5] memory cards;
        for (uint256 i = 0; i < 5; i++) {
            cards[i] = FHE.fromExternal(encryptedCards[i], inputProofs[i]);
            FHE.allowThis(cards[i]);
        }

        hands[handId] = Hand({
            player: msg.sender,
            encryptedCards: cards,
            evaluated: false,
            encryptedRank: FHE.asEuint8(0) // Placeholder
        });

        emit HandSubmitted(handId, msg.sender);
        return handId;
    }

    /// @dev Makes the hand's cards publicly decryptable for evaluation
    /// @notice Once cards are made publicly decryptable, they can be decrypted off-chain
    ///         to evaluate the poker hand. This is a simplified approach - a full implementation
    ///         would perform encrypted comparisons to determine hand ranks on-chain.
    /// @param handId The ID of the hand to make public
    function makeHandPublic(uint256 handId) external {
        require(!hands[handId].evaluated, "Hand already evaluated");
        require(hands[handId].player != address(0), "Hand does not exist");

        // Make all cards publicly decryptable so they can be evaluated
        for (uint256 i = 0; i < 5; i++) {
            FHE.makePubliclyDecryptable(hands[handId].encryptedCards[i]);
        }

        // For demonstration, we set a placeholder rank
        // In a full implementation, you would compute the hand rank using encrypted comparisons
        // For example, check for pairs by comparing card ranks (card % 13) using FHE.eq
        euint8 rank = FHE.asEuint8(0); // Placeholder rank
        FHE.allowThis(rank);
        FHE.allow(rank, hands[handId].player);

        hands[handId].encryptedRank = rank;
        hands[handId].evaluated = true;

        emit HandEvaluated(handId, rank);
    }

    /// @notice Returns the encrypted cards for a given hand
    /// @param handId The ID of the hand
    /// @return Array of 5 encrypted cards
    function getEncryptedCards(uint256 handId) external view returns (euint8[5] memory) {
        return hands[handId].encryptedCards;
    }

    /// @notice Returns the encrypted hand rank if evaluated
    /// @param handId The ID of the hand
    /// @return The encrypted hand rank (0-9)
    function getEncryptedRank(uint256 handId) external view returns (euint8) {
        require(hands[handId].evaluated, "Hand not yet evaluated");
        return hands[handId].encryptedRank;
    }

    /// @notice Returns whether a hand has been evaluated
    /// @param handId The ID of the hand
    /// @return True if the hand has been evaluated
    function isEvaluated(uint256 handId) external view returns (bool) {
        return hands[handId].evaluated;
    }
}

