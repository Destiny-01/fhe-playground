Example: EncryptedKYC

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="EncryptedKYC.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, ebool, euint8, euint32, externalEuint8, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Encrypted KYC - Identity attributes with selective disclosure
/// @notice This contract demonstrates how to store and verify Know Your Customer (KYC) identity
///         attributes with selective disclosure. Users can prove they meet specific requirements
///         (e.g., age, residency status, account balance) without revealing all their information.
///         This is useful for financial services, exchanges, or platforms that need to comply
///         with KYC regulations while respecting user privacy.
contract EncryptedKYC is ZamaEthereumConfig {
    /// @dev Structure to hold encrypted KYC attributes
    struct KYCData {
        euint8 age; // User's age
        euint8 residencyStatus; // 0 = non-resident, 1 = resident
        euint32 accountBalance; // Account balance in smallest unit
        bool verified; // Whether KYC has been verified by an authority
    }

    // Mapping from user address to their encrypted KYC data
    mapping(address => KYCData) private _kycData;

    // Mapping from user address to encrypted verification results
    mapping(address => ebool) private _ageResults;
    mapping(address => ebool) private _residencyResults;
    mapping(address => ebool) private _balanceResults;

    // Minimum age requirement for KYC
    uint8 public constant MINIMUM_AGE = 18;

    // Minimum account balance threshold (in smallest unit, e.g., cents)
    uint32 public constant MINIMUM_BALANCE = 10000; // e.g., $100.00

    // solhint-disable-next-line no-empty-blocks
    constructor() {}

    /// @dev Register or update KYC data for a user and compute verification results
    /// @param encryptedAge The user's age encrypted as euint8
    /// @param ageProof The zero-knowledge proof for the encrypted age
    /// @param encryptedResidency The residency status encrypted as euint8 (0 or 1)
    /// @param residencyProof The zero-knowledge proof for the encrypted residency
    /// @param encryptedBalance The account balance encrypted as euint32
    /// @param balanceProof The zero-knowledge proof for the encrypted balance
    /// @notice All attributes are stored encrypted and verification results are computed
    function registerKYCData(
        externalEuint8 encryptedAge,
        bytes calldata ageProof,
        externalEuint8 encryptedResidency,
        bytes calldata residencyProof,
        externalEuint32 encryptedBalance,
        bytes calldata balanceProof
    ) external {
        euint8 age = FHE.fromExternal(encryptedAge, ageProof);
        FHE.allowThis(age);

        euint8 residency = FHE.fromExternal(encryptedResidency, residencyProof);
        FHE.allowThis(residency);

        euint32 balance = FHE.fromExternal(encryptedBalance, balanceProof);
        FHE.allowThis(balance);

        _kycData[msg.sender] = KYCData({
            age: age,
            residencyStatus: residency,
            accountBalance: balance,
            verified: false
        });

        // Compute age requirement result
        euint8 minAge = FHE.asEuint8(MINIMUM_AGE);
        ebool meetsAge = FHE.ge(age, minAge);
        FHE.allowThis(meetsAge);
        FHE.allow(meetsAge, msg.sender);
        _ageResults[msg.sender] = meetsAge;

        // Compute residency result
        euint8 one = FHE.asEuint8(1);
        ebool isCurrResident = FHE.eq(residency, one);
        FHE.allowThis(isCurrResident);
        FHE.allow(isCurrResident, msg.sender);
        _residencyResults[msg.sender] = isCurrResident;

        // Compute balance requirement result
        euint32 minBalance = FHE.asEuint32(MINIMUM_BALANCE);
        ebool meetsBalance = FHE.ge(balance, minBalance);
        FHE.allowThis(meetsBalance);
        FHE.allow(meetsBalance, msg.sender);
        _balanceResults[msg.sender] = meetsBalance;
    }

    /// @dev Mark a user's KYC as verified by an authorized party
    /// @param user The address of the user to verify
    /// @notice Only callable by the contract owner or authorized verifier
    function verifyKYC(address user) external {
        // In a real implementation, you would add access control here
        // For this example, we'll allow anyone to verify (but in production, use role-based access)
        _kycData[user].verified = true;
    }

    /// @dev Get encrypted result for age requirement check
    /// @param user The address of the user to check
    /// @return Encrypted boolean (true if user's age >= MINIMUM_AGE)
    function meetsAgeRequirement(address user) external view returns (ebool) {
        return _ageResults[user];
    }

    /// @dev Get encrypted result for residency check
    /// @param user The address of the user to check
    /// @return Encrypted boolean (true if residencyStatus == 1)
    function isResident(address user) external view returns (ebool) {
        return _residencyResults[user];
    }

    /// @dev Get encrypted result for balance requirement check
    /// @param user The address of the user to check
    /// @return Encrypted boolean (true if accountBalance >= MINIMUM_BALANCE)
    function meetsBalanceRequirement(
        address user
    ) external view returns (ebool) {
        return _balanceResults[user];
    }

    /// @dev Check if a user's KYC has been verified (plain boolean, not encrypted)
    /// @param user The address of the user to check
    /// @return True if KYC has been verified by an authority
    function isVerified(address user) external view returns (bool) {
        return _kycData[user].verified;
    }

    /// @dev Get encrypted KYC data for a user (for testing/verification purposes)
    /// @param user The address of the user
    /// @return age The encrypted age
    /// @return residencyStatus The encrypted residency status
    /// @return accountBalance The encrypted account balance
    /// @return verified Whether KYC has been verified
    function getKYCData(
        address user
    )
        external
        view
        returns (
            euint8 age,
            euint8 residencyStatus,
            euint32 accountBalance,
            bool verified
        )
    {
        KYCData memory data = _kycData[user];
        return (
            data.age,
            data.residencyStatus,
            data.accountBalance,
            data.verified
        );
    }
}

