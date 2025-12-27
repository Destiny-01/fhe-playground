import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import { FHEIfThenElse, FHEIfThenElse__factory } from "../../../types";
import type { Signers } from "../types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHEIfThenElse")) as FHEIfThenElse__factory;
  const fheIfThenElse = (await factory.deploy()) as FHEIfThenElse;
  const fheIfThenElse_address = await fheIfThenElse.getAddress();

  return { fheIfThenElse, fheIfThenElse_address };
}

/**
 * This example demonstrates FHE if-then-else conditional operations with encrypted conditions.
 * It shows how to conditionally select between two encrypted values based on an encrypted boolean condition.
 */
describe("FHEIfThenElse", function () {
  let contract: FHEIfThenElse;
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
    contractAddress = deployment.fheIfThenElse_address;
    contract = deployment.fheIfThenElse;
  });

  // ✅ Test should succeed - condition is true, returns trueValue
  it("if condition then trueValue else falseValue should succeed when condition is true", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    let tx;
    const condition = true;
    const trueValue = 100;
    const falseValue = 50;

    // @dev Encrypts and sets condition with proper input proof
    const inputCondition = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).addBool(condition).encrypt();
    tx = await contract.connect(signers.alice).setCondition(inputCondition.handles[0], inputCondition.inputProof);
    await tx.wait();

    // @dev Encrypts and sets true value with proper input proof
    const inputTrueValue = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(trueValue).encrypt();
    tx = await contract.connect(signers.alice).setTrueValue(inputTrueValue.handles[0], inputTrueValue.inputProof);
    await tx.wait();

    // @dev Encrypts and sets false value with proper input proof
    const inputFalseValue = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(falseValue).encrypt();
    tx = await contract.connect(signers.alice).setFalseValue(inputFalseValue.handles[0], inputFalseValue.inputProof);
    await tx.wait();

    // @dev Performs if-then-else operation and grants decryption permission to caller
    tx = await contract.connect(bob).computeIfThenElse();
    await tx.wait();

    const encryptedResult = await contract.result();

    // @dev Decrypts the encrypted result using user decryption
    const clearResult = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      encryptedResult,
      contractAddress,
      bob,
    );

    expect(clearResult).to.equal(condition ? trueValue : falseValue);
  });

  // ✅ Test should succeed - condition is false, returns falseValue
  it("if condition then trueValue else falseValue should succeed when condition is false", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    let tx;
    const condition = false;
    const trueValue = 100;
    const falseValue = 50;

    const inputCondition = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).addBool(condition).encrypt();
    tx = await contract.connect(signers.alice).setCondition(inputCondition.handles[0], inputCondition.inputProof);
    await tx.wait();

    const inputTrueValue = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(trueValue).encrypt();
    tx = await contract.connect(signers.alice).setTrueValue(inputTrueValue.handles[0], inputTrueValue.inputProof);
    await tx.wait();

    const inputFalseValue = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(falseValue).encrypt();
    tx = await contract.connect(signers.alice).setFalseValue(inputFalseValue.handles[0], inputFalseValue.inputProof);
    await tx.wait();

    tx = await contract.connect(bob).computeIfThenElse();
    await tx.wait();

    const encryptedResult = await contract.result();
    const clearResult = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      encryptedResult,
      contractAddress,
      bob,
    );

    // @dev Should return falseValue when condition is false
    expect(clearResult).to.equal(falseValue);
  });

  // ❌ Test should fail - missing FHE permissions
  it("should fail when trying to decrypt without permissions", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const condition = true;
    const trueValue = 100;
    const falseValue = 50;

    const inputCondition = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).addBool(condition).encrypt();
    let tx = await contract.connect(signers.alice).setCondition(inputCondition.handles[0], inputCondition.inputProof);
    await tx.wait();

    const inputTrueValue = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(trueValue).encrypt();
    tx = await contract.connect(signers.alice).setTrueValue(inputTrueValue.handles[0], inputTrueValue.inputProof);
    await tx.wait();

    const inputFalseValue = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(falseValue).encrypt();
    tx = await contract.connect(signers.alice).setFalseValue(inputFalseValue.handles[0], inputFalseValue.inputProof);
    await tx.wait();

    tx = await contract.connect(bob).computeIfThenElse();
    await tx.wait();

    const encryptedResult = await contract.result();

    // @dev Alice doesn't have permissions because bob called computeIfThenElse()
    await expect(
      fhevm.userDecryptEuint(FhevmType.euint8, encryptedResult, contractAddress, signers.alice),
    ).to.be.rejected;
  });
});

