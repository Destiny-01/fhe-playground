import { ethers } from 'hardhat';
import { time } from '@nomicfoundation/hardhat-network-helpers';

export async function deployVestingWalletExampleFixture() {
  const [owner, beneficiary] = await ethers.getSigners();

  // Deploy ERC7984 mock token
  const token = await ethers.deployContract('ERC7984Example', [
    'TestToken',
    'TT',
    'https://example.com/metadata'
  ]);

  // Get current time and set vesting to start in 1 minute
  const currentTime = await time.latest();
  const startTime = currentTime + 60;
  const duration = 60 * 60; // 1 hour

  // Deploy and initialize vesting wallet in one step
  const vestingWallet = await ethers.deployContract('VestingWalletExample', [
    beneficiary.address,
    startTime,
    duration
  ]);

  return { vestingWallet, token, owner, beneficiary, startTime, duration };
}

export async function deployVestingWalletWithTokensFixture() {
  const { vestingWallet, token, owner, beneficiary, startTime, duration } = await deployVestingWalletExampleFixture();
  
  // Import fhevm for token minting
  const { fhevm } = await import('hardhat');
  
  // Mint tokens to the vesting wallet
  const encryptedInput = await fhevm
    .createEncryptedInput(await token.getAddress(), owner.address)
    .add64(1000) // 1000 tokens
    .encrypt();

  await (token as any)
    .connect(owner)
    ['$_mint(address,bytes32,bytes)'](
      vestingWallet.target, 
      encryptedInput.handles[0], 
      encryptedInput.inputProof
    );

  return { vestingWallet, token, owner, beneficiary, startTime, duration, vestingAmount: 1000 };
}

