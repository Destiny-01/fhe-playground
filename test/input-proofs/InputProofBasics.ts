import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import { InputProofBasics, InputProofBasics__factory } from "../../../types";
import type { Signers } from "./types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory("InputProofBasics")) as InputProofBasics__factory;
  const inputProofBasics = (await factory.deploy()) as InputProofBasics;
  const inputProofBasics_address = await inputProofBasics.getAddress();

  return { inputProofBasics, inputProofBasics_address };
}

/**
 * This example demonstrates input proof basics in FHEVM.
 * Input proofs are zero-knowledge proofs that verify encrypted inputs are cryptographically bound to a specific contract and user pair.
 */
describe("InputProofBasics", function () {
  let contract: InputProofBasics;
  let contractAddress: string;
  let signers: Signers;

  before(async function () {
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { owner: ethSigners[0], alice: ethSigners[1] };
  });

  beforeEach(async function () {
    const deployment = await deployFixture();
    contractAddress = deployment.inputProofBasics_address;
    contract = deployment.inputProofBasics;
  });

  // ✅ Test should succeed - using valid input proof
  it("should succeed when using valid input proof", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value = 42;

    // Create encrypted input with proper proof bound to contract and user
    const input = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(value).encrypt();

    let tx = await contract.connect(signers.alice).setValue(input.handles[0], input.inputProof);
    await tx.wait();

    const encryptedValue = await contract.connect(signers.alice).getValue();

    const clearValue = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      typeof encryptedValue === 'string' ? encryptedValue : ethers.hexlify(encryptedValue),
      contractAddress,
      signers.alice,
    );

    expect(clearValue).to.equal(value);
  });

  // ✅ Test should succeed - using input proof with operations
  it("should succeed when using input proof with FHE operations", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value1 = 10;
    const value2 = 20;

    // Add first value
    const input1 = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(value1).encrypt();
    let tx = await contract.connect(signers.alice).addValue(input1.handles[0], input1.inputProof);
    await tx.wait();

    // Add second value
    const input2 = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(value2).encrypt();
    tx = await contract.connect(signers.alice).addValue(input2.handles[0], input2.inputProof);
    await tx.wait();

    const encryptedSum = await contract.connect(signers.alice).getSum();

    const clearSum = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      typeof encryptedSum === 'string' ? encryptedSum : ethers.hexlify(encryptedSum),
      contractAddress,
      signers.alice,
    );

    expect(clearSum).to.equal(value1 + value2);
  });

  // ❌ Test should fail - invalid input proof
  it("should fail when using invalid input proof", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value = 100;

    // Create encrypted input
    const input = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(value).encrypt();

    // Try to use wrong proof (empty or malformed)
    const invalidProof = "0x";

    // This should revert because the proof is invalid
    await expect(
      contract.connect(signers.alice).setValue(input.handles[0], invalidProof),
    ).to.be.reverted;
  });
});

