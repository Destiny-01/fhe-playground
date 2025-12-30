/**
 * Robust configuration update utilities
 * Parses, modifies, and regenerates config files safely
 */

import * as fs from "fs";
import * as path from "path";
import { logger } from "../utils/logger";

/**
 * Category configuration structure
 */
interface CategoryContract {
  path: string;
  test: string;
}

interface CategoryConfig {
  name: string;
  description: string;
  contracts: CategoryContract[];
}

interface CategoriesConfig {
  [key: string]: CategoryConfig;
}

/**
 * Parse categories-config.ts file into a data structure
 */
function parseCategoriesConfig(filePath: string): CategoriesConfig {
  const content = fs.readFileSync(filePath, "utf-8");

  // Extract the CATEGORIES object using a more flexible regex
  // Match: export const CATEGORIES: <type> = { ... };
  // This handles various type annotations like Record<string, CategoryConfig>, { [key: string]: Category }, etc.
  const match = content.match(
    /export\s+const\s+CATEGORIES\s*:\s*[^=]+\s*=\s*(\{[\s\S]*?\n\};)/
  );

  if (!match) {
    throw new Error("Could not find CATEGORIES export in config file");
  }

  const categoriesBlock = match[1];

  // Use eval in a safe context to parse the object
  // Remove the trailing semicolon and parse as JavaScript object
  const categoriesObj = categoriesBlock.slice(0, -1); // Remove trailing ;

  try {
    // Create a safe evaluation context
    const parsed = eval(`(${categoriesObj})`);
    return parsed as CategoriesConfig;
  } catch (error) {
    throw new Error(
      `Failed to parse categories config: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Format a category key (add quotes if needed)
 */
function formatCategoryKey(key: string): string {
  // Quote keys that contain hyphens, spaces, or other special characters
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
    return `'${key}'`;
  }
  return key;
}

/**
 * Generate formatted TypeScript code for categories config
 */
function generateCategoriesConfigCode(categories: CategoriesConfig): string {
  const lines: string[] = [];

  lines.push("/**");
  lines.push(" * Categories configuration for examples");
  lines.push(" * Auto-generated - do not edit manually");
  lines.push(" */");
  lines.push("");
  lines.push("export interface CategoryContract {");
  lines.push("  path: string;");
  lines.push("  test: string;");
  lines.push("}");
  lines.push("");
  lines.push("export interface CategoryConfig {");
  lines.push("  name: string;");
  lines.push("  description: string;");
  lines.push("  contracts: CategoryContract[];");
  lines.push("}");
  lines.push("");
  lines.push("export const CATEGORIES: Record<string, CategoryConfig> = {");

  const categoryKeys = Object.keys(categories);

  categoryKeys.forEach((key, index) => {
    const category = categories[key];
    const formattedKey = formatCategoryKey(key);
    const isLast = index === categoryKeys.length - 1;

    lines.push(`  ${formattedKey}: {`);
    lines.push(`    name: '${category.name.replace(/'/g, "\\'")}',`);
    lines.push(
      `    description: '${category.description.replace(/'/g, "\\'")}',`
    );
    lines.push(`    contracts: [`);

    category.contracts.forEach((contract, contractIndex) => {
      const isLastContract = contractIndex === category.contracts.length - 1;
      lines.push(`      {`);
      lines.push(`        path: '${contract.path}',`);
      lines.push(`        test: '${contract.test}',`);
      lines.push(`      }${isLastContract ? "" : ","}`);
    });

    lines.push(`    ],`);
    lines.push(`  }${isLast ? "" : ","}`);
  });

  lines.push("};");
  lines.push("");

  return lines.join("\n");
}

/**
 * Add or update a category in the categories config
 */
