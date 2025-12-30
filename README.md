# FHEVM Examples Hub

A comprehensive, production-ready system for creating, managing, and distributing standalone FHEVM (Fully Homomorphic Encryption Virtual Machine) example repositories with automated documentation generation. Built with TypeScript, featuring a powerful CLI and full automation suite.

## 🚀 Quick Start with npx

**Available on npm!** Use directly without installation:

```bash
# Interactive mode
npx fhe-playground

# Create an example
npx fhe-playground example fhe-counter ./my-counter

# Create a category project
npx fhe-playground category fundamentals ./my-fundamentals

# List all examples
npx fhe-playground list examples
```

[Full documentation below ↓](#-quick-start)

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
- **40+ verified examples** across 9 categories
- All examples compile and pass tests
- Covers fundamentals to advanced use cases
- Includes anti-patterns to help developers avoid common mistakes
- Gaming and identity verification examples

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

#### Option 1: Use via npx (Recommended - No Installation Required)

The easiest way to use `fhe-playground` is via `npx`, which doesn't require any installation:

```bash
# Interactive mode
npx fhe-playground

# Create an example
npx fhe-playground example <example-name> [output-dir]

# Create a category project
npx fhe-playground category <category> [output-dir]

# Generate documentation
npx fhe-playground docs <example-name>
npx fhe-playground docs --all

# List available examples
npx fhe-playground list examples

# List available categories
npx fhe-playground list categories

# Discover new examples
npx fhe-playground discover

# Validate generated examples
npx fhe-playground validate

# Refresh examples
npx fhe-playground refresh [example-name]

# Batch operations
npx fhe-playground batch examples
npx fhe-playground batch categories
```

**Options:**
- `--target <dir>` - Inject into existing Hardhat project (use `.` for current directory)
- `--override` - Automatically override existing output directory
- `--install` - Install dependencies and run tests after creation

#### Option 2: Install Globally

```bash
npm install -g fhe-playground

# Then use directly
fhe-playground
fhe-playground example <name>
```

#### Option 3: Clone and Develop

```bash
# Clone the repository
git clone https://github.com/Destiny-01/fhe-playground.git
cd fhe-playground

# Install dependencies
npm install

# Build the project
npm run build

# Use via npm scripts
npm run cli
npm run create-example <name>
```

### Using the CLI

#### Interactive Mode (Recommended)

```bash
# Via npx (no installation)
npx fhe-playground

# Or if installed globally
fhe-playground
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
# Via npx (recommended)
npx fhe-playground example <example-name> [output-dir]

# Example
npx fhe-playground example fhe-counter ./my-counter

# With options
npx fhe-playground example fhe-counter ./my-counter --target . --install
```

**Create a category project:**
```bash
# Via npx
npx fhe-playground category <category> [output-dir]

# Example
npx fhe-playground category fundamentals ./my-fundamentals
```

**Generate documentation:**
```bash
# Single example
npx fhe-playground docs <example-name>

# All examples
npx fhe-playground docs --all
```

**Inject into existing Hardhat project:**
```bash
npx fhe-playground example <example-name> --target <project-dir>

# Example: inject into current directory
npx fhe-playground example fhe-counter --target .
```

### Other Useful Commands

```bash
# List all available examples
npx fhe-playground list examples

# List all available categories
npx fhe-playground list categories

# Discover new examples
npx fhe-playground discover

# Validate all generated examples
npx fhe-playground validate

# Refresh examples with updated template
npx fhe-playground refresh [example-name]

# Batch generate all examples
npx fhe-playground batch examples

# Batch generate all categories
npx fhe-playground batch categories
```

### Command Options

All commands support the following options:

- `--target <dir>` - Inject into existing Hardhat project (use `.` for current directory)
- `--override` - Automatically override existing output directory without prompting
- `--install` - Install dependencies and run tests after creation

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
- **multi-input-validation** - Validating multiple encrypted inputs in a single operation

### 🎮 Gaming Examples

Provably fair gaming applications:
- **rock-paper-scissors** - Commit-reveal Rock-Paper-Scissors game
- **encrypted-dice** - Provably fair dice rolling
- **poker-hand** - Poker hand evaluation with encrypted cards
- **private-lottery** - Private lottery with encrypted tickets

### 🆔 Identity Examples

Privacy-preserving identity verification:
- **age-verification** - Verify age requirements without revealing exact age
- **credit-score-check** - Check credit scores against thresholds privately
- **encrypted-kyc** - Know Your Customer verification with encrypted data

### 🎯 Advanced Examples

#### OpenZeppelin Integration
- **erc7984-example** - ERC7984 confidential token standard implementation
- **erc7984-erc20-wrapper** - Convert between confidential and public token standards
- **swap-erc7984-to-erc20** - Cross-standard token swapping
- **swap-erc7984-to-erc7984** - Confidential token-to-token swapping
- **vesting-wallet** - Confidential token vesting mechanisms

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

### Step 3: Configure External Dependencies (If Needed)

If your contract uses external npm packages (like OpenZeppelin contracts), you need to configure their versions in `package.json`:

**Edit `package.json` and add a `dependencyVersions` field:**

```json
{
  "dependencyVersions": {
    "@openzeppelin/contracts": "^5.0.0",
    "@openzeppelin/confidential-contracts": "^0.3.0",
    "@fhevm/solidity": "^0.9.1",
    "@your-package/name": "^1.0.0"  // Add your package here
  }
}
```

**How it works:**
- The system automatically detects npm-scoped packages (starting with `@`) from your contract's import statements
- It looks up the version from `dependencyVersions` in `package.json`
- If a package is used but not configured, you'll get a warning and it will use `'latest'` as fallback
- **Always configure versions** to ensure reproducible builds

**Example contract with external dependencies:**
```solidity
import {IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
```

The system will automatically detect `@openzeppelin/contracts` and use the version specified in `dependencyVersions`.

### Step 4: Verify Your Contract Works

Before running discovery, verify that your contract compiles and your tests pass. Simply ensure your contract is in the `contracts/<category>/` directory and your test is in the `test/<category>/` directory. The discovery tool will automatically test it for you.

If you want to verify manually, you can check that:
- Your contract file is valid Solidity
- Your test file is valid TypeScript
- Both files follow the naming conventions

**Note:** The discovery tool will automatically test your example - you don't need to manually test it. Just make sure the files are in the correct locations.

### Step 5: Run Discovery

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

### Step 6: Verify Configuration

Check that your example was added correctly:

```bash
# List examples to see yours
npm run cli list examples

# Try generating it
npm run cli example <your-example-name> ./test-output
```

### Step 7: Create Pull Request

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
   - ✅ External dependencies configured in `dependencyVersions` (if any)
   - ✅ Discover command ran successfully
   - ✅ Documentation was generated
   - ✅ Example appears in list

---

## 🔧 Maintenance

### Managing External Dependencies

The system automatically detects and manages external npm package dependencies used in contracts.

#### How Dependency Detection Works

1. **Automatic Detection**: When generating examples or categories, the system scans all contract import statements
2. **Package Extraction**: It extracts npm-scoped package names (e.g., `@openzeppelin/contracts` from `@openzeppelin/contracts/token/ERC20/ERC20.sol`)
3. **Version Lookup**: It looks up the version from `dependencyVersions` in the root `package.json`
4. **Auto-Installation**: Detected dependencies are automatically added to generated projects' `package.json`

#### Configuring Dependency Versions

Edit the root `package.json` and add/update the `dependencyVersions` field:

```json
{
  "dependencyVersions": {
    "@openzeppelin/contracts": "^5.0.0",
    "@openzeppelin/confidential-contracts": "^0.3.0",
    "@fhevm/solidity": "^0.9.1",
    "@your-package/name": "^1.0.0"
  }
}
```

#### Updating Dependency Versions

To update a dependency version:

1. Edit `package.json` → `dependencyVersions`
2. Update the version string (e.g., `^5.0.0` → `^5.1.0`)
3. Regenerate examples if needed:
   ```bash
   npm run refresh <example-name>
   ```

#### Troubleshooting

**Warning: Package not configured**
```
Package "@your-package/name" detected but not configured in package.json dependencyVersions.
```

**Solution**: Add the package to `dependencyVersions` in `package.json` with the desired version.

**Package installation fails**
- Check that the version exists on npm
- Verify the version string format (e.g., `^1.0.0`, `~1.0.0`, `1.0.0`)
- Ensure the package name matches exactly (case-sensitive)

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

#### Updating the Template

The `fhevm-hardhat-template` is a git submodule. To update it:

```bash
# Update the submodule to latest
git submodule update --remote fhevm-hardhat-template

# Then refresh all examples to use the updated template
npm run refresh
```

**Note:** The `refresh` command automatically handles template updates and dependency management. You don't need to manually update dependencies in generated examples - the refresh command does this automatically.

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

2. **Verify Your Files**
   - Ensure your contract is in `contracts/<category>/YourExample.sol`
   - Ensure your test is in `test/<category>/YourExample.ts`
   - The discovery tool will automatically test it for you

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
   npx fhe-playground example <your-example-name> ./output
   cd ./output/fhevm-example-<your-example-name>
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

- **npm Package**: [fhe-playground](https://www.npmjs.com/package/fhe-playground) - Install via `npm install -g fhe-playground` or use with `npx fhe-playground`
- **FHEVM Documentation**: https://docs.zama.ai/fhevm
- **Protocol Examples**: https://docs.zama.org/protocol/examples
- **Base Template**: https://github.com/zama-ai/fhevm-hardhat-template
- **OpenZeppelin Confidential Contracts**: https://github.com/OpenZeppelin/openzeppelin-confidential-contracts
- **GitHub Repository**: https://github.com/Destiny-01/fhe-playground

---

## 📄 License

BSD-3-Clause-Clear License - See LICENSE file

---

**Built with ❤️ using [FHEVM](https://github.com/zama-ai/fhevm) by Zama**
