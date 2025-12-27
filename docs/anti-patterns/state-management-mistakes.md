Example: StateManagementMistakes

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="StateManagementMistakes.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint8, externalEuint8 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title State Management Mistakes - Demonstrates common storage/retrieval errors with encrypted data
/// @notice This example shows common mistakes when storing and retrieving encrypted values.
///         Issues include losing permissions when overwriting values, not preserving permissions on updates,
///         and incorrect handling of encrypted state in mappings and arrays.
contract StateManagementMistakes is ZamaEthereumConfig {
  euint8 private _value;
  mapping(uint256 => euint8) private _valueMap;
  euint8[] private _valueArray;

  // solhint-disable-next-line no-empty-blocks
  constructor() {}

  /// @dev ❌ ANTI-PATTERN: Overwriting value without preserving permissions
  ///         When you overwrite an encrypted value, you lose the previous permissions.
  ///         New permissions must be granted for the new value.
  function setValueWrong(externalEuint8 inputValue, bytes calldata inputProof) external {
    _value = FHE.fromExternal(inputValue, inputProof);
    // Missing FHE.allowThis() and FHE.allow() - permissions lost!
  }

  /// @dev ✅ CORRECT PATTERN: Always grant permissions when setting values
  function setValue(externalEuint8 inputValue, bytes calldata inputProof) external {
    _value = FHE.fromExternal(inputValue, inputProof);
    FHE.allowThis(_value);
    FHE.allow(_value, msg.sender);
  }

  /// @dev ❌ ANTI-PATTERN: Updating value without re-granting permissions
  ///         When you modify an encrypted value, you create a new encrypted value.
  ///         The new value needs new permissions, even if the old one had them.
  function updateValueWrong(externalEuint8 increment, bytes calldata inputProof) external {
    euint8 incrementValue = FHE.fromExternal(increment, inputProof);
    _value = FHE.add(_value, incrementValue);
    // Missing FHE.allowThis() and FHE.allow() - new value has no permissions!
  }

  /// @dev ✅ CORRECT PATTERN: Re-grant permissions after any operation that creates new encrypted value
  function updateValue(externalEuint8 increment, bytes calldata inputProof) external {
    euint8 incrementValue = FHE.fromExternal(increment, inputProof);
    _value = FHE.add(_value, incrementValue);
    // Must re-grant permissions for the new encrypted value
    FHE.allowThis(_value);
    FHE.allow(_value, msg.sender);
  }

  /// @dev ❌ ANTI-PATTERN: Storing in mapping without permissions
  function setValueInMapWrong(uint256 key, externalEuint8 inputValue, bytes calldata inputProof) external {
    _valueMap[key] = FHE.fromExternal(inputValue, inputProof);
    // Missing permissions - cannot decrypt later!
  }

  /// @dev ✅ CORRECT PATTERN: Grant permissions when storing in mapping
  function setValueInMap(uint256 key, externalEuint8 inputValue, bytes calldata inputProof) external {
    euint8 value = FHE.fromExternal(inputValue, inputProof);
    FHE.allowThis(value);
    FHE.allow(value, msg.sender);
    _valueMap[key] = value;
  }

  /// @dev ❌ ANTI-PATTERN: Pushing to array without permissions
  function addToArrayWrong(externalEuint8 inputValue, bytes calldata inputProof) external {
    euint8 value = FHE.fromExternal(inputValue, inputProof);
    _valueArray.push(value);
    // Missing permissions!
  }

  /// @dev ✅ CORRECT PATTERN: Grant permissions before storing in array
  function addToArray(externalEuint8 inputValue, bytes calldata inputProof) external {
    euint8 value = FHE.fromExternal(inputValue, inputProof);
    FHE.allowThis(value);
    FHE.allow(value, msg.sender);
    _valueArray.push(value);
  }

  /// @dev Returns the main value
  function getValue() external view returns (euint8) {
    return _value;
  }

  /// @dev Returns value from mapping
  function getValueFromMap(uint256 key) external view returns (euint8) {
    return _valueMap[key];
  }

  /// @dev Returns value from array
  function getValueFromArray(uint256 index) external view returns (euint8) {
    require(index < _valueArray.length, "Index out of bounds");
    return _valueArray[index];
  }

  /// @dev Returns array length
  function getArrayLength() external view returns (uint256) {
    return _valueArray.length;
  }
}


```

{% endtab %}

{% tab title="StateManagementMistakes.ts" %}

```typescript
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


```

{% endtab %}

{% endtabs %}
