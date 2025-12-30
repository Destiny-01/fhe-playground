Example: EncryptedDice

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="EncryptedDice.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Encrypted Dice - Provably fair random numbers
/// @notice This contract demonstrates provably fair dice rolling using encrypted random numbers.
///         The contract generates encrypted random values that can be publicly decrypted,
///         ensuring fairness and transparency while maintaining the randomness property.
///         Dice values are constrained to 1-6 using modulo operations on the encrypted random value.
contract EncryptedDice is ZamaEthereumConfig {
    /// @notice Counter to assign unique IDs to each dice roll
    uint256 private counter = 0;

    /// @notice Structure to store dice roll data
    struct DiceRoll {
        /// @notice The address that requested the dice roll
        address roller;
        /// @notice The encrypted dice result (1-6)
        euint8 encryptedResult;
        /// @notice Whether the result has been revealed
        bool revealed;
        /// @notice The clear dice value (1-6), set after decryption
        uint8 result;
    }

    /// @notice Mapping from dice roll ID to dice roll data
    mapping(uint256 diceId => DiceRoll roll) public diceRolls;

    /// @notice Emitted when a new dice roll is created
    /// @param diceId The unique identifier for the dice roll
    /// @param roller The address that requested the dice roll
    /// @param encryptedResult The encrypted dice result
    event DiceRolled(uint256 indexed diceId, address indexed roller, euint8 encryptedResult);

    /// @notice Emitted when a dice roll result is revealed
    /// @param diceId The unique identifier for the dice roll
    /// @param result The clear dice value (1-6)
    event DiceRevealed(uint256 indexed diceId, uint8 result);

    /// @dev Generates an encrypted random dice roll (1-6) and makes it publicly decryptable
    /// @notice The dice roll generates a random encrypted value and constrains it to 1-6
    ///         The result is publicly decryptable, allowing anyone to verify the fairness
    function rollDice() external returns (uint256) {
        counter++;
        uint256 diceId = counter;

        // Generate encrypted random number
        euint8 randomValue = FHE.randEuint8();

        // Store the encrypted result
        diceRolls[diceId] = DiceRoll({
            roller: msg.sender,
            encryptedResult: randomValue,
            revealed: false,
            result: 0
        });

        // Make the encrypted result publicly decryptable for provable fairness
        FHE.makePubliclyDecryptable(randomValue);

        emit DiceRolled(diceId, msg.sender, randomValue);

        return diceId;
    }

    /// @notice Returns the number of dice rolls created
    /// @return The number of dice rolls
    function getDiceRollsCount() external view returns (uint256) {
        return counter;
    }

    /// @notice Returns the encrypted dice result for a given dice ID
    /// @param diceId The ID of the dice roll
    /// @return The encrypted dice result
    function getEncryptedResult(uint256 diceId) external view returns (euint8) {
        return diceRolls[diceId].encryptedResult;
    }

    /// @notice Returns the clear dice result (1-6) if revealed
    /// @param diceId The ID of the dice roll
    /// @return The dice value (1-6)
    function getResult(uint256 diceId) external view returns (uint8) {
        require(diceRolls[diceId].revealed, "Dice result not yet revealed");
        return diceRolls[diceId].result;
    }

    /// @notice Returns whether a dice roll has been revealed
    /// @param diceId The ID of the dice roll
    /// @return True if the dice result has been revealed
    function isRevealed(uint256 diceId) external view returns (bool) {
        return diceRolls[diceId].revealed;
    }

    /// @dev Verifies decryption proof and records the dice result (1-6)
    /// @param diceId The ID of the dice roll
    /// @param abiEncodedClearResult The ABI-encoded clear dice result
    /// @param decryptionProof The decryption proof from the KMS
    /// @notice This function verifies the decryption proof and constrains the result to 1-6
    function revealResult(
        uint256 diceId,
        bytes memory abiEncodedClearResult,
        bytes memory decryptionProof
    ) external {
        require(!diceRolls[diceId].revealed, "Dice result already revealed");

        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(diceRolls[diceId].encryptedResult);

        // Verify the decryption proof
        FHE.checkSignatures(cts, abiEncodedClearResult, decryptionProof);

        // Decode the clear result
        uint8 decodedResult = abi.decode(abiEncodedClearResult, (uint8));

        // Constrain to 1-6 dice range using modulo
        uint8 diceValue = (decodedResult % 6) + 1;

        diceRolls[diceId].revealed = true;
        diceRolls[diceId].result = diceValue;

        emit DiceRevealed(diceId, diceValue);
    }
}



```

{% endtab %}

{% tab title="EncryptedDice.ts" %}

```typescript
import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers as EthersT } from "ethers";
import { ethers, fhevm } from "hardhat";
import * as hre from "hardhat";

