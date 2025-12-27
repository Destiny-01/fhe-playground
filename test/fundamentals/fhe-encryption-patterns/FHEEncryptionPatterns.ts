import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import { FHEEncryptionPatterns, FHEEncryptionPatterns__factory } from "../../../types";
import type { Signers } from "../types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHEEncryptionPatterns")) as FHEEncryptionPatterns__factory;
  const fheEncryptionPatterns = (await factory.deploy()) as FHEEncryptionPatterns;
  const fheEncryptionPatterns_address = await fheEncryptionPatterns.getAddress();

  return { fheEncryptionPatterns, fheEncryptionPatterns_address };
}

/**
 * This example demonstrates various FHE encryption patterns:
 * - Single value encryption
 * - Multiple values of the same type
 * - Mixed types (integers, booleans, addresses)
 */
describe("FHEEncryptionPatterns", function () {
  let contract: FHEEncryptionPatterns;
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
    contractAddress = deployment.fheEncryptionPatterns_address;
    contract = deployment.fheEncryptionPatterns;
  });

  // ✅ Test single value encryption pattern
  it("should successfully encrypt and decrypt a single value", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value = 12345;

    // @dev Encrypts single value with proper input proof
    const input = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(value).encrypt();
    let tx = await contract.connect(signers.alice).setSingleValue(input.handles[0], input.inputProof);
    await tx.wait();

    const encryptedValue = await contract.getSingleValue();

    // @dev Decrypts the encrypted value using user decryption
    const clearValue = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedValue,
      contractAddress,
      signers.alice,
    );

    expect(clearValue).to.equal(value);
  });

  // ✅ Test multiple values of same type pattern
  it("should successfully encrypt and decrypt multiple values of the same type", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value1 = 10;
    const value2 = 20;
    const value3 = 30;

    // @dev Encrypts multiple values separately with proper input proofs
    const input1 = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(value1).encrypt();
    let tx = await contract.connect(signers.alice).setValue1(input1.handles[0], input1.inputProof);
    await tx.wait();

    const input2 = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(value2).encrypt();
    tx = await contract.connect(signers.alice).setValue2(input2.handles[0], input2.inputProof);
    await tx.wait();

    const input3 = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(value3).encrypt();
    tx = await contract.connect(signers.alice).setValue3(input3.handles[0], input3.inputProof);
    await tx.wait();

    const encrypted1 = await contract.getValue1();
    const encrypted2 = await contract.getValue2();
    const encrypted3 = await contract.getValue3();

    // @dev Decrypts all encrypted values using user decryption
    const clear1 = await fhevm.userDecryptEuint(FhevmType.euint8, encrypted1, contractAddress, signers.alice);
    const clear2 = await fhevm.userDecryptEuint(FhevmType.euint8, encrypted2, contractAddress, signers.alice);
    const clear3 = await fhevm.userDecryptEuint(FhevmType.euint8, encrypted3, contractAddress, signers.alice);

    expect(clear1).to.equal(value1);
    expect(clear2).to.equal(value2);
    expect(clear3).to.equal(value3);
  });

  // ✅ Test mixed types pattern
  it("should successfully encrypt and decrypt mixed types (uint, bool, address)", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const uintValue = 999;
    const boolValue = true;
    const addressValue = signers.alice.address;

    // @dev Encrypts different types separately with proper input proofs
    const inputUint = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(uintValue).encrypt();
    let tx = await contract.connect(signers.alice).setMixedUint(inputUint.handles[0], inputUint.inputProof);
    await tx.wait();

    const inputBool = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).addBool(boolValue).encrypt();
    tx = await contract.connect(signers.alice).setMixedBool(inputBool.handles[0], inputBool.inputProof);
    await tx.wait();

    const inputAddress = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).addAddress(addressValue).encrypt();
    tx = await contract.connect(signers.alice).setMixedAddress(inputAddress.handles[0], inputAddress.inputProof);
    await tx.wait();

    const encryptedUint = await contract.getMixedUint();
    const encryptedBool = await contract.getMixedBool();
    const encryptedAddress = await contract.getMixedAddress();

    // @dev Decrypts all encrypted values using user decryption
    const clearUint = await fhevm.userDecryptEuint(FhevmType.euint32, encryptedUint, contractAddress, signers.alice);
    const clearBool = await fhevm.userDecryptEbool(encryptedBool, contractAddress, signers.alice);
    const clearAddress = await fhevm.userDecryptEaddress(encryptedAddress, contractAddress, signers.alice);

    expect(clearUint).to.equal(uintValue);
    expect(clearBool).to.equal(boolValue);
    expect(clearAddress.toLowerCase()).to.equal(addressValue.toLowerCase());
  });
});

