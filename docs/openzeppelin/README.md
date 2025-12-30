This section contains comprehensive guides and examples for using [OpenZeppelin's confidential smart contracts library](https://github.com/OpenZeppelin/openzeppelin-confidential-contracts) with FHEVM. OpenZeppelin's confidential contracts library provides a secure, audited foundation for building privacy-preserving applications on fully homomorphic encryption (FHE) enabled blockchains.

The library includes implementations of popular standards like ERC20, ERC721, and ERC1155, adapted for confidential computing with FHEVM, ensuring your applications maintain privacy while leveraging battle-tested security patterns.

## Getting Started

This guide will help you set up a development environment for working with OpenZeppelin's confidential contracts and FHEVM.

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 20
- **Hardhat** ^2.24
- **Access to an FHEVM-enabled network** and the Zama gateway/relayer

### Project Setup

#### Option 1: Using the Example Generator (Recommended)

The easiest way to get started is using the FHEVM Examples Generator, which automatically handles dependencies:

1. **Generate an OpenZeppelin example:**

   ```bash
   npm run cli example erc7984-example ./my-project
   cd my-project
   ```

2. **Dependencies are automatically configured!** The generator detects OpenZeppelin imports and adds the required packages to `package.json`.

3. **Install and test:**

   ```bash
   npm install
   npm run compile
   npm test
   ```

#### Option 2: Manual Setup

1. **Clone the FHEVM Hardhat template repository:**

   ```bash
   git clone https://github.com/zama-ai/fhevm-hardhat-template conf-token
   cd conf-token
   ```

2. **Install project dependencies:**

   ```bash
   npm ci
   ```

3. **Install OpenZeppelin's confidential contracts library:**

   ```bash
   npm i @openzeppelin/confidential-contracts @openzeppelin/contracts
   ```

4. **Compile the contracts:**

   ```bash
   npm run compile
   ```

5. **Run the test suite:**

   ```bash
   npm test
   ```

### Dependency Management

When using the example generator, external dependencies are automatically detected and configured. The generator:

- ✅ Automatically detects `@openzeppelin/contracts` and `@openzeppelin/confidential-contracts` from import statements
- ✅ Adds them to the generated project's `package.json` with configured versions
- ✅ Ensures reproducible builds with version pinning

**Note**: If you're adding a new example with OpenZeppelin dependencies, make sure the versions are configured in the root `package.json` → `dependencyVersions` field. See the main [README.md](../../README.md) for details.

## Available Guides

Explore the following guides to learn how to implement confidential contracts using OpenZeppelin's library:

- **[ERC7984 Standard](erc7984.md)** - Learn about the ERC7984 standard for confidential tokens
- **[ERC7984 Tutorial](erc7984-tutorial.md)** - Step-by-step tutorial for implementing ERC7984 tokens
- **[ERC7984 Example](erc7984.md)** - Basic implementation of ERC7984 confidential tokens
- **[ERC7984 to ERC20 Wrapper](ERC7984ERC20WrapperMock.md)** - Convert between confidential and public token standards
- **[Swap ERC7984 to ERC20](swapERC7984ToERC20.md)** - Implement cross-standard token swapping using gateway pattern
- **[Swap ERC7984 to ERC7984](swapERC7984ToERC7984.md)** - Confidential token-to-token swapping
- **[Vesting Wallet](vesting-wallet.md)** - Implement confidential token vesting mechanisms
