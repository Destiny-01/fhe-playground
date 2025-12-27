import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import { StateManagementMistakes, StateManagementMistakes__factory } from "../../../types";
import type { Signers } from "./types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory("StateManagementMistakes")) as StateManagementMistakes__factory;
  const stateManagementMistakes = (await factory.deploy()) as StateManagementMistakes;
  const stateManagementMistakes_address = await stateManagementMistakes.getAddress();

  return { stateManagementMistakes, stateManagementMistakes_address };
}

/**
 * This example demonstrates common state management mistakes with encrypted data.
 * Issues include losing permissions when overwriting values and incorrect handling of encrypted state.
 */
describe("StateManagementMistakes", function () {
  let contract: StateManagementMistakes;
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
    contractAddress = deployment.stateManagementMistakes_address;
    contract = deployment.stateManagementMistakes;
  });

  // ✅ Test should succeed - correct pattern with permissions
  it("should succeed when setting value with proper permissions", async function () {
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

  // ❌ Test should fail - missing permissions when setting value
  it("should fail to decrypt when setting value without permissions", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value = 100;

    const inputValue = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(value).encrypt();
    let tx = await contract.connect(signers.alice).setValueWrong(inputValue.handles[0], inputValue.inputProof);
    await tx.wait();

    const encryptedValue = await contract.connect(signers.alice).getValue();

    // Decryption should fail because permissions were not granted
    await expect(
      fhevm.userDecryptEuint(FhevmType.euint8, encryptedValue, contractAddress, signers.alice),
    ).to.be.rejected;
  });

  // ✅ Test should succeed - updating value with re-granted permissions
  it("should succeed when updating value and re-granting permissions", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const initialValue = 50;
    const increment = 25;

    // Set initial value
    const inputInitial = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(initialValue).encrypt();
    let tx = await contract.connect(signers.alice).setValue(inputInitial.handles[0], inputInitial.inputProof);
    await tx.wait();

    // Update value with proper permission re-grant
    const inputIncrement = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(increment).encrypt();
    tx = await contract.connect(signers.alice).updateValue(inputIncrement.handles[0], inputIncrement.inputProof);
    await tx.wait();

    const encryptedValue = await contract.connect(signers.alice).getValue();

    const clearValue = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      typeof encryptedValue === 'string' ? encryptedValue : ethers.hexlify(encryptedValue),
      contractAddress,
      signers.alice,
    );

    expect(clearValue).to.equal(initialValue + increment);
  });

  // ❌ Test should fail - updating without re-granting permissions
  it("should fail when updating value without re-granting permissions", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const initialValue = 30;
    const increment = 20;

    const inputInitial = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(initialValue).encrypt();
    let tx = await contract.connect(signers.alice).setValue(inputInitial.handles[0], inputInitial.inputProof);
    await tx.wait();

    const inputIncrement = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(increment).encrypt();
    tx = await contract.connect(signers.alice).updateValueWrong(inputIncrement.handles[0], inputIncrement.inputProof);
    await tx.wait();

    const encryptedValue = await contract.connect(signers.alice).getValue();

    // Decryption should fail because new value doesn't have permissions
    await expect(
      fhevm.userDecryptEuint(FhevmType.euint8, encryptedValue, contractAddress, signers.alice),
    ).to.be.rejected;
  });

  // ✅ Test should succeed - storing in mapping with permissions
  it("should succeed when storing value in mapping with permissions", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const key = 1;
    const value = 200;

    const inputValue = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(value).encrypt();
    let tx = await contract.connect(signers.alice).setValueInMap(key, inputValue.handles[0], inputValue.inputProof);
    await tx.wait();

    const encryptedValue = await contract.connect(signers.alice).getValueFromMap(key);

    const clearValue = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      typeof encryptedValue === 'string' ? encryptedValue : ethers.hexlify(encryptedValue),
      contractAddress,
      signers.alice,
    );

    expect(clearValue).to.equal(value);
  });

  // ✅ Test should succeed - storing in array with permissions
  it("should succeed when storing value in array with permissions", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value = 200; // Changed from 300 to 200 to avoid uint8 overflow (max 255)

    const inputValue = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(value).encrypt();
    let tx = await contract.connect(signers.alice).addToArray(inputValue.handles[0], inputValue.inputProof);
    await tx.wait();

    const arrayLength = await contract.getArrayLength();
    expect(arrayLength).to.equal(1);

    const encryptedValue = await contract.connect(signers.alice).getValueFromArray(0);

    const clearValue = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      typeof encryptedValue === 'string' ? encryptedValue : ethers.hexlify(encryptedValue),
      contractAddress,
      signers.alice,
    );

    expect(clearValue).to.equal(value);
  });
});

