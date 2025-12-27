import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import { FHEAdd, FHEAdd__factory } from "../../../types";
import type { Signers } from "../types";

async function deployFixture() {
  // Contracts are deployed using the first signer/account by default
  const factory = (await ethers.getContractFactory("FHEAdd")) as FHEAdd__factory;
  const fheAdd = (await factory.deploy()) as FHEAdd;
  const fheAdd_address = await fheAdd.getAddress();

  return { fheAdd, fheAdd_address };
}

/**
 * This example demonstrates FHE addition operations on encrypted values.
 * It shows how to add two encrypted values and highlights common pitfalls.
 */
describe("FHEAdd", function () {
  let contract: FHEAdd;
  let contractAddress: string;
  let signers: Signers;
  let bob: HardhatEthersSigner;

  before(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { owner: ethSigners[0], alice: ethSigners[1] };
    bob = ethSigners[2];
  });

  beforeEach(async function () {
    // Deploy a new contract each time we run a new test
    const deployment = await deployFixture();
    contractAddress = deployment.fheAdd_address;
    contract = deployment.fheAdd;
  });

  // ✅ Test should succeed
  it("a + b should succeed", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    let tx;

    // Let's compute 80 + 123 = 203
    const a = 80;
    const b = 123;

    // Alice encrypts and sets `a` as 80
    // @dev Encrypts the first value and sends it to the contract with proper input proof
    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    // Alice encrypts and sets `b` as 123
    // @dev Encrypts the second value and sends it to the contract with proper input proof
    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    // @dev Any user can execute computeAPlusB() because the contract has FHE permissions for both operands.
    //          The result is granted to msg.sender, allowing them to decrypt it.
    tx = await contract.connect(bob).computeAPlusB();
    await tx.wait();

    const encryptedAplusB = await contract.result();

    // @dev Decrypts the result using user decryption, which requires both allowThis and allow permissions
    const clearAplusB = await fhevm.userDecryptEuint(
      FhevmType.euint8, // Specify the encrypted type
      encryptedAplusB,
      contractAddress, // The contract address
      bob, // The user wallet
    );

    expect(clearAplusB).to.equal(a + b);
  });

  // ❌ Test should fail - missing FHE permissions
  it("should fail when trying to decrypt without permissions", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const a = 50;
    const b = 75;

    // Alice encrypts and sets both values
    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    let tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    // Bob computes the result (this will succeed)
    tx = await contract.connect(bob).computeAPlusB();
    await tx.wait();

    const encryptedAplusB = await contract.result();

    // @dev Alice tries to decrypt but doesn't have permissions because bob called computeAPlusB().
    //          Only bob has the allow permission for the result.
    await expect(
      fhevm.userDecryptEuint(FhevmType.euint8, encryptedAplusB, contractAddress, signers.alice),
    ).to.be.rejected;
  });

  // ❌ Test should fail - wrong input proof
  it("should fail when using wrong input proof", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const a = 10;
    const b = 20;

    // Create encrypted input for a different contract address (wrong proof)
    const wrongAddress = await ethers.Wallet.createRandom().getAddress();
    const inputA = await fhevm.createEncryptedInput(wrongAddress, signers.alice.address).add8(a).encrypt();

    // @dev Attempting to use an input proof bound to a different contract will fail validation
    await expect(
      contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof),
    ).to.be.reverted;
  });
});

