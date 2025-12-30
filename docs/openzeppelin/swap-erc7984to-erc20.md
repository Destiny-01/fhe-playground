Example: SwapERC7984ToERC20

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="SwapERC7984ToERC20.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, externalEuint64, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @notice Bridges encrypted ERC7984 balances into a plain ERC20 token
contract SwapERC7984ToERC20 is ZamaEthereumConfig {
    using SafeERC20 for IERC20;

    /// @notice Raised when trying to settle a swap that does not exist
    error SwapRequestNotFound(euint64 encryptedAmount);

    /// @notice Minimal record describing a pending swap
    struct SwapRecord {
        address beneficiary;
        bool active;
    }

    /// @dev Swap requests are indexed by the encrypted amount handle
    mapping(euint64 => SwapRecord) private swapRecords;

    IERC7984 private confidentialAsset;
    IERC20 private payoutAsset;

    /// @notice Emitted each time a user locks ERC7984 for conversion
    event SwapRequested(
        euint64 indexed encryptedAmount,
        address indexed requester
    );

    /// @notice Emitted when a swap is successfully settled in ERC20
    event SwapSettled(address indexed beneficiary, uint64 amountOut);

    constructor(IERC7984 fromToken, IERC20 toToken) {
        confidentialAsset = fromToken;
        payoutAsset = toToken;
    }

    /// @notice Lock encrypted ERC7984 and register a swap intent
    function initiateSwap(
        externalEuint64 encryptedInput,
        bytes calldata inputProof
    ) public {
        euint64 encryptedAmount = FHE.fromExternal(encryptedInput, inputProof);

        FHE.allowTransient(encryptedAmount, address(confidentialAsset));
        euint64 movedAmount = confidentialAsset.confidentialTransferFrom(
            msg.sender,
            address(this),
            encryptedAmount
        );

        FHE.makePubliclyDecryptable(movedAmount);
        FHE.allowThis(movedAmount);

        swapRecords[movedAmount] = SwapRecord({
            beneficiary: msg.sender,
            active: true
        });

        emit SwapRequested(movedAmount, msg.sender);
    }

    /// @notice Settle a previously registered swap using a verified decryption proof
    function finalizeSwap(
        euint64 encryptedAmount,
        uint64 cleartextAmount,
        bytes calldata decryptionProof
    ) public {
        SwapRecord storage record = swapRecords[encryptedAmount];
        require(record.active, SwapRequestNotFound(encryptedAmount));

        bytes32[] memory handles = new bytes32[](1);
        handles[0] = euint64.unwrap(encryptedAmount);

        FHE.checkSignatures(
            handles,
            abi.encode(cleartextAmount),
            decryptionProof
        );

        address beneficiary = record.beneficiary;
        delete swapRecords[encryptedAmount];

        if (cleartextAmount != 0) {
            payoutAsset.safeTransfer(beneficiary, cleartextAmount);
        }

        emit SwapSettled(beneficiary, cleartextAmount);
    }
}

```

{% endtab %}

{% tab title="SwapERC7984ToERC20.ts" %}

```typescript
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

/**
 * ERC-7984 to ERC-20 Swap Tests
 *
 * Tests the swapping of confidential ERC-7984 tokens for public ERC-20 tokens.
 * Validates the off-ramp process from private state to public financial state.
 */
describe("SwapERC7984ToERC20", function () {
  let swap: any;
  let erc7984: any;
  let erc20Mock: any;
  let owner: any;
  let user: any;

  const INITIAL_ERC20 = 10000;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy ERC7984 mock
    erc7984 = await ethers.deployContract("ERC7984Example", [
      owner.address,
      10000,
      "Confidential Token",
      "CTKN",
      "https://example.com/token",
    ]);

    // Deploy ERC20 mock
    erc20Mock = await ethers.deployContract("ERC20Mock", [
      "Mock USDC",
      "USDC",
      6,
    ]);

    // Deploy swap contract
    swap = await ethers.deployContract("SwapERC7984ToERC20", [
      await erc7984.getAddress(),
      await erc20Mock.getAddress(),
    ]);

    // Fund swap contract with ERC20
    await erc20Mock.mint(await swap.getAddress(), INITIAL_ERC20);

    // Transfer some ERC7984 to user
    const encryptedInput = await fhevm
      .createEncryptedInput(await erc7984.getAddress(), owner.address)
      .add64(1000)
      .encrypt();

    // 🔐 Setup Confidential State:
    // We first transfer encrypted tokens to the user to prepare for the swap.
    await erc7984
      .connect(owner)
      [
        "confidentialTransfer(address,bytes32,bytes)"
      ](user.address, encryptedInput.handles[0], encryptedInput.inputProof);

    // Set swap contract as operator for user
    const maxTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    await erc7984
      .connect(user)
      .setOperator(await swap.getAddress(), maxTimestamp);
  });

  describe("Swap Initiation", function () {
    it("should initiate a swap", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await swap.getAddress(), user.address)
        .add64(100)
        .encrypt();

      // 🚀 Initiate Swap:
      // The user initiates a swap by providing an encrypted amount.
      // The contract will deduce this amount from the user's private balance
      // and eventually "off-ramp" it into a public ERC-20 token.
      await expect(
        swap
          .connect(user)
          .initiateSwap(encryptedInput.handles[0], encryptedInput.inputProof)
      ).to.emit(swap, "SwapRequested");
    });
  });
});

```

{% endtab %}

{% endtabs %}
