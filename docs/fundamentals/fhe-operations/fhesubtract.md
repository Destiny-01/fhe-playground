Example: FHESubtract

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="FHESubtract.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint8, externalEuint8 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Subtract - Demonstrates subtraction operations on encrypted values using FHE.sub
/// @notice This example shows how to perform subtraction on encrypted values without decrypting them.
///         The contract demonstrates the basic FHE arithmetic operation by subtracting two encrypted uint8 values.
///         The result remains encrypted and can only be decrypted by users who have been granted FHE permissions.
contract FHESubtract is ZamaEthereumConfig {
  euint8 private _a;
  euint8 private _b;
  // solhint-disable-next-line var-name-mixedcase
  euint8 private _a_minus_b;

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

  /// @dev Performs FHE subtraction on encrypted values using FHE.sub, then grants permissions for result decryption
  ///          The operation is performed entirely on encrypted data without revealing the actual values.
  function computeAMinusB() external {
    _a_minus_b = FHE.sub(_a, _b);

    FHE.allowThis(_a_minus_b);
    FHE.allow(_a_minus_b, msg.sender);
  }

  function result() public view returns (euint8) {
    return _a_minus_b;
  }
}


```

{% endtab %}

{% tab title="FHESubtract.ts" %}

```typescript
import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import { FHESubtract, FHESubtract__factory } from "../../../types";
import type { Signers } from "../types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHESubtract")) as FHESubtract__factory;
  const fheSubtract = (await factory.deploy()) as FHESubtract;
  const fheSubtract_address = await fheSubtract.getAddress();

  return { fheSubtract, fheSubtract_address };
}

/**
 * This example demonstrates FHE subtraction operations on encrypted values.
 * It shows how to subtract two encrypted values and highlights common pitfalls.
 */
describe("FHESubtract", function () {
  let contract: FHESubtract;
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
    contractAddress = deployment.fheSubtract_address;
    contract = deployment.fheSubtract;
  });

  // ✅ Test should succeed
  it("a - b should succeed", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    let tx;
    const a = 150;
    const b = 50;

    // @dev Encrypts and sets both values with proper input proofs
    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    // @dev Performs subtraction operation and grants decryption permission to caller
    tx = await contract.connect(bob).computeAMinusB();
    await tx.wait();

    const encryptedResult = await contract.result();

    // @dev Decrypts the result using user decryption
    const clearResult = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      encryptedResult,
      contractAddress,
      bob,
    );

    expect(clearResult).to.equal(a - b);
  });

  // ✅ Test should succeed - handling underflow (wraps around)
  it("should handle subtraction resulting in underflow (wraps around)", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    let tx;
    const a = 10;
    const b = 200; // This will cause underflow (result wraps around)

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    tx = await contract.connect(bob).computeAMinusB();
    await tx.wait();

    const encryptedResult = await contract.result();
    const clearResult = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      encryptedResult,
      contractAddress,
      bob,
    );

    // @dev uint8 underflow wraps around: (a - b) mod 256
    const expectedResult = (a - b + 256) % 256;
    expect(clearResult).to.equal(expectedResult);
  });

  // ❌ Test should fail - wrong user trying to decrypt
  it("should fail when wrong user tries to decrypt", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const a = 100;
    const b = 30;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    let tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    tx = await contract.connect(bob).computeAMinusB();
    await tx.wait();

    const encryptedResult = await contract.result();

    // @dev Alice doesn't have permissions because bob called computeAMinusB()
    await expect(
      fhevm.userDecryptEuint(FhevmType.euint8, encryptedResult, contractAddress, signers.alice),
    ).to.be.rejected;
  });
});


```

{% endtab %}

{% endtabs %}
