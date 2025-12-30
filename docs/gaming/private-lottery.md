Example: PrivateLottery

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="PrivateLottery.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, ebool, euint8, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import "hardhat/console.sol";

/// @title Private Lottery - Lottery with hidden tickets
/// @notice This contract implements a private lottery where players purchase encrypted tickets
///         and a winning number is drawn using encrypted random generation. Winners are determined
///         by comparing encrypted ticket numbers with the encrypted winning number without revealing
///         the actual ticket values until after the draw.
contract PrivateLottery is ZamaEthereumConfig {
    /// @notice Counter to assign unique IDs to each lottery round
    uint256 private counter = 0;

    /// @notice Maximum ticket number (e.g., 0-99 for a 100-ticket lottery)
    uint8 public constant MAX_TICKET_NUMBER = 99;

    /// @notice Structure to store lottery round data
    struct LotteryRound {
        /// @notice The encrypted winning number
        euint8 encryptedWinningNumber;
        /// @notice Whether the winning number has been drawn
        bool winningNumberDrawn;
        /// @notice Whether the lottery has been closed
        bool closed;
        /// @notice Whether the winning number has been revealed
        bool winningNumberRevealed;
        /// @notice The clear winning number, set after decryption
        uint8 winningNumber;
    }

    /// @notice Structure to store player ticket data
    struct Ticket {
        /// @notice The address that purchased the ticket
        address player;
        /// @notice The encrypted ticket number (0-MAX_TICKET_NUMBER)
        euint8 encryptedTicketNumber;
        /// @notice Whether this ticket is a winner (encrypted boolean)
        ebool isWinner;
        /// @notice Whether the winner status has been computed
        bool winnerComputed;
    }

    /// @notice Mapping from lottery round ID to lottery round data
    mapping(uint256 roundId => LotteryRound round) public rounds;

    /// @notice Mapping from (roundId, ticketId) to ticket data
    mapping(uint256 roundId => mapping(uint256 ticketId => Ticket ticket))
        public tickets;

    /// @notice Mapping from round ID to ticket count
    mapping(uint256 roundId => uint256) public ticketCounts;

    /// @notice Emitted when a new lottery round is created
    /// @param roundId The unique identifier for the lottery round
    event LotteryRoundCreated(uint256 indexed roundId);

    /// @notice Emitted when a ticket is purchased
    /// @param roundId The ID of the lottery round
    /// @param ticketId The ID of the ticket
    /// @param player The address that purchased the ticket
    event TicketPurchased(
        uint256 indexed roundId,
        uint256 indexed ticketId,
        address indexed player
    );

    /// @notice Emitted when the winning number is drawn
    /// @param roundId The ID of the lottery round
    /// @param encryptedWinningNumber The encrypted winning number
    event WinningNumberDrawn(
        uint256 indexed roundId,
        euint8 encryptedWinningNumber
    );

    /// @notice Emitted when the winning number is revealed
    /// @param roundId The ID of the lottery round
    /// @param winningNumber The clear winning number
    event WinningNumberRevealed(uint256 indexed roundId, uint8 winningNumber);

    /// @dev Creates a new lottery round
    /// @return The round ID
    function createLotteryRound() external returns (uint256) {
        counter++;
        uint256 roundId = counter;

        rounds[roundId] = LotteryRound({
            encryptedWinningNumber: FHE.asEuint8(0), // Placeholder
            winningNumberDrawn: false,
            closed: false,
            winningNumberRevealed: false,
            winningNumber: 0
        });

        emit LotteryRoundCreated(roundId);
        return roundId;
    }

    /// @dev Purchases a ticket with an encrypted ticket number
    /// @param roundId The ID of the lottery round
    /// @param encryptedTicketNumber The encrypted ticket number (0-MAX_TICKET_NUMBER)
    /// @param inputProof The zero-knowledge proof for the encrypted ticket number
    /// @return The ticket ID
    function purchaseTicket(
        uint256 roundId,
        externalEuint8 encryptedTicketNumber,
        bytes calldata inputProof
    ) external returns (uint256) {
        console.log(
            "purchaseTicket: Starting for roundId",
            roundId,
            "player",
            uint160(msg.sender)
        );
        require(!rounds[roundId].closed, "Lottery round is closed");
        console.log("purchaseTicket: Round not closed check passed");
        require(
            !rounds[roundId].winningNumberDrawn,
            "Winning number already drawn"
        );
        console.log("purchaseTicket: Winning number not drawn check passed");

        euint8 ticketNumber = FHE.fromExternal(
            encryptedTicketNumber,
            inputProof
        );
        console.log("purchaseTicket: Converted external to euint8");
        FHE.allowThis(ticketNumber);
        FHE.allow(ticketNumber, msg.sender);
        console.log("purchaseTicket: Set permissions for ticket number");

        uint256 ticketId = ticketCounts[roundId];
        ticketCounts[roundId]++;
        console.log("purchaseTicket: Assigned ticketId", ticketId);

        tickets[roundId][ticketId] = Ticket({
            player: msg.sender,
            encryptedTicketNumber: ticketNumber,
            isWinner: FHE.asEbool(false), // Placeholder
            winnerComputed: false
        });

        emit TicketPurchased(roundId, ticketId, msg.sender);
        console.log("purchaseTicket: Completed successfully");
        return ticketId;
    }

    /// @dev Draws the winning number using encrypted random generation
    /// @param roundId The ID of the lottery round
    /// @notice This function generates a random encrypted winning number and makes it publicly decryptable
    function drawWinningNumber(uint256 roundId) external {
        console.log("drawWinningNumber: Starting for roundId", roundId);
        require(!rounds[roundId].closed, "Lottery round is closed");
        console.log("drawWinningNumber: Round not closed check passed");
        require(
            !rounds[roundId].winningNumberDrawn,
            "Winning number already drawn"
        );
        console.log(
            "drawWinningNumber: Winning number not already drawn check passed"
        );
        require(ticketCounts[roundId] > 0, "No tickets purchased");
        console.log("drawWinningNumber: Ticket count", ticketCounts[roundId]);

        // Generate encrypted random winning number
        console.log("drawWinningNumber: Generating random winning number");
        euint8 randomWinning = FHE.randEuint8();
        console.log("drawWinningNumber: Random winning number generated");

        rounds[roundId].encryptedWinningNumber = randomWinning;
        rounds[roundId].winningNumberDrawn = true;
        console.log(
            "drawWinningNumber: Stored winning number and set drawn flag"
        );

        // Make the winning number publicly decryptable for provable fairness
        console.log(
            "drawWinningNumber: Making winning number publicly decryptable"
        );
        FHE.allowThis(rounds[roundId].encryptedWinningNumber);
        FHE.makePubliclyDecryptable(randomWinning);
        console.log(
            "drawWinningNumber: Winning number is now publicly decryptable"
        );

        emit WinningNumberDrawn(roundId, randomWinning);
        console.log("drawWinningNumber: Completed successfully");
    }

    /// @dev Computes winner status for all tickets by comparing with encrypted winning number
    /// @param roundId The ID of the lottery round
    /// @notice This function compares each ticket's encrypted number with the encrypted winning number
    function computeWinners(uint256 roundId) external {
        console.log("computeWinners: Starting for roundId", roundId);
        require(
            rounds[roundId].winningNumberDrawn,
            "Winning number not yet drawn"
        );
        console.log("computeWinners: Winning number drawn check passed");

        euint8 winningNumber = rounds[roundId].encryptedWinningNumber;
        console.log("computeWinners: Got winning number");
        // Allow the contract to use the winning number for comparisons
        FHE.allowThis(winningNumber);
        console.log("computeWinners: Allowed contract to use winning number");

        uint256 count = ticketCounts[roundId];
        console.log("computeWinners: Ticket count", count);

        for (uint256 i = 0; i < count; i++) {
            console.log("computeWinners: Processing ticket", i);
            if (!tickets[roundId][i].winnerComputed) {
                console.log("computeWinners: Ticket", i, "not yet computed");
                // Allow the contract to use the ticket number for comparison
                FHE.allowThis(tickets[roundId][i].encryptedTicketNumber);
                console.log(
                    "computeWinners: Allowed contract to use ticket number",
                    i
                );

                // Compare encrypted ticket number with encrypted winning number
                console.log(
                    "computeWinners: Comparing ticket",
                    i,
                    "with winning number"
                );
                ebool isMatch = FHE.eq(
                    tickets[roundId][i].encryptedTicketNumber,
                    winningNumber
                );
                console.log(
                    "computeWinners: Comparison complete for ticket",
                    i
                );
                FHE.allowThis(isMatch);
                FHE.allow(isMatch, tickets[roundId][i].player);
                console.log(
                    "computeWinners: Allowed player to decrypt winner status for ticket",
                    i
                );

                tickets[roundId][i].isWinner = isMatch;
                tickets[roundId][i].winnerComputed = true;
                console.log("computeWinners: Marked ticket", i, "as computed");
            } else {
                console.log(
                    "computeWinners: Ticket",
                    i,
                    "already computed, skipping"
                );
            }
        }

        rounds[roundId].closed = true;
        console.log("computeWinners: Round closed");
    }

    /// @dev Verifies decryption proof and reveals the winning number
    /// @param roundId The ID of the lottery round
    /// @param abiEncodedClearWinningNumber The ABI-encoded clear winning number
    /// @param decryptionProof The decryption proof from the KMS
    function revealWinningNumber(
        uint256 roundId,
        bytes memory abiEncodedClearWinningNumber,
        bytes memory decryptionProof
    ) external {
        console.log("revealWinningNumber: Starting for roundId", roundId);
        console.log(
            "revealWinningNumber: winningNumberDrawn =",
            rounds[roundId].winningNumberDrawn
        );
        require(
            rounds[roundId].winningNumberDrawn,
            "Winning number not yet drawn"
        );
        console.log("revealWinningNumber: Winning number drawn check passed");
        console.log(
            "revealWinningNumber: winningNumberRevealed =",
            rounds[roundId].winningNumberRevealed
        );
        require(
            !rounds[roundId].winningNumberRevealed,
            "Winning number already revealed"
        );
        console.log("revealWinningNumber: Already revealed check passed");

        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(rounds[roundId].encryptedWinningNumber);
        console.log("revealWinningNumber: Created ciphertext array");

        // Verify the decryption proof
        console.log("revealWinningNumber: Verifying decryption proof");
        FHE.checkSignatures(cts, abiEncodedClearWinningNumber, decryptionProof);
        console.log("revealWinningNumber: Decryption proof verified");

        // Decode the clear winning number
        uint8 decodedWinning = abi.decode(
            abiEncodedClearWinningNumber,
            (uint8)
        );
        console.log(
            "revealWinningNumber: Decoded winning number",
            decodedWinning
        );

        // Constrain to valid ticket range
        uint8 winningNumber = decodedWinning % (MAX_TICKET_NUMBER + 1);
        console.log("revealWinningNumber: Final winning number", winningNumber);

        rounds[roundId].winningNumber = winningNumber;
        rounds[roundId].winningNumberRevealed = true;

        emit WinningNumberRevealed(roundId, winningNumber);
        console.log("revealWinningNumber: Completed successfully");
    }

    /// @notice Returns the encrypted winning number
    /// @param roundId The ID of the lottery round
    /// @return The encrypted winning number
    function getEncryptedWinningNumber(
        uint256 roundId
    ) external view returns (euint8) {
        return rounds[roundId].encryptedWinningNumber;
    }

    /// @notice Returns the clear winning number if revealed
    /// @param roundId The ID of the lottery round
    /// @return The clear winning number
    function getWinningNumber(uint256 roundId) external view returns (uint8) {
        require(
            rounds[roundId].winningNumberRevealed,
            "Winning number not yet revealed"
        );
        return rounds[roundId].winningNumber;
    }

    /// @notice Returns the encrypted ticket number for a given ticket
    /// @param roundId The ID of the lottery round
    /// @param ticketId The ID of the ticket
    /// @return The encrypted ticket number
    function getEncryptedTicketNumber(
        uint256 roundId,
        uint256 ticketId
    ) external view returns (euint8) {
        return tickets[roundId][ticketId].encryptedTicketNumber;
    }

    /// @notice Returns the encrypted winner status for a given ticket
    /// @param roundId The ID of the lottery round
    /// @param ticketId The ID of the ticket
    /// @return The encrypted boolean indicating if the ticket is a winner
    function getEncryptedWinnerStatus(
        uint256 roundId,
        uint256 ticketId
    ) external view returns (ebool) {
        require(
            tickets[roundId][ticketId].winnerComputed,
            "Winner status not yet computed"
        );
        return tickets[roundId][ticketId].isWinner;
    }

    /// @notice Returns the number of tickets purchased for a round
    /// @param roundId The ID of the lottery round
    /// @return The number of tickets
    function getTicketCount(uint256 roundId) external view returns (uint256) {
        return ticketCounts[roundId];
    }
}

