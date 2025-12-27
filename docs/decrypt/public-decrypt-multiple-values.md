@notice Simple counter to assign a unique ID to each new game.

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="PublicDecryptMultipleValues.sol" %}

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint8 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Public Decrypt Multiple Values - Demonstrates public permissionless decryption for multiple encrypted values
contract PublicDecryptMultipleValues is ZamaEthereumConfig {
    constructor() {}

    /**
     * @notice Simple counter to assign a unique ID to each new game.
     */
    uint256 private counter = 0;

    /**
     * @notice Defines the entire state for a single Heads or Tails game instance.
     */
    struct Game {
        /// @notice The address of the player who chose Heads.
        address playerA;
        /// @notice The address of the player who chose Tails.
        address playerB;
        /// @notice The core encrypted result. This is a publicly decryptable set of 4 handle.
        euint8 playerAEncryptedDieRoll;
        euint8 playerBEncryptedDieRoll;
        /// @notice The clear address of the final winne, address(0) if draw, set after decryption and verification.
        address winner;
        /// @notice true if the game result is revealed
        bool revealed;
    }

    /**
     * @notice Mapping to store all game states, accessible by a unique game ID.
     */
    mapping(uint256 gameId => Game game) public games;

    /**
     * @notice Emitted when a new game is started, providing the encrypted handle required for decryption.
     * @param gameId The unique identifier for the game.
     * @param playerA The address of playerA.
     * @param playerB The address of playerB.
     * @param playerAEncryptedDieRoll The encrypted die roll result of playerA.
     * @param playerBEncryptedDieRoll The encrypted die roll result of playerB.
     */
    event GameCreated(
        uint256 indexed gameId,
        address indexed playerA,
        address indexed playerB,
        euint8 playerAEncryptedDieRoll,
        euint8 playerBEncryptedDieRoll
    );

    /// @dev Generates multiple encrypted random values and makes them publicly decryptable
    function highestDieRoll(address playerA, address playerB) external {
        require(playerA != address(0), "playerA is address zero");
        require(playerB != address(0), "playerB player is address zero");
        require(playerA != playerB, "playerA and playerB should be different");

        euint8 playerAEncryptedDieRoll = FHE.randEuint8();
        euint8 playerBEncryptedDieRoll = FHE.randEuint8();

        counter++;

        uint256 gameId = counter;
        games[gameId] = Game({
            playerA: playerA,
            playerB: playerB,
            playerAEncryptedDieRoll: playerAEncryptedDieRoll,
            playerBEncryptedDieRoll: playerBEncryptedDieRoll,
            winner: address(0),
            revealed: false
        });

        FHE.makePubliclyDecryptable(playerAEncryptedDieRoll);
        FHE.makePubliclyDecryptable(playerBEncryptedDieRoll);

        emit GameCreated(gameId, playerA, playerB, playerAEncryptedDieRoll, playerBEncryptedDieRoll);
    }

    /**
     * @notice Returns the number of games created so far.
     * @return The number of games created.
     */
    function getGamesCount() public view returns (uint256) {
        return counter;
    }

    /**
     * @notice Returns the encrypted euint8 handle that stores the playerA die roll.
     * @param gameId The ID of the game.
     * @return The encrypted result (euint8 handle).
     */
    function getPlayerADieRoll(uint256 gameId) public view returns (euint8) {
        return games[gameId].playerAEncryptedDieRoll;
    }

    /**
     * @notice Returns the encrypted euint8 handle that stores the playerB die roll.
     * @param gameId The ID of the game.
     * @return The encrypted result (euint8 handle).
     */
    function getPlayerBDieRoll(uint256 gameId) public view returns (euint8) {
        return games[gameId].playerBEncryptedDieRoll;
    }

    /**
     * @notice Returns the address of the game winner. If the game is finalized, the function returns `address(0)`
     *         if the game is a draw.
     * @param gameId The ID of the game.
     * @return The winner's address (address(0) if not yet revealed or draw).
     */
    function getWinner(uint256 gameId) public view returns (address) {
        require(games[gameId].revealed, "Game winner not yet revealed");
        return games[gameId].winner;
    }

    /**
     * @notice Returns `true` if the game result is publicly revealed, `false` otherwise.
     * @param gameId The ID of the game.
     * @return true if the game is publicly revealed.
     */
    function isGameRevealed(uint256 gameId) public view returns (bool) {
        return games[gameId].revealed;
    }

    /// @dev Verifies decryption proof for multiple values and determines winner from publicly decrypted results
    function recordAndVerifyWinner(
        uint256 gameId,
        bytes memory abiEncodedClearGameResult,
        bytes memory decryptionProof
    ) public {
        require(!games[gameId].revealed, "Game already revealed");

        bytes32[] memory cts = new bytes32[](2);
        cts[0] = FHE.toBytes32(games[gameId].playerAEncryptedDieRoll);
        cts[1] = FHE.toBytes32(games[gameId].playerBEncryptedDieRoll);

        FHE.checkSignatures(cts, abiEncodedClearGameResult, decryptionProof);

        (uint8 decodedClearPlayerADieRoll, uint8 decodedClearPlayerBDieRoll) = abi.decode(
            abiEncodedClearGameResult,
            (uint8, uint8)
        );

        decodedClearPlayerADieRoll = (decodedClearPlayerADieRoll % 8) + 1;
        decodedClearPlayerBDieRoll = (decodedClearPlayerBDieRoll % 8) + 1;

        address winner = decodedClearPlayerADieRoll > decodedClearPlayerBDieRoll
            ? games[gameId].playerA
            : (decodedClearPlayerADieRoll < decodedClearPlayerBDieRoll ? games[gameId].playerB : address(0));

        games[gameId].revealed = true;
        games[gameId].winner = winner;
    }
}
```

{% endtab %}

{% tab title="PublicDecryptMultipleValues.ts" %}

```typescript
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { ClearValueType } from "@zama-fhe/relayer-sdk/node";
import { expect } from "chai";
import { ethers as EthersT } from "ethers";
import { ethers, fhevm } from "hardhat";
import * as hre from "hardhat";

