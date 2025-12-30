import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers as EthersT } from "ethers";
import { ethers, fhevm } from "hardhat";
import * as hre from "hardhat";

import { RockPaperScissors, RockPaperScissors__factory } from "../../../typechain-types";
import type { Signers } from "./types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory("RockPaperScissors")) as RockPaperScissors__factory;
  const rockPaperScissors = (await factory.deploy()) as RockPaperScissors;
  const rockPaperScissors_address = await rockPaperScissors.getAddress();

  return { rockPaperScissors, rockPaperScissors_address };
}

/**
 * This example demonstrates a commit-reveal Rock-Paper-Scissors game using encrypted choices.
 * Players commit their encrypted choices and then both choices are compared to determine the winner.
 */
describe("RockPaperScissors", function () {
  let contract: RockPaperScissors;
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
    contractAddress = deployment.rockPaperScissors_address;
    contract = deployment.rockPaperScissors;
  });

  // Helper function to decrypt euint8
  async function decryptEuint8(encrypted: any, user: HardhatEthersSigner): Promise<number> {
    return await fhevm.userDecryptEuint8(
      typeof encrypted === 'string' ? encrypted : ethers.hexlify(encrypted),
      contractAddress,
      user
    );
  }

  // ✅ Test should succeed - create a game
  it("should create a new game", async function () {
    const tx = await contract.createGame(signers.alice.address, signers.bob.address);
    const receipt = await tx.wait();

    expect(receipt).to.not.be.null;
    // Check that game was created by checking if we can access game 1
    const game = await contract.games(1);
    expect(game.player1).to.eq(signers.alice.address);
  });

  // ✅ Test should succeed - player 1 commits choice
  it("should allow player 1 to commit their choice", async function () {
    const tx = await contract.createGame(signers.alice.address, signers.bob.address);
    await tx.wait();

    const gameId = 1;
    const choice = 0; // Rock

    const input = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(choice)
      .encrypt();

    const commitTx = await contract
      .connect(signers.alice)
      .commitChoice1(gameId, input.handles[0], input.inputProof);
    await commitTx.wait();

    const player1Committed = await contract.games(gameId);
    expect(player1Committed.player1Committed).to.be.true;
  });

  // ✅ Test should succeed - player 2 commits choice
  it("should allow player 2 to commit their choice", async function () {
    const tx = await contract.createGame(signers.alice.address, signers.bob.address);
    await tx.wait();

    const gameId = 1;
    const choice1 = 0; // Rock
    const choice2 = 1; // Paper

    // Player 1 commits
    const input1 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(choice1)
      .encrypt();

    await contract
      .connect(signers.alice)
      .commitChoice1(gameId, input1.handles[0], input1.inputProof);

    // Player 2 commits
    const input2 = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add8(choice2)
      .encrypt();

    const commitTx = await contract
      .connect(signers.bob)
      .commitChoice2(gameId, input2.handles[0], input2.inputProof);
    await commitTx.wait();

    const game = await contract.games(gameId);
    expect(game.player2Committed).to.be.true;
  });

  // ✅ Test should succeed - make choices public and reveal winner
  it("should make choices public and determine winner (Rock vs Paper)", async function () {
    const tx = await contract.createGame(signers.alice.address, signers.bob.address);
    await tx.wait();

    const gameId = 1;
    const choice1 = 0; // Rock
    const choice2 = 1; // Paper (wins)

    // Player 1 commits Rock
    const input1 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(choice1)
      .encrypt();

    await contract
      .connect(signers.alice)
      .commitChoice1(gameId, input1.handles[0], input1.inputProof);

    // Player 2 commits Paper
    const input2 = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add8(choice2)
      .encrypt();

    await contract
      .connect(signers.bob)
      .commitChoice2(gameId, input2.handles[0], input2.inputProof);

    // Make choices public
    const makePublicTx = await contract.makeChoicesPublic(gameId);
    await makePublicTx.wait();

    const game = await contract.games(gameId);
    expect(game.resultComputed).to.be.true;

    // Get encrypted choices and decrypt them
    const encryptedChoice1 = await contract.getEncryptedChoice1(gameId);
    const encryptedChoice2 = await contract.getEncryptedChoice2(gameId);

    // Decrypt both choices
    const publicDecryptResults = await fhevm.publicDecrypt([
      ethers.hexlify(encryptedChoice1),
      ethers.hexlify(encryptedChoice2)
    ]);

    // Reveal and determine winner
    const revealTx = await contract.revealAndDetermineWinner(
      gameId,
      publicDecryptResults.abiEncodedClearValues,
      publicDecryptResults.decryptionProof
    );
    await revealTx.wait();

    const winner = await contract.getWinner(gameId);
    expect(winner).to.eq(signers.bob.address); // Paper beats Rock
  });

  // ✅ Test should succeed - draw scenario
  it("should result in a draw when both players choose the same", async function () {
    const tx = await contract.createGame(signers.alice.address, signers.bob.address);
    await tx.wait();

    const gameId = 1;
    const choice = 0; // Both choose Rock

    // Both players commit Rock
    const input1 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(choice)
      .encrypt();

    await contract
      .connect(signers.alice)
      .commitChoice1(gameId, input1.handles[0], input1.inputProof);

    const input2 = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add8(choice)
      .encrypt();

    await contract
      .connect(signers.bob)
      .commitChoice2(gameId, input2.handles[0], input2.inputProof);

    // Make choices public
    await contract.makeChoicesPublic(gameId);

    // Get encrypted choices and decrypt them
    const encryptedChoice1 = await contract.getEncryptedChoice1(gameId);
    const encryptedChoice2 = await contract.getEncryptedChoice2(gameId);

    const publicDecryptResults = await fhevm.publicDecrypt([
      ethers.hexlify(encryptedChoice1),
      ethers.hexlify(encryptedChoice2)
    ]);

    // Reveal and determine winner
    await contract.revealAndDetermineWinner(
      gameId,
      publicDecryptResults.abiEncodedClearValues,
      publicDecryptResults.decryptionProof
    );

    const winner = await contract.getWinner(gameId);
    expect(winner).to.eq(ethers.ZeroAddress); // Draw
  });

  // ❌ Test should fail - only player 1 can commit choice 1
  it("should fail if player 2 tries to commit choice 1", async function () {
    const tx = await contract.createGame(signers.alice.address, signers.bob.address);
    await tx.wait();

    const gameId = 1;
    const choice = 0;

    const input = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add8(choice)
      .encrypt();

    await expect(
      contract
        .connect(signers.bob)
        .commitChoice1(gameId, input.handles[0], input.inputProof)
    ).to.be.revertedWith("Only player1 can commit");
  });

  // ❌ Test should fail - cannot make choices public before both commit
  it("should fail to make choices public before both players commit", async function () {
    const tx = await contract.createGame(signers.alice.address, signers.bob.address);
    await tx.wait();

    const gameId = 1;
    const choice = 0;

    const input = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(choice)
      .encrypt();

    await contract
      .connect(signers.alice)
      .commitChoice1(gameId, input.handles[0], input.inputProof);

    await expect(
      contract.makeChoicesPublic(gameId)
    ).to.be.revertedWith("Player2 has not committed");
  });
});