```

{% endtab %}

{% tab title="EncryptedKYC.ts" %}

```typescript
import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import { EncryptedKYC, EncryptedKYC__factory } from "../../../types";
import type { Signers } from "./types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory("EncryptedKYC")) as EncryptedKYC__factory;
  const encryptedKYC = (await factory.deploy()) as EncryptedKYC;
  const encryptedKYC_address = await encryptedKYC.getAddress();

  return { encryptedKYC, encryptedKYC_address };
}

/**
 * This example demonstrates KYC identity verification with selective disclosure.
 * Users can prove they meet specific requirements without revealing all their information.
 */
describe("EncryptedKYC", function () {
  let contract: EncryptedKYC;
  let contractAddress: string;
  let signers: Signers;
  let fhevm: HardhatFhevmRuntimeEnvironment;

  before(async function () {
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { owner: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
    fhevm = hre.fhevm;
  });

  beforeEach(async function () {
    const deployment = await deployFixture();
    contractAddress = deployment.encryptedKYC_address;
    contract = deployment.encryptedKYC;
  });

  // Helper function to decrypt ebool
  async function decryptEbool(encrypted: any, user: HardhatEthersSigner): Promise<boolean> {
    return await fhevm.userDecryptEbool(
      typeof encrypted === 'string' ? encrypted : ethers.hexlify(encrypted),
      contractAddress,
      user
    );
  }

  // ✅ Test should succeed - user meets all requirements
  it("should verify user meets all KYC requirements", async function () {

    const age = 25; // Above minimum of 18
    const residencyStatus = 1; // Resident
    const accountBalance = 50000; // Above minimum of 10000

    const ageInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(age)
      .encrypt();
    const residencyInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(residencyStatus)
      .encrypt();
    const balanceInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(accountBalance)
      .encrypt();

    let tx = await contract
      .connect(signers.alice)
      .registerKYCData(
        ageInput.handles[0],
        ageInput.inputProof,
        residencyInput.handles[0],
        residencyInput.inputProof,
        balanceInput.handles[0],
        balanceInput.inputProof
      );
    await tx.wait();

    // Verify individual requirements
    const ageResult = await contract.meetsAgeRequirement(signers.alice.address);
    const residencyResult = await contract.isResident(signers.alice.address);
    const balanceResult = await contract.meetsBalanceRequirement(signers.alice.address);

    expect(await decryptEbool(ageResult, signers.alice)).to.be.true;
    expect(await decryptEbool(residencyResult, signers.alice)).to.be.true;
    expect(await decryptEbool(balanceResult, signers.alice)).to.be.true;

    // Verify KYC and mark as verified
    tx = await contract.connect(signers.owner).verifyKYC(signers.alice.address);
    await tx.wait();

    expect(await contract.isVerified(signers.alice.address)).to.be.true;
  });

  // ❌ Test should fail - user below minimum age
  it("should reject user below minimum age", async function () {

    const age = 16; // Below minimum of 18
    const residencyStatus = 1;
    const accountBalance = 50000;

    const ageInput = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add8(age)
      .encrypt();
    const residencyInput = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add8(residencyStatus)
      .encrypt();
    const balanceInput = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add32(accountBalance)
      .encrypt();

    let tx = await contract
      .connect(signers.bob)
      .registerKYCData(
        ageInput.handles[0],
        ageInput.inputProof,
        residencyInput.handles[0],
        residencyInput.inputProof,
        balanceInput.handles[0],
        balanceInput.inputProof
      );
    await tx.wait();

    const ageResult = await contract.meetsAgeRequirement(signers.bob.address);
    const residencyResult = await contract.isResident(signers.bob.address);
    const balanceResult = await contract.meetsBalanceRequirement(signers.bob.address);

    expect(await decryptEbool(ageResult, signers.bob)).to.be.false;
    expect(await decryptEbool(residencyResult, signers.bob)).to.be.true;
    expect(await decryptEbool(balanceResult, signers.bob)).to.be.true;
  });

  // ❌ Test should fail - user is not a resident
  it("should reject non-resident user", async function () {

    const age = 25;
    const residencyStatus = 0; // Non-resident
    const accountBalance = 50000;

    const ageInput = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add8(age)
      .encrypt();
    const residencyInput = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add8(residencyStatus)
      .encrypt();
    const balanceInput = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add32(accountBalance)
      .encrypt();

    let tx = await contract
      .connect(signers.bob)
      .registerKYCData(
        ageInput.handles[0],
        ageInput.inputProof,
        residencyInput.handles[0],
        residencyInput.inputProof,
        balanceInput.handles[0],
        balanceInput.inputProof
      );
    await tx.wait();

    const ageResult = await contract.meetsAgeRequirement(signers.bob.address);
    const residencyResult = await contract.isResident(signers.bob.address);
    const balanceResult = await contract.meetsBalanceRequirement(signers.bob.address);

    expect(await decryptEbool(ageResult, signers.bob)).to.be.true;
    expect(await decryptEbool(residencyResult, signers.bob)).to.be.false;
    expect(await decryptEbool(balanceResult, signers.bob)).to.be.true;
  });

  // ❌ Test should fail - user below minimum balance
  it("should reject user below minimum balance", async function () {

    const age = 25;
    const residencyStatus = 1;
    const accountBalance = 5000; // Below minimum of 10000

    const ageInput = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add8(age)
      .encrypt();
    const residencyInput = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add8(residencyStatus)
      .encrypt();
    const balanceInput = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add32(accountBalance)
      .encrypt();

    let tx = await contract
      .connect(signers.bob)
      .registerKYCData(
        ageInput.handles[0],
        ageInput.inputProof,
        residencyInput.handles[0],
        residencyInput.inputProof,
        balanceInput.handles[0],
        balanceInput.inputProof
      );
    await tx.wait();

    const ageResult = await contract.meetsAgeRequirement(signers.bob.address);
    const residencyResult = await contract.isResident(signers.bob.address);
    const balanceResult = await contract.meetsBalanceRequirement(signers.bob.address);

    expect(await decryptEbool(ageResult, signers.bob)).to.be.true;
    expect(await decryptEbool(residencyResult, signers.bob)).to.be.true;
    expect(await decryptEbool(balanceResult, signers.bob)).to.be.false;
  });

  // ✅ Test should succeed - selective disclosure of requirements
  it("should allow selective disclosure of requirements", async function () {

    const age = 30;
    const residencyStatus = 1;
    const accountBalance = 20000;

    const ageInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(age)
      .encrypt();
    const residencyInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(residencyStatus)
      .encrypt();
    const balanceInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(accountBalance)
      .encrypt();

    let tx = await contract
      .connect(signers.alice)
      .registerKYCData(
        ageInput.handles[0],
        ageInput.inputProof,
        residencyInput.handles[0],
        residencyInput.inputProof,
        balanceInput.handles[0],
        balanceInput.inputProof
      );
    await tx.wait();

    // Can check individual requirements without revealing all data
    const ageResult = await contract.meetsAgeRequirement(signers.alice.address);
    const residencyResult = await contract.isResident(signers.alice.address);
    const balanceResult = await contract.meetsBalanceRequirement(signers.alice.address);

    expect(await decryptEbool(ageResult, signers.alice)).to.be.true;
    expect(await decryptEbool(residencyResult, signers.alice)).to.be.true;
    expect(await decryptEbool(balanceResult, signers.alice)).to.be.true;

    // Before verification, not verified
    expect(await contract.isVerified(signers.alice.address)).to.be.false;

    // After verification, verified
    tx = await contract.connect(signers.owner).verifyKYC(signers.alice.address);
    await tx.wait();
    expect(await contract.isVerified(signers.alice.address)).to.be.true;
  });
});


```

{% endtab %}

{% endtabs %}