import { PublicDecryptMultipleValues, PublicDecryptMultipleValues__factory } from "../../../typechain-types";
import { Signers } from "../signers";

async function deployFixture() {
  // Contracts are deployed using the first signer/account by default
  const factory = (await ethers.getContractFactory("PublicDecryptMultipleValues")) as PublicDecryptMultipleValues__factory;
  const publicDecryptMultipleValues = (await factory.deploy()) as PublicDecryptMultipleValues;
  const publicDecryptMultipleValues_address = await publicDecryptMultipleValues.getAddress();

  return { publicDecryptMultipleValues, publicDecryptMultipleValues_address };
}

describe("PublicDecryptMultipleValues", function () {
  let contract: PublicDecryptMultipleValues;
  let contractAddress: string;
  let signers: Signers;
  let playerA: HardhatEthersSigner;
  let playerB: HardhatEthersSigner;

  before(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { owner: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };

    playerA = signers.alice;
    playerB = signers.bob;
  });

  beforeEach(async function () {
    // Deploy a new contract each time we run a new test
    const deployment = await deployFixture();
    contractAddress = deployment.publicDecryptMultipleValues_address;
    contract = deployment.publicDecryptMultipleValues;
  });

  /**
   * Helper: Parses the GameCreated event from a transaction receipt.
   * WARNING: This function is for illustrative purposes only and is not production-ready
   * (it does not handle several events in same tx).
   */
  function parseGameCreatedEvent(txReceipt: EthersT.ContractTransactionReceipt | null): {
    txHash: `0x${string}`;
    gameId: number;
    playerA: `0x${string}`;
    playerB: `0x${string}`;
    playerAEncryptedDiceRoll: `0x${string}`;
    playerBEncryptedDiceRoll: `0x${string}`;
  } {
    const gameCreatedEvents: Array<{
      txHash: `0x${string}`;
      gameId: number;
      playerA: `0x${string}`;
      playerB: `0x${string}`;
      playerAEncryptedDiceRoll: `0x${string}`;
      playerBEncryptedDiceRoll: `0x${string}`;
    }> = [];

    if (txReceipt) {
      const logs = Array.isArray(txReceipt.logs) ? txReceipt.logs : [txReceipt.logs];
      for (let i = 0; i < logs.length; ++i) {
        const parsedLog = contract.interface.parseLog(logs[i]);
        if (!parsedLog || parsedLog.name !== "GameCreated") {
          continue;
        }
        const ge = {
          txHash: txReceipt.hash as `0x${string}`,
          gameId: Number(parsedLog.args[0]),
          playerA: parsedLog.args[1],
          playerB: parsedLog.args[2],
          playerAEncryptedDiceRoll: parsedLog.args[3],
          playerBEncryptedDiceRoll: parsedLog.args[4],
        };
        gameCreatedEvents.push(ge);
      }
    }

    // In this example, we expect on one single GameCreated event
    expect(gameCreatedEvents.length).to.eq(1);

    return gameCreatedEvents[0];
  }

  // ✅ Test should succeed
  it("decryption should succeed", async function () {
    console.log(``);
    console.log(`🎲 PublicDecryptMultipleValues Game contract address: ${contractAddress}`);
    console.log(`   🤖 playerA.address: ${playerA.address}`);
    console.log(`   🎃 playerB.address: ${playerB.address}`);
    console.log(``);

    // Starts a new game. This will emit a `GameCreated` event
    const tx = await contract.connect(signers.owner).highestDieRoll(playerA, playerB);

    // Parse the `GameCreated` event
    const gameCreatedEvent = parseGameCreatedEvent(await tx.wait())!;

    // GameId is 1 since we are playing the first game
    expect(gameCreatedEvent.gameId).to.eq(1);
    expect(gameCreatedEvent.playerA).to.eq(playerA.address);
    expect(gameCreatedEvent.playerB).to.eq(playerB.address);
    expect(await contract.getGamesCount()).to.eq(1);

    console.log(`✅ New game #${gameCreatedEvent.gameId} created!`);
    console.log(JSON.stringify(gameCreatedEvent, null, 2));

    const gameId = gameCreatedEvent.gameId;
    const playerADiceRoll = gameCreatedEvent.playerAEncryptedDiceRoll;
    const playerBDiceRoll = gameCreatedEvent.playerBEncryptedDiceRoll;

    // Call the Zama Relayer to compute the decryption
    const publicDecryptResults = await fhevm.publicDecrypt([playerADiceRoll, playerBDiceRoll]);

    // The Relayer returns a `PublicDecryptResults` object containing:
    // - the ORDERED clear values (here we have only one single value)
    // - the ORDERED clear values in ABI-encoded form
    // - the KMS decryption proof associated with the ORDERED clear values in ABI-encoded form
    const abiEncodedClearGameResult = publicDecryptResults.abiEncodedClearValues;
    const decryptionProof = publicDecryptResults.decryptionProof;

    const clearValueA: ClearValueType = publicDecryptResults.clearValues[playerADiceRoll];
    const clearValueB: ClearValueType = publicDecryptResults.clearValues[playerBDiceRoll];

    expect(typeof clearValueA).to.eq("bigint");
    expect(typeof clearValueB).to.eq("bigint");

    // playerA's 8-sided die roll result (between 1 and 8)
    const a = (Number(clearValueA) % 8) + 1;
    // playerB's 8-sided die roll result (between 1 and 8)
    const b = (Number(clearValueB) % 8) + 1;

    const isDraw = a === b;
    const playerAWon = a > b;
    const playerBWon = a < b;

    console.log(``);
    console.log(`🎲 playerA's 8-sided die roll is ${a}`);
    console.log(`🎲 playerB's 8-sided die roll is ${b}`);

    // Let's forward the `PublicDecryptResults` content to the on-chain contract whose job
    // will simply be to verify the proof and store the final winner of the game
    await contract.recordAndVerifyWinner(gameId, abiEncodedClearGameResult, decryptionProof);

    const isRevealed = await contract.isGameRevealed(gameId);
    const winner = await contract.getWinner(gameId);

    expect(isRevealed).to.eq(true);
    expect(winner === playerA.address || winner === playerB.address || winner === EthersT.ZeroAddress).to.eq(true);

    expect(isDraw).to.eq(winner === EthersT.ZeroAddress);
    expect(playerAWon).to.eq(winner === playerA.address);
    expect(playerBWon).to.eq(winner === playerB.address);

    console.log(``);
    if (winner === playerA.address) {
      console.log(`🤖 playerA is the winner 🥇🥇`);
    } else if (winner === playerB.address) {
      console.log(`🎃 playerB is the winner 🥇🥇`);
    } else if (winner === EthersT.ZeroAddress) {
      console.log(`Game is a draw!`);
    }
  });

  // ❌ Test should fail because clear values are ABI-encoded in the wrong order.
  it("decryption should fail when ABI-encoding is wrongly ordered", async function () {
    // Test Case: Verify strict ordering is enforced for cryptographic proof generation.
    // The `decryptionProof` is generated based on the expected order (A, B). By ABI-encoding
    // the clear values in the **reverse order** (B, A), we create a mismatch when the contract
    // internally verifies the proof (e.g., checks a signature against a newly computed hash).
    // This intentional failure is expected to revert with the `KMSInvalidSigner` error,
    // confirming the proof's order dependency.
    const tx = await contract.connect(signers.owner).highestDieRoll(playerA, playerB);
    const gameCreatedEvent = parseGameCreatedEvent(await tx.wait())!;
    const gameId = gameCreatedEvent.gameId;
    const playerADiceRoll = gameCreatedEvent.playerAEncryptedDiceRoll;
    const playerBDiceRoll = gameCreatedEvent.playerBEncryptedDiceRoll;
    // Call `fhevm.publicDecrypt` using order (A, B)
    const publicDecryptResults = await fhevm.publicDecrypt([playerADiceRoll, playerBDiceRoll]);
    const clearValueA: ClearValueType = publicDecryptResults.clearValues[playerADiceRoll];
    const clearValueB: ClearValueType = publicDecryptResults.clearValues[playerBDiceRoll];
    const decryptionProof = publicDecryptResults.decryptionProof;
    expect(typeof clearValueA).to.eq("bigint");
    expect(typeof clearValueB).to.eq("bigint");
    expect(ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "uint256"], [clearValueA, clearValueB])).to.eq(
      publicDecryptResults.abiEncodedClearValues,
    );
    const wrongOrderBAInsteadOfABAbiEncodedValues = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "uint256"],
      [clearValueB, clearValueA],
    );
    // ❌ Call `contract.recordAndVerifyWinner` using order (B, A)
    await expect(
      contract.recordAndVerifyWinner(gameId, wrongOrderBAInsteadOfABAbiEncodedValues, decryptionProof),
    ).to.be.revertedWithCustomError(
      { interface: new EthersT.Interface(["error KMSInvalidSigner(address invalidSigner)"]) },
      "KMSInvalidSigner",
    );
  });
});
```

{% endtab %}

{% endtabs %}
