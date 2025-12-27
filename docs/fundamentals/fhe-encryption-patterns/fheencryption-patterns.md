Example: FHEEncryptionPatterns

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="FHEEncryptionPatterns.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {
  FHE,
  euint8,
  euint32,
  ebool,
  eaddress,
  externalEuint8,
  externalEuint32,
  externalEbool,
  externalEaddress
} from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Encryption Patterns - Demonstrates various encryption patterns for single values, multiple values, and mixed types
/// @notice This example shows different patterns for encrypting and handling values in FHEVM:
///         - Single value encryption
///         - Multiple values of the same type
///         - Mixed types (integers, booleans, addresses)
///         The contract demonstrates proper FHE permission management for each pattern.
contract FHEEncryptionPatterns is ZamaEthereumConfig {
  // Single value pattern
  euint32 private _singleValue;

  // Multiple values of same type pattern
  euint8 private _value1;
  euint8 private _value2;
  euint8 private _value3;

  // Mixed types pattern
  euint32 private _mixedUint;
  ebool private _mixedBool;
  eaddress private _mixedAddress;

  // solhint-disable-next-line no-empty-blocks
  constructor() {}

  // ========== Single Value Pattern ==========

  /// @dev Single value encryption pattern - encrypts one value and grants permissions
  function setSingleValue(externalEuint32 inputValue, bytes calldata inputProof) external {
    _singleValue = FHE.fromExternal(inputValue, inputProof);
    FHE.allowThis(_singleValue);
    FHE.allow(_singleValue, msg.sender);
  }

  function getSingleValue() external view returns (euint32) {
    return _singleValue;
  }

  // ========== Multiple Values Pattern (Same Type) ==========

  /// @dev Multiple values pattern - encrypts multiple values of the same type in separate calls
  function setValue1(externalEuint8 inputValue, bytes calldata inputProof) external {
    _value1 = FHE.fromExternal(inputValue, inputProof);
    FHE.allowThis(_value1);
    FHE.allow(_value1, msg.sender);
  }

  function setValue2(externalEuint8 inputValue, bytes calldata inputProof) external {
    _value2 = FHE.fromExternal(inputValue, inputProof);
    FHE.allowThis(_value2);
    FHE.allow(_value2, msg.sender);
  }

  function setValue3(externalEuint8 inputValue, bytes calldata inputProof) external {
    _value3 = FHE.fromExternal(inputValue, inputProof);
    FHE.allowThis(_value3);
    FHE.allow(_value3, msg.sender);
  }

  function getValue1() external view returns (euint8) {
    return _value1;
  }

  function getValue2() external view returns (euint8) {
    return _value2;
  }

  function getValue3() external view returns (euint8) {
    return _value3;
  }

  // ========== Mixed Types Pattern ==========

  /// @dev Mixed types pattern - encrypts different types (uint, bool, address) in separate calls
  function setMixedUint(externalEuint32 inputValue, bytes calldata inputProof) external {
    _mixedUint = FHE.fromExternal(inputValue, inputProof);
    FHE.allowThis(_mixedUint);
    FHE.allow(_mixedUint, msg.sender);
  }

  function setMixedBool(externalEbool inputValue, bytes calldata inputProof) external {
    _mixedBool = FHE.fromExternal(inputValue, inputProof);
    FHE.allowThis(_mixedBool);
    FHE.allow(_mixedBool, msg.sender);
  }

  function setMixedAddress(externalEaddress inputValue, bytes calldata inputProof) external {
    _mixedAddress = FHE.fromExternal(inputValue, inputProof);
    FHE.allowThis(_mixedAddress);
    FHE.allow(_mixedAddress, msg.sender);
  }

  function getMixedUint() external view returns (euint32) {
    return _mixedUint;
  }

  function getMixedBool() external view returns (ebool) {
    return _mixedBool;
  }

  function getMixedAddress() external view returns (eaddress) {
    return _mixedAddress;
  }
}


```

{% endtab %}

{% tab title="FHEEncryptionPatterns.ts" %}

```typescript
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


```

{% endtab %}

{% endtabs %}