```

{% endtab %}

{% tab title="PrivateLottery.ts" %}

```typescript
import {
  FhevmType,
  HardhatFhevmRuntimeEnvironment,
} from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers as EthersT } from "ethers";
import { ethers, fhevm } from "hardhat";
import * as hre from "hardhat";

import {
  PrivateLottery,
  PrivateLottery__factory,
} from "../../../typechain-types";
import type { Signers } from "./types";

async function deployFixture() {
  const factory = (await ethers.getContractFactory(
    "PrivateLottery"
  )) as PrivateLottery__factory;
  const privateLottery = (await factory.deploy()) as PrivateLottery;
  const privateLottery_address = await privateLottery.getAddress();

  return { privateLottery, privateLottery_address };
}

/**
 * This example demonstrates a private lottery where players purchase encrypted tickets
 * and a winning number is drawn using encrypted random generation.
 */
describe("PrivateLottery", function () {
  let contract: PrivateLottery;
  let contractAddress: string;
  let signers: Signers;
  let fhevm: HardhatFhevmRuntimeEnvironment;

  before(async function () {
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      owner: ethSigners[0],
      alice: ethSigners[1],
      bob: ethSigners[2],
    };
    fhevm = hre.fhevm;
  });

  beforeEach(async function () {
    const deployment = await deployFixture();
    contractAddress = deployment.privateLottery_address;
    contract = deployment.privateLottery;
  });

  // Helper function to decrypt ebool
  async function decryptEbool(
    encrypted: any,
    user: HardhatEthersSigner
  ): Promise<boolean> {
    return await fhevm.userDecryptEbool(
      typeof encrypted === "string" ? encrypted : ethers.hexlify(encrypted),
      contractAddress,
      user
    );
  }

  // ✅ Test should succeed - create lottery round
  it("should create a new lottery round", async function () {
    const tx = await contract.createLotteryRound();
    const receipt = await tx.wait();

    expect(receipt).to.not.be.null;
    const roundId = 1;
    const round = await contract.rounds(roundId);
    expect(round.closed).to.be.false;
    expect(round.winningNumberDrawn).to.be.false;
  });

  // ✅ Test should succeed - purchase ticket
  it("should allow a player to purchase a ticket", async function () {
    await contract.createLotteryRound();

    const roundId = 1;
    const ticketNumber = 42;

    const input = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(ticketNumber)
      .encrypt();

    const tx = await contract
      .connect(signers.alice)
      .purchaseTicket(roundId, input.handles[0], input.inputProof);
    await tx.wait();

    const ticketCount = await contract.getTicketCount(roundId);
    expect(ticketCount).to.eq(1);

    const ticket = await contract.tickets(roundId, 0);
    expect(ticket.player).to.eq(signers.alice.address);
  });

  // ✅ Test should succeed - draw winning number
  it("should allow drawing the winning number", async function () {
    await contract.createLotteryRound();

    const roundId = 1;
    const ticketNumber = 42;

    const input = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(ticketNumber)
      .encrypt();

    await contract
      .connect(signers.alice)
      .purchaseTicket(roundId, input.handles[0], input.inputProof);

    const drawTx = await contract.drawWinningNumber(roundId);
    await drawTx.wait();

    const round = await contract.rounds(roundId);
    expect(round.winningNumberDrawn).to.be.true;
  });

  // ✅ Test should succeed - compute winners
  it("should compute winners by comparing tickets with winning number", async function () {
    await contract.createLotteryRound();

    const roundId = 1;
    const winningTicket = 42;

    // Alice purchases ticket 42
    const input1 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(winningTicket)
      .encrypt();

    await contract
      .connect(signers.alice)
      .purchaseTicket(roundId, input1.handles[0], input1.inputProof);

    // Bob purchases ticket 99
    const input2 = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add8(99)
      .encrypt();
    console.log("f check");

    await contract
      .connect(signers.bob)
      .purchaseTicket(roundId, input2.handles[0], input2.inputProof);

    console.log("first check");
    // Draw winning number (will be random, but we'll compute winners)
    await contract.drawWinningNumber(roundId);

    console.log("second check");
    // Compute winners
    const computeTx = await contract.computeWinners(roundId);
    await computeTx.wait();
    console.log("third check");

    const round = await contract.rounds(roundId);
    expect(round.closed).to.be.true;

    // Check that winner status has been computed
    const ticket0 = await contract.tickets(roundId, 0);
    const ticket1 = await contract.tickets(roundId, 1);
    expect(ticket0.winnerComputed).to.be.true;
    expect(ticket1.winnerComputed).to.be.true;
  });

  // ✅ Test should succeed - reveal winning number
  it("should allow revealing the winning number", async function () {
    await contract.createLotteryRound();

    const roundId = 1;
    const ticketNumber = 42;

    const input = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(ticketNumber)
      .encrypt();

    await contract
      .connect(signers.alice)
      .purchaseTicket(roundId, input.handles[0], input.inputProof);

    await contract.drawWinningNumber(roundId);

    // Get encrypted winning number and decrypt it
    const encryptedWinningNumber = await contract.getEncryptedWinningNumber(
      roundId
    );

    // Decrypt the winning number
    const publicDecryptResults = await fhevm.publicDecrypt([
      ethers.hexlify(encryptedWinningNumber),
    ]);

    // Reveal the winning number
    const revealTx = await contract.revealWinningNumber(
      roundId,
      publicDecryptResults.abiEncodedClearValues,
      publicDecryptResults.decryptionProof
    );
    await revealTx.wait();

    const round = await contract.rounds(roundId);
    expect(round.winningNumberRevealed).to.be.true;
    expect(round.winningNumber).to.be.at.least(0);
    expect(round.winningNumber).to.be.at.most(99);
  });

  // ✅ Test should succeed - get ticket count
  it("should return the correct ticket count", async function () {
    await contract.createLotteryRound();

    const roundId = 1;

    // Purchase multiple tickets
    for (let i = 0; i < 5; i++) {
      const input = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add8(i)
        .encrypt();

      await contract
        .connect(signers.alice)
        .purchaseTicket(roundId, input.handles[0], input.inputProof);
    }

    const ticketCount = await contract.getTicketCount(roundId);
    expect(ticketCount).to.eq(5);
  });

  // ✅ Test should succeed - get encrypted ticket number
  it("should return encrypted ticket number for a ticket", async function () {
    await contract.createLotteryRound();

    const roundId = 1;
    const ticketNumber = 42;

    const input = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(ticketNumber)
      .encrypt();

    await contract
      .connect(signers.alice)
      .purchaseTicket(roundId, input.handles[0], input.inputProof);

    const encryptedTicketNumber = await contract.getEncryptedTicketNumber(
      roundId,
      0
    );
    expect(encryptedTicketNumber).to.not.be.null;
  });

  // ✅ Test should succeed - get encrypted winner status
  it("should return encrypted winner status after computing winners", async function () {
    await contract.createLotteryRound();

    const roundId = 1;
    const ticketNumber = 42;

    const input = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(ticketNumber)
      .encrypt();

    await contract
      .connect(signers.alice)
      .purchaseTicket(roundId, input.handles[0], input.inputProof);

    await contract.drawWinningNumber(roundId);
    await contract.computeWinners(roundId);

    const encryptedWinnerStatus = await contract.getEncryptedWinnerStatus(
      roundId,
      0
    );
    expect(encryptedWinnerStatus).to.not.be.null;
  });

  // ❌ Test should fail - cannot purchase ticket after closing
  it("should fail to purchase ticket after lottery is closed", async function () {
    await contract.createLotteryRound();

    const roundId = 1;
    const ticketNumber = 42;

    const input1 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(ticketNumber)
      .encrypt();

    await contract
      .connect(signers.alice)
      .purchaseTicket(roundId, input1.handles[0], input1.inputProof);

    await contract.drawWinningNumber(roundId);
    await contract.computeWinners(roundId);

    // Try to purchase ticket after closing
    const input2 = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add8(99)
      .encrypt();

    await expect(
      contract
        .connect(signers.bob)
        .purchaseTicket(roundId, input2.handles[0], input2.inputProof)
    ).to.be.revertedWith("Lottery round is closed");
  });

  // ❌ Test should fail - cannot draw winning number without tickets
  it("should fail to draw winning number if no tickets purchased", async function () {
    await contract.createLotteryRound();

    const roundId = 1;

    await expect(contract.drawWinningNumber(roundId)).to.be.revertedWith(
      "No tickets purchased"
    );
  });

  // ❌ Test should fail - cannot reveal winning number before drawing
  it("should fail to reveal winning number before drawing", async function () {
    await contract.createLotteryRound();

    const roundId = 1;

    // Try to reveal without drawing - should fail because winning number not drawn
    // We need a valid encrypted value structure, but the contract will check if winningNumberDrawn is false
    const ticketNumber = 42;
    const input = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(ticketNumber)
      .encrypt();

    // Purchase a ticket to have some encrypted data
    await contract
      .connect(signers.alice)
      .purchaseTicket(roundId, input.handles[0], input.inputProof);

    // Try to reveal without drawing - create dummy data since ticket numbers aren't publicly decryptable
    // The contract will reject this at the require check before decryption verification
    // We'll create dummy ABI-encoded data and proof that will fail validation
    const dummyAbiEncoded = EthersT.AbiCoder.defaultAbiCoder().encode(
      ["uint8"],
      [42]
    );
    const dummyProof = "0x"; // Empty proof - contract will check winningNumberDrawn first

    await expect(
      contract.revealWinningNumber(roundId, dummyAbiEncoded, dummyProof)
    ).to.be.revertedWith("Winning number not yet drawn");
  });

  // ❌ Test should fail - cannot get winner status before computing
  it("should fail to get winner status before computing winners", async function () {
    await contract.createLotteryRound();

    const roundId = 1;
    const ticketNumber = 42;

    const input = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(ticketNumber)
      .encrypt();

    await contract
      .connect(signers.alice)
      .purchaseTicket(roundId, input.handles[0], input.inputProof);

    await expect(
      contract.getEncryptedWinnerStatus(roundId, 0)
    ).to.be.revertedWith("Winner status not yet computed");
  });
});

```

{% endtab %}

{% endtabs %}
