/**
 * Example generation utilities - used for validation during discovery
 */

import * as path from 'path';
import * as fs from 'fs';
import { getProjectRoot } from './paths';
import {
  copyDirectoryRecursive,
  getContractName,
  readFile,
  writeFile,
  removeFile,
  removeFilesMatching,
} from './files';
import { ExampleConfig } from './config';

/**
 * Generate example from config (internal, accepts config directly)
 * Used by discovery process to test examples before adding to config
 */
export async function generateExampleFromConfig(
  exampleKey: string,
  exampleConfig: ExampleConfig,
  outputDir: string
): Promise<void> {
  const rootDir = getProjectRoot();
  const templateDir = path.join(rootDir, 'fhevm-hardhat-template');

  const contractPath = path.join(rootDir, exampleConfig.contract);
  const testPath = path.join(rootDir, exampleConfig.test);

  // Validate paths
  if (!fs.existsSync(contractPath)) {
    throw new Error(`Contract not found: ${exampleConfig.contract}`);
  }
  if (!fs.existsSync(testPath)) {
    throw new Error(`Test not found: ${exampleConfig.test}`);
  }

  // Clean output directory if exists
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }

  // Step 1: Copy template
  copyDirectoryRecursive(templateDir, outputDir);

  // Step 2: Copy contract
  const contractName = getContractName(contractPath);
  if (!contractName) {
    throw new Error('Could not extract contract name from contract file');
  }

  const destContractPath = path.join(outputDir, 'contracts', `${contractName}.sol`);
  removeFile(path.join(outputDir, 'contracts', 'FHECounter.sol'));
  
  // Copy contract as-is (@dev is a valid NatSpec tag)
  fs.copyFileSync(contractPath, destContractPath);

  // Step 3: Copy test
  const destTestPath = path.join(outputDir, 'test', path.basename(testPath));
  removeFilesMatching(path.join(outputDir, 'test'), /\.ts$/);
  fs.copyFileSync(testPath, destTestPath);

  // Copy test fixture if it exists
  if (exampleConfig.testFixture) {
    const fixtureSourcePath = path.join(rootDir, exampleConfig.testFixture);
    if (fs.existsSync(fixtureSourcePath)) {
      const destFixturePath = path.join(outputDir, 'test', path.basename(exampleConfig.testFixture));
      fs.copyFileSync(fixtureSourcePath, destFixturePath);
    }
  }

  // Step 4: Update configuration files
  const deployScript = `import { DeployFunction } from "hardhat-deploy/types";
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

  writeFile(path.join(outputDir, 'deploy', 'deploy.ts'), deployScript);

  // Update package.json
  const packageJsonPath = path.join(outputDir, 'package.json');
  const packageJson = JSON.parse(readFile(packageJsonPath));
  packageJson.name = `fhevm-example-${exampleKey}`;
  packageJson.description = exampleConfig.description;
  packageJson.homepage = `https://github.com/zama-ai/fhevm-examples/${exampleKey}`;
  writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

  // Generate README
  const readme = `# FHEVM Example: ${exampleKey}

${exampleConfig.description}

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

  writeFile(path.join(outputDir, 'README.md'), readme);

  // Update tasks directory
  const tasksDir = path.join(outputDir, 'tasks');
  if (fs.existsSync(tasksDir)) {
    const oldTaskFile = path.join(tasksDir, 'FHECounter.ts');
    const newTaskFile = path.join(tasksDir, `${contractName}.ts`);

    if (fs.existsSync(oldTaskFile)) {
      let taskContent = readFile(oldTaskFile);
      taskContent = taskContent.replace(/FHECounter/g, contractName);
      taskContent = taskContent.replace(
        /fheCounter/g,
        contractName.charAt(0).toLowerCase() + contractName.slice(1)
      );
      writeFile(newTaskFile, taskContent);

      if (oldTaskFile !== newTaskFile) {
        removeFile(oldTaskFile);
      }
    }
  }

  // Update hardhat.config.ts to reference the new task file and set correct Solidity version
  const hardhatConfigPath = path.join(outputDir, 'hardhat.config.ts');
  if (fs.existsSync(hardhatConfigPath)) {
    let configContent = readFile(hardhatConfigPath);
    // Replace task imports and references
    configContent = configContent.replace(/FHECounter/g, contractName);
    configContent = configContent.replace(
      /fheCounter/g,
      contractName.charAt(0).toLowerCase() + contractName.slice(1)
    );
    // Replace task file path imports
    configContent = configContent.replace(
      /\.\/tasks\/FHECounter/g,
      `./tasks/${contractName}`
    );
    // Update Solidity version to match contracts (0.8.24 instead of 0.8.27)
    configContent = configContent.replace(
      /version: "0\.8\.\d+"/,
      'version: "0.8.24"'
    );
    writeFile(hardhatConfigPath, configContent);
  }
}

