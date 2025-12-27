import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import { EncryptedKYC, EncryptedKYC__factory } from "../../../types";
import type { Signers } from "./types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory("EncryptedKYC")) as EncryptedKYC__factory;
  const encryptedKYC = (await factory.deploy()) as EncryptedKYC;
  const encryptedKYC_address = await encryptedKYC.getAddress();

  return { encryptedKYC, encryptedKYC_address };
}

/**
 * This example demonstrates KYC identity verification with selective disclosure.
 * Users can prove they meet specific requirements without revealing all their information.
 */
describe("EncryptedKYC", function () {
  let contract: EncryptedKYC;
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
    contractAddress = deployment.encryptedKYC_address;
    contract = deployment.encryptedKYC;
  });

  // Helper function to decrypt ebool
  async function decryptEbool(encrypted: any, user: HardhatEthersSigner): Promise<boolean> {
    return await fhevm.userDecryptEbool(
      typeof encrypted === 'string' ? encrypted : ethers.hexlify(encrypted),
      contractAddress,
      user
    );
  }

  // ✅ Test should succeed - user meets all requirements
  it("should verify user meets all KYC requirements", async function () {

    const age = 25; // Above minimum of 18
    const residencyStatus = 1; // Resident
    const accountBalance = 50000; // Above minimum of 10000

    const ageInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(age)
      .encrypt();
    const residencyInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(residencyStatus)
      .encrypt();
    const balanceInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(accountBalance)
      .encrypt();

    let tx = await contract
      .connect(signers.alice)
      .registerKYCData(
        ageInput.handles[0],
        ageInput.inputProof,
        residencyInput.handles[0],
        residencyInput.inputProof,
        balanceInput.handles[0],
        balanceInput.inputProof
      );
    await tx.wait();

    // Verify individual requirements
    const ageResult = await contract.meetsAgeRequirement(signers.alice.address);
    const residencyResult = await contract.isResident(signers.alice.address);
    const balanceResult = await contract.meetsBalanceRequirement(signers.alice.address);

    expect(await decryptEbool(ageResult, signers.alice)).to.be.true;
    expect(await decryptEbool(residencyResult, signers.alice)).to.be.true;
    expect(await decryptEbool(balanceResult, signers.alice)).to.be.true;

    // Verify KYC and mark as verified
    tx = await contract.connect(signers.owner).verifyKYC(signers.alice.address);
    await tx.wait();

    expect(await contract.isVerified(signers.alice.address)).to.be.true;
  });

  // ❌ Test should fail - user below minimum age
  it("should reject user below minimum age", async function () {

    const age = 16; // Below minimum of 18
    const residencyStatus = 1;
    const accountBalance = 50000;

    const ageInput = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add8(age)
      .encrypt();
    const residencyInput = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add8(residencyStatus)
      .encrypt();
    const balanceInput = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add32(accountBalance)
      .encrypt();

    let tx = await contract
      .connect(signers.bob)
      .registerKYCData(
        ageInput.handles[0],
        ageInput.inputProof,
        residencyInput.handles[0],
        residencyInput.inputProof,
        balanceInput.handles[0],
        balanceInput.inputProof
      );
    await tx.wait();

    const ageResult = await contract.meetsAgeRequirement(signers.bob.address);
    const residencyResult = await contract.isResident(signers.bob.address);
    const balanceResult = await contract.meetsBalanceRequirement(signers.bob.address);

    expect(await decryptEbool(ageResult, signers.bob)).to.be.false;
    expect(await decryptEbool(residencyResult, signers.bob)).to.be.true;
    expect(await decryptEbool(balanceResult, signers.bob)).to.be.true;
  });

  // ❌ Test should fail - user is not a resident
  it("should reject non-resident user", async function () {

    const age = 25;
    const residencyStatus = 0; // Non-resident
    const accountBalance = 50000;

    const ageInput = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add8(age)
      .encrypt();
    const residencyInput = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add8(residencyStatus)
      .encrypt();
    const balanceInput = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add32(accountBalance)
      .encrypt();

    let tx = await contract
      .connect(signers.bob)
      .registerKYCData(
        ageInput.handles[0],
        ageInput.inputProof,
        residencyInput.handles[0],
        residencyInput.inputProof,
        balanceInput.handles[0],
        balanceInput.inputProof
      );
    await tx.wait();

    const ageResult = await contract.meetsAgeRequirement(signers.bob.address);
    const residencyResult = await contract.isResident(signers.bob.address);
    const balanceResult = await contract.meetsBalanceRequirement(signers.bob.address);

    expect(await decryptEbool(ageResult, signers.bob)).to.be.true;
    expect(await decryptEbool(residencyResult, signers.bob)).to.be.false;
    expect(await decryptEbool(balanceResult, signers.bob)).to.be.true;
  });

  // ❌ Test should fail - user below minimum balance
  it("should reject user below minimum balance", async function () {

    const age = 25;
    const residencyStatus = 1;
    const accountBalance = 5000; // Below minimum of 10000

    const ageInput = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add8(age)
      .encrypt();
    const residencyInput = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add8(residencyStatus)
      .encrypt();
    const balanceInput = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add32(accountBalance)
      .encrypt();

    let tx = await contract
      .connect(signers.bob)
      .registerKYCData(
        ageInput.handles[0],
        ageInput.inputProof,
        residencyInput.handles[0],
        residencyInput.inputProof,
        balanceInput.handles[0],
        balanceInput.inputProof
      );
    await tx.wait();

    const ageResult = await contract.meetsAgeRequirement(signers.bob.address);
    const residencyResult = await contract.isResident(signers.bob.address);
    const balanceResult = await contract.meetsBalanceRequirement(signers.bob.address);

    expect(await decryptEbool(ageResult, signers.bob)).to.be.true;
    expect(await decryptEbool(residencyResult, signers.bob)).to.be.true;
    expect(await decryptEbool(balanceResult, signers.bob)).to.be.false;
  });

  // ✅ Test should succeed - selective disclosure of requirements
  it("should allow selective disclosure of requirements", async function () {

    const age = 30;
    const residencyStatus = 1;
    const accountBalance = 20000;

    const ageInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(age)
      .encrypt();
    const residencyInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(residencyStatus)
      .encrypt();
    const balanceInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(accountBalance)
      .encrypt();

    let tx = await contract
      .connect(signers.alice)
      .registerKYCData(
        ageInput.handles[0],
        ageInput.inputProof,
        residencyInput.handles[0],
        residencyInput.inputProof,
        balanceInput.handles[0],
        balanceInput.inputProof
      );
    await tx.wait();

    // Can check individual requirements without revealing all data
    const ageResult = await contract.meetsAgeRequirement(signers.alice.address);
    const residencyResult = await contract.isResident(signers.alice.address);
    const balanceResult = await contract.meetsBalanceRequirement(signers.alice.address);

    expect(await decryptEbool(ageResult, signers.alice)).to.be.true;
    expect(await decryptEbool(residencyResult, signers.alice)).to.be.true;
    expect(await decryptEbool(balanceResult, signers.alice)).to.be.true;

    // Before verification, not verified
    expect(await contract.isVerified(signers.alice.address)).to.be.false;

    // After verification, verified
    tx = await contract.connect(signers.owner).verifyKYC(signers.alice.address);
    await tx.wait();
    expect(await contract.isVerified(signers.alice.address)).to.be.true;
  });
});

