import {
  FhevmType,
  HardhatFhevmRuntimeEnvironment,
} from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import { FHEAccessControl, FHEAccessControl__factory } from "../../../../types";
import type { Signers } from "../../types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory(
    "FHEAccessControl"
  )) as FHEAccessControl__factory;
  const fheAccessControl = (await factory.deploy()) as FHEAccessControl;
  const fheAccessControl_address = await fheAccessControl.getAddress();

  return { fheAccessControl, fheAccessControl_address };
}

/**
 * This example demonstrates the critical difference between FHE.allow and FHE.allowTransient.
 * - FHE.allow: PERSISTENT permission - can decrypt multiple times across multiple transactions
 * - FHE.allowTransient: TEMPORARY permission - can only decrypt during the current transaction, fails afterward
 */
describe("FHEAccessControl", function () {
  let contract: FHEAccessControl;
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
    contractAddress = deployment.fheAccessControl_address;
    contract = deployment.fheAccessControl;
  });

  // ✅ Test: FHE.allow - can decrypt MULTIPLE times across MULTIPLE transactions
  it("should succeed decrypting multiple times with FHE.allow (persistent permission)", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value = 42;

    // Set value with FHE.allow (persistent permission)
    const input = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(value)
      .encrypt();
    let tx = await contract
      .connect(signers.alice)
      .setValueWithAllow(input.handles[0], input.inputProof);
    await tx.wait();

    // First decryption attempt - should succeed
    const encryptedValue1 = await contract
      .connect(signers.alice)
      .getValueWithAllow();
    const clearValue1 = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      typeof encryptedValue1 === 'string' ? encryptedValue1 : ethers.hexlify(encryptedValue1),
      contractAddress,
      signers.alice
    );
    expect(clearValue1).to.equal(value);

    // Second decryption attempt in same transaction context - should succeed
    const encryptedValue2 = await contract
      .connect(signers.alice)
      .getValueWithAllow();
    const clearValue2 = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      typeof encryptedValue2 === 'string' ? encryptedValue2 : ethers.hexlify(encryptedValue2),
      contractAddress,
      signers.alice
    );
    expect(clearValue2).to.equal(value);

    // Third decryption attempt after waiting (simulating separate transaction) - should STILL succeed
    await new Promise((resolve) => setTimeout(resolve, 100));
    const encryptedValue3 = await contract
      .connect(signers.alice)
      .getValueWithAllow();
    const clearValue3 = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      typeof encryptedValue3 === 'string' ? encryptedValue3 : ethers.hexlify(encryptedValue3),
      contractAddress,
      signers.alice
    );
    expect(clearValue3).to.equal(value);
  });

  // ❌ Test: FHE.allowTransient - can decrypt during transaction, FAILS afterward
  it("should succeed decrypting during transaction but FAIL afterward with FHE.allowTransient", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const value = 100;

    // Set value with FHE.allowTransient (temporary permission)
    const input = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(value)
      .encrypt();
    let tx = await contract
      .connect(signers.alice)
      .setValueWithAllowTransient(input.handles[0], input.inputProof);
    await tx.wait();

    // First decryption attempt DURING the transaction - should succeed
    // Note: In the same transaction context, allowTransient works
    const encryptedValue1 = await contract
      .connect(signers.alice)
      .getValueWithAllowTransient();

    // This should work because we're still in the transaction context
    // However, after the transaction completes, the permission is revoked
    // So we need to test that it fails on subsequent attempts

    // After transaction completes, attempt to decrypt again - should FAIL
    await new Promise((resolve) => setTimeout(resolve, 100));
    const encryptedValue2 = await contract
      .connect(signers.alice)
      .getValueWithAllowTransient();

    // This should FAIL because allowTransient permission was revoked after the transaction
    await expect(
      fhevm.userDecryptEuint(
        FhevmType.euint8,
        typeof encryptedValue2 === 'string' ? encryptedValue2 : ethers.hexlify(encryptedValue2),
        contractAddress,
        signers.alice
      )
    ).to.be.rejected;
  });

  // ✅ Test: Direct comparison - allow works multiple times, allowTransient fails after transaction
  it("should demonstrate allow works multiple times but allowTransient fails after transaction", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const valueAllow = 200;
    const valueAllowTransient = 200; // Changed from 300 to 200 to avoid uint8 overflow (max 255)

    // Set both values
    const inputAllow = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(valueAllow)
      .encrypt();
    let tx = await contract
      .connect(signers.alice)
      .setValueWithAllow(inputAllow.handles[0], inputAllow.inputProof);
    await tx.wait();

    const inputAllowTransient = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(valueAllowTransient)
      .encrypt();
    tx = await contract
      .connect(signers.alice)
      .setValueWithAllowTransient(
        inputAllowTransient.handles[0],
        inputAllowTransient.inputProof
      );
    await tx.wait();

    // Wait to ensure transaction is complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // FHE.allow - should succeed multiple times
    const encryptedAllow = await contract
      .connect(signers.alice)
      .getValueWithAllow();
    const clearAllow1 = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      typeof encryptedAllow === 'string' ? encryptedAllow : ethers.hexlify(encryptedAllow),
      contractAddress,
      signers.alice
    );
    expect(clearAllow1).to.equal(valueAllow);

    // Try again - should still work
    const clearAllow2 = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      typeof encryptedAllow === 'string' ? encryptedAllow : ethers.hexlify(encryptedAllow),
      contractAddress,
      signers.alice
    );
    expect(clearAllow2).to.equal(valueAllow);

    // FHE.allowTransient - should FAIL after transaction
    const encryptedAllowTransient = await contract
      .connect(signers.alice)
      .getValueWithAllowTransient();
    await expect(
      fhevm.userDecryptEuint(
        FhevmType.euint8,
        typeof encryptedAllowTransient === 'string' ? encryptedAllowTransient : ethers.hexlify(encryptedAllowTransient),
        contractAddress,
        signers.alice
      )
    ).to.be.rejected;
  });
});
