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

