import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import { FHEAnd, FHEAnd__factory } from "../../../types";
import type { Signers } from "../types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHEAnd")) as FHEAnd__factory;
  const fheAnd = (await factory.deploy()) as FHEAnd;
  const fheAnd_address = await fheAnd.getAddress();

  return { fheAnd, fheAnd_address };
}

/**
 * This example demonstrates FHE AND boolean logic operations on encrypted boolean values.
 * It shows how to perform AND operations and highlights common pitfalls.
 */
describe("FHEAnd", function () {
  let contract: FHEAnd;
  let contractAddress: string;
  let signers: Signers;
  let bob: HardhatEthersSigner;

  before(async function () {
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { owner: ethSigners[0], alice: ethSigners[1] };
    bob = ethSigners[2];
  });

  beforeEach(async function () {
    const deployment = await deployFixture();
    contractAddress = deployment.fheAnd_address;
    contract = deployment.fheAnd;
  });

  // ✅ Test should succeed - true AND true = true
  it("a && b should succeed when both are true", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    let tx;
    const a = true;
    const b = true;

    // @dev Encrypts and sets both boolean values with proper input proofs
    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).addBool(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).addBool(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    // @dev Performs AND operation and grants decryption permission to caller
    tx = await contract.connect(bob).computeAAndB();
    await tx.wait();

    const encryptedResult = await contract.result();

    // @dev Decrypts the encrypted boolean result using user decryption
    const clearResult = await fhevm.userDecryptEbool(
      encryptedResult,
      contractAddress,
      bob,
    );

    expect(clearResult).to.equal(a && b);
  });

  // ✅ Test should succeed - true AND false = false
  it("a && b should succeed when one is false", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    let tx;
    const a = true;
    const b = false;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).addBool(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).addBool(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    tx = await contract.connect(bob).computeAAndB();
    await tx.wait();

    const encryptedResult = await contract.result();
    const clearResult = await fhevm.userDecryptEbool(
      encryptedResult,
      contractAddress,
      bob,
    );

    // @dev Should return false when one operand is false
    expect(clearResult).to.equal(false);
  });

  // ✅ Test should succeed - false AND false = false
  it("a && b should succeed when both are false", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    let tx;
    const a = false;
    const b = false;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).addBool(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).addBool(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    tx = await contract.connect(bob).computeAAndB();
    await tx.wait();

    const encryptedResult = await contract.result();
    const clearResult = await fhevm.userDecryptEbool(
      encryptedResult,
      contractAddress,
      bob,
    );

    // @dev Should return false when both operands are false
    expect(clearResult).to.equal(false);
  });

  // ❌ Test should fail - missing FHE permissions
  it("should fail when trying to decrypt without permissions", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const a = true;
    const b = true;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).addBool(a).encrypt();
    let tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).addBool(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    tx = await contract.connect(bob).computeAAndB();
    await tx.wait();

    const encryptedResult = await contract.result();

    // @dev Alice doesn't have permissions because bob called computeAAndB()
    await expect(
      fhevm.userDecryptEbool(encryptedResult, contractAddress, signers.alice),
    ).to.be.rejected;
  });
});

