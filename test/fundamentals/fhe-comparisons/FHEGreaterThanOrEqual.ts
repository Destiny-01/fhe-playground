import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import { FHEGreaterThanOrEqual, FHEGreaterThanOrEqual__factory } from "../../../types";
import type { Signers } from "../types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHEGreaterThanOrEqual")) as FHEGreaterThanOrEqual__factory;
  const fheGreaterThanOrEqual = (await factory.deploy()) as FHEGreaterThanOrEqual;
  const fheGreaterThanOrEqual_address = await fheGreaterThanOrEqual.getAddress();

  return { fheGreaterThanOrEqual, fheGreaterThanOrEqual_address };
}

/**
 * This example demonstrates FHE greater-than-or-equal comparison operations on encrypted values.
 * It shows how to compare two encrypted values and highlights common pitfalls.
 */
describe("FHEGreaterThanOrEqual", function () {
  let contract: FHEGreaterThanOrEqual;
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
    contractAddress = deployment.fheGreaterThanOrEqual_address;
    contract = deployment.fheGreaterThanOrEqual;
  });

  // ✅ Test should succeed - a >= b is true (greater)
  it("a >= b should succeed when a is greater", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    let tx;
    const a = 100;
    const b = 50;

    // @dev Encrypts and sets both values with proper input proofs
    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    // @dev Performs greater-than-or-equal comparison and grants decryption permission to caller
    tx = await contract.connect(bob).computeAGreaterThanOrEqualB();
    await tx.wait();

    const encryptedResult = await contract.result();

    // @dev Decrypts the encrypted boolean result using user decryption
    const clearResult = await fhevm.userDecryptEbool(
      encryptedResult,
      contractAddress,
      bob,
    );

    expect(clearResult).to.equal(a >= b);
  });

  // ✅ Test should succeed - a >= b is true (equal)
  it("a >= b should succeed when values are equal", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    let tx;
    const a = 42;
    const b = 42;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    tx = await contract.connect(bob).computeAGreaterThanOrEqualB();
    await tx.wait();

    const encryptedResult = await contract.result();
    const clearResult = await fhevm.userDecryptEbool(
      encryptedResult,
      contractAddress,
      bob,
    );

    // @dev Should return true when values are equal
    expect(clearResult).to.equal(true);
  });

  // ✅ Test should succeed - a >= b is false
  it("a >= b should succeed when a is less", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    let tx;
    const a = 30;
    const b = 80;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    tx = await contract.connect(bob).computeAGreaterThanOrEqualB();
    await tx.wait();

    const encryptedResult = await contract.result();
    const clearResult = await fhevm.userDecryptEbool(
      encryptedResult,
      contractAddress,
      bob,
    );

    // @dev Should return false when a is less than b
    expect(clearResult).to.equal(false);
  });

  // ❌ Test should fail - missing FHE permissions
  it("should fail when trying to decrypt without permissions", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const a = 100;
    const b = 50;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    let tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    tx = await contract.connect(bob).computeAGreaterThanOrEqualB();
    await tx.wait();

    const encryptedResult = await contract.result();

    // @dev Alice doesn't have permissions because bob called computeAGreaterThanOrEqualB()
    await expect(
      fhevm.userDecryptEbool(encryptedResult, contractAddress, signers.alice),
    ).to.be.rejected;
  });
});

