# FHEVM Examples Documentation

Welcome to the FHEVM Examples documentation! This collection provides comprehensive, production-ready examples for building privacy-preserving smart contracts using Fully Homomorphic Encryption (FHE) on the Ethereum Virtual Machine.

## What is FHEVM?

FHEVM enables developers to perform computations on encrypted data without ever decrypting it. This revolutionary technology allows smart contracts to process sensitive information while maintaining complete privacy, opening up new possibilities for confidential DeFi, private voting systems, encrypted auctions, and more.

## About This Documentation

This documentation contains a curated collection of **40+ verified FHEVM examples**, each demonstrating specific concepts and patterns for working with encrypted data on the blockchain. Every example:

- ✅ **Compiles successfully** - All contracts are tested and verified
- ✅ **Passes all tests** - Comprehensive test coverage included
- ✅ **Production-ready** - Code follows best practices
- ✅ **Well-documented** - Detailed explanations and comments

Each example includes:

- **Complete Solidity Contracts** - Production-ready code with detailed explanations
- **Comprehensive Tests** - Test suites showing both correct usage and common pitfalls
- **Implementation Details** - Step-by-step breakdowns of key concepts
- **Best Practices** - Patterns and anti-patterns for FHE development

## Quick Start

### Prerequisites

- **Node.js** (v20 or higher)
- **npm** or **yarn** package manager
- Basic understanding of Solidity and Hardhat
- Familiarity with TypeScript (for tests)

### Getting Started

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd example-hub
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Generate a standalone example**

   ```bash
   # Generate an example
   npm run cli example fhe-counter ./output/my-counter

   # Navigate to the example
   cd output/my-counter

   # Install and test
   npm install
   npm run compile
   npm run test
   ```

4. **View documentation**

   Browse the examples below or generate documentation:

   ```bash
   # Generate docs for a specific example
   npm run generate-docs fhe-counter

   # Or generate all documentation
   npm run generate-all-docs
   ```

## Example Categories

### 🔷 Fundamentals

Core FHEVM operations and patterns:

- **FHE Operations** - Addition, subtraction, multiplication
- **FHE Boolean Logic** - AND, OR, XOR, NOT operations
- **FHE Comparisons** - Equality, greater than, less than, etc.
- **FHE Conditionals** - Selection and conditional operations
- **FHE Permissions** - Access control patterns
- **Handle Lifecycle** - Handle management
- **Encryption Patterns** - Common encryption patterns

### 🔐 Encryption

Learn how to encrypt data:

- **Encrypt Single Value** - Basic encryption patterns
- **Encrypt Multiple Values** - Handling multiple encrypted values

### 🔓 Decryption

Understand decryption mechanisms:

- **User Decryption** - User-controlled decryption (single and multiple values)
- **Public Decryption** - Public decryption patterns (single and multiple values)

### ⚠️ Anti-Patterns

Learn from common mistakes:

- **View Function Anti-Pattern** - Common pitfalls with view functions
- **Gas Limit Pitfalls** - Gas limit considerations
- **Incorrect Reencryption** - Reencryption mistakes
- **Missing Permission Anti-Pattern** - Permission-related errors
- **State Management Mistakes** - State management pitfalls

### 🔒 Input Proofs

Input proof concepts and error handling:

- **Input Proof Basics** - Basic input proof concepts
- **Input Proof Error Handling** - Error handling patterns

### 🎯 Advanced Examples

More complex use cases:

- **Auctions** - Confidential bidding and price discovery
- **OpenZeppelin Integration** - ERC7984 and confidential tokens

## Features

### 🔐 Privacy by Design

All examples demonstrate how to keep sensitive data encrypted throughout computation, ensuring that values remain confidential even on a public blockchain.

### 📚 Comprehensive Documentation

Each example includes:

- Detailed contract explanations with `@title` and `@notice` tags
- Code breakdowns with `@dev` annotations
- Test explanations showing how to interact with encrypted data
- Implementation details highlighting key FHE concepts

### 🧪 Production-Ready Code

- Fully tested contracts with edge case coverage
- Common pitfalls and how to avoid them
- Best practices for FHE permissions and access control
- Error handling and validation patterns

### 🛠️ Easy to Use

- Standalone repositories for each example
- Automated scaffolding tools
- Category-based project generation
- Auto-generated documentation

### 🔄 Maintainable

- Clear code structure and organization
- Consistent patterns across examples
- Easy to update and extend
- Well-documented configuration

## Documentation Structure

Each example documentation page follows this structure:

1. **Title and Description** - Overview of what the example demonstrates
2. **Full Code** - Complete contract and test code in tabs
3. **Implementation Details** - Breakdown of key concepts with explanations

## Navigation

- [Fundamentals](fundamentals/README.md) - Core FHEVM operations
- [Encryption](encrypt/README.md) - Encryption patterns
- [Decryption](decrypt/README.md) - Decryption mechanisms
- [Anti-Patterns](anti-patterns/README.md) - Common mistakes to avoid
- [Input Proofs](input-proofs/README.md) - Input proof concepts
- [OpenZeppelin](openzeppelin/README.md) - OpenZeppelin integration examples

See [SUMMARY.md](SUMMARY.md) for a complete list of all examples.

## Contributing

We welcome contributions! When adding new examples:

1. Use NatSpec format with `@title` and `@notice` for contract documentation
2. Add `@dev` comments for key code sections
3. Include comprehensive tests with explanations
4. Follow the existing code style and patterns
5. Run `npm run discover` to auto-configure
6. Ensure all tests pass before submitting

See the [Contributing Guide](../README.md#contributing) for detailed guidelines.

## Resources

- **FHEVM Documentation**: https://docs.zama.ai/fhevm
- **Protocol Examples**: https://docs.zama.org/protocol/examples
- **Base Template**: https://github.com/zama-ai/fhevm-hardhat-template
- **OpenZeppelin Confidential Contracts**: https://github.com/OpenZeppelin/openzeppelin-confidential-contracts

## Next Steps

Ready to start building?

- Start with fundamentals to understand core concepts
- Explore encryption/decryption examples to learn data handling
- Study anti-patterns to avoid common mistakes
- Build something amazing with the advanced examples!

---

**Happy coding with FHEVM!** 🚀
