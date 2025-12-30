/**
 * Create category task - generates FHEVM project with all examples from a category
 */

import * as fs from "fs";
import * as path from "path";
import { logger } from "../utils/logger";
import {
  copyDirectoryRecursive,
  getContractName,
  readFile,
  writeFile,
  removeFilesMatching,
  detectDependenciesFromContracts,
} from "../utils/files";
import { getProjectRoot } from "../utils/paths";
import { askConfirmation } from "../utils/prompts";
import { installAndTest } from "../utils/project-execution";
import { CATEGORIES, type CategoryConfig } from "../utils/categories-config";
import type { ContractItem } from "../utils/config";

/**
 * Generate deploy script for multiple contracts
 */
function generateDeployScript(contractNames: string[]): string {
  return `import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

${contractNames
  .map(
    (name) => `  // Deploy ${name}
  const deployed${name} = await deploy("${name}", {
    from: deployer,
    log: true,
  });
  console.log(\`${name} contract: \${deployed${name}.address}\`);
`
  )
  .join("\n")}};

export default func;
func.id = "deploy_all";
func.tags = ["all", ${contractNames.map((n) => `"${n}"`).join(", ")}];
`;
}

/**
 * Generate README for category project
 */
function generateReadme(category: string, contractNames: string[]): string {
  const categoryInfo = CATEGORIES[category];

  return `# FHEVM Examples: ${categoryInfo.name}

${categoryInfo.description}

## 📦 Included Examples

This project contains ${contractNames.length} example contract${
    contractNames.length > 1 ? "s" : ""
  }:

${contractNames.map((name, i) => `${i + 1}. **${name}**`).join("\n")}

## Quick Start

### Prerequisites

- **Node.js**: Version 20 or higher
- **npm**: Package manager

### Installation

1. **Install dependencies**

   \`\`\`bash
   npm install
   \`\`\`

2. **Set up environment variables**

   \`\`\`bash
   npx hardhat vars set MNEMONIC
   npx hardhat vars set INFURA_API_KEY
   # Optional: Set Etherscan API key for contract verification
   npx hardhat vars set ETHERSCAN_API_KEY
   \`\`\`

3. **Compile all contracts**

   \`\`\`bash
   npm run compile
   \`\`\`

4. **Run all tests**

   \`\`\`bash
   npm run test
   \`\`\`

## Contracts

${contractNames
  .map(
    (name) => `### ${name}

Located in \`contracts/${name}.sol\`

Run specific tests:
\`\`\`bash
npx hardhat test test/${name}.ts
\`\`\`
`
  )
  .join("\n")}

## Deployment

### Local Network

\`\`\`bash
# Start local node
npx hardhat node

# Deploy all contracts
npx hardhat deploy --network localhost
\`\`\`

### Sepolia Testnet

\`\`\`bash
# Deploy all contracts
npx hardhat deploy --network sepolia

# Verify contracts
${contractNames
  .map(
    (name) =>
      `npx hardhat verify --network sepolia <${name.toUpperCase()}_ADDRESS>`
  )
  .join("\n")}
\`\`\`

## Available Scripts

| Script | Description |
|--------|-------------|
| \`npm run compile\` | Compile all contracts |
| \`npm run test\` | Run all tests |
| \`npm run test:sepolia\` | Run tests on Sepolia |
| \`npm run lint\` | Run all linters |
| \`npm run lint:sol\` | Lint Solidity only |
| \`npm run lint:ts\` | Lint TypeScript only |
| \`npm run prettier:check\` | Check formatting |
| \`npm run prettier:write\` | Auto-format code |
| \`npm run clean\` | Clean build artifacts |
| \`npm run coverage\` | Generate coverage report |

## Documentation

- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [FHEVM Examples](https://docs.zama.org/protocol/examples)
- [FHEVM Hardhat Plugin](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat)

## License

This project is licensed under the BSD-3-Clause-Clear License.

---

**Built with ❤️ using [FHEVM](https://github.com/zama-ai/fhevm) by Zama**
`;
}

/**
 * Create FHEVM category project
 * @param category - Category name
 * @param outputDir - Output directory path
 * @param override - Whether to override existing directory (if false, will prompt)
 * @param installAndRunTests - Whether to install dependencies and run tests
 */
