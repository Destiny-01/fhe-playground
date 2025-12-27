/**
 * File system utility functions
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

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

