Example: ViewFunctionAntiPattern

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="ViewFunctionAntiPattern.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint8, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title View Function Anti-Pattern - Demonstrates why FHE operations cannot be performed in view functions
/// @notice This example shows the common mistake of trying to perform FHE operations inside view functions.
///         View functions cannot execute FHE operations (like FHE.add, FHE.select, etc.) because these require
///         transaction context. View functions can return encrypted values, but cannot perform FHE computations.
///         This contract demonstrates both the incorrect pattern and the correct approach.
contract ViewFunctionAntiPattern is ZamaEthereumConfig {
    euint8 private _a;
    euint8 private _b;
    euint8 private _sum;

    // solhint-disable-next-line no-empty-blocks
    constructor() {}

    /// @dev Sets encrypted value A with proper permissions
    function setA(
        externalEuint8 inputValue,
        bytes calldata inputProof
    ) external {
        _a = FHE.fromExternal(inputValue, inputProof);
        FHE.allowThis(_a);
        FHE.allow(_a, msg.sender);
    }

    /// @dev Sets encrypted value B with proper permissions
    function setB(
        externalEuint8 inputValue,
        bytes calldata inputProof
    ) external {
        _b = FHE.fromExternal(inputValue, inputProof);
        FHE.allowThis(_b);
        FHE.allow(_b, msg.sender);
    }

    /// @dev ❌ ANTI-PATTERN: Attempting FHE operation inside view function
    ///         This will NOT compile - FHE operations cannot be performed in view functions.
    ///         View functions are read-only and cannot execute state-changing FHE computations.
    ///         Uncommenting the line below will cause a compilation error.
    // function computeSumView() external view returns (euint8) {
    //   return FHE.add(_a, _b); // ❌ ERROR: Cannot perform FHE operations in view functions
    // }

    /// @dev ✅ CORRECT PATTERN: Perform FHE operations in non-view function
    ///         FHE operations must be performed in a transaction context (non-view function).
    ///         After computation, the result can be stored and accessed via view functions.
    function computeSum() external {
        _sum = FHE.add(_a, _b);
        FHE.allowThis(_sum);
        FHE.allow(_sum, msg.sender);
    }

    /// @dev ✅ CORRECT PATTERN: View function can return encrypted value (but not compute it)
    ///         View functions CAN return encrypted values that were computed in previous transactions.
    ///         They just cannot perform FHE operations themselves.
    function getSum() external view returns (euint8) {
        return _sum; // ✅ This works - just returning a stored encrypted value
    }

    /// @dev ✅ CORRECT PATTERN: View function can return stored encrypted values
    function getA() external view returns (euint8) {
        return _a;
    }

    /// @dev ✅ CORRECT PATTERN: View function can return stored encrypted values
    function getB() external view returns (euint8) {
        return _b;
    }
}

```

{% endtab %}

{% tab title="ViewFunctionAntiPattern.ts" %}

```typescript
import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import { ViewFunctionAntiPattern, ViewFunctionAntiPattern__factory } from "../../../types";
import type { Signers } from "./types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory("ViewFunctionAntiPattern")) as ViewFunctionAntiPattern__factory;
  const viewFunctionAntiPattern = (await factory.deploy()) as ViewFunctionAntiPattern;
  const viewFunctionAntiPattern_address = await viewFunctionAntiPattern.getAddress();

  return { viewFunctionAntiPattern, viewFunctionAntiPattern_address };
}

/**
 * This example demonstrates why FHE operations cannot be performed in view functions.
 * View functions can return encrypted values, but cannot perform FHE computations like FHE.add, FHE.select, etc.
 */
describe("ViewFunctionAntiPattern", function () {
  let contract: ViewFunctionAntiPattern;
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
    contractAddress = deployment.viewFunctionAntiPattern_address;
    contract = deployment.viewFunctionAntiPattern;
  });

  // ✅ Test should succeed - performing FHE operation in non-view function
  it("should succeed when performing FHE operations in non-view function", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const valueA = 10;
    const valueB = 20;

    // Set value A
    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(valueA).encrypt();
    let tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    // Set value B
    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(valueB).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    // Perform FHE operation in non-view function (correct pattern)
    tx = await contract.connect(signers.alice).computeSum();
    await tx.wait();

    // Get result using view function (this works - just returning stored value)
    const encryptedSum = await contract.connect(signers.alice).getSum();

    // Decrypt the result
    const clearSum = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      encryptedSum,
      contractAddress,
      signers.alice,
    );

    expect(clearSum).to.equal(valueA + valueB);
  });

  // ✅ Test should succeed - view function can return encrypted values
  it("should succeed when view function returns stored encrypted value", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const valueA = 42;
    const valueB = 58;

    // Set values
    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(valueA).encrypt();
    let tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(valueB).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    // View functions CAN return encrypted values (they just can't compute them)
    const encryptedA = await contract.connect(signers.alice).getA();
    const encryptedB = await contract.connect(signers.alice).getB();

    const clearA = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      encryptedA,
      contractAddress,
      signers.alice,
    );

    const clearB = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      encryptedB,
      contractAddress,
      signers.alice,
    );

    expect(clearA).to.equal(valueA);
    expect(clearB).to.equal(valueB);
  });
});


```

{% endtab %}

{% endtabs %}
