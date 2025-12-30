/**
 * File system utility functions
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';
import { getProjectRoot } from './paths';

/**
 * Copy a directory recursively, excluding specified directories
 */
export function copyDirectoryRecursive(
  source: string,
  destination: string,
  excludeDirs: string[] = []
): void {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  const items = fs.readdirSync(source);

  items.forEach((item) => {
    const sourcePath = path.join(source, item);
    const destPath = path.join(destination, item);
    const stat = fs.statSync(sourcePath);

    if (stat.isDirectory()) {
      const defaultExcludes = [
        'node_modules',
        'artifacts',
        'cache',
        'coverage',
        'types',
        'dist',
      ];

      if ([...defaultExcludes, ...excludeDirs].includes(item)) {
        return;
      }

      copyDirectoryRecursive(sourcePath, destPath, excludeDirs);
    } else {
      fs.copyFileSync(sourcePath, destPath);
    }
  });
}

/**
 * Extract contract name from Solidity file content
 */
export function getContractName(contractPath: string): string | null {
  const content = fs.readFileSync(contractPath, 'utf-8');
  const match = content.match(/^\s*contract\s+(\w+)(?:\s+is\s+|\s*\{)/m);
  return match ? match[1] : null;
}

/**
 * Read file content with error handling
 */
export function readFile(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    logger.error(`File not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Write file content with directory creation if needed
 */
export function writeFile(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content);
}

/**
 * Ensure directory exists
 */
export function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Remove file if it exists
 */
export function removeFile(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/**
 * Remove all files matching pattern in directory
 */
export function removeFilesMatching(
  dirPath: string,
  pattern: RegExp
): void {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  fs.readdirSync(dirPath).forEach((file) => {
    if (pattern.test(file)) {
      fs.unlinkSync(path.join(dirPath, file));
    }
  });
}

/**
 * Map of known npm package names for Solidity imports
 * Maps import path patterns to npm package names
 */
const DEPENDENCY_PACKAGE_MAP: Record<string, string> = {
  '@openzeppelin/contracts': '@openzeppelin/contracts',
  '@openzeppelin/confidential-contracts': '@openzeppelin/confidential-contracts',
  '@fhevm/solidity': '@fhevm/solidity',
};

/**
 * Get dependency versions from package.json configuration
 * Returns all configured versions from dependencyVersions field
 */
function getDependencyVersions(): Map<string, string> {
  const versions = new Map<string, string>();
  const rootDir = getProjectRoot();
  const packageJsonPath = path.join(rootDir, 'package.json');
  
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFile(packageJsonPath));
      
      // Check for dependencyVersions field
      if (packageJson.dependencyVersions && typeof packageJson.dependencyVersions === 'object') {
        Object.entries(packageJson.dependencyVersions).forEach(([pkg, version]) => {
          if (typeof version === 'string') {
            versions.set(pkg, version);
          }
        });
      }
    } catch (error) {
      // If reading fails, log warning
      logger.warning('Could not read dependency versions from package.json');
    }
  }
  
  return versions;
}

/**
 * Extract package name from an import path
 * Handles both scoped (@scope/package) and unscoped packages
 * @param importPath - The import path from Solidity (e.g., "@openzeppelin/contracts/token/ERC20.sol")
 * @returns The npm package name or null if not an npm package
 */
function extractPackageName(importPath: string): string | null {
  // Check if it's an npm-scoped package (starts with @)
  if (importPath.startsWith('@')) {
    // Extract package name: @scope/package-name from @scope/package-name/path/to/file.sol
    const match = importPath.match(/^(@[^/]+\/[^/]+)/);
    if (match) {
      return match[1];
    }
  }
  
  // Check known packages first (for backwards compatibility and special cases)
  for (const [pattern, packageName] of Object.entries(DEPENDENCY_PACKAGE_MAP)) {
    if (importPath.startsWith(pattern)) {
      return packageName;
    }
  }
  
  return null;
}

/**
 * Extract npm dependencies from Solidity import statements
 * @param contractPath - Path to the Solidity contract file
 * @returns Map of npm package names to versions that need to be installed
 */
export function detectDependenciesFromContract(contractPath: string): Map<string, string> {
  const dependencies = new Map<string, string>();
  
  if (!fs.existsSync(contractPath)) {
    return dependencies;
  }

  const content = readFile(contractPath);
  
  // Get configured versions from package.json
  const configuredVersions = getDependencyVersions();
  
  // Match import statements like:
  // import {X} from "@package/path/to/file.sol";
  // import "@package/path/to/file.sol";
  const importRegex = /import\s+(?:{[^}]+}|\*)\s+from\s+["']([^"']+)["']|import\s+["']([^"']+)["']/g;
  
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1] || match[2];
    
    // Extract package name from import path
    const packageName = extractPackageName(importPath);
    
    if (packageName && !dependencies.has(packageName)) {
      // Check if version is configured in package.json
      const configuredVersion = configuredVersions.get(packageName);
      
      if (configuredVersion) {
        // Use configured version
        dependencies.set(packageName, configuredVersion);
      } else {
        // Package detected but not configured - warn and use 'latest'
        logger.warning(
          `Package "${packageName}" detected in ${path.basename(contractPath)} but not configured in package.json dependencyVersions. ` +
          `Add it to package.json dependencyVersions to specify a version, or it will use 'latest'.`
        );
        dependencies.set(packageName, 'latest');
      }
    }
  }
  
  return dependencies;
}

/**
 * Detect dependencies from multiple contract files
 * @param contractPaths - Array of paths to Solidity contract files
 * @returns Map of npm package names to versions that need to be installed
 */
export function detectDependenciesFromContracts(contractPaths: string[]): Map<string, string> {
  const allDependencies = new Map<string, string>();
  
  for (const contractPath of contractPaths) {
    const deps = detectDependenciesFromContract(contractPath);
    deps.forEach((version, packageName) => {
      // Keep the first version encountered for each package
      if (!allDependencies.has(packageName)) {
        allDependencies.set(packageName, version);
      }
    });
  }
  
  return allDependencies;
}

