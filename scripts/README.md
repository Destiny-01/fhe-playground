# FHEVM Examples Generator Scripts

This directory contains the automation scripts for the FHEVM Examples Hub. All scripts are TypeScript-based and accessible through the main CLI.

## Overview

The scripts directory provides a comprehensive automation suite for:
- Generating standalone FHEVM example repositories
- Creating category-based projects
- Generating GitBook-formatted documentation
- Discovering and configuring new examples
- Validating and refreshing generated examples

## CLI Access

All scripts are accessible through the main CLI. See the root [README.md](../README.md) for complete usage instructions.

### Quick Commands

```bash
# Interactive mode
npm run cli

# Direct commands
npm run create-example <name> [output-dir]
npm run create-category <category> [output-dir]
npm run generate-docs <name>
npm run discover
npm run validate
npm run refresh [name]
npm run cli batch examples
npm run cli batch categories
```

## Script Structure

```
scripts/
├── cli.ts                      # Main CLI entry point
├── tasks/                      # Task implementations
│   ├── create-example.ts      # Single example generator
│   ├── create-category.ts     # Category project generator
│   ├── generate-docs.ts       # Documentation generator
│   ├── discover.ts            # Example discovery and auto-config
│   ├── validate.ts            # Validation tool
│   ├── refresh.ts             # Refresh tool
│   ├── batch.ts               # Batch operations
│   └── add-example.ts         # Interactive add example guide
└── utils/                     # Shared utilities
    ├── examples-config.ts     # Example configurations
    ├── docs-config.ts         # Documentation configurations
    ├── categories-config.ts   # Category configurations
    └── ...                    # Other utilities
```

## Main Tasks

### 1. Create Example

Generates a complete, standalone FHEVM example repository from the base template.

**Features:**
- Copies contract and test files
- Sets up Hardhat configuration
- Generates README.md
- Creates deployment scripts
- Updates package.json metadata
- Can inject into existing Hardhat projects

**Usage:**
```bash
npm run create-example <example-name> [output-dir] [--target <dir>] [--override] [--install]
```

### 2. Create Category

Generates a project containing all examples from a specific category.

**Features:**
- Includes all contracts from category
- Includes all corresponding tests
- Generates unified deployment script
- Creates comprehensive README
- Perfect for learning workflows

**Usage:**
```bash
npm run create-category <category> [output-dir] [--override] [--install]
```

### 3. Generate Docs

Creates GitBook-formatted documentation from contract and test files.

**Features:**
- Extracts contract and test code
- Generates markdown with tabs
- Auto-updates SUMMARY.md
- Organizes by category
- Includes hints and formatting

**Usage:**
```bash
npm run generate-docs <example-name>
npm run generate-all-docs
```

### 4. Discover

Automatically scans for new examples and configures them.

**Features:**
- Scans contracts/ and test/ directories
- Finds matching contract/test pairs
- Validates file structure
- Tests each example
- Updates configuration files automatically
- Generates documentation
- Only adds examples that pass tests

**Usage:**
```bash
npm run discover
```

### 5. Validate

Tests all generated examples to ensure they work.

**Features:**
- Finds all generated examples
- Compiles each example
- Runs tests
- Reports results

**Usage:**
```bash
npm run validate
```

### 6. Refresh

Updates generated examples with the latest template.

**Features:**
- Updates template submodule/repo
- Regenerates examples
- Preserves example code
- Updates dependencies

**Usage:**
```bash
npm run refresh              # Refresh all
npm run refresh <name>       # Refresh specific example/category
```

### 7. Batch

Generates multiple examples or categories at once.

**Features:**
- Generate all examples
- Generate all categories
- Supports override flag
- Optional install and test

**Usage:**
```bash
npm run cli batch examples
npm run cli batch categories
```

## Configuration Files

All examples are configured in TypeScript configuration files:

### `utils/examples-config.ts`

Maps example names to their contract and test files:

```typescript
export const EXAMPLES_MAP: Record<string, ExampleConfig> = {
  'example-name': {
    contract: 'contracts/category/Example.sol',
    test: 'test/category/Example.ts',
    description: 'Example description',
    category: 'category',
  },
};
```

### `utils/docs-config.ts`

Maps examples to documentation configuration:

```typescript
export const EXAMPLES_CONFIG: Record<string, DocsConfig> = {
  'example-name': {
    title: 'Display Title',
    description: 'Full description',
    contract: 'contracts/category/Example.sol',
    test: 'test/category/Example.ts',
    output: 'docs/category/example.md',
    category: 'Category Name',
  },
};
```

