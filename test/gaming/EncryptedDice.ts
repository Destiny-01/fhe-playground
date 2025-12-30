import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers as EthersT } from "ethers";
import { ethers, fhevm } from "hardhat";
import * as hre from "hardhat";

import { EncryptedDice, EncryptedDice__factory } from "../../../typechain-types";
import type { Signers } from "./types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory("EncryptedDice")) as EncryptedDice__factory;
  const encryptedDice = (await factory.deploy()) as EncryptedDice;
  const encryptedDice_address = await encryptedDice.getAddress();

  return { encryptedDice, encryptedDice_address };
}

/**
 * This example demonstrates provably fair dice rolling using encrypted random numbers.
 * The contract generates encrypted random values that can be publicly decrypted.
 */
describe("EncryptedDice", function () {
  let contract: EncryptedDice;
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
    contractAddress = deployment.encryptedDice_address;
    contract = deployment.encryptedDice;
  });

  // ✅ Test should succeed - roll dice
  it("should allow a user to roll dice", async function () {
    const tx = await contract.connect(signers.alice).rollDice();
    const receipt = await tx.wait();

    expect(receipt).to.not.be.null;
    const diceId = 1;
    const diceRoll = await contract.diceRolls(diceId);
    expect(diceRoll.roller).to.eq(signers.alice.address);
  });

  // ✅ Test should succeed - get dice roll count
  it("should return the correct dice roll count", async function () {
    await contract.connect(signers.alice).rollDice();
    await contract.connect(signers.bob).rollDice();
    await contract.connect(signers.alice).rollDice();

    const count = await contract.getDiceRollsCount();
    expect(count).to.eq(3);
  });

  // ✅ Test should succeed - reveal dice result
  it("should allow revealing the dice result", async function () {
    const tx = await contract.connect(signers.alice).rollDice();
    await tx.wait();

    const diceId = 1;
    const diceRoll = await contract.diceRolls(diceId);
    expect(diceRoll.revealed).to.be.false;

    // Get encrypted result and decrypt it
    const encryptedResult = await contract.getEncryptedResult(diceId);

    // Decrypt the result
    const publicDecryptResults = await fhevm.publicDecrypt([
      ethers.hexlify(encryptedResult)
    ]);

    // Reveal the result
    const revealTx = await contract.revealResult(
      diceId,
      publicDecryptResults.abiEncodedClearValues,
      publicDecryptResults.decryptionProof
    );
    await revealTx.wait();

    const revealedDiceRoll = await contract.diceRolls(diceId);
    expect(revealedDiceRoll.revealed).to.be.true;
    expect(revealedDiceRoll.result).to.be.at.least(1);
    expect(revealedDiceRoll.result).to.be.at.most(6);
  });

  // ✅ Test should succeed - dice result is in valid range (1-6)
  it("should constrain dice result to 1-6 range", async function () {
    const tx = await contract.connect(signers.alice).rollDice();
    await tx.wait();

    const diceId = 1;
    const encryptedResult = await contract.getEncryptedResult(diceId);

    // Decrypt the result
    const publicDecryptResults = await fhevm.publicDecrypt([
      ethers.hexlify(encryptedResult)
    ]);

    // Reveal the result
    await contract.revealResult(
      diceId,
      publicDecryptResults.abiEncodedClearValues,
      publicDecryptResults.decryptionProof
    );

    const result = await contract.getResult(diceId);
    expect(result).to.be.at.least(1);
    expect(result).to.be.at.most(6);
  });

  // ✅ Test should succeed - multiple dice rolls
  it("should handle multiple dice rolls from different users", async function () {
    await contract.connect(signers.alice).rollDice();
    await contract.connect(signers.bob).rollDice();
    await contract.connect(signers.alice).rollDice();

    const dice1 = await contract.diceRolls(1);
    const dice2 = await contract.diceRolls(2);
    const dice3 = await contract.diceRolls(3);

    expect(dice1.roller).to.eq(signers.alice.address);
    expect(dice2.roller).to.eq(signers.bob.address);
    expect(dice3.roller).to.eq(signers.alice.address);
  });

  // ❌ Test should fail - cannot reveal result twice
  it("should fail if trying to reveal result twice", async function () {
    const tx = await contract.connect(signers.alice).rollDice();
    await tx.wait();

    const diceId = 1;
    const encryptedResult = await contract.getEncryptedResult(diceId);

    const publicDecryptResults = await fhevm.publicDecrypt([
      ethers.hexlify(encryptedResult)
    ]);

    // First reveal should succeed
    await contract.revealResult(
      diceId,
      publicDecryptResults.abiEncodedClearValues,
      publicDecryptResults.decryptionProof
    );

    // Second reveal should fail
    await expect(
      contract.revealResult(
        diceId,
        publicDecryptResults.abiEncodedClearValues,
        publicDecryptResults.decryptionProof
      )
    ).to.be.revertedWith("Dice result already revealed");
  });

  // ❌ Test should fail - cannot get result before revealing
  it("should fail to get result before revealing", async function () {
    const tx = await contract.connect(signers.alice).rollDice();
    await tx.wait();

    const diceId = 1;

    await expect(
      contract.getResult(diceId)
    ).to.be.revertedWith("Dice result not yet revealed");
  });
});

