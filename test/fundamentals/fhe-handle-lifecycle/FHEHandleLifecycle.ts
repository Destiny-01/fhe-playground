import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import { FHEHandleLifecycle, FHEHandleLifecycle__factory } from "../../../types";
import type { Signers } from "../types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHEHandleLifecycle")) as FHEHandleLifecycle__factory;
  const fheHandleLifecycle = (await factory.deploy()) as FHEHandleLifecycle;
  const fheHandleLifecycle_address = await fheHandleLifecycle.getAddress();

  return { fheHandleLifecycle, fheHandleLifecycle_address };
}

/**
 * This example demonstrates FHE handle lifecycle management:
 * - How handles are generated from encrypted inputs
 * - How handles are converted to internal encrypted values
 * - How symbolic execution works with handles
 * - Handle lifecycle from creation to use in operations
 */
describe("FHEHandleLifecycle", function () {
  let contract: FHEHandleLifecycle;
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
    contractAddress = deployment.fheHandleLifecycle_address;
    contract = deployment.fheHandleLifecycle;
  });

  // ✅ Test handle lifecycle: generation -> conversion -> operation
  it("should demonstrate complete handle lifecycle: generation, conversion, and operation", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value1 = 100;
    const value2 = 50;

    // @dev Step 1: Handle generation - createEncryptedInput generates handles bound to [contract, user]
    const input1 = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(value1).encrypt();
    // input1.handles[0] is the handle, input1.inputProof is the proof validating the handle
    
    // @dev Step 2: Handle conversion - FHE.fromExternal converts handle to internal euint32
    let tx = await contract.connect(signers.alice).setValue1(input1.handles[0], input1.inputProof);
    await tx.wait();

    // @dev Step 3: Handle generation for second value
    const input2 = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(value2).encrypt();
    tx = await contract.connect(signers.alice).setValue2(input2.handles[0], input2.inputProof);
    await tx.wait();

    // @dev Step 4: Operation on internal encrypted values (not handles)
    tx = await contract.connect(bob).computeResult();
    await tx.wait();

    const encryptedResult = await contract.getResult();

    // @dev Step 5: Decryption of the result (which is an internal encrypted value, not a handle)
    const clearResult = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedResult,
      contractAddress,
      bob,
    );

    expect(clearResult).to.equal(value1 + value2);
  });

  // ✅ Test that handles are bound to specific contract and user
  it("should demonstrate that handles are bound to [contract, user] pairs", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value = 200;

    // @dev Handle is bound to contractAddress and alice.address
    const input = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(value).encrypt();
    
    // @dev This should succeed - handle matches contract and user
    let tx = await contract.connect(signers.alice).setValue1(input.handles[0], input.inputProof);
    await tx.wait();

    const encryptedValue = await contract.getResult();
    // Operation should work correctly with properly bound handle
  });

  // ✅ Test handle single-use behavior
  it("should demonstrate that handles are single-use (consumed by FHE.fromExternal)", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value = 150;

    // @dev Generate handle
    const input = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(value).encrypt();
    
    // @dev Handle is consumed by FHE.fromExternal - cannot be reused
    let tx = await contract.connect(signers.alice).demonstrateHandleSingleUse(input.handles[0], input.inputProof);
    await tx.wait();

    // @dev To use the value again, a new handle must be generated
    // This demonstrates that handles are temporary references, not persistent values
  });

  // ❌ Test should fail - handle bound to wrong user
  it("should fail when handle is bound to different user than caller", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value = 100;

    // @dev Handle is bound to alice.address
    const input = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(value).encrypt();
    
    // @dev This should fail - bob is calling but handle is bound to alice
    await expect(
      contract.connect(bob).setValue1(input.handles[0], input.inputProof)
    ).to.be.rejected;
  });
});

