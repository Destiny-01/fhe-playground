Example: CreditScoreCheck

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="CreditScoreCheck.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, ebool, euint16, externalEuint16} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Credit Score Check - Verify creditworthiness privately
/// @notice This contract demonstrates how to verify a user's creditworthiness based on their
///         credit score without revealing the actual score. This is useful for lending platforms,
///         rental applications, or financial services that need to assess risk while maintaining
///         user privacy.
///         The contract allows users to prove they meet credit score thresholds for different
///         loan tiers or service levels without exposing their exact credit score.
contract CreditScoreCheck is ZamaEthereumConfig {
    // Mapping from user address to their encrypted credit score
    mapping(address => euint16) private _creditScores;

    // Mapping from user address to encrypted qualification results for each tier
    mapping(address => ebool) private _excellentResults;
    mapping(address => ebool) private _goodResults;
    mapping(address => ebool) private _fairResults;
    mapping(address => ebool) private _minimumResults;

    // Credit score thresholds for different tiers
    uint16 public constant EXCELLENT_THRESHOLD = 750; // Excellent credit
    uint16 public constant GOOD_THRESHOLD = 700; // Good credit
    uint16 public constant FAIR_THRESHOLD = 650; // Fair credit
    uint16 public constant MINIMUM_THRESHOLD = 600; // Minimum acceptable

    // solhint-disable-next-line no-empty-blocks
    constructor() {}

    /// @dev Register a user's encrypted credit score and compute all tier qualifications
    /// @param encryptedScore The user's credit score encrypted as euint16
    /// @param inputProof The zero-knowledge proof for the encrypted score
    /// @notice The credit score is stored encrypted and all tier qualifications are computed
    function registerCreditScore(
        externalEuint16 encryptedScore,
        bytes calldata inputProof
    ) external {
        euint16 score = FHE.fromExternal(encryptedScore, inputProof);
        FHE.allowThis(score);
        _creditScores[msg.sender] = score;

        // Compute all tier qualifications
        euint16 excellentThreshold = FHE.asEuint16(EXCELLENT_THRESHOLD);
        ebool excellent = FHE.ge(score, excellentThreshold);
        FHE.allowThis(excellent);
        FHE.allow(excellent, msg.sender);
        _excellentResults[msg.sender] = excellent;

        euint16 goodThreshold = FHE.asEuint16(GOOD_THRESHOLD);
        ebool good = FHE.ge(score, goodThreshold);
        FHE.allowThis(good);
        FHE.allow(good, msg.sender);
        _goodResults[msg.sender] = good;

        euint16 fairThreshold = FHE.asEuint16(FAIR_THRESHOLD);
        ebool fair = FHE.ge(score, fairThreshold);
        FHE.allowThis(fair);
        FHE.allow(fair, msg.sender);
        _fairResults[msg.sender] = fair;

        euint16 minimumThreshold = FHE.asEuint16(MINIMUM_THRESHOLD);
        ebool minimum = FHE.ge(score, minimumThreshold);
        FHE.allowThis(minimum);
        FHE.allow(minimum, msg.sender);
        _minimumResults[msg.sender] = minimum;
    }

    /// @dev Get encrypted result for excellent credit tier qualification
    /// @param user The address of the user to check
    /// @return Encrypted boolean (true if credit score >= 750)
    function qualifiesForExcellent(address user) external view returns (ebool) {
        return _excellentResults[user];
    }

    /// @dev Get encrypted result for good credit tier qualification
    /// @param user The address of the user to check
    /// @return Encrypted boolean (true if credit score >= 700)
    function qualifiesForGood(address user) external view returns (ebool) {
        return _goodResults[user];
    }

    /// @dev Get encrypted result for fair credit tier qualification
    /// @param user The address of the user to check
    /// @return Encrypted boolean (true if credit score >= 650)
    function qualifiesForFair(address user) external view returns (ebool) {
        return _fairResults[user];
    }

    /// @dev Get encrypted result for minimum credit requirement
    /// @param user The address of the user to check
    /// @return Encrypted boolean (true if credit score >= 600)
    function meetsMinimumRequirement(
        address user
    ) external view returns (ebool) {
        return _minimumResults[user];
    }

    /// @dev Get the encrypted credit score for a user
    /// @param user The address of the user
    /// @return The encrypted credit score value
    function getEncryptedScore(address user) external view returns (euint16) {
        return _creditScores[user];
    }
}

```

{% endtab %}

{% tab title="CreditScoreCheck.ts" %}

```typescript
import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import { CreditScoreCheck, CreditScoreCheck__factory } from "../../../types";
import type { Signers } from "./types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory("CreditScoreCheck")) as CreditScoreCheck__factory;
  const creditScoreCheck = (await factory.deploy()) as CreditScoreCheck;
  const creditScoreCheck_address = await creditScoreCheck.getAddress();

  return { creditScoreCheck, creditScoreCheck_address };
}

/**
 * This example demonstrates credit score verification without revealing the actual score.
 * Users can prove they meet credit score thresholds for different tiers without exposing their exact score.
 */