### `utils/categories-config.ts`

Defines category projects:

```typescript
export const CATEGORIES: Record<string, CategoryConfig> = {
  'category-name': {
    name: 'Category Name',
    description: 'Category description',
    contracts: [
      {
        path: 'contracts/category/Example.sol',
        test: 'test/category/Example.ts',
      },
    ],
  },
};
```

## Dependency Version Configuration

When your contracts use external npm packages (like OpenZeppelin), you need to configure their versions in the root `package.json`.

### Setting Up Dependency Versions

Add a `dependencyVersions` field to the root `package.json`:

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

### How It Works

1. **Automatic Detection**: The system automatically scans contract import statements and detects npm-scoped packages (starting with `@`)

2. **Version Lookup**: When generating examples or categories, it looks up each detected package in `dependencyVersions`

3. **Automatic Installation**: Detected dependencies are automatically added to the generated project's `package.json` with the configured version

4. **Warnings**: If a package is used but not configured, you'll see a warning:
   ```
   Package "@your-package/name" detected but not configured in package.json dependencyVersions.
   Add it to package.json dependencyVersions to specify a version, or it will use 'latest'.
   ```

### Example

**Contract:**
```solidity
import {IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {MyLib} from "@mycompany/mylib/utils/MyLib.sol";
```

**package.json:**
```json
{
  "dependencyVersions": {
    "@openzeppelin/contracts": "^5.0.0",
    "@mycompany/mylib": "^1.2.3"
  }
}
```

**Result**: When generating the example, both packages will be automatically added to the generated project's `package.json` with the specified versions.

### Best Practices

- ✅ **Always configure versions** for external dependencies to ensure reproducible builds
- ✅ **Use semantic versioning** (e.g., `^5.0.0` for compatible updates)
- ✅ **Test after adding new dependencies** to ensure they work correctly
- ✅ **Update versions regularly** to get security patches and new features

## Adding New Examples

The recommended workflow is to use the `discover` command, which automatically:

1. Detects new contract/test pairs
2. Validates them
3. Tests them
4. Updates configuration files
5. Generates documentation

**Manual workflow:**

1. Add contract to `contracts/<category>/`
2. Add test to `test/<category>/`
3. **Configure external dependencies** (if your contract uses npm packages):
   - Add package versions to `package.json` → `dependencyVersions`
   - See [Dependency Version Configuration](#dependency-version-configuration) above
4. Update configuration files (or run `discover`)
5. Generate documentation
6. Test the generated example

**Important**: If your contract uses external npm packages, make sure to add them to `dependencyVersions` in `package.json` before running `discover` or generating examples. The system will automatically detect and include them.

See the root [README.md](../README.md) for the complete contribution guide.

## NatSpec Documentation Format

All contracts should use NatSpec comments:

### Contract-Level Documentation

```solidity
/**
 * @title Contract Name - Brief description
 * @notice Longer description explaining what the contract does
 */
contract MyContract {
  // ...
}
```

### Code Explanation

```solidity
/// @dev Detailed explanation of what this code does.
///      Can span multiple lines.
function myFunction() external {
  // Implementation
}
```

## Best Practices

1. **Always test locally** before submitting
2. **Use discover command** to auto-configure examples
3. **Follow naming conventions** (kebab-case for example names)
4. **Include comprehensive tests** with both success and failure cases
5. **Add NatSpec comments** for clarity
6. **Validate generated examples** before committing

## Troubleshooting

**Example doesn't appear in CLI:**
- Ensure it's in `EXAMPLES_MAP` configuration
- Run `npm run discover` to auto-detect

**Generated example doesn't compile:**
- Check dependencies in base template
- Verify import paths
- Ensure no template-specific references

**Documentation not generating:**
- Check `EXAMPLES_CONFIG` has entry
- Verify output path is correct
- Ensure contract/test files exist

**Discover fails:**
- Check contract and test files exist
- Verify file structure matches pattern
- Ensure tests pass locally first

## Maintenance

When updating dependencies:

1. Update base template (`fhevm-hardhat-template/`)
2. Run `npm run refresh` to update all examples
3. Run `npm run validate` to ensure everything works
4. Update documentation if APIs changed

## See Also

- Root [README.md](../README.md) - Complete project documentation
- [docs/README.md](../docs/README.md) - Documentation structure
- [FHEVM Documentation](https://docs.zama.ai/fhevm) - Official FHEVM docs
