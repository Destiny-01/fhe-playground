import {
  FhevmType,
  HardhatFhevmRuntimeEnvironment,
} from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers as EthersT } from "ethers";
import { ethers, fhevm } from "hardhat";
import * as hre from "hardhat";

import {
  PrivateLottery,
  PrivateLottery__factory,
} from "../../../typechain-types";
import type { Signers } from "./types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory(
    "PrivateLottery"
  )) as PrivateLottery__factory;
  const privateLottery = (await factory.deploy()) as PrivateLottery;
  const privateLottery_address = await privateLottery.getAddress();

  return { privateLottery, privateLottery_address };
}

/**
 * This example demonstrates a private lottery where players purchase encrypted tickets
 * and a winning number is drawn using encrypted random generation.
 */
describe("PrivateLottery", function () {
  let contract: PrivateLottery;
  let contractAddress: string;
  let signers: Signers;
  let fhevm: HardhatFhevmRuntimeEnvironment;

  before(async function () {
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      owner: ethSigners[0],
      alice: ethSigners[1],
      bob: ethSigners[2],
    };
    fhevm = hre.fhevm;
  });

  beforeEach(async function () {
    const deployment = await deployFixture();
    contractAddress = deployment.privateLottery_address;
    contract = deployment.privateLottery;
  });

  // Helper function to decrypt ebool
  async function decryptEbool(
    encrypted: any,
    user: HardhatEthersSigner
  ): Promise<boolean> {
    return await fhevm.userDecryptEbool(
      typeof encrypted === "string" ? encrypted : ethers.hexlify(encrypted),
      contractAddress,
      user
    );
  }

  // ✅ Test should succeed - create lottery round
  it("should create a new lottery round", async function () {
    const tx = await contract.createLotteryRound();
    const receipt = await tx.wait();

    expect(receipt).to.not.be.null;
    const roundId = 1;
    const round = await contract.rounds(roundId);
    expect(round.closed).to.be.false;
    expect(round.winningNumberDrawn).to.be.false;
  });

  // ✅ Test should succeed - purchase ticket
  it("should allow a player to purchase a ticket", async function () {
    await contract.createLotteryRound();

    const roundId = 1;
    const ticketNumber = 42;

    const input = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(ticketNumber)
      .encrypt();

    const tx = await contract
      .connect(signers.alice)
      .purchaseTicket(roundId, input.handles[0], input.inputProof);
    await tx.wait();

    const ticketCount = await contract.getTicketCount(roundId);
    expect(ticketCount).to.eq(1);

    const ticket = await contract.tickets(roundId, 0);
    expect(ticket.player).to.eq(signers.alice.address);
  });

  // ✅ Test should succeed - draw winning number
  it("should allow drawing the winning number", async function () {
    await contract.createLotteryRound();

    const roundId = 1;
    const ticketNumber = 42;

    const input = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(ticketNumber)
      .encrypt();

    await contract
      .connect(signers.alice)
      .purchaseTicket(roundId, input.handles[0], input.inputProof);

    const drawTx = await contract.drawWinningNumber(roundId);
    await drawTx.wait();

    const round = await contract.rounds(roundId);
    expect(round.winningNumberDrawn).to.be.true;
  });

  // ✅ Test should succeed - compute winners
  it("should compute winners by comparing tickets with winning number", async function () {
    await contract.createLotteryRound();

    const roundId = 1;
    const winningTicket = 42;

    // Alice purchases ticket 42
    const input1 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(winningTicket)
      .encrypt();

    await contract
      .connect(signers.alice)
      .purchaseTicket(roundId, input1.handles[0], input1.inputProof);

    // Bob purchases ticket 99
    const input2 = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add8(99)
      .encrypt();
    console.log("f check");

    await contract
      .connect(signers.bob)
      .purchaseTicket(roundId, input2.handles[0], input2.inputProof);

    console.log("first check");
    // Draw winning number (will be random, but we'll compute winners)
    await contract.drawWinningNumber(roundId);

    console.log("second check");
    // Compute winners
    const computeTx = await contract.computeWinners(roundId);
    await computeTx.wait();
    console.log("third check");

    const round = await contract.rounds(roundId);
    expect(round.closed).to.be.true;

    // Check that winner status has been computed
    const ticket0 = await contract.tickets(roundId, 0);
    const ticket1 = await contract.tickets(roundId, 1);
    expect(ticket0.winnerComputed).to.be.true;
    expect(ticket1.winnerComputed).to.be.true;
  });

  // ✅ Test should succeed - reveal winning number
  it("should allow revealing the winning number", async function () {
    await contract.createLotteryRound();

    const roundId = 1;
    const ticketNumber = 42;

    const input = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(ticketNumber)
      .encrypt();

    await contract
      .connect(signers.alice)
      .purchaseTicket(roundId, input.handles[0], input.inputProof);

    await contract.drawWinningNumber(roundId);

    // Get encrypted winning number and decrypt it
    const encryptedWinningNumber = await contract.getEncryptedWinningNumber(
      roundId
    );

    // Decrypt the winning number
    const publicDecryptResults = await fhevm.publicDecrypt([
      ethers.hexlify(encryptedWinningNumber),
    ]);

    // Reveal the winning number
    const revealTx = await contract.revealWinningNumber(
      roundId,
      publicDecryptResults.abiEncodedClearValues,
      publicDecryptResults.decryptionProof
    );
    await revealTx.wait();

    const round = await contract.rounds(roundId);
    expect(round.winningNumberRevealed).to.be.true;
    expect(round.winningNumber).to.be.at.least(0);
    expect(round.winningNumber).to.be.at.most(99);
  });

  // ✅ Test should succeed - get ticket count
  it("should return the correct ticket count", async function () {
    await contract.createLotteryRound();

    const roundId = 1;

    // Purchase multiple tickets
    for (let i = 0; i < 5; i++) {
      const input = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add8(i)
        .encrypt();

      await contract
        .connect(signers.alice)
        .purchaseTicket(roundId, input.handles[0], input.inputProof);
    }

    const ticketCount = await contract.getTicketCount(roundId);
    expect(ticketCount).to.eq(5);
  });

  // ✅ Test should succeed - get encrypted ticket number
  it("should return encrypted ticket number for a ticket", async function () {
    await contract.createLotteryRound();

    const roundId = 1;
    const ticketNumber = 42;

    const input = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(ticketNumber)
      .encrypt();

    await contract
      .connect(signers.alice)
      .purchaseTicket(roundId, input.handles[0], input.inputProof);

    const encryptedTicketNumber = await contract.getEncryptedTicketNumber(
      roundId,
      0
    );
    expect(encryptedTicketNumber).to.not.be.null;
  });

  // ✅ Test should succeed - get encrypted winner status
  it("should return encrypted winner status after computing winners", async function () {
    await contract.createLotteryRound();

    const roundId = 1;
    const ticketNumber = 42;

    const input = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(ticketNumber)
      .encrypt();

    await contract
      .connect(signers.alice)
      .purchaseTicket(roundId, input.handles[0], input.inputProof);

    await contract.drawWinningNumber(roundId);
    await contract.computeWinners(roundId);

    const encryptedWinnerStatus = await contract.getEncryptedWinnerStatus(
      roundId,
      0
    );
    expect(encryptedWinnerStatus).to.not.be.null;
  });

  // ❌ Test should fail - cannot purchase ticket after closing
  it("should fail to purchase ticket after lottery is closed", async function () {
    await contract.createLotteryRound();

    const roundId = 1;
    const ticketNumber = 42;

    const input1 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(ticketNumber)
      .encrypt();

    await contract
      .connect(signers.alice)
      .purchaseTicket(roundId, input1.handles[0], input1.inputProof);

    await contract.drawWinningNumber(roundId);
    await contract.computeWinners(roundId);

    // Try to purchase ticket after closing
    const input2 = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add8(99)
      .encrypt();

    await expect(
      contract
        .connect(signers.bob)
        .purchaseTicket(roundId, input2.handles[0], input2.inputProof)
    ).to.be.revertedWith("Lottery round is closed");
  });

  // ❌ Test should fail - cannot draw winning number without tickets
  it("should fail to draw winning number if no tickets purchased", async function () {
    await contract.createLotteryRound();

    const roundId = 1;

    await expect(contract.drawWinningNumber(roundId)).to.be.revertedWith(
      "No tickets purchased"
    );
  });

  // ❌ Test should fail - cannot reveal winning number before drawing
  it("should fail to reveal winning number before drawing", async function () {
    await contract.createLotteryRound();

    const roundId = 1;

    // Try to reveal without drawing - should fail because winning number not drawn
    // We need a valid encrypted value structure, but the contract will check if winningNumberDrawn is false
    const ticketNumber = 42;
    const input = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(ticketNumber)
      .encrypt();

    // Purchase a ticket to have some encrypted data
    await contract
      .connect(signers.alice)
      .purchaseTicket(roundId, input.handles[0], input.inputProof);

    // Try to reveal without drawing - create dummy data since ticket numbers aren't publicly decryptable
    // The contract will reject this at the require check before decryption verification
    // We'll create dummy ABI-encoded data and proof that will fail validation
    const dummyAbiEncoded = EthersT.AbiCoder.defaultAbiCoder().encode(
      ["uint8"],
      [42]
    );
    const dummyProof = "0x"; // Empty proof - contract will check winningNumberDrawn first

    await expect(
      contract.revealWinningNumber(roundId, dummyAbiEncoded, dummyProof)
    ).to.be.revertedWith("Winning number not yet drawn");
  });

  // ❌ Test should fail - cannot get winner status before computing
  it("should fail to get winner status before computing winners", async function () {
    await contract.createLotteryRound();

    const roundId = 1;
    const ticketNumber = 42;

    const input = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(ticketNumber)
      .encrypt();

    await contract
      .connect(signers.alice)
      .purchaseTicket(roundId, input.handles[0], input.inputProof);

    await expect(
      contract.getEncryptedWinnerStatus(roundId, 0)
    ).to.be.revertedWith("Winner status not yet computed");
  });
});
