# FHEVM Examples Hub

A comprehensive, production-ready system for creating, managing, and distributing standalone FHEVM (Fully Homomorphic Encryption Virtual Machine) example repositories with automated documentation generation. Built with TypeScript, featuring a powerful CLI and full automation suite.

---

## 📋 Overview

This project serves as the central hub for FHEVM examples, providing developers with:

- **Verified Examples**: Production-ready examples that compile and pass all tests
- **Automated Generation**: CLI tools to generate standalone repositories instantly
- **Complete Documentation**: Auto-generated GitBook-formatted documentation for every example
- **Maintenance Tools**: Automated discovery, validation, and refresh capabilities
- **Category Projects**: Generate multi-example projects organized by category

Every example in this repository has been tested, validated, and verified to work correctly. The system ensures quality through automated testing before examples are added to the configuration.

---

## ✨ Key Features

### 🎯 **Comprehensive Example Library**
- **40+ verified examples** across 7 categories
- All examples compile and pass tests
- Covers fundamentals to advanced use cases
- Includes anti-patterns to help developers avoid common mistakes

### 🚀 **Powerful CLI**
- Interactive mode for easy navigation
- Direct command execution for automation
- Category-based organization
- Batch operations support

### 📚 **Automated Documentation**
- GitBook-formatted markdown generation
- Extracts code from contracts and tests
- Organizes by category with nested structure
- Auto-updates SUMMARY.md index

### 🔧 **Automation Tools**
- **Discover**: Scan for new examples and auto-configure
- **Validate**: Test all generated examples
- **Refresh**: Update examples with latest template
- **Batch**: Generate all examples or categories at once

### 🎓 **Category Projects**
Generate complete projects with multiple related examples:
- Perfect for learning workflows
- Includes all contracts and tests
- Unified deployment scripts
- Comprehensive README

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd example-hub

# Install dependencies
npm install

# Build the project
npm run build
```

### Using the CLI

#### Interactive Mode (Recommended)

```bash
npm run cli
```

This launches an interactive menu where you can:
- Browse examples by category
- Generate standalone examples
- Create category projects
- Generate documentation
- Run maintenance tasks

#### Direct Commands

**Create a standalone example:**
```bash
# Via npm script
npm run create-example <example-name> [output-dir]

# Via CLI
npm run cli example <example-name> [output-dir]

# Example
npm run cli example fhe-counter ./my-counter
```

**Create a category project:**
```bash
# Via npm script
npm run create-category <category> [output-dir]

# Via CLI
npm run cli category <category> [output-dir]

# Example
npm run cli category fundamentals ./my-fundamentals
```

**Generate documentation:**
```bash
# Single example
npm run generate-docs <example-name>

# All examples
npm run generate-all-docs

# Via CLI
npm run cli docs <example-name>
npm run cli docs --all
```

**Inject into existing Hardhat project:**
```bash
npm run cli example <example-name> --target <project-dir>

# Example: inject into current directory
npm run cli example fhe-counter --target .
```

### Other Useful Commands

```bash
# List all available examples
npm run cli list examples

# List all available categories
npm run cli list categories

# Discover new examples
npm run discover

# Validate all generated examples
npm run validate

# Refresh examples with updated template
npm run refresh [example-name]

# Batch generate all examples
npm run cli batch examples

# Batch generate all categories
npm run cli batch categories
```

---

## 📦 Available Examples

All examples listed below are **verified** — they compile successfully and pass all tests. Examples are organized by category for easy navigation.

### 🔷 Fundamentals

Core FHEVM operations and patterns:

#### FHE Operations
- **fhe-add** - Addition operations on encrypted values
- **fhe-subtract** - Subtraction operations on encrypted values
- **fhe-multiply** - Multiplication operations on encrypted values

#### FHE Boolean Logic
- **fhe-and** - Boolean AND operations
- **fhe-or** - Boolean OR operations
- **fhe-xor** - Boolean XOR operations
- **fhe-not** - Boolean NOT operations

#### FHE Comparisons
- **fhe-equal** - Equality comparisons
- **fhe-greater-than** - Greater than comparisons
- **fhe-greater-than-or-equal** - Greater than or equal comparisons
- **fhe-less-than** - Less than comparisons
- **fhe-less-than-or-equal** - Less than or equal comparisons

#### FHE Conditionals
- **fhe-select** - Conditional selection operations
- **fhe-if-then-else** - Conditional operations on encrypted values

#### Other Fundamentals
- **fhe-access-control** - Access control patterns
- **fhe-handle-lifecycle** - Handle lifecycle management
- **fhe-encryption-patterns** - Common encryption patterns

### 🔐 Encryption Examples

- **encrypt-single-value** - Single value encryption patterns
- **encrypt-multiple-values** - Multiple value encryption patterns

### 🔓 Decryption Examples

#### User Decryption
- **user-decrypt-single-value** - User decryption with single value
- **user-decrypt-multiple-values** - User decryption with multiple values

#### Public Decryption
- **public-decrypt-single-value** - Public decryption with single value
- **public-decrypt-multiple-values** - Public decryption with multiple values

### ⚠️ Anti-Patterns

Learn from common mistakes:

- **view-function-anti-pattern** - Common pitfalls with view functions
- **gas-limit-pitfalls** - Gas limit considerations
- **incorrect-reencryption** - Reencryption mistakes
- **missing-permission-anti-pattern** - Permission-related errors
- **state-management-mistakes** - State management pitfalls

### 🔒 Input Proofs

- **input-proof-basics** - Basic input proof concepts
- **input-proof-error-handling** - Error handling for input proofs

### 🎯 Advanced Examples

#### Auctions
- **blind-auction** - Sealed-bid auction with confidential bids
- **confidential-dutch-auction** - Dutch auction with encrypted prices

#### OpenZeppelin Integration
- **erc7984-example** - ERC7984 confidential token standard implementation

---

## 📝 Creating a New Example

Follow this guide to add a new verified example to the repository:

### Step 1: Write Your Contract

Create your contract in the appropriate category directory:

```
contracts/<category>/YourExample.sol
```

**Important:** Include detailed NatSpec comments explaining FHE concepts, correct usage, and common pitfalls.

**Example structure:**
```solidity
/**
 * @title Your Example Contract
 * @notice Brief description of what this example demonstrates
 */
