import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import { IncorrectReencryption, IncorrectReencryption__factory } from "../../../types";
import type { Signers } from "./types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory("IncorrectReencryption")) as IncorrectReencryption__factory;
  const incorrectReencryption = (await factory.deploy()) as IncorrectReencryption;
  const incorrectReencryption_address = await incorrectReencryption.getAddress();

  return { incorrectReencryption, incorrectReencryption_address };
}

/**
 * This example demonstrates incorrect reencryption patterns.
 * Attempting to decrypt values without proper FHE permissions will fail.
 */
describe("IncorrectReencryption", function () {
  let contract: IncorrectReencryption;
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
    contractAddress = deployment.incorrectReencryption_address;
    contract = deployment.incorrectReencryption;
  });

  // ✅ Test should succeed - correct pattern with proper permissions
  it("should succeed when value has proper permissions", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value = 42;

    const inputValue = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(value).encrypt();
    let tx = await contract.connect(signers.alice).setValue(inputValue.handles[0], inputValue.inputProof);
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

  // ❌ Test should fail - attempting decrypt without permission
  it("should fail when trying to decrypt without permission", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value = 100;

    const inputValue = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(value).encrypt();
    let tx = await contract.connect(signers.alice).setValue(inputValue.handles[0], inputValue.inputProof);
    await tx.wait();

    // Bob tries to get value without permission
    const encryptedValue = await contract.connect(bob).tryDecryptWithoutPermission();

    // Decryption should fail because bob doesn't have permission
    await expect(
      fhevm.userDecryptEuint(FhevmType.euint8, encryptedValue, contractAddress, bob),
    ).to.be.rejected;
  });

  // ❌ Test should fail - restricted value without permission
  it("should fail to decrypt restricted value", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value = 75;

    const inputValue = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(value).encrypt();
    let tx = await contract.connect(signers.alice).setRestrictedValue(inputValue.handles[0], inputValue.inputProof);
    await tx.wait();

    const encryptedValue = await contract.connect(signers.alice).getRestrictedValue();

    // Decryption should fail because permission was never granted
    await expect(
      fhevm.userDecryptEuint(FhevmType.euint8, encryptedValue, contractAddress, signers.alice),
    ).to.be.rejected;
  });

  // ✅ Test should succeed - granting permission after setup
  it("should succeed when permission is granted after setup", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value = 200;

    const inputValue = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(value).encrypt();
    let tx = await contract.connect(signers.alice).setValue(inputValue.handles[0], inputValue.inputProof);
    await tx.wait();

    // Authorize bob and grant permission
    tx = await contract.connect(signers.alice).authorizeUser(bob.address);
    await tx.wait();

    tx = await contract.connect(signers.alice).grantDecryptionPermission(bob.address);
    await tx.wait();

    const encryptedValue = await contract.connect(bob).getValue();

    // Now bob can decrypt
    const clearValue = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      typeof encryptedValue === 'string' ? encryptedValue : ethers.hexlify(encryptedValue),
      contractAddress,
      bob,
    );

    expect(clearValue).to.equal(value);
  });

  // ✅ Test should succeed - setting value with permission in same transaction
  it("should succeed when setting value with permission in same transaction", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value = 150;

    const inputValue = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(value).encrypt();
    let tx = await contract.connect(signers.alice).setValueWithPermission(
      inputValue.handles[0],
      inputValue.inputProof,
      bob.address
    );
    await tx.wait();

    const encryptedValue = await contract.connect(bob).getValue();

    // Bob can decrypt because permission was granted during setValueWithPermission
    const clearValue = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      typeof encryptedValue === 'string' ? encryptedValue : ethers.hexlify(encryptedValue),
      contractAddress,
      bob,
    );

    expect(clearValue).to.equal(value);
  });
});

