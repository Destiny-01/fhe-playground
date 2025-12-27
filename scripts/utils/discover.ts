/**
 * Example discovery utilities - scan and find new examples
 */

import * as fs from "fs";
import * as path from "path";
import { getProjectRoot } from "./paths";
import { logger } from "./logger";
import { EXAMPLES_MAP } from "./examples-config";
import { CATEGORIES } from "./categories-config";

export interface DiscoveredExample {
  exampleKey: string;
  category: string;
  contractPath: string;
  testPath: string;
  contractName: string;
  description?: string;
}

/**
 * Get contract name from Solidity file
 */
function getContractNameFromFile(filePath: string): string | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const match = content.match(/^\s*contract\s+(\w+)(?:\s+is\s+|\s*\{)/m);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Generate example key from contract path
 */
function generateExampleKey(contractPath: string, category: string): string {
  // Extract filename without extension
  const filename = path.basename(contractPath, ".sol");
  // Convert PascalCase to kebab-case
  const kebabCase = filename.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
  return kebabCase;
}

/**
 * Find test file for a contract
 */
function findTestFile(contractPath: string, category: string): string | null {
  const rootDir = getProjectRoot();
  const contractName = path.basename(contractPath, ".sol");

  // Convert contract path to test path
  // contracts/basic/encrypt/EncryptSingleValue.sol -> test/basic/encrypt/EncryptSingleValue.ts
  const relativePath = path.relative(
    path.join(rootDir, "contracts"),
    contractPath
  );
  const testPath1 = path.join(
    rootDir,
    "test",
    relativePath.replace(".sol", ".ts")
  );

  // Also try directly in category folder
  const testPath2 = path.join(rootDir, "test", category, `${contractName}.ts`);

  // Try different possible test locations
  const possibleTestPaths = [
    testPath1, // Match the contract path structure exactly
    testPath2, // Directly in category folder
  ];

  for (const testPath of possibleTestPaths) {
    if (fs.existsSync(testPath)) {
      return path.relative(rootDir, testPath);
    }
  }

  return null;
}

/**
 * Discover all examples in contracts folder
 */
export function discoverExamples(): DiscoveredExample[] {
  const rootDir = getProjectRoot();
  const contractsDir = path.join(rootDir, "contracts");
  const discovered: DiscoveredExample[] = [];

  if (!fs.existsSync(contractsDir)) {
    return discovered;
  }

  // Map category folders (for known top-level categories)
  const categoryFolders = Object.keys(CATEGORIES);

  function scanDirectory(dir: string, currentCategory?: string): void {
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        // Check if this directory name matches a known category
        let category = currentCategory;
        if (categoryFolders.includes(item.name)) {
          category = item.name;
        } else if (!currentCategory) {
          // If no category yet, use the directory name as category
          // This allows for new categories like "fundamentals"
          category = item.name;
        }
        scanDirectory(fullPath, category);
      } else if (item.isFile() && item.name.endsWith(".sol")) {
        // Found a contract file
        const relativePath = path.relative(rootDir, fullPath);

        // Determine category from path
        let category = currentCategory;
        if (!category) {
          const pathParts = relativePath.split(path.sep);
          const contractsIndex = pathParts.indexOf("contracts");
          if (contractsIndex >= 0 && contractsIndex < pathParts.length - 1) {
            // Use the first folder after contracts as category
            // This allows for nested structures like fundamentals/fhe-operations
            category = pathParts[contractsIndex + 1];
          }
        }

        // Always use the category (even if not in CATEGORIES) - allows discovering new categories
        if (!category) {
          continue; // Skip if we can't determine category from path
        }

        const contractName = getContractNameFromFile(fullPath);
        if (!contractName) {
          continue;
        }

        const testPath = findTestFile(relativePath, category);
        if (!testPath) {
          continue; // Skip if no matching test found
        }

        const exampleKey = generateExampleKey(relativePath, category);
        discovered.push({
          exampleKey,
          category,
          contractPath: relativePath,
          testPath,
          contractName,
        });
      }
    }
  }

  scanDirectory(contractsDir);

  return discovered;
}

/**
 * Find examples that exist in contracts/test but not in config
 */
export function findNewExamples(): DiscoveredExample[] {
  const discovered = discoverExamples();
  const existingKeys = new Set(Object.keys(EXAMPLES_MAP));
  console.log(existingKeys);

  return discovered.filter((example) => !existingKeys.has(example.exampleKey));
}

/**
 * Validate that contract and test exist for an example key
 */
export function validateExampleFiles(
  contractPath: string,
  expectedTestPath?: string
): { valid: boolean; error?: string; testPath?: string } {
  const rootDir = getProjectRoot();
  const fullContractPath = path.join(rootDir, contractPath);

  if (!fs.existsSync(fullContractPath)) {
    return {
      valid: false,
      error: `Contract not found: ${contractPath}`,
    };
  }

  // Try to find test file
  const pathParts = contractPath.split(path.sep);
  const contractsIndex = pathParts.indexOf("contracts");
  let category = "";
  if (contractsIndex >= 0 && contractsIndex < pathParts.length - 1) {
    category = pathParts[contractsIndex + 1];
  }

  const contractName = path.basename(contractPath, ".sol");
  const testPath = expectedTestPath || findTestFile(contractPath, category);

  if (!testPath) {
    const expectedTestName = `${contractName}.ts`;
    return {
      valid: false,
      error: `Test file not found for contract ${contractPath}. Expected test file: test/${category}/${expectedTestName}`,
    };
  }

  const fullTestPath = path.join(rootDir, testPath);
  if (!fs.existsSync(fullTestPath)) {
    return {
      valid: false,
      error: `Test file not found: ${testPath}`,
    };
  }

  return {
    valid: true,
    testPath,
  };
}