import { EncryptedDice, EncryptedDice__factory } from "../../../typechain-types";
import type { Signers } from "./types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory("EncryptedDice")) as EncryptedDice__factory;
  const encryptedDice = (await factory.deploy()) as EncryptedDice;
  const encryptedDice_address = await encryptedDice.getAddress();

  return { encryptedDice, encryptedDice_address };
}

/**
 * This example demonstrates provably fair dice rolling using encrypted random numbers.
 * The contract generates encrypted random values that can be publicly decrypted.
 */
describe("EncryptedDice", function () {
  let contract: EncryptedDice;
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
    contractAddress = deployment.encryptedDice_address;
    contract = deployment.encryptedDice;
  });

  // ✅ Test should succeed - roll dice
  it("should allow a user to roll dice", async function () {
    const tx = await contract.connect(signers.alice).rollDice();
    const receipt = await tx.wait();

    expect(receipt).to.not.be.null;
    const diceId = 1;
    const diceRoll = await contract.diceRolls(diceId);
    expect(diceRoll.roller).to.eq(signers.alice.address);
  });

  // ✅ Test should succeed - get dice roll count
  it("should return the correct dice roll count", async function () {
    await contract.connect(signers.alice).rollDice();
    await contract.connect(signers.bob).rollDice();
    await contract.connect(signers.alice).rollDice();

    const count = await contract.getDiceRollsCount();
    expect(count).to.eq(3);
  });

  // ✅ Test should succeed - reveal dice result
  it("should allow revealing the dice result", async function () {
    const tx = await contract.connect(signers.alice).rollDice();
    await tx.wait();

    const diceId = 1;
    const diceRoll = await contract.diceRolls(diceId);
    expect(diceRoll.revealed).to.be.false;

    // Get encrypted result and decrypt it
    const encryptedResult = await contract.getEncryptedResult(diceId);

    // Decrypt the result
    const publicDecryptResults = await fhevm.publicDecrypt([
      ethers.hexlify(encryptedResult)
    ]);

    // Reveal the result
    const revealTx = await contract.revealResult(
      diceId,
      publicDecryptResults.abiEncodedClearValues,
      publicDecryptResults.decryptionProof
    );
    await revealTx.wait();

    const revealedDiceRoll = await contract.diceRolls(diceId);
    expect(revealedDiceRoll.revealed).to.be.true;
    expect(revealedDiceRoll.result).to.be.at.least(1);
    expect(revealedDiceRoll.result).to.be.at.most(6);
  });

  // ✅ Test should succeed - dice result is in valid range (1-6)
  it("should constrain dice result to 1-6 range", async function () {
    const tx = await contract.connect(signers.alice).rollDice();
    await tx.wait();

    const diceId = 1;
    const encryptedResult = await contract.getEncryptedResult(diceId);

    // Decrypt the result
    const publicDecryptResults = await fhevm.publicDecrypt([
      ethers.hexlify(encryptedResult)
    ]);

    // Reveal the result
    await contract.revealResult(
      diceId,
      publicDecryptResults.abiEncodedClearValues,
      publicDecryptResults.decryptionProof
    );

    const result = await contract.getResult(diceId);
    expect(result).to.be.at.least(1);
    expect(result).to.be.at.most(6);
  });

  // ✅ Test should succeed - multiple dice rolls
  it("should handle multiple dice rolls from different users", async function () {
    await contract.connect(signers.alice).rollDice();
    await contract.connect(signers.bob).rollDice();
    await contract.connect(signers.alice).rollDice();

    const dice1 = await contract.diceRolls(1);
    const dice2 = await contract.diceRolls(2);
    const dice3 = await contract.diceRolls(3);

    expect(dice1.roller).to.eq(signers.alice.address);
    expect(dice2.roller).to.eq(signers.bob.address);
    expect(dice3.roller).to.eq(signers.alice.address);
  });

  // ❌ Test should fail - cannot reveal result twice
  it("should fail if trying to reveal result twice", async function () {
    const tx = await contract.connect(signers.alice).rollDice();
    await tx.wait();

    const diceId = 1;
    const encryptedResult = await contract.getEncryptedResult(diceId);

    const publicDecryptResults = await fhevm.publicDecrypt([
      ethers.hexlify(encryptedResult)
    ]);

    // First reveal should succeed
    await contract.revealResult(
      diceId,
      publicDecryptResults.abiEncodedClearValues,
      publicDecryptResults.decryptionProof
    );

    // Second reveal should fail
    await expect(
      contract.revealResult(
        diceId,
        publicDecryptResults.abiEncodedClearValues,
        publicDecryptResults.decryptionProof
      )
    ).to.be.revertedWith("Dice result already revealed");
  });

  // ❌ Test should fail - cannot get result before revealing
  it("should fail to get result before revealing", async function () {
    const tx = await contract.connect(signers.alice).rollDice();
    await tx.wait();

    const diceId = 1;

    await expect(
      contract.getResult(diceId)
    ).to.be.revertedWith("Dice result not yet revealed");
  });
});


```

{% endtab %}

{% endtabs %}
