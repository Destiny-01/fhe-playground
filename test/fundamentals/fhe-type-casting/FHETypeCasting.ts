import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import { FHETypeCasting, FHETypeCasting__factory } from "../../../types";
import type { Signers } from "../types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHETypeCasting")) as FHETypeCasting__factory;
  const fheTypeCasting = (await factory.deploy()) as FHETypeCasting;
  const fheTypeCasting_address = await fheTypeCasting.getAddress();

  return { fheTypeCasting, fheTypeCasting_address };
}

/**
 * This example demonstrates FHE type casting and conversion between different encrypted integer types.
 * It shows how to safely convert between euint8, euint16, euint32, euint64, and handle eaddress.
 */
describe("FHETypeCasting", function () {
  let contract: FHETypeCasting;
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
    contractAddress = deployment.fheTypeCasting_address;
    contract = deployment.fheTypeCasting;
  });

  // ✅ Test should succeed - widening conversion from euint8 to euint16
  it("should successfully cast euint8 to euint16 (widening)", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value8 = 100;

    // @dev Encrypts and sets uint8 value with proper input proof
    const input8 = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(value8).encrypt();
    let tx = await contract.connect(signers.alice).setValue8(input8.handles[0], input8.inputProof);
    await tx.wait();

    // @dev Performs type casting from euint8 to euint16
    const encryptedResult = await contract.cast8To16();

    // Grant permissions for decryption
    tx = await contract.connect(bob).allowAddressDecryption();
    await tx.wait();

    // @dev Decrypts the encrypted result using user decryption
    const clearResult = await fhevm.userDecryptEuint(
      FhevmType.euint16,
      encryptedResult,
      contractAddress,
      bob,
    );

    expect(clearResult).to.equal(value8);
  });

  // ✅ Test should succeed - widening conversion from euint8 to euint32
  it("should successfully cast euint8 to euint32 (widening)", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value8 = 200;

    const input8 = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(value8).encrypt();
    let tx = await contract.connect(signers.alice).setValue8(input8.handles[0], input8.inputProof);
    await tx.wait();

    const encryptedResult = await contract.cast8To32();

    tx = await contract.connect(bob).allowAddressDecryption();
    await tx.wait();

    const clearResult = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedResult,
      contractAddress,
      bob,
    );

    expect(clearResult).to.equal(value8);
  });

  // ✅ Test should succeed - widening conversion from euint16 to euint32
  it("should successfully cast euint16 to euint32 (widening)", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value16 = 1000;

    const input16 = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add16(value16).encrypt();
    let tx = await contract.connect(signers.alice).setValue16(input16.handles[0], input16.inputProof);
    await tx.wait();

    const encryptedResult = await contract.cast16To32();

    tx = await contract.connect(bob).allowAddressDecryption();
    await tx.wait();

    const clearResult = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedResult,
      contractAddress,
      bob,
    );

    expect(clearResult).to.equal(value16);
  });

  // ✅ Test should succeed - narrowing conversion from euint16 to euint8 (value fits)
  it("should successfully cast euint16 to euint8 when value fits (narrowing)", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value16 = 150; // Fits in uint8

    const input16 = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add16(value16).encrypt();
    let tx = await contract.connect(signers.alice).setValue16(input16.handles[0], input16.inputProof);
    await tx.wait();

    const encryptedResult = await contract.cast16To8();

    tx = await contract.connect(bob).allowAddressDecryption();
    await tx.wait();

    const clearResult = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      encryptedResult,
      contractAddress,
      bob,
    );

    expect(clearResult).to.equal(value16);
  });

  // ✅ Test should succeed - encrypted address handling
  it("should successfully handle encrypted address", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const testAddress = signers.alice.address;

    // @dev Encrypts and sets address with proper input proof
    const inputAddress = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).addAddress(testAddress).encrypt();
    let tx = await contract.connect(signers.alice).setEncryptedAddress(inputAddress.handles[0], inputAddress.inputProof);
    await tx.wait();

    // @dev Grants permissions for address decryption
    tx = await contract.connect(bob).allowAddressDecryption();
    await tx.wait();

    const encryptedAddress = await contract.getEncryptedAddress();

    // @dev Decrypts the encrypted address using user decryption
    const clearAddress = await fhevm.userDecryptEaddress(
      encryptedAddress,
      contractAddress,
      bob,
    );

    expect(clearAddress.toLowerCase()).to.equal(testAddress.toLowerCase());
  });
});

