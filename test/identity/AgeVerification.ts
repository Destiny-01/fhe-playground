import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import { AgeVerification, AgeVerification__factory } from "../../../types";
import type { Signers } from "./types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory("AgeVerification")) as AgeVerification__factory;
  const minimumAge = 18;
  const ageVerification = (await factory.deploy(minimumAge)) as AgeVerification;
  const ageVerification_address = await ageVerification.getAddress();

  return { ageVerification, ageVerification_address, minimumAge };
}

/**
 * This example demonstrates age verification without revealing the actual age.
 * Users can prove they meet a minimum age threshold while keeping their exact age private.
 */
describe("AgeVerification", function () {
  let contract: AgeVerification;
  let contractAddress: string;
  let signers: Signers;
  let minimumAge: number;
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
    contractAddress = deployment.ageVerification_address;
    contract = deployment.ageVerification;
    minimumAge = deployment.minimumAge;
  });

  // Helper function to decrypt ebool
  async function decryptEbool(encrypted: any, user: HardhatEthersSigner): Promise<boolean> {
    return await fhevm.userDecryptEbool(
      typeof encrypted === 'string' ? encrypted : ethers.hexlify(encrypted),
      contractAddress,
      user
    );
  }

  // ✅ Test should succeed - user above minimum age
  it("should verify user above minimum age", async function () {

    const userAge = 25; // Above minimum age of 18

    const input = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(userAge)
      .encrypt();

    let tx = await contract
      .connect(signers.alice)
      .registerAge(input.handles[0], input.inputProof);
    await tx.wait();

    const encryptedResult = await contract.verifyAge(signers.alice.address);
    const isEligible = await decryptEbool(encryptedResult, signers.alice);
    expect(isEligible).to.be.true;
  });

  // ❌ Test should fail - user below minimum age
  it("should reject user below minimum age", async function () {

    const userAge = 16; // Below minimum age of 18

    const input = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add8(userAge)
      .encrypt();

    let tx = await contract
      .connect(signers.bob)
      .registerAge(input.handles[0], input.inputProof);
    await tx.wait();

    const encryptedResult = await contract.verifyAge(signers.bob.address);
    const isEligible = await decryptEbool(encryptedResult, signers.bob);
    expect(isEligible).to.be.false;
  });

  // ✅ Test should succeed - user exactly at minimum age
  it("should verify user exactly at minimum age", async function () {

    const userAge = minimumAge; // Exactly at minimum age

    const input = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(userAge)
      .encrypt();

    let tx = await contract
      .connect(signers.alice)
      .registerAge(input.handles[0], input.inputProof);
    await tx.wait();

    const encryptedResult = await contract.verifyAge(signers.alice.address);
    const isEligible = await decryptEbool(encryptedResult, signers.alice);
    expect(isEligible).to.be.true;
  });

  // ✅ Test should succeed - multiple users with different ages
  it("should handle multiple users with different ages", async function () {

    // Alice is 30 (above threshold)
    const aliceAge = 30;
    const aliceInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(aliceAge)
      .encrypt();
    let tx = await contract
      .connect(signers.alice)
      .registerAge(aliceInput.handles[0], aliceInput.inputProof);
    await tx.wait();

    // Bob is 15 (below threshold)
    const bobAge = 15;
    const bobInput = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add8(bobAge)
      .encrypt();
    tx = await contract
      .connect(signers.bob)
      .registerAge(bobInput.handles[0], bobInput.inputProof);
    await tx.wait();

    const aliceEncrypted = await contract.verifyAge(signers.alice.address);
    const bobEncrypted = await contract.verifyAge(signers.bob.address);
    
    const aliceEligible = await decryptEbool(aliceEncrypted, signers.alice);
    const bobEligible = await decryptEbool(bobEncrypted, signers.bob);

    expect(aliceEligible).to.be.true;
    expect(bobEligible).to.be.false;
  });
});