describe("CreditScoreCheck", function () {
  let contract: CreditScoreCheck;
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
    contractAddress = deployment.creditScoreCheck_address;
    contract = deployment.creditScoreCheck;
  });

  // Helper function to decrypt ebool
  async function decryptEbool(encrypted: any, user: HardhatEthersSigner): Promise<boolean> {
    return await fhevm.userDecryptEbool(
      typeof encrypted === 'string' ? encrypted : ethers.hexlify(encrypted),
      contractAddress,
      user
    );
  }

  // ✅ Test should succeed - excellent credit score
  it("should qualify user with excellent credit score", async function () {

    const creditScore = 780; // Above excellent threshold of 750

    const input = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add16(creditScore)
      .encrypt();

    let tx = await contract
      .connect(signers.alice)
      .registerCreditScore(input.handles[0], input.inputProof);
    await tx.wait();

    const excellent = await contract.qualifiesForExcellent(signers.alice.address);
    const good = await contract.qualifiesForGood(signers.alice.address);
    const fair = await contract.qualifiesForFair(signers.alice.address);
    const minimum = await contract.meetsMinimumRequirement(signers.alice.address);
    
    const excellentResult = await fhevm.userDecryptEbool(
      typeof excellent === 'string' ? excellent : ethers.hexlify(excellent),
      contractAddress,
      signers.alice
    );
    const goodResult = await fhevm.userDecryptEbool(
      typeof good === 'string' ? good : ethers.hexlify(good),
      contractAddress,
      signers.alice
    );
    const fairResult = await fhevm.userDecryptEbool(
      typeof fair === 'string' ? fair : ethers.hexlify(fair),
      contractAddress,
      signers.alice
    );
    const minimumResult = await fhevm.userDecryptEbool(
      typeof minimum === 'string' ? minimum : ethers.hexlify(minimum),
      contractAddress,
      signers.alice
    );
    
    expect(excellentResult).to.be.true;
    expect(goodResult).to.be.true;
    expect(fairResult).to.be.true;
    expect(minimumResult).to.be.true;
  });

  // ✅ Test should succeed - good credit score
  it("should qualify user with good credit score", async function () {
    const creditScore = 720; // Above good threshold of 700, below excellent

    const input = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add16(creditScore)
      .encrypt();

    let tx = await contract
      .connect(signers.alice)
      .registerCreditScore(input.handles[0], input.inputProof);
    await tx.wait();

    const excellent = await contract.qualifiesForExcellent(signers.alice.address);
    const good = await contract.qualifiesForGood(signers.alice.address);
    const fair = await contract.qualifiesForFair(signers.alice.address);
    const minimum = await contract.meetsMinimumRequirement(signers.alice.address);

    expect(await decryptEbool(excellent, signers.alice)).to.be.false;
    expect(await decryptEbool(good, signers.alice)).to.be.true;
    expect(await decryptEbool(fair, signers.alice)).to.be.true;
    expect(await decryptEbool(minimum, signers.alice)).to.be.true;
  });

  // ✅ Test should succeed - fair credit score
  it("should qualify user with fair credit score", async function () {
    const creditScore = 670; // Above fair threshold of 650, below good

    const input = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add16(creditScore)
      .encrypt();

    let tx = await contract
      .connect(signers.alice)
      .registerCreditScore(input.handles[0], input.inputProof);
    await tx.wait();

    const excellent = await contract.qualifiesForExcellent(signers.alice.address);
    const good = await contract.qualifiesForGood(signers.alice.address);
    const fair = await contract.qualifiesForFair(signers.alice.address);
    const minimum = await contract.meetsMinimumRequirement(signers.alice.address);

    expect(await decryptEbool(excellent, signers.alice)).to.be.false;
    expect(await decryptEbool(good, signers.alice)).to.be.false;
    expect(await decryptEbool(fair, signers.alice)).to.be.true;
    expect(await decryptEbool(minimum, signers.alice)).to.be.true;
  });

  // ❌ Test should fail - below minimum credit score
  it("should reject user below minimum credit score", async function () {
    const creditScore = 580; // Below minimum threshold of 600

    const input = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add16(creditScore)
      .encrypt();

    let tx = await contract
      .connect(signers.bob)
      .registerCreditScore(input.handles[0], input.inputProof);
    await tx.wait();

    const excellent = await contract.qualifiesForExcellent(signers.bob.address);
    const good = await contract.qualifiesForGood(signers.bob.address);
    const fair = await contract.qualifiesForFair(signers.bob.address);
    const minimum = await contract.meetsMinimumRequirement(signers.bob.address);

    expect(await decryptEbool(excellent, signers.bob)).to.be.false;
    expect(await decryptEbool(good, signers.bob)).to.be.false;
    expect(await decryptEbool(fair, signers.bob)).to.be.false;
    expect(await decryptEbool(minimum, signers.bob)).to.be.false;
  });

  // ✅ Test should succeed - multiple users with different scores
  it("should handle multiple users with different credit scores", async function () {
    // Alice has excellent credit
    const aliceScore = 800;
    const aliceInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add16(aliceScore)
      .encrypt();
    let tx = await contract
      .connect(signers.alice)
      .registerCreditScore(aliceInput.handles[0], aliceInput.inputProof);
    await tx.wait();

    // Bob has poor credit
    const bobScore = 550;
    const bobInput = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add16(bobScore)
      .encrypt();
    tx = await contract
      .connect(signers.bob)
      .registerCreditScore(bobInput.handles[0], bobInput.inputProof);
    await tx.wait();

    const aliceExcellent = await contract.qualifiesForExcellent(signers.alice.address);
    const bobMinimum = await contract.meetsMinimumRequirement(signers.bob.address);

    expect(await decryptEbool(aliceExcellent, signers.alice)).to.be.true;
    expect(await decryptEbool(bobMinimum, signers.bob)).to.be.false;
  });
});


```

{% endtab %}

{% endtabs %}
