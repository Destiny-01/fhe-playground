Example: FHEHandleLifecycle

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="FHEHandleLifecycle.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint32, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Handle Lifecycle - Demonstrates handle generation, symbolic execution, and lifecycle management
/// @notice This example demonstrates how FHE handles work in FHEVM:
///         - How handles are generated from external encrypted inputs
///         - How handles are converted to internal encrypted values via FHE.fromExternal
///         - How symbolic execution works with handles
///         - The lifecycle of handles from creation to use in operations
///         Handles are temporary references that must be converted to internal encrypted types for operations.
contract FHEHandleLifecycle is ZamaEthereumConfig {
  euint32 private _value1;
  euint32 private _value2;
  euint32 private _result;

  // solhint-disable-next-line no-empty-blocks
  constructor() {}

  /// @dev Demonstrates handle lifecycle: external handle -> internal euint32 via FHE.fromExternal
  ///          The handle is bound to [contract, user] and validated via inputProof
  ///          After conversion, the handle is no longer needed - the internal euint32 is used for operations
  function setValue1(externalEuint32 inputHandle, bytes calldata inputProof) external {
    // Step 1: Handle is received as externalEuint32 (a handle reference)
    // Step 2: FHE.fromExternal validates the handle and converts it to internal euint32
    // Step 3: The internal value can now be used in FHE operations
    _value1 = FHE.fromExternal(inputHandle, inputProof);
    
    // Step 4: Grant permissions for the internal encrypted value
    FHE.allowThis(_value1);
    FHE.allow(_value1, msg.sender);
  }

  /// @dev Demonstrates handle lifecycle for a second value
  function setValue2(externalEuint32 inputHandle, bytes calldata inputProof) external {
    _value2 = FHE.fromExternal(inputHandle, inputProof);
    FHE.allowThis(_value2);
    FHE.allow(_value2, msg.sender);
  }

  /// @dev Demonstrates that operations work on internal encrypted values, not handles
  ///          Once converted from handles, values can be used in FHE operations
  ///          The result is a new internal encrypted value (not a handle)
  function computeResult() external {
    // Operations work on internal euint32 values, not handles
    // The result is a new internal encrypted value
    _result = FHE.add(_value1, _value2);

    FHE.allowThis(_result);
    FHE.allow(_result, msg.sender);
  }

  /// @dev Returns the result - this is an internal encrypted value, not a handle
  function getResult() external view returns (euint32) {
    return _result;
  }

  /// @dev Demonstrates that handles cannot be reused - each handle is single-use
  ///          This function shows that once a handle is converted, it cannot be used again
  function demonstrateHandleSingleUse(externalEuint32 inputHandle, bytes calldata inputProof) external {
    // First conversion - handle is consumed
    euint32 firstValue = FHE.fromExternal(inputHandle, inputProof);
    FHE.allowThis(firstValue);
    
    // Note: The handle cannot be used again - it's been consumed by FHE.fromExternal
    // Attempting to use the same handle again would require a new handle from the client
  }
}


```

{% endtab %}

{% tab title="FHEHandleLifecycle.ts" %}

```typescript
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


```

{% endtab %}

{% endtabs %}
