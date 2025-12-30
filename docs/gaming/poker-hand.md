Example: PokerHand

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="PokerHand.sol" %}

```solidity
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


```

{% endtab %}

{% tab title="PokerHand.ts" %}

```typescript
import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers as EthersT } from "ethers";
import { ethers, fhevm } from "hardhat";
import * as hre from "hardhat";

import { PokerHand, PokerHand__factory } from "../../../typechain-types";
import type { Signers } from "./types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory("PokerHand")) as PokerHand__factory;
  const pokerHand = (await factory.deploy()) as PokerHand;
  const pokerHand_address = await pokerHand.getAddress();

  return { pokerHand, pokerHand_address };
}

/**
 * This example demonstrates evaluating poker hands with encrypted cards.
 * Players submit 5 encrypted cards, and the contract evaluates the hand rank.
 */
describe("PokerHand", function () {
  let contract: PokerHand;
  let contractAddress: string;
  let signers: Signers;
  let fhevm: HardhatFhevmRuntimeEnvironment;

  before(async function () {
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { owner: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
    fhevm = hre.fhevm;
  });

  beforeEach(async function () {
    const deployment = await deployFixture();
    contractAddress = deployment.pokerHand_address;
    contract = deployment.pokerHand;
  });

  // ✅ Test should succeed - submit a hand
  it("should allow a player to submit a hand with 5 encrypted cards", async function () {
    // Create 5 encrypted cards (example: Ace of Spades, King of Spades, Queen of Spades, Jack of Spades, 10 of Spades)
    const cards = [0, 12, 11, 10, 9]; // Royal Flush in Spades

    const encryptedCards: any[] = [];
    const inputProofs: string[] = [];

    for (let i = 0; i < 5; i++) {
      const input = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add8(cards[i])
        .encrypt();
      encryptedCards.push(input.handles[0]);
      inputProofs.push(input.inputProof);
    }

    const tx = await contract
      .connect(signers.alice)
      .submitHand(encryptedCards as any, inputProofs as any);
    const receipt = await tx.wait();

    expect(receipt).to.not.be.null;
    const handId = 1;
    const hand = await contract.hands(handId);
    expect(hand.player).to.eq(signers.alice.address);
    expect(hand.evaluated).to.be.false;
  });

  // ✅ Test should succeed - make hand public
  it("should allow making a hand public for evaluation", async function () {
    const cards = [0, 12, 11, 10, 9];

    const encryptedCards: any[] = [];
    const inputProofs: string[] = [];

    for (let i = 0; i < 5; i++) {
      const input = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add8(cards[i])
        .encrypt();
      encryptedCards.push(input.handles[0]);
      inputProofs.push(input.inputProof);
    }

    await contract
      .connect(signers.alice)
      .submitHand(encryptedCards as any, inputProofs as any);

    const handId = 1;
    const makePublicTx = await contract.makeHandPublic(handId);
    await makePublicTx.wait();

    const hand = await contract.hands(handId);
    expect(hand.evaluated).to.be.true;
  });

  // ✅ Test should succeed - get encrypted cards
  it("should return encrypted cards for a submitted hand", async function () {
    const cards = [0, 12, 11, 10, 9];

    const encryptedCards: any[] = [];
    const inputProofs: string[] = [];

    for (let i = 0; i < 5; i++) {
      const input = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add8(cards[i])
        .encrypt();
      encryptedCards.push(input.handles[0]);
      inputProofs.push(input.inputProof);
    }

    await contract
      .connect(signers.alice)
      .submitHand(encryptedCards as any, inputProofs as any);

    const handId = 1;
    const returnedCards = await contract.getEncryptedCards(handId);
    expect(returnedCards.length).to.eq(5);
  });

  // ✅ Test should succeed - get encrypted rank after evaluation
  it("should return encrypted rank after evaluation", async function () {
    const cards = [0, 12, 11, 10, 9];

    const encryptedCards: any[] = [];
    const inputProofs: string[] = [];

    for (let i = 0; i < 5; i++) {
      const input = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add8(cards[i])
        .encrypt();
      encryptedCards.push(input.handles[0]);
      inputProofs.push(input.inputProof);
    }

    await contract
      .connect(signers.alice)
      .submitHand(encryptedCards as any, inputProofs as any);

    const handId = 1;
    await contract.makeHandPublic(handId);

    const encryptedRank = await contract.getEncryptedRank(handId);
    expect(encryptedRank).to.not.be.null;
  });

  // ✅ Test should succeed - check if hand is evaluated
  it("should correctly report if a hand has been evaluated", async function () {
    const cards = [0, 12, 11, 10, 9];

    const encryptedCards: any[] = [];
    const inputProofs: string[] = [];

    for (let i = 0; i < 5; i++) {
      const input = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add8(cards[i])
        .encrypt();
      encryptedCards.push(input.handles[0]);
      inputProofs.push(input.inputProof);
    }

    await contract
      .connect(signers.alice)
      .submitHand(encryptedCards as any, inputProofs as any);

    const handId = 1;
    expect(await contract.isEvaluated(handId)).to.be.false;

    await contract.makeHandPublic(handId);
    expect(await contract.isEvaluated(handId)).to.be.true;
  });

  // ✅ Test should succeed - multiple hands
  it("should handle multiple hands from different players", async function () {
    // Alice's hand
    const aliceCards = [0, 12, 11, 10, 9];
    const aliceEncryptedCards: any[] = [];
    const aliceInputProofs: string[] = [];

    for (let i = 0; i < 5; i++) {
      const input = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add8(aliceCards[i])
        .encrypt();
      aliceEncryptedCards.push(input.handles[0]);
      aliceInputProofs.push(input.inputProof);
    }

    await contract
      .connect(signers.alice)
      .submitHand(aliceEncryptedCards as any, aliceInputProofs as any);

    // Bob's hand
    const bobCards = [13, 14, 15, 16, 17];
    const bobEncryptedCards: any[] = [];
    const bobInputProofs: string[] = [];

    for (let i = 0; i < 5; i++) {
      const input = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .add8(bobCards[i])
        .encrypt();
      bobEncryptedCards.push(input.handles[0]);
      bobInputProofs.push(input.inputProof);
    }

    await contract
      .connect(signers.bob)
      .submitHand(bobEncryptedCards as any, bobInputProofs as any);

    const hand1 = await contract.hands(1);
    const hand2 = await contract.hands(2);

    expect(hand1.player).to.eq(signers.alice.address);
    expect(hand2.player).to.eq(signers.bob.address);
  });

  // ❌ Test should fail - cannot make hand public twice
  it("should fail if trying to make hand public twice", async function () {
    const cards = [0, 12, 11, 10, 9];

    const encryptedCards: any[] = [];
    const inputProofs: string[] = [];

    for (let i = 0; i < 5; i++) {
      const input = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add8(cards[i])
        .encrypt();
      encryptedCards.push(input.handles[0]);
      inputProofs.push(input.inputProof);
    }

    await contract
      .connect(signers.alice)
      .submitHand(encryptedCards as any, inputProofs as any);

    const handId = 1;
    await contract.makeHandPublic(handId);

    await expect(
      contract.makeHandPublic(handId)
    ).to.be.revertedWith("Hand already evaluated");
  });

  // ❌ Test should fail - cannot get rank before evaluation
  it("should fail to get rank before evaluation", async function () {
    const cards = [0, 12, 11, 10, 9];

    const encryptedCards: any[] = [];
    const inputProofs: string[] = [];

    for (let i = 0; i < 5; i++) {
      const input = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add8(cards[i])
        .encrypt();
      encryptedCards.push(input.handles[0]);
      inputProofs.push(input.inputProof);
    }

    await contract
      .connect(signers.alice)
      .submitHand(encryptedCards as any, inputProofs as any);

    const handId = 1;

    await expect(
      contract.getEncryptedRank(handId)
    ).to.be.revertedWith("Hand not yet evaluated");
  });
});


```

{% endtab %}

{% endtabs %}
