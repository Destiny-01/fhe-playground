/**
 * Path utility functions
 */

import * as path from "path";
import * as fs from "fs";

// Declare __dirname for TypeScript (available in CommonJS)
declare const __dirname: string;

/**
 * Get the project root directory
 * Handles both development (scripts/utils/) and production (dist/utils/) builds
 */
export function getProjectRoot(): string {
  try {
    // In CommonJS, __dirname is the directory of the current file
    // Development: __dirname = /project/scripts/utils, need to go up 2 levels
    // Production: __dirname = /project/dist/utils, need to go up 2 levels
    let rootDir = path.resolve(__dirname, "..", "..");

    // Verify by checking for package.json
    if (fs.existsSync(path.join(rootDir, "package.json"))) {
      return rootDir;
    }

    // If we're in dist/, try going up one more level (though this shouldn't happen)
    rootDir = path.resolve(__dirname, "..", "..", "..");
    if (fs.existsSync(path.join(rootDir, "package.json"))) {
      return rootDir;
    }
  } catch {
    // Fall through
  }

  // Fallback to process.cwd() (should be project root when npm script runs)
  return process.cwd();
}
