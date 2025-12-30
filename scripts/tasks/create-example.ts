/**
 * Create example task - generates standalone FHEVM example repository
 */

import * as fs from "fs";
import * as path from "path";
import { logger } from "../utils/logger";
import { askConfirmation } from "../utils/prompts";
import {
  copyDirectoryRecursive,
  getContractName,
  readFile,
  writeFile,
  removeFile,
  removeFilesMatching,
  detectDependenciesFromContract,
} from "../utils/files";
import { getProjectRoot } from "../utils/paths";
import { installAndTest } from "../utils/project-execution";
import { EXAMPLES_MAP } from "../utils/examples-config";

/**
 * Generate deploy script content
 */
function generateDeployScript(contractName: string): string {
  return `import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployed${contractName} = await deploy("${contractName}", {
    from: deployer,
    log: true,
  });

  console.log(\`${contractName} contract: \`, deployed${contractName}.address);
};
export default func;
func.id = "deploy_${contractName.toLowerCase()}";
func.tags = ["${contractName}"];
`;
}

/**
 * Generate README content for example
 */
function generateReadme(
  exampleName: string,
  description: string,
  contractName: string
): string {
  return `# FHEVM Example: ${exampleName}

${description}

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

3. **Compile and test**

   \`\`\`bash
   npm run compile
   npm run test
   \`\`\`

## Contract

The main contract is \`${contractName}\` located in \`contracts/${contractName}.sol\`.

## Testing

Run the test suite:

\`\`\`bash
npm run test
\`\`\`

For Sepolia testnet testing:

\`\`\`bash
npm run test:sepolia
\`\`\`

## Deployment

Deploy to local network:

\`\`\`bash
npx hardhat node
npx hardhat deploy --network localhost
\`\`\`

Deploy to Sepolia:

\`\`\`bash
npx hardhat deploy --network sepolia
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
\`\`\`

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
 * Update package.json with example metadata and dependencies
 */
function updatePackageJson(
  outputDir: string,
  exampleName: string,
  description: string,
  dependencies: Map<string, string> = new Map()
): void {
  const packageJsonPath = path.join(outputDir, "package.json");
  const packageJson = JSON.parse(readFile(packageJsonPath));

  packageJson.name = `fhevm-example-${exampleName}`;
  packageJson.description = description;
  packageJson.homepage = `https://github.com/Destiny-01/fhe-playground/${exampleName}`;

  // Add detected dependencies
  if (dependencies.size > 0) {
    if (!packageJson.dependencies) {
      packageJson.dependencies = {};
    }
    dependencies.forEach((version, packageName) => {
      packageJson.dependencies[packageName] = version;
    });
  }

  writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

/**
 * Create standalone FHEVM example repository
 * @param exampleName - Name of the example to create
 * @param outputDir - Output directory path
 * @param override - Whether to override existing directory (if false, will prompt)
 * @param installAndRunTests - Whether to install dependencies and run tests
 */
export async function createExample(
  exampleName: string,
  outputDir: string,
  override?: boolean,
  installAndRunTests = false
): Promise<void> {
  const rootDir = getProjectRoot();
  const templateDir = path.join(rootDir, "fhevm-hardhat-template");

  // Validate example
  if (!EXAMPLES_MAP[exampleName]) {
    logger.error(
      `Unknown example: ${exampleName}\n\nAvailable examples:\n${Object.keys(
        EXAMPLES_MAP
      )
        .map((k) => `  - ${k}`)
        .join("\n")}`
    );
  }

  const example = EXAMPLES_MAP[exampleName];
  const contractPath = path.join(rootDir, example.contract);
  const testPath = path.join(rootDir, example.test);

  // Validate paths
  if (!fs.existsSync(contractPath)) {
    logger.error(`Contract not found: ${example.contract}`);
  }
  if (!fs.existsSync(testPath)) {
    logger.error(`Test not found: ${example.test}`);
  }

  logger.info(`Creating FHEVM example: ${exampleName}`);
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
    configContent = configContent.replace(/import\s+["'].*\/tasks\/.*["'];\s*\n/g, '');
    writeFile(hardhatConfigPath, configContent);
  }
  
  // Remove tasks from tsconfig.json if it exists
  const tsconfigPath = path.join(outputDir, "tsconfig.json");
  if (fs.existsSync(tsconfigPath)) {
    let tsconfigContent = readFile(tsconfigPath);
    // Remove "tasks/**/*" from include array
    tsconfigContent = tsconfigContent.replace(/["']tasks\/\*\*\/\*["']\s*,?\s*/g, '');
    writeFile(tsconfigPath, tsconfigContent);
  }
  
  logger.success("Template copied");

  // Step 2: Copy contract
  logger.step("Copying contract...");
  const contractName = getContractName(contractPath);
  if (!contractName) {
    logger.error("Could not extract contract name from contract file");
  }

  const destContractPath = path.join(
    outputDir,
    "contracts",
    `${contractName}.sol`
  );

  // Remove template contract
  removeFile(path.join(outputDir, "contracts", "FHECounter.sol"));

  fs.copyFileSync(contractPath, destContractPath);
  logger.success(`Contract copied: ${contractName}.sol`);

  // Step 3: Copy test
  logger.step("Copying test...");
  const destTestPath = path.join(outputDir, "test", path.basename(testPath));

  // Remove template tests
  removeFilesMatching(path.join(outputDir, "test"), /\.ts$/);

  fs.copyFileSync(testPath, destTestPath);
  logger.success(`Test copied: ${path.basename(testPath)}`);

  // Copy test fixture if it exists
  if (example.testFixture) {
    const fixtureSourcePath = path.join(rootDir, example.testFixture);
    if (fs.existsSync(fixtureSourcePath)) {
      const destFixturePath = path.join(
        outputDir,
        "test",
        path.basename(example.testFixture)
      );
      fs.copyFileSync(fixtureSourcePath, destFixturePath);
      logger.success(
        `Test fixture copied: ${path.basename(example.testFixture)}`
      );
    }
  }

  // Auto-detect common helper contracts from test file
  const testContent = readFile(testPath);
  const autoDetectedFiles: string[] = [];
  
  // Check if test uses ERC7984Example
  if (testContent.includes('ERC7984Example') || testContent.includes("'ERC7984Example'") || testContent.includes('"ERC7984Example"')) {
    const erc7984Path = path.join(rootDir, 'contracts/openzeppelin/ERC7984Example.sol');
    if (fs.existsSync(erc7984Path)) {
      autoDetectedFiles.push('contracts/openzeppelin/ERC7984Example.sol');
    }
  }
  
  // Check if test uses ERC20Mock
  if (testContent.includes('ERC20Mock') || testContent.includes("'ERC20Mock'") || testContent.includes('"ERC20Mock"')) {
    const erc20MockPath = path.join(rootDir, 'contracts/openzeppelin/ERC20Mock.sol');
    if (fs.existsSync(erc20MockPath)) {
      autoDetectedFiles.push('contracts/openzeppelin/ERC20Mock.sol');
    }
  }

  // Combine manually specified and auto-detected files
  const allAdditionalFiles = [
    ...(example.additionalFiles || []),
    ...autoDetectedFiles.filter(file => !example.additionalFiles?.includes(file))
  ];

  // Copy additional files if any (e.g., helper contracts needed by tests)
  if (allAdditionalFiles.length > 0) {
    logger.step("Copying additional files...");
    for (const additionalFile of allAdditionalFiles) {
      const sourcePath = path.join(rootDir, additionalFile);
      if (fs.existsSync(sourcePath)) {
        // Determine if it's a contract or test file based on path
        if (additionalFile.startsWith('contracts/')) {
          const fileName = path.basename(additionalFile);
          const destPath = path.join(outputDir, 'contracts', fileName);
          fs.copyFileSync(sourcePath, destPath);
          logger.log(`  ✓ ${fileName}`);
        } else if (additionalFile.startsWith('test/')) {
          const fileName = path.basename(additionalFile);
          const destPath = path.join(outputDir, 'test', fileName);
          fs.copyFileSync(sourcePath, destPath);
          logger.log(`  ✓ ${fileName}`);
        }
      }
    }
    logger.success(`Copied ${allAdditionalFiles.length} additional file(s)`);
  }

  // Step 4: Detect dependencies from contract
  logger.step("Detecting dependencies...");
  const dependencies = detectDependenciesFromContract(contractPath);
  if (dependencies.size > 0) {
    logger.log(`  Found ${dependencies.size} dependency(ies): ${Array.from(dependencies.keys()).join(', ')}`);
  }
  
  // Step 5: Update configuration files
  logger.step("Updating configuration...");
  writeFile(
    path.join(outputDir, "deploy", "deploy.ts"),
    generateDeployScript(contractName!)
  );
  updatePackageJson(outputDir, exampleName, example.description, dependencies);
  logger.success("Configuration updated");

  // Step 6: Generate README
  logger.step("Generating README...");
  const readme = generateReadme(
    exampleName,
    example.description,
    contractName!
  );
  writeFile(path.join(outputDir, "README.md"), readme);
  logger.success("README.md generated");

  // Final summary
  logger.separator();
  logger.success(`FHEVM example "${exampleName}" created successfully!`);
  logger.separator();

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
