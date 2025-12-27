import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import { FHESelect, FHESelect__factory } from "../../../types";
import type { Signers } from "../types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHESelect")) as FHESelect__factory;
  const fheSelect = (await factory.deploy()) as FHESelect;
  const fheSelect_address = await fheSelect.getAddress();

  return { fheSelect, fheSelect_address };
}

/**
 * This example demonstrates FHE conditional selection (ternary) operations on encrypted values.
 * It shows how to conditionally select between two encrypted values based on an encrypted boolean condition.
 */
describe("FHESelect", function () {
  let contract: FHESelect;
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
    contractAddress = deployment.fheSelect_address;
    contract = deployment.fheSelect;
  });

  // ✅ Test should succeed - condition is true, selects a
  it("condition ? a : b should succeed when condition is true (selects a)", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    let tx;
    const condition = true;
    const a = 100;
    const b = 50;

    // @dev Encrypts and sets all values with proper input proofs
    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    const inputCondition = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).addBool(condition).encrypt();
    tx = await contract.connect(signers.alice).setCondition(inputCondition.handles[0], inputCondition.inputProof);
    await tx.wait();

    // @dev Performs conditional selection and grants decryption permission to caller
    tx = await contract.connect(bob).computeSelect();
    await tx.wait();

    const encryptedResult = await contract.result();

    // @dev Decrypts the encrypted result using user decryption
    const clearResult = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      encryptedResult,
      contractAddress,
      bob,
    );

    expect(clearResult).to.equal(condition ? a : b);
  });

  // ✅ Test should succeed - condition is false, selects b
  it("condition ? a : b should succeed when condition is false (selects b)", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    let tx;
    const condition = false;
    const a = 100;
    const b = 50;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    const inputCondition = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).addBool(condition).encrypt();
    tx = await contract.connect(signers.alice).setCondition(inputCondition.handles[0], inputCondition.inputProof);
    await tx.wait();

    tx = await contract.connect(bob).computeSelect();
    await tx.wait();

    const encryptedResult = await contract.result();
    const clearResult = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      encryptedResult,
      contractAddress,
      bob,
    );

    // @dev Should return b when condition is false
    expect(clearResult).to.equal(b);
  });

  // ❌ Test should fail - missing FHE permissions
  it("should fail when trying to decrypt without permissions", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const condition = true;
    const a = 100;
    const b = 50;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    let tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    const inputCondition = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).addBool(condition).encrypt();
    tx = await contract.connect(signers.alice).setCondition(inputCondition.handles[0], inputCondition.inputProof);
    await tx.wait();

    tx = await contract.connect(bob).computeSelect();
    await tx.wait();

    const encryptedResult = await contract.result();

    // @dev Alice doesn't have permissions because bob called computeSelect()
    await expect(
      fhevm.userDecryptEuint(FhevmType.euint8, encryptedResult, contractAddress, signers.alice),
    ).to.be.rejected;
  });
});

