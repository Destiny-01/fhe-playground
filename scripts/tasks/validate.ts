/**
 * Validate task - test all generated examples
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { logger } from '../utils/logger';
import { getProjectRoot } from '../utils/paths';

interface ValidationResult {
  name: string;
  type: 'example' | 'category';
  compiled: boolean;
  testsPassed: boolean;
  error?: string;
}

/**
 * Validate a single generated project
 */
function validateProject(projectDir: string, name: string, type: 'example' | 'category'): ValidationResult {
  const result: ValidationResult = {
    name,
    type,
    compiled: false,
    testsPassed: false,
  };

  // Check if directory exists
  if (!fs.existsSync(projectDir)) {
    result.error = 'Directory not found';
    return result;
  }

  // Check if package.json exists
  const packageJsonPath = path.join(projectDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    result.error = 'package.json not found';
    return result;
  }

  // Install dependencies first
  try {
    execSync('npm install', {
      cwd: projectDir,
      stdio: 'pipe',
      timeout: 120000, // 2 minute timeout for npm install
    });
  } catch (error) {
    result.error = 'Failed to install dependencies';
    return result;
  }

  // Try to compile
  try {
    execSync('npm run compile', {
      cwd: projectDir,
      stdio: 'pipe',
      timeout: 60000, // 60 second timeout
    });
    result.compiled = true;
  } catch (error) {
    result.error = 'Compilation failed';
    return result;
  }

  // Try to run tests
  try {
    execSync('npm run test', {
      cwd: projectDir,
      stdio: 'pipe',
      timeout: 120000, // 2 minute timeout
    });
    result.testsPassed = true;
  } catch (error) {
    result.error = 'Tests failed';
    return result;
  }

  return result;
}

/**
 * Find all generated examples and categories
 */
function findGeneratedProjects(): Array<{ name: string; path: string; type: 'example' | 'category' }> {
  const rootDir = getProjectRoot();
  const outputDir = path.join(rootDir, 'output');
  
  if (!fs.existsSync(outputDir)) {
    return [];
  }

  const projects: Array<{ name: string; path: string; type: 'example' | 'category' }> = [];
  const items = fs.readdirSync(outputDir, { withFileTypes: true });

  for (const item of items) {
    if (item.isDirectory()) {
      const dirName = item.name;
      const dirPath = path.join(outputDir, dirName);

      if (dirName.startsWith('fhevm-example-')) {
        const exampleName = dirName.replace('fhevm-example-', '');
        projects.push({ name: exampleName, path: dirPath, type: 'example' });
      } else if (dirName.startsWith('fhevm-examples-')) {
        const categoryName = dirName.replace('fhevm-examples-', '');
        projects.push({ name: categoryName, path: dirPath, type: 'category' });
      }
    }
  }

  return projects;
}

/**
 * Validate all generated examples
 */
export function validateAll(): void {
  logger.highlight('\nValidating Generated Examples...\n');

  const projects = findGeneratedProjects();

  if (projects.length === 0) {
    logger.info('No generated examples found in output directory.');
    return;
  }

  logger.info(`Found ${projects.length} generated project(s) to validate.\n`);

  const results: ValidationResult[] = [];

  for (const project of projects) {
    logger.log(`Validating ${project.type}: ${project.name}...`);
    const result = validateProject(project.path, project.name, project.type);
    results.push(result);

    if (result.compiled && result.testsPassed) {
      logger.success(`  ✓ ${project.name} - Compiled and tests passed`);
    } else {
      logger.warning(`  ✗ ${project.name} - ${result.error || 'Failed'}`);
    }
  }

  // Summary
  logger.log('');
  logger.separator();
  
  const passed = results.filter((r) => r.compiled && r.testsPassed);
  const failed = results.filter((r) => !r.compiled || !r.testsPassed);

  logger.success(`Passed: ${passed.length}/${results.length}`);
  if (failed.length > 0) {
    logger.warning(`Failed: ${failed.length}/${results.length}`);
    logger.log('');
    logger.info('Failed projects:');
    failed.forEach((result) => {
      logger.log(`  ${result.name} (${result.type}): ${result.error || 'Unknown error'}`);
    });
  }

  logger.separator();
}