export async function createCategory(
  category: string,
  outputDir: string,
  override?: boolean,
  installAndRunTests = false
): Promise<void> {
  const rootDir = getProjectRoot();
  const templateDir = path.join(rootDir, "fhevm-hardhat-template");

  // Validate category
  if (!CATEGORIES[category]) {
    logger.error(
      `Unknown category: ${category}\n\nAvailable categories:\n${Object.keys(
        CATEGORIES
      )
        .map((k) => `  - ${k}: ${CATEGORIES[k].name}`)
        .join("\n")}`
    );
    process.exit(1);
  }

  const categoryInfo: CategoryConfig = CATEGORIES[category];
  logger.info(`Creating FHEVM project: ${categoryInfo.name}`);
  logger.info(`Output directory: ${outputDir}`);

  // Check if output directory exists and handle override
  if (fs.existsSync(outputDir)) {
    let shouldOverride = override;

    if (shouldOverride === undefined) {
      logger.warning(`Output directory already exists: ${outputDir}`);
      logger.info("Use --override flag to automatically replace it.");
      shouldOverride = await askConfirmation(
        "Do you want to override it?",
        false
      );
    }

    if (shouldOverride) {
      logger.warning(`Removing existing directory: ${outputDir}`);
      fs.rmSync(outputDir, { recursive: true, force: true });
    } else {
      logger.error("Operation cancelled. Directory already exists.");
      process.exit(1);
    }
  }

  // Step 1: Copy template
  logger.step("Copying template...");
  copyDirectoryRecursive(templateDir, outputDir);

  // Remove tasks folder - not needed for examples
  const tasksDir = path.join(outputDir, "tasks");
  if (fs.existsSync(tasksDir)) {
    fs.rmSync(tasksDir, { recursive: true, force: true });
  }

  // Remove task imports from hardhat.config.ts
  const hardhatConfigPath = path.join(outputDir, "hardhat.config.ts");
  if (fs.existsSync(hardhatConfigPath)) {
    let configContent = readFile(hardhatConfigPath);
    // Remove lines that import from tasks folder
    configContent = configContent.replace(
      /import\s+["'].*\/tasks\/.*["'];\s*\n/g,
      ""
    );
    writeFile(hardhatConfigPath, configContent);
  }

  // Remove tasks from tsconfig.json if it exists
  const tsconfigPath = path.join(outputDir, "tsconfig.json");
  if (fs.existsSync(tsconfigPath)) {
    let tsconfigContent = readFile(tsconfigPath);
    // Remove "tasks/**/*" from include array
    tsconfigContent = tsconfigContent.replace(
      /["']tasks\/\*\*\/\*["']\s*,?\s*/g,
      ""
    );
    writeFile(tsconfigPath, tsconfigContent);
  }

  logger.success("Template copied");

  // Step 2: Clear template contracts and tests
  logger.step("Clearing template files...");
  const contractsDir = path.join(outputDir, "contracts");
  const testsDir = path.join(outputDir, "test");

  removeFilesMatching(contractsDir, /\.sol$/);
  removeFilesMatching(testsDir, /\.ts$/);
  logger.success("Template files cleared");

  // Step 3: Copy all contracts and tests from category
  logger.step("Copying contracts and tests...");
  const contractNames: string[] = [];
  const copiedTests = new Set<string>();

  categoryInfo.contracts.forEach(
    ({
      path: contractPath,
      test: testPath,
      fixture,
      additionalFiles,
    }: ContractItem) => {
      // Copy contract
      const fullContractPath = path.join(rootDir, contractPath);
      if (!fs.existsSync(fullContractPath)) {
        logger.warning(`Contract not found: ${contractPath}`);
        return;
      }

      const contractName = getContractName(fullContractPath);
      if (contractName) {
        contractNames.push(contractName);
        const destContractPath = path.join(contractsDir, `${contractName}.sol`);
        fs.copyFileSync(fullContractPath, destContractPath);
        logger.log(`  ✓ ${contractName}.sol`);
      }

      // Copy test (avoid duplicates)
      const fullTestPath = path.join(rootDir, testPath);
      if (fs.existsSync(fullTestPath) && !copiedTests.has(testPath)) {
        const testFileName = path.basename(testPath);
        const destTestPath = path.join(testsDir, testFileName);
        fs.copyFileSync(fullTestPath, destTestPath);
        copiedTests.add(testPath);
        logger.log(`  ✓ ${testFileName}`);
      }

      // Copy fixture if exists
      if (fixture) {
        const fullFixturePath = path.join(rootDir, fixture);
        if (fs.existsSync(fullFixturePath) && !copiedTests.has(fixture)) {
          const fixtureFileName = path.basename(fixture);
          const destFixturePath = path.join(testsDir, fixtureFileName);
          fs.copyFileSync(fullFixturePath, destFixturePath);
          copiedTests.add(fixture);
          logger.log(`  ✓ ${fixtureFileName}`);
        }
      }

      // Copy additional files if any
      if (additionalFiles) {
        additionalFiles.forEach((filePath: string) => {
          const fullFilePath = path.join(rootDir, filePath);
          if (fs.existsSync(fullFilePath)) {
            const fileName = path.basename(filePath);
            const destFilePath = path.join(testsDir, fileName);
            fs.copyFileSync(fullFilePath, destFilePath);
            logger.log(`  ✓ ${fileName}`);
          }
        });
      }
    }
  );

  logger.success(`Copied ${contractNames.length} contracts and their tests`);

  // Step 4: Generate deployment script
  logger.step("Generating deployment script...");
  const deployScript = generateDeployScript(contractNames);
  writeFile(path.join(outputDir, "deploy", "deploy.ts"), deployScript);
  logger.success("Deployment script generated");

  // Step 5: Detect dependencies from all contracts
  logger.step("Detecting dependencies...");
  const contractPaths = categoryInfo.contracts.map((c) =>
    path.join(rootDir, c.path)
  );
  const detectedDependencies = detectDependenciesFromContracts(contractPaths);
  if (detectedDependencies.size > 0) {
    logger.log(
      `  Found ${detectedDependencies.size} dependency(ies): ${Array.from(
        detectedDependencies.keys()
      ).join(", ")}`
    );
  }

  // Step 6: Update package.json
  logger.step("Updating package.json...");
  const packageJsonPath = path.join(outputDir, "package.json");
  const packageJson = JSON.parse(readFile(packageJsonPath));

  packageJson.name = `fhevm-examples-${category}`;
  packageJson.description = categoryInfo.description;
  packageJson.homepage = `https://github.com/Destiny-01/fhe-playground/${category}`;

  // Add detected dependencies
  const additionalDeps = (categoryInfo as any).additionalDeps;
  if (detectedDependencies.size > 0 || additionalDeps) {
    if (!packageJson.dependencies) {
      packageJson.dependencies = {};
    }

    // Add detected dependencies
    detectedDependencies.forEach((version, packageName) => {
      packageJson.dependencies[packageName] = version;
    });

    // Add additional dependencies from config (these take precedence if there's a conflict)
    if (additionalDeps) {
      Object.assign(packageJson.dependencies, additionalDeps);
    }
  }

  writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
  logger.success("package.json updated");

  // Step 7: Generate README
  logger.step("Generating README...");
  const readme = generateReadme(category, contractNames);
  writeFile(path.join(outputDir, "README.md"), readme);
  logger.success("README.md generated");

  // Final summary
  logger.separator();
  logger.success(`${categoryInfo.name} project created successfully!`);
  logger.separator();

  logger.info(`Project Summary:`);
  logger.dim(`  Category: ${categoryInfo.name}`);
  logger.dim(`  Contracts: ${contractNames.length}`);
  logger.dim(`  Location: ${path.relative(process.cwd(), outputDir)}`);

  // Install and test if requested
  if (installAndRunTests) {
    installAndTest(outputDir);
  } else {
    logger.info(`Next steps:`);
    logger.dim(`  cd ${path.relative(process.cwd(), outputDir)}`);
    logger.dim("  npm install");
    logger.dim("  npm run compile");
    logger.dim("  npm run test");
  }

  logger.highlight("\nHappy coding with FHEVM!");
}
