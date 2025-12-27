import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import { MissingPermissionAntiPattern, MissingPermissionAntiPattern__factory } from "../../../types";
import type { Signers } from "./types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory("MissingPermissionAntiPattern")) as MissingPermissionAntiPattern__factory;
  const missingPermissionAntiPattern = (await factory.deploy()) as MissingPermissionAntiPattern;
  const missingPermissionAntiPattern_address = await missingPermissionAntiPattern.getAddress();

  return { missingPermissionAntiPattern, missingPermissionAntiPattern_address };
}

/**
 * This example demonstrates what happens when you forget FHE.allowThis().
 * Without FHE.allowThis(), the contract cannot operate on encrypted values and users cannot decrypt them.
 */
describe("MissingPermissionAntiPattern", function () {
  let contract: MissingPermissionAntiPattern;
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
    contractAddress = deployment.missingPermissionAntiPattern_address;
    contract = deployment.missingPermissionAntiPattern;
  });

  // ✅ Test should succeed - correct pattern with FHE.allowThis()
  it("should succeed when FHE.allowThis() is called", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value = 42;

    // Set value with proper permissions (correct pattern)
    const inputValue = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(value).encrypt();
    let tx = await contract.connect(signers.alice).setValue(inputValue.handles[0], inputValue.inputProof);
    await tx.wait();

    const encryptedValue = await contract.connect(signers.alice).getValue();

    // Decryption should succeed because FHE.allowThis() was called
    const clearValue = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      typeof encryptedValue === 'string' ? encryptedValue : ethers.hexlify(encryptedValue),
      contractAddress,
      signers.alice,
    );

    expect(clearValue).to.equal(value);
  });

  // ❌ Test should fail - missing FHE.allowThis()
  it("should fail to decrypt when FHE.allowThis() is missing", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value = 100;

    // Set value without FHE.allowThis() (anti-pattern)
    const inputValue = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(value).encrypt();
    let tx = await contract.connect(signers.alice).setValueWrong(inputValue.handles[0], inputValue.inputProof);
    await tx.wait();

    const encryptedValue = await contract.connect(signers.alice).getWrongValue();

    // Decryption should fail because FHE.allowThis() was not called
    await expect(
      fhevm.userDecryptEuint(FhevmType.euint8, encryptedValue, contractAddress, signers.alice),
    ).to.be.rejected;
  });
});

