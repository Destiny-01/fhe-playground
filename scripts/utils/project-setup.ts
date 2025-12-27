/**
 * Hardhat project setup and configuration utilities
 * Handles detection, dependency injection, and config updates
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

// FHEVM dependencies to inject
const FHEVM_DEPENDENCIES = {
  dependencies: {
    '@fhevm/solidity': '^0.9.1',
    'encrypted-types': '^0.0.4',
  },
  devDependencies: {
    '@fhevm/hardhat-plugin': '^0.3.0-1',
    '@zama-fhe/relayer-sdk': '^0.3.0-5',
  },
};

const FHEVM_PLUGIN_IMPORT = `import "@fhevm/hardhat-plugin";`;

/**
 * Check if a directory is a Hardhat project
 */
export function isHardhatProject(dir: string): boolean {
  const hardhatConfigs = [
    path.join(dir, 'hardhat.config.ts'),
    path.join(dir, 'hardhat.config.js'),
    path.join(dir, 'hardhat.config.cjs'),
  ];

  return hardhatConfigs.some((config) => fs.existsSync(config));
}

/**
 * Get the Hardhat config file path
 */
export function getHardhatConfigPath(dir: string): string | null {
  const hardhatConfigs = [
    path.join(dir, 'hardhat.config.ts'),
    path.join(dir, 'hardhat.config.js'),
    path.join(dir, 'hardhat.config.cjs'),
  ];

  for (const config of hardhatConfigs) {
    if (fs.existsSync(config)) {
      return config;
    }
  }

  return null;
}

/**
 * Check if FHEVM plugin is already in hardhat config
 */
function hasFhevmPlugin(configContent: string): boolean {
  return (
    configContent.includes('@fhevm/hardhat-plugin') ||
    configContent.includes('fhevm-hardhat-plugin')
  );
}

/**
 * Add FHEVM dependencies to package.json
 */
export function addFhevmDependencies(packageJsonPath: string): boolean {
  try {
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    let updated = false;

    // Add dependencies
    if (!packageJson.dependencies) {
      packageJson.dependencies = {};
    }

    for (const [dep, version] of Object.entries(FHEVM_DEPENDENCIES.dependencies)) {
      if (!packageJson.dependencies[dep]) {
        packageJson.dependencies[dep] = version;
        updated = true;
        logger.dim(`  Adding dependency: ${dep}@${version}`);
      } else {
        logger.dim(`  Dependency already exists: ${dep}`);
      }
    }

    // Add devDependencies
    if (!packageJson.devDependencies) {
      packageJson.devDependencies = {};
    }

    for (const [dep, version] of Object.entries(FHEVM_DEPENDENCIES.devDependencies)) {
      if (!packageJson.devDependencies[dep]) {
        packageJson.devDependencies[dep] = version;
        updated = true;
        logger.dim(`  Adding devDependency: ${dep}@${version}`);
      } else {
        logger.dim(`  DevDependency already exists: ${dep}`);
      }
    }

    if (updated) {
      fs.writeFileSync(
        packageJsonPath,
        JSON.stringify(packageJson, null, 2) + '\n'
      );
      logger.success('Package.json updated with FHEVM dependencies');
      return true;
    } else {
      logger.info('All FHEVM dependencies already present');
      return false;
    }
  } catch (error) {
    logger.error(`Failed to update package.json: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Update hardhat.config.ts/js to include FHEVM plugin
 */
export function addFhevmPlugin(configPath: string): boolean {
  try {
    let content = fs.readFileSync(configPath, 'utf-8');

    // Check if plugin already exists
    if (hasFhevmPlugin(content)) {
      logger.info('FHEVM plugin already present in hardhat.config');
      return false;
    }

    // Add import at the top (after existing imports or at the beginning)
    const importRegex = /^(import\s+.*?from\s+.*?;?\s*$)/m;
    const hasImports = importRegex.test(content);

    if (hasImports) {
      // Find the last import statement
      const lines = content.split('\n');
      let lastImportIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) {
          lastImportIndex = i;
        } else if (lastImportIndex !== -1 && lines[i].trim() && !lines[i].trim().startsWith('//')) {
          break;
        }
      }

      if (lastImportIndex !== -1) {
        // Insert after the last import
        lines.splice(lastImportIndex + 1, 0, FHEVM_PLUGIN_IMPORT);
        content = lines.join('\n');
      } else {
        // Fallback: add at the beginning
        content = FHEVM_PLUGIN_IMPORT + '\n' + content;
      }
    } else {
      // No imports, add at the beginning
      content = FHEVM_PLUGIN_IMPORT + '\n' + content;
    }

    fs.writeFileSync(configPath, content);
    logger.success(`Updated ${path.basename(configPath)} with FHEVM plugin`);
    return true;
  } catch (error) {
    logger.error(
      `Failed to update hardhat config: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
}

