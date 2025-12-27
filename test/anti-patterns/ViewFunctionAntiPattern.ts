import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import { ViewFunctionAntiPattern, ViewFunctionAntiPattern__factory } from "../../../types";
import type { Signers } from "./types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory("ViewFunctionAntiPattern")) as ViewFunctionAntiPattern__factory;
  const viewFunctionAntiPattern = (await factory.deploy()) as ViewFunctionAntiPattern;
  const viewFunctionAntiPattern_address = await viewFunctionAntiPattern.getAddress();

  return { viewFunctionAntiPattern, viewFunctionAntiPattern_address };
}

/**
 * This example demonstrates why FHE operations cannot be performed in view functions.
 * View functions can return encrypted values, but cannot perform FHE computations like FHE.add, FHE.select, etc.
 */
describe("ViewFunctionAntiPattern", function () {
  let contract: ViewFunctionAntiPattern;
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
    contractAddress = deployment.viewFunctionAntiPattern_address;
    contract = deployment.viewFunctionAntiPattern;
  });

  // ✅ Test should succeed - performing FHE operation in non-view function
  it("should succeed when performing FHE operations in non-view function", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const valueA = 10;
    const valueB = 20;

    // Set value A
    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(valueA).encrypt();
    let tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    // Set value B
    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(valueB).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    // Perform FHE operation in non-view function (correct pattern)
    tx = await contract.connect(signers.alice).computeSum();
    await tx.wait();

    // Get result using view function (this works - just returning stored value)
    const encryptedSum = await contract.connect(signers.alice).getSum();

    // Decrypt the result
    const clearSum = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      encryptedSum,
      contractAddress,
      signers.alice,
    );

    expect(clearSum).to.equal(valueA + valueB);
  });

  // ✅ Test should succeed - view function can return encrypted values
  it("should succeed when view function returns stored encrypted value", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const valueA = 42;
    const valueB = 58;

    // Set values
    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(valueA).encrypt();
    let tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(valueB).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    // View functions CAN return encrypted values (they just can't compute them)
    const encryptedA = await contract.connect(signers.alice).getA();
    const encryptedB = await contract.connect(signers.alice).getB();

    const clearA = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      encryptedA,
      contractAddress,
      signers.alice,
    );

    const clearB = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      encryptedB,
      contractAddress,
      signers.alice,
    );

    expect(clearA).to.equal(valueA);
    expect(clearB).to.equal(valueB);
  });
});