export function updateCategoriesConfig(
  configPath: string,
  categoryKey: string,
  categoryData: Partial<CategoryConfig>,
  newContracts?: CategoryContract[]
): void {
  try {
    // Parse existing config
    const categories = parseCategoriesConfig(configPath);

    // Normalize category key for comparison
    const normalizedKey = categoryKey.toLowerCase().trim();

    // Check if category exists (case-insensitive)
    let existingKey = Object.keys(categories).find(
      (key) => key.toLowerCase().trim() === normalizedKey
    );

    if (existingKey) {
      // Update existing category
      const existing = categories[existingKey];

      if (newContracts && newContracts.length > 0) {
        // Add new contracts to existing category
        // Avoid duplicates based on path
        const existingPaths = new Set(existing.contracts.map((c) => c.path));
        const uniqueNewContracts = newContracts.filter(
          (c) => !existingPaths.has(c.path)
        );

        existing.contracts = [...existing.contracts, ...uniqueNewContracts];

        logger.log(
          `  Updated category '${existingKey}' with ${uniqueNewContracts.length} new contract(s)`
        );
      }

      // Update other fields if provided
      if (categoryData.name) existing.name = categoryData.name;
      if (categoryData.description)
        existing.description = categoryData.description;
    } else {
      // Create new category
      const newCategory: CategoryConfig = {
        name:
          categoryData.name ||
          categoryKey.charAt(0).toUpperCase() +
            categoryKey.slice(1).replace(/-/g, " "),
        description:
          categoryData.description ||
          `Examples for ${categoryData.name || categoryKey}`,
        contracts: newContracts || [],
      };

      categories[categoryKey] = newCategory;
      logger.log(`  Added new category '${categoryKey}'`);
    }

    // Generate new config code
    const newConfigCode = generateCategoriesConfigCode(categories);

    // Write back to file
    fs.writeFileSync(configPath, newConfigCode, "utf-8");
  } catch (error) {
    logger.error(
      `Failed to update categories config: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
  }
}

/**
 * Add multiple examples to categories config
 */
export function addExamplesToCategories(
  configPath: string,
  examples: Array<{
    category: string;
    contractPath: string;
    testPath: string;
    categoryName?: string;
    categoryDescription?: string;
  }>
): void {
  try {
    // Parse existing config
    const categories = parseCategoriesConfig(configPath);

    // Group examples by category
    const examplesByCategory = new Map<string, typeof examples>();

    for (const example of examples) {
      if (!examplesByCategory.has(example.category)) {
        examplesByCategory.set(example.category, []);
      }
      examplesByCategory.get(example.category)!.push(example);
    }

    // Update each category
    for (const [
      categoryKey,
      categoryExamples,
    ] of examplesByCategory.entries()) {
      const normalizedKey = categoryKey.toLowerCase().trim();

      // Check if category exists (case-insensitive)
      let existingKey = Object.keys(categories).find(
        (key) => key.toLowerCase().trim() === normalizedKey
      );

      const newContracts: CategoryContract[] = categoryExamples.map((ex) => ({
        path: ex.contractPath,
        test: ex.testPath,
      }));

      if (existingKey) {
        // Update existing category
        const existing = categories[existingKey];

        // Add new contracts, avoiding duplicates
        const existingPaths = new Set(existing.contracts.map((c) => c.path));
        const uniqueNewContracts = newContracts.filter(
          (c) => !existingPaths.has(c.path)
        );

        existing.contracts = [...existing.contracts, ...uniqueNewContracts];

        logger.log(
          `  Updated '${existingKey}' with ${uniqueNewContracts.length} new contract(s)`
        );
      } else {
        // Create new category
        const firstExample = categoryExamples[0];
        const categoryName =
          firstExample.categoryName ||
          categoryKey.charAt(0).toUpperCase() +
            categoryKey.slice(1).replace(/-/g, " ");
        const categoryDescription =
          firstExample.categoryDescription || `Examples for ${categoryName}`;

        categories[categoryKey] = {
          name: categoryName,
          description: categoryDescription,
          contracts: newContracts,
        };

        logger.log(
          `  Created new category '${categoryKey}' with ${newContracts.length} contract(s)`
        );
      }
    }

    // Generate and write new config
    const newConfigCode = generateCategoriesConfigCode(categories);
    fs.writeFileSync(configPath, newConfigCode, "utf-8");

    logger.success("Categories config updated successfully");
  } catch (error) {
    logger.error(
      `Failed to update categories config: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
  }
}

/**
 * Validate categories config syntax
 */
export function validateCategoriesConfigSyntax(filePath: string): boolean {
  try {
    parseCategoriesConfig(filePath);
    return true;
  } catch (error) {
    logger.error(
      `Config validation failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return false;
  }
}
