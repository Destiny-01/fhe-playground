import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import { CreditScoreCheck, CreditScoreCheck__factory } from "../../../types";
import type { Signers } from "./types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory("CreditScoreCheck")) as CreditScoreCheck__factory;
  const creditScoreCheck = (await factory.deploy()) as CreditScoreCheck;
  const creditScoreCheck_address = await creditScoreCheck.getAddress();

  return { creditScoreCheck, creditScoreCheck_address };
}

/**
 * This example demonstrates credit score verification without revealing the actual score.
 * Users can prove they meet credit score thresholds for different tiers without exposing their exact score.
 */
describe("CreditScoreCheck", function () {
  let contract: CreditScoreCheck;
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
    contractAddress = deployment.creditScoreCheck_address;
    contract = deployment.creditScoreCheck;
  });

  // Helper function to decrypt ebool
  async function decryptEbool(encrypted: any, user: HardhatEthersSigner): Promise<boolean> {
    return await fhevm.userDecryptEbool(
      typeof encrypted === 'string' ? encrypted : ethers.hexlify(encrypted),
      contractAddress,
      user
    );
  }

  // ✅ Test should succeed - excellent credit score
  it("should qualify user with excellent credit score", async function () {

    const creditScore = 780; // Above excellent threshold of 750

    const input = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add16(creditScore)
      .encrypt();

    let tx = await contract
      .connect(signers.alice)
      .registerCreditScore(input.handles[0], input.inputProof);
    await tx.wait();

    const excellent = await contract.qualifiesForExcellent(signers.alice.address);
    const good = await contract.qualifiesForGood(signers.alice.address);
    const fair = await contract.qualifiesForFair(signers.alice.address);
    const minimum = await contract.meetsMinimumRequirement(signers.alice.address);
    
    const excellentResult = await fhevm.userDecryptEbool(
      typeof excellent === 'string' ? excellent : ethers.hexlify(excellent),
      contractAddress,
      signers.alice
    );
    const goodResult = await fhevm.userDecryptEbool(
      typeof good === 'string' ? good : ethers.hexlify(good),
      contractAddress,
      signers.alice
    );
    const fairResult = await fhevm.userDecryptEbool(
      typeof fair === 'string' ? fair : ethers.hexlify(fair),
      contractAddress,
      signers.alice
    );
    const minimumResult = await fhevm.userDecryptEbool(
      typeof minimum === 'string' ? minimum : ethers.hexlify(minimum),
      contractAddress,
      signers.alice
    );
    
    expect(excellentResult).to.be.true;
    expect(goodResult).to.be.true;
    expect(fairResult).to.be.true;
    expect(minimumResult).to.be.true;
  });

  // ✅ Test should succeed - good credit score
  it("should qualify user with good credit score", async function () {
    const creditScore = 720; // Above good threshold of 700, below excellent

    const input = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add16(creditScore)
      .encrypt();

    let tx = await contract
      .connect(signers.alice)
      .registerCreditScore(input.handles[0], input.inputProof);
    await tx.wait();

    const excellent = await contract.qualifiesForExcellent(signers.alice.address);
    const good = await contract.qualifiesForGood(signers.alice.address);
    const fair = await contract.qualifiesForFair(signers.alice.address);
    const minimum = await contract.meetsMinimumRequirement(signers.alice.address);

    expect(await decryptEbool(excellent, signers.alice)).to.be.false;
    expect(await decryptEbool(good, signers.alice)).to.be.true;
    expect(await decryptEbool(fair, signers.alice)).to.be.true;
    expect(await decryptEbool(minimum, signers.alice)).to.be.true;
  });

  // ✅ Test should succeed - fair credit score
  it("should qualify user with fair credit score", async function () {
    const creditScore = 670; // Above fair threshold of 650, below good

    const input = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add16(creditScore)
      .encrypt();

    let tx = await contract
      .connect(signers.alice)
      .registerCreditScore(input.handles[0], input.inputProof);
    await tx.wait();

    const excellent = await contract.qualifiesForExcellent(signers.alice.address);
    const good = await contract.qualifiesForGood(signers.alice.address);
    const fair = await contract.qualifiesForFair(signers.alice.address);
    const minimum = await contract.meetsMinimumRequirement(signers.alice.address);

    expect(await decryptEbool(excellent, signers.alice)).to.be.false;
    expect(await decryptEbool(good, signers.alice)).to.be.false;
    expect(await decryptEbool(fair, signers.alice)).to.be.true;
    expect(await decryptEbool(minimum, signers.alice)).to.be.true;
  });

  // ❌ Test should fail - below minimum credit score
  it("should reject user below minimum credit score", async function () {
    const creditScore = 580; // Below minimum threshold of 600

    const input = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add16(creditScore)
      .encrypt();

    let tx = await contract
      .connect(signers.bob)
      .registerCreditScore(input.handles[0], input.inputProof);
    await tx.wait();

    const excellent = await contract.qualifiesForExcellent(signers.bob.address);
    const good = await contract.qualifiesForGood(signers.bob.address);
    const fair = await contract.qualifiesForFair(signers.bob.address);
    const minimum = await contract.meetsMinimumRequirement(signers.bob.address);

    expect(await decryptEbool(excellent, signers.bob)).to.be.false;
    expect(await decryptEbool(good, signers.bob)).to.be.false;
    expect(await decryptEbool(fair, signers.bob)).to.be.false;
    expect(await decryptEbool(minimum, signers.bob)).to.be.false;
  });

  // ✅ Test should succeed - multiple users with different scores
  it("should handle multiple users with different credit scores", async function () {
    // Alice has excellent credit
    const aliceScore = 800;
    const aliceInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add16(aliceScore)
      .encrypt();
    let tx = await contract
      .connect(signers.alice)
      .registerCreditScore(aliceInput.handles[0], aliceInput.inputProof);
    await tx.wait();

    // Bob has poor credit
    const bobScore = 550;
    const bobInput = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add16(bobScore)
      .encrypt();
    tx = await contract
      .connect(signers.bob)
      .registerCreditScore(bobInput.handles[0], bobInput.inputProof);
    await tx.wait();

    const aliceExcellent = await contract.qualifiesForExcellent(signers.alice.address);
    const bobMinimum = await contract.meetsMinimumRequirement(signers.bob.address);

    expect(await decryptEbool(aliceExcellent, signers.alice)).to.be.true;
    expect(await decryptEbool(bobMinimum, signers.bob)).to.be.false;
  });
});

