Example: FHEMultiply

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="FHEMultiply.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint8, externalEuint8 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Multiply - Demonstrates multiplication operations on encrypted values using FHE.mul
/// @notice This example shows how to perform multiplication on encrypted values without decrypting them.
///         The contract demonstrates the basic FHE arithmetic operation by multiplying two encrypted uint8 values.
///         The result remains encrypted and can only be decrypted by users who have been granted FHE permissions.
contract FHEMultiply is ZamaEthereumConfig {
  euint8 private _a;
  euint8 private _b;
  // solhint-disable-next-line var-name-mixedcase
  euint8 private _a_times_b;

  // solhint-disable-next-line no-empty-blocks
  constructor() {}

  /// @dev Converts external encrypted input to internal format and grants contract FHE permissions for value a
  function setA(externalEuint8 inputA, bytes calldata inputProof) external {
    _a = FHE.fromExternal(inputA, inputProof);
    FHE.allowThis(_a);
  }

  /// @dev Converts external encrypted input to internal format and grants contract FHE permissions for value b
  function setB(externalEuint8 inputB, bytes calldata inputProof) external {
    _b = FHE.fromExternal(inputB, inputProof);
    FHE.allowThis(_b);
  }

  /// @dev Performs FHE multiplication on encrypted values using FHE.mul, then grants permissions for result decryption
  ///          The operation is performed entirely on encrypted data without revealing the actual values.
  function computeATimesB() external {
    _a_times_b = FHE.mul(_a, _b);

    FHE.allowThis(_a_times_b);
    FHE.allow(_a_times_b, msg.sender);
  }

  function result() public view returns (euint8) {
    return _a_times_b;
  }
}


```

{% endtab %}

{% tab title="FHEMultiply.ts" %}

```typescript
import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import { FHEMultiply, FHEMultiply__factory } from "../../../types";
import type { Signers } from "../types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHEMultiply")) as FHEMultiply__factory;
  const fheMultiply = (await factory.deploy()) as FHEMultiply;
  const fheMultiply_address = await fheMultiply.getAddress();

  return { fheMultiply, fheMultiply_address };
}

/**
 * This example demonstrates FHE multiplication operations on encrypted values.
 * It shows how to multiply two encrypted values and highlights common pitfalls.
 */
describe("FHEMultiply", function () {
  let contract: FHEMultiply;
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
    contractAddress = deployment.fheMultiply_address;
    contract = deployment.fheMultiply;
  });

  // ✅ Test should succeed
  it("a * b should succeed", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    let tx;
    const a = 15;
    const b = 8;

    // @dev Encrypts and sets both values with proper input proofs
    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    // @dev Performs multiplication operation and grants decryption permission to caller
    tx = await contract.connect(bob).computeATimesB();
    await tx.wait();

    const encryptedResult = await contract.result();

    // @dev Decrypts the result using user decryption
    const clearResult = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      encryptedResult,
      contractAddress,
      bob,
    );

    expect(clearResult).to.equal(a * b);
  });

  // ✅ Test should succeed - handling overflow (wraps around)
  it("should handle multiplication resulting in overflow (wraps around)", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    let tx;
    const a = 20;
    const b = 15; // 20 * 15 = 300, which overflows uint8 (max 255)

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    tx = await contract.connect(bob).computeATimesB();
    await tx.wait();

    const encryptedResult = await contract.result();
    const clearResult = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      encryptedResult,
      contractAddress,
      bob,
    );

    // @dev uint8 overflow wraps around: (a * b) mod 256
    const expectedResult = (a * b) % 256;
    expect(clearResult).to.equal(expectedResult);
  });

  // ❌ Test should fail - missing FHE permissions
  it("should fail when trying to decrypt without permissions", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const a = 10;
    const b = 5;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    let tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    tx = await contract.connect(bob).computeATimesB();
    await tx.wait();

    const encryptedResult = await contract.result();

    // @dev Alice doesn't have permissions because bob called computeATimesB()
    await expect(
      fhevm.userDecryptEuint(FhevmType.euint8, encryptedResult, contractAddress, signers.alice),
    ).to.be.rejected;
  });
});


```

{% endtab %}

{% endtabs %}
