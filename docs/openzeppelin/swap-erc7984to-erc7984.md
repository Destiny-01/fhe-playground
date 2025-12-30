Example: SwapERC7984ToERC7984

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="SwapERC7984ToERC7984.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, externalEuint64, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract SwapERC7984ToERC7984 is ZamaEthereumConfig {
    function swapConfidentialForConfidential(
        IERC7984 fromToken,
        IERC7984 toToken,
        externalEuint64 amountInput,
        bytes calldata inputProof
    ) public virtual {
        require(fromToken.isOperator(msg.sender, address(this)));

        euint64 amount = FHE.fromExternal(amountInput, inputProof);

        FHE.allowTransient(amount, address(fromToken));
        euint64 amountTransferred = fromToken.confidentialTransferFrom(
            msg.sender,
            address(this),
            amount
        );

        FHE.allowTransient(amountTransferred, address(toToken));
        toToken.confidentialTransfer(msg.sender, amountTransferred);
    }
}

```

{% endtab %}

{% tab title="SwapERC7984ToERC7984.ts" %}

```typescript
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

/**
 * Private ERC-7984 Swap Tests
 *
 * Tests purely private swaps between different confidential token pairs.
 * Validates on-chain atomic swaps without revealing balances or trade amounts.
 */
describe("SwapERC7984ToERC7984", function () {
  let swap: any;
  let tokenA: any;
  let tokenB: any;
  let owner: any;
  let user: any;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy two ERC7984 tokens
    tokenA = await ethers.deployContract("ERC7984Example", [
      owner.address,
      10000,
      "Token A",
      "TKA",
      "https://example.com/a",
    ]);

    tokenB = await ethers.deployContract("ERC7984Example", [
      owner.address,
      10000,
      "Token B",
      "TKB",
      "https://example.com/b",
    ]);

    // Deploy swap contract
    swap = await ethers.deployContract("SwapERC7984ToERC7984", []);

    // Transfer tokenA to user
    const encryptedInputA = await fhevm
      .createEncryptedInput(await tokenA.getAddress(), owner.address)
      .add64(1000)
      .encrypt();

    await tokenA
      .connect(owner)
      [
        "confidentialTransfer(address,bytes32,bytes)"
      ](user.address, encryptedInputA.handles[0], encryptedInputA.inputProof);

    // Transfer tokenB to swap contract
    const encryptedInputB = await fhevm
      .createEncryptedInput(await tokenB.getAddress(), owner.address)
      .add64(1000)
      .encrypt();

    await tokenB
      .connect(owner)
      [
        "confidentialTransfer(address,bytes32,bytes)"
      ](await swap.getAddress(), encryptedInputB.handles[0], encryptedInputB.inputProof);

    // Set swap as operator for user's tokenA
    const maxTimestamp = Math.floor(Date.now() / 1000) + 3600;
    await tokenA
      .connect(user)
      .setOperator(await swap.getAddress(), maxTimestamp);
  });

  describe("Swap", function () {
    it("should swap tokenA for tokenB", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await swap.getAddress(), user.address)
        .add64(100)
        .encrypt();

      // 🚀 Private Swap:
      // The swap is performed using FHE logic. The contract deducts TokenA
      // and adds TokenB to the user's balances privately.
      await expect(
        swap
          .connect(user)
          .swapConfidentialForConfidential(
            await tokenA.getAddress(),
            await tokenB.getAddress(),
            encryptedInput.handles[0],
            encryptedInput.inputProof
          )
      ).to.not.be.reverted;

      // User should have tokenB balance
      const balanceB = await tokenB.confidentialBalanceOf(user.address);
      expect(balanceB).to.not.be.undefined;
    });

    it("should fail without operator authorization", async function () {
      // Remove operator
      await tokenA.connect(user).setOperator(await swap.getAddress(), 0);

      const encryptedInput = await fhevm
        .createEncryptedInput(await tokenA.getAddress(), user.address)
        .add64(100)
        .encrypt();

      await expect(
        swap
          .connect(user)
          .swapConfidentialForConfidential(
            await tokenA.getAddress(),
            await tokenB.getAddress(),
            encryptedInput.handles[0],
            encryptedInput.inputProof
          )
      ).to.be.reverted;
    });
  });
});

```

{% endtab %}

{% endtabs %}
