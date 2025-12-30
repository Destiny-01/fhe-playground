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

    // Transfer confidential tokens to user for testing
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

      // Execute swap initiation
      // The swap contract will transfer the encrypted amount from user's balance
      await expect(
        swap
          .connect(user)
          .initiateSwap(encryptedInput.handles[0], encryptedInput.inputProof)
      ).to.emit(swap, "SwapRequested");
    });
  });
});