contract YourExample {
    // Your implementation
}
```

### Step 2: Write Your Tests

Create corresponding tests:

```
test/<category>/YourExample.ts
```

**Best practices:**
- Include both success and failure test cases
- Use ✅/❌ markers for clarity in test descriptions
- Add explanatory comments for complex test scenarios
- Test edge cases and error conditions

### Step 3: Test Locally

Test your contract and tests in the base template:

```bash
cd fhevm-hardhat-template/

# Copy your files temporarily
cp ../contracts/<category>/YourExample.sol contracts/
cp ../test/<category>/YourExample.ts test/

# Run tests
npm run compile
npm run test

# Clean up
rm contracts/YourExample.sol test/YourExample.ts
```

### Step 4: Run Discovery

Use the discovery tool to automatically detect and configure your example:

```bash
npm run discover
```

The discovery tool will:
1. Scan for new contracts with matching tests
2. Validate file structure and syntax
3. Generate and test the example in a temporary directory
4. Update configuration files automatically
5. Generate documentation

**Note:** Only examples that compile and pass tests will be added to the configuration.

### Step 5: Verify Configuration

Check that your example was added correctly:

```bash
# List examples to see yours
npm run cli list examples

# Try generating it
npm run cli example <your-example-name> ./test-output
```

### Step 6: Create Pull Request

Once your example is discovered, configured, and verified:

1. **Commit your changes:**
   ```bash
   git add contracts/<category>/YourExample.sol
   git add test/<category>/YourExample.ts
   git add scripts/utils/*-config.ts  # Config files updated by discover
   git add docs/<category>/your-example.md  # Documentation generated by discover
   
   git commit -m "Add <your-example-name> example"
   ```

2. **Push and create PR:**
   ```bash
   git push origin your-branch
   ```

3. **PR Checklist:**
   - ✅ Example compiles successfully
   - ✅ All tests pass
   - ✅ Discover command ran successfully
   - ✅ Documentation was generated
   - ✅ Example appears in list

---

## 🔧 Maintenance

### Updating Project Dependencies

When you need to update the base template or dependencies:

#### Refresh Command

The `refresh` command updates all generated examples with the latest template:

```bash
# Refresh all examples and categories
npm run refresh

# Refresh a specific example
npm run refresh <example-name>

# Refresh a specific category
npm run refresh <category-name>
```

**What it does:**
1. Updates the `fhevm-hardhat-template` submodule/repository
2. Regenerates all examples with the updated template
3. Preserves your generated examples with latest changes

#### Manual Template Update

If you need to update the template manually:

```bash
# Navigate to template directory
cd fhevm-hardhat-template/

# Update dependencies
npm install

# Or if it's a git submodule
git submodule update --remote --merge

# Return to root
cd ..
```

#### Updating Dependencies in Generated Examples

To update dependencies across all examples:

```bash
# Use refresh command (automated)
npm run refresh

# Or manually update each example's package.json
# Then regenerate using create-example command with --override flag
```

### Updating Configuration Files

Configuration files are typically updated automatically by the `discover` command. However, if you need to manually edit:

- `scripts/utils/examples-config.ts` - Example configurations
- `scripts/utils/docs-config.ts` - Documentation configurations
- `scripts/utils/categories-config.ts` - Category configurations

**Important:** Always test after manual configuration changes:

```bash
npm run validate
```

### Regenerating Documentation

To regenerate all documentation:

```bash
npm run generate-all-docs
```

Or regenerate for a specific example:

```bash
npm run generate-docs <example-name>
```

---

## 🤝 Contributing

We welcome contributions! Here's how to contribute a new example:

### Contribution Workflow

1. **Create Your Example**
   - Write contract in `contracts/<category>/`
   - Write tests in `test/<category>/`
   - Follow existing patterns and include comments

2. **Test Your Example**
   ```bash
   # Test locally in template
   cd fhevm-hardhat-template/
   # Copy files and test
   npm run compile && npm run test
   ```

3. **Run Discovery**
   ```bash
   npm run discover
   ```
   This will:
   - Detect your new example
   - Validate it compiles and tests pass
   - Add it to configuration files
   - Generate documentation

4. **Verify Everything Works**
   ```bash
   # Generate the example to verify
   npm run cli example <your-example-name> ./test-output
   cd ./test-output/fhevm-example-<your-example-name>
   npm install
   npm run compile
   npm run test
   ```

5. **Run Validation**
   ```bash
   npm run validate
   ```
   This ensures all generated examples still work.

6. **Create Pull Request**
   - Commit your changes
   - Push to your fork
   - Create a PR with a clear description
   - Mention which category your example belongs to

### Contribution Guidelines

- ✅ **DO**: Write clear, well-commented code
- ✅ **DO**: Include both success and failure test cases
- ✅ **DO**: Follow existing naming conventions
- ✅ **DO**: Test locally before submitting
- ✅ **DO**: Run `discover` to auto-configure
- ❌ **DON'T**: Submit examples that don't compile
- ❌ **DON'T**: Submit examples with failing tests
- ❌ **DON'T**: Manually edit config files (use `discover`)
- ❌ **DON'T**: Skip the discovery step

### Getting Help

If you need help:
- Check existing examples for patterns
- Review the `discover` output for errors
- Test in the base template first
- Ensure all dependencies are installed

---

## 🛠️ Automation Tools

The project includes powerful automation tools to streamline development:

### Discover (`npm run discover`)

**Purpose:** Automatically scan for new examples and configure them.

**What it does:**
- Scans `contracts/` and `test/` directories
- Finds contracts with matching test files
- Validates file structure and syntax
- Generates and tests each example
- Updates configuration files automatically
- Generates documentation
- Only adds examples that pass all tests

**Usage:**
```bash
npm run discover
```

**When to use:**
- After adding new contract/test pairs
- To automatically configure new examples
- To verify all examples are properly configured

### Validate (`npm run validate`)

**Purpose:** Test all generated examples to ensure they work.

**What it does:**
- Finds all generated examples in `output/`
- Compiles each example
- Runs tests for each example
- Reports success/failure status

**Usage:**
```bash
npm run validate
```

**When to use:**
- Before submitting PRs
- After updating dependencies
- After making changes to the template
- To verify generated examples still work

### Refresh (`npm run refresh`)

**Purpose:** Update generated examples with the latest template.

**What it does:**
- Updates the `fhevm-hardhat-template` submodule/repo
- Regenerates all existing examples
- Preserves example-specific code
- Updates dependencies and configurations

**Usage:**
```bash
# Refresh all
npm run refresh

# Refresh specific example
npm run refresh <example-name>

# Refresh specific category
npm run refresh <category-name>
```

**When to use:**
- After template updates
- When dependencies need updating
- To sync with latest FHEVM changes

### Batch (`npm run cli batch`)

**Purpose:** Generate multiple examples or categories at once.

**What it does:**
- Generates all examples or categories
- Supports override flag for existing directories
- Optionally installs dependencies and runs tests

**Usage:**
```bash
# Generate all examples
npm run cli batch examples

# Generate all categories
npm run cli batch categories
```

**When to use:**
- Initial repository setup
- Regenerating all examples after changes
- CI/CD pipelines

### Generate Docs (`npm run generate-docs`)

**Purpose:** Create GitBook-formatted documentation.

**What it does:**
- Extracts contract and test code
- Formats as markdown with syntax highlighting
- Organizes by category
- Updates SUMMARY.md index

**Usage:**
```bash
# Single example
npm run generate-docs <example-name>

# All examples
npm run generate-all-docs
```

**When to use:**
- After adding new examples
- When documentation needs updating
- Before publishing documentation

---

## 📚 Resources

- **FHEVM Documentation**: https://docs.zama.ai/fhevm
- **Protocol Examples**: https://docs.zama.org/protocol/examples
- **Base Template**: https://github.com/zama-ai/fhevm-hardhat-template
- **OpenZeppelin Confidential Contracts**: https://github.com/OpenZeppelin/openzeppelin-confidential-contracts

---

## 📄 License

BSD-3-Clause-Clear License - See LICENSE file

---

**Built with ❤️ using [FHEVM](https://github.com/zama-ai/fhevm) by Zama**
