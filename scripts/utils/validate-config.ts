/**
 * Configuration validation utilities
 * Validates categories-config.ts for duplicate keys and syntax errors
 */

import * as fs from "fs";
import * as path from "path";
import { getProjectRoot } from "./paths";
import { logger } from "./logger";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Normalize a category key by removing quotes and converting to a canonical form
 * Handles both 'input-proofs' and "input-proofs" and input-proofs
 */
function normalizeCategoryKey(key: string): string {
  // Remove surrounding quotes (single or double)
  let normalized = key.trim();
  if (
    (normalized.startsWith("'") && normalized.endsWith("'")) ||
    (normalized.startsWith('"') && normalized.endsWith('"'))
  ) {
    normalized = normalized.slice(1, -1);
  }
  return normalized;
}

/**
 * Extract all category keys from categories-config.ts content
 * Handles both quoted and unquoted keys
 */
function extractCategoryKeys(content: string): Array<{
  key: string;
  normalizedKey: string;
  lineNumber: number;
  rawLine: string;
  isQuoted: boolean;
}> {
  const keys: Array<{
    key: string;
    normalizedKey: string;
    lineNumber: number;
    rawLine: string;
    isQuoted: boolean;
  }> = [];
  const lines = content.split("\n");

  // Pattern to match category keys:
  // - Quoted: 'category-name': or "category-name":
  // - Unquoted: categoryName:
  // Must be at the start of a line (with optional whitespace) and followed by : {
  const keyPattern = /^\s*((['"])([^'"]+)\2|([a-zA-Z_][a-zA-Z0-9_]*))\s*:\s*\{/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(keyPattern);
    if (match) {
      // Extract the key (either from quoted match[3] or unquoted match[4])
      const rawKey = match[3] || match[4] || match[1];
      const normalizedKey = normalizeCategoryKey(rawKey);
      // Check if it's quoted: match[2] contains the quote character if quoted, undefined if unquoted
      const isQuoted = !!match[2];
      keys.push({
        key: rawKey,
        normalizedKey,
        lineNumber: i + 1,
        rawLine: line.trim(),
        isQuoted,
      });
    }
  }

  return keys;
}

/**
 * Validate categories-config.ts content for duplicate keys and syntax issues
 * This function parses the file content as text to avoid TypeScript compilation errors
 * @param content - The content to validate (if not provided, reads from file)
 */
export function validateCategoriesConfig(content?: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rootDir = getProjectRoot();
  const configPath = path.join(
    rootDir,
    "scripts",
    "utils",
    "categories-config.ts"
  );

  let fileContent: string;
  if (content !== undefined) {
    fileContent = content;
  } else {
    if (!fs.existsSync(configPath)) {
      return {
        valid: false,
        errors: [`Categories config file not found: ${configPath}`],
        warnings: [],
      };
    }
    try {
      fileContent = fs.readFileSync(configPath, "utf-8");
    } catch (error) {
      return {
        valid: false,
        errors: [
          `Failed to read categories-config.ts: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ],
        warnings: [],
      };
    }
  }

  try {
    // Extract all category keys
    const keys = extractCategoryKeys(fileContent);

    // Check for duplicate keys (normalized comparison)
    const keyMap = new Map<string, Array<{ lineNumber: number; rawLine: string }>>();
    for (const keyInfo of keys) {
      if (!keyMap.has(keyInfo.normalizedKey)) {
        keyMap.set(keyInfo.normalizedKey, []);
      }
      keyMap.get(keyInfo.normalizedKey)!.push({
        lineNumber: keyInfo.lineNumber,
        rawLine: keyInfo.rawLine,
      });
    }

    // Report duplicates
    for (const [normalizedKey, occurrences] of keyMap.entries()) {
      if (occurrences.length > 1) {
        const locations = occurrences
          .map((occ) => `line ${occ.lineNumber}: ${occ.rawLine}`)
          .join(", ");
        errors.push(
          `Duplicate category key "${normalizedKey}" found at: ${locations}`
        );
      }
    }

    // Check for unquoted keys with hyphens (they should be quoted)
    for (const keyInfo of keys) {
      if (keyInfo.normalizedKey.includes("-") && !keyInfo.isQuoted) {
        warnings.push(
          `Unquoted key with hyphen at line ${keyInfo.lineNumber}: "${keyInfo.rawLine}". ` +
          `Keys with hyphens should be quoted. Use '${keyInfo.normalizedKey}' instead of ${keyInfo.normalizedKey}`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [
        `Failed to read or parse categories-config.ts: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ],
      warnings: [],
    };
  }
}

/**
 * Validate and exit if invalid
 * Call this before importing categories-config.ts
 */
export function validateCategoriesConfigOrExit(): void {
  const result = validateCategoriesConfig();

  if (result.warnings.length > 0) {
    logger.warning("Categories config validation warnings:");
    for (const warning of result.warnings) {
      logger.warning(`  ⚠ ${warning}`);
    }
    logger.log("");
  }

  if (!result.valid) {
    logger.error("Categories config validation failed:");
    for (const error of result.errors) {
      logger.error(`  ✗ ${error}`);
    }
    logger.log("");
    logger.error(
      "Please fix the errors in scripts/utils/categories-config.ts before continuing."
    );
    process.exit(1);
  }
}

/**
 * Normalize a category key for comparison
 * Use this when comparing category keys to handle both quoted and unquoted versions
 */
export function normalizeKeyForComparison(key: string): string {
  return normalizeCategoryKey(key);
}

