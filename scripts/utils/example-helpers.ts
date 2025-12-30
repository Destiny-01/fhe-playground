/**
 * Example and category listing/querying utilities
 */

import { logger } from './logger';
import { EXAMPLES_MAP } from './examples-config';
import { CATEGORIES } from './categories-config';
import * as kleur from 'kleur';

/**
 * Get examples grouped by category
 */
export function getExamplesByCategory(): Record<string, string[]> {
  const examplesByCategory: Record<string, string[]> = {};

  // Initialize categories
  Object.keys(CATEGORIES).forEach((categoryKey) => {
    examplesByCategory[categoryKey] = [];
  });

  // Map examples to categories
  Object.entries(EXAMPLES_MAP).forEach(([exampleKey, example]) => {
    const categoryKey = example.category || inferCategoryFromPath(example.contract);
    if (categoryKey && examplesByCategory[categoryKey]) {
      examplesByCategory[categoryKey].push(exampleKey);
    } else {
      // If category not found, add to a default "other" category
      if (!examplesByCategory['other']) {
        examplesByCategory['other'] = [];
      }
      examplesByCategory['other'].push(exampleKey);
    }
  });

  // Remove empty categories
  Object.keys(examplesByCategory).forEach((key) => {
    if (examplesByCategory[key].length === 0) {
      delete examplesByCategory[key];
    }
  });

  return examplesByCategory;
}

/**
 * Infer category from contract path
 */
function inferCategoryFromPath(contractPath: string): string | null {
  if (contractPath.includes('/basic/')) return 'basic';
  if (contractPath.includes('/openzeppelin')) return 'openzeppelin';
  if (contractPath.includes('/fheWordle/')) return 'games';
  return null;
}

/**
 * Get examples for a specific category
 */
export function getExamplesForCategory(categoryKey: string): string[] {
  const examplesByCategory = getExamplesByCategory();
  return examplesByCategory[categoryKey] || [];
}

/**
 * Derive subcategory from contract path
 * contracts/fundamentals/fhe-boolean-logic/FHEAnd.sol -> "fhe-boolean-logic"
 */
function deriveSubcategory(contractPath: string): string | null {
  // Remove contracts/ prefix
  const relativePath = contractPath.replace(/^contracts\//, '');
  
  // Get directory parts
  const pathParts = relativePath.split('/');
  
  // If we have at least 2 parts (category/subcategory), return the subcategory
  if (pathParts.length >= 2) {
    return pathParts[1];
  }
  
  return null;
}

/**
 * Convert subcategory name to display name
 * fhe-boolean-logic -> "FHE Boolean Logic"
 */
function subcategoryToDisplayName(subcategory: string): string {
  return subcategory
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get examples grouped by subcategory for a specific category
 */
export function getExamplesBySubcategory(categoryKey: string): Array<{
  subcategory: string | null;
  displayName: string;
  examples: Array<{ key: string; description: string }>;
}> {
  const exampleKeys = getExamplesForCategory(categoryKey);
  const subcategoryMap = new Map<string | null, Array<{ key: string; description: string }>>();
  
  // Group examples by subcategory
  exampleKeys.forEach((key) => {
    const example = EXAMPLES_MAP[key];
    const subcategory = deriveSubcategory(example.contract);
    
    if (!subcategoryMap.has(subcategory)) {
      subcategoryMap.set(subcategory, []);
    }
    subcategoryMap.get(subcategory)!.push({
      key,
      description: example.description,
    });
  });
  
  // Convert to array and sort
  const result: Array<{
    subcategory: string | null;
    displayName: string;
    examples: Array<{ key: string; description: string }>;
  }> = [];
  
  subcategoryMap.forEach((examples, subcategory) => {
    result.push({
      subcategory,
      displayName: subcategory ? subcategoryToDisplayName(subcategory) : 'General',
      examples: examples.sort((a, b) => a.key.localeCompare(b.key)),
    });
  });
  
  // Sort by subcategory name (null first, then alphabetically)
  result.sort((a, b) => {
    if (a.subcategory === null && b.subcategory === null) return 0;
    if (a.subcategory === null) return -1;
    if (b.subcategory === null) return 1;
    return a.displayName.localeCompare(b.displayName);
  });
  
  return result;
}

/**
 * List all available examples
 */
export function listExamples(): void {
  logger.highlight('\nAvailable Examples:\n');
  
  const examples = Object.entries(EXAMPLES_MAP);
  
  examples.forEach(([key, config]) => {
    logger.log(`  ${kleur.cyan(key)}`);
    logger.dim(`    ${config.description}`);
  });
  
  logger.log('');
  logger.info(`Total: ${examples.length} examples\n`);
}

/**
 * List all available categories
 */
export function listCategories(): void {
  logger.highlight('\nAvailable Categories:\n');
  
  const categories = Object.entries(CATEGORIES);
  
  categories.forEach(([key, config]) => {
    logger.log(`  ${kleur.cyan(key)}`);
    logger.log(`    ${kleur.bold(config.name)}`);
    logger.dim(`    ${config.description}`);
    logger.dim(`    Contracts: ${config.contracts.length}`);
  });
  
  logger.log('');
  logger.info(`Total: ${categories.length} categories\n`);
}

