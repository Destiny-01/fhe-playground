/**
 * Refresh task - regenerate examples with updated template
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { logger } from '../utils/logger';
import { getProjectRoot } from '../utils/paths';
import { createExample } from './create-example';
import { createCategory } from './create-category';
import { EXAMPLES_MAP } from '../utils/examples-config';
import { CATEGORIES } from '../utils/categories-config';
import { askConfirmation } from '../utils/prompts';

/**
 * Find all generated examples in output directory
 */
function findGeneratedExamples(): string[] {
  const rootDir = getProjectRoot();
  const outputDir = path.join(rootDir, 'output');
  
  if (!fs.existsSync(outputDir)) {
    return [];
  }

  const examples: string[] = [];
  const items = fs.readdirSync(outputDir, { withFileTypes: true });

  for (const item of items) {
    if (item.isDirectory()) {
      const dirName = item.name;
      // Check if it matches example pattern: fhevm-example-* or fhevm-examples-*
      if (dirName.startsWith('fhevm-example-') || dirName.startsWith('fhevm-examples-')) {
        examples.push(dirName);
      }
    }
  }

  return examples;
}

/**
 * Extract example name from directory name
 */
function extractExampleName(dirName: string): string | null {
  if (dirName.startsWith('fhevm-example-')) {
    return dirName.replace('fhevm-example-', '');
  }
  return null;
}

/**
 * Extract category name from directory name
 */
function extractCategoryName(dirName: string): string | null {
  if (dirName.startsWith('fhevm-examples-')) {
    return dirName.replace('fhevm-examples-', '');
  }
  return null;
}

/**
 * Check if template directory is a git repository/submodule
 */
function isGitRepository(dirPath: string): boolean {
  return fs.existsSync(path.join(dirPath, '.git'));
}

/**
 * Update git submodule or repository
 */
function updateSubmodule(submodulePath: string): { updated: boolean; changed: boolean } {
  const rootDir = getProjectRoot();
  
  try {
    // Check if it's actually a submodule by checking .gitmodules
    const gitmodulesPath = path.join(rootDir, '.gitmodules');
    if (!fs.existsSync(gitmodulesPath)) {
      // Not a submodule, try to update as regular git repo
      if (isGitRepository(submodulePath)) {
        logger.dim('  Updating template repository...');
        const currentCommit = execSync('git rev-parse HEAD', {
          cwd: submodulePath,
          stdio: 'pipe',
        }).toString().trim();

        execSync('git fetch', {
          cwd: submodulePath,
          stdio: 'pipe',
        });

        execSync('git pull', {
          cwd: submodulePath,
          stdio: 'pipe',
        });

        const newCommit = execSync('git rev-parse HEAD', {
          cwd: submodulePath,
          stdio: 'pipe',
        }).toString().trim();

        const changed = currentCommit !== newCommit;
        return { updated: true, changed };
      }
      return { updated: false, changed: false };
    }

    // It's a submodule, use git submodule update
    logger.dim('  Updating submodule...');
    const currentCommit = execSync('git rev-parse HEAD', {
      cwd: submodulePath,
      stdio: 'pipe',
    }).toString().trim();

    execSync('git submodule update --remote --merge', {
      cwd: rootDir,
      stdio: 'pipe',
    });

    const newCommit = execSync('git rev-parse HEAD', {
      cwd: submodulePath,
      stdio: 'pipe',
    }).toString().trim();

    const changed = currentCommit !== newCommit;
    return { updated: true, changed };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warning(`Failed to update submodule: ${errorMessage}`);
    return { updated: false, changed: false };
  }
}

/**
 * Refresh a specific example
 */
export async function refreshExample(exampleName: string, skipSubmoduleUpdate = false): Promise<void> {
  const rootDir = getProjectRoot();
  const outputDir = path.join(rootDir, 'output', `fhevm-example-${exampleName}`);

  if (!EXAMPLES_MAP[exampleName]) {
    logger.error(`Unknown example: ${exampleName}`);
    return;
  }

  // Update submodule if not skipped (skip when refreshing all to avoid multiple updates)
  if (!skipSubmoduleUpdate) {
    const templateDir = path.join(rootDir, 'fhevm-hardhat-template');
    if (fs.existsSync(templateDir)) {
      updateSubmodule(templateDir);
    }
  }

  if (!fs.existsSync(outputDir)) {
    logger.warning(`Example directory not found: ${outputDir}`);
    logger.info('Creating new example instead...');
    await createExample(exampleName, outputDir, true, false);
    return;
  }

  logger.info(`Refreshing example: ${exampleName}`);
  await createExample(exampleName, outputDir, true, false);
  logger.success(`Example "${exampleName}" refreshed successfully!`);
}

/**
 * Refresh a specific category
 */
export async function refreshCategory(category: string, skipSubmoduleUpdate = false): Promise<void> {
  const rootDir = getProjectRoot();
  const outputDir = path.join(rootDir, 'output', `fhevm-examples-${category}`);

  if (!CATEGORIES[category]) {
    logger.error(`Unknown category: ${category}`);
    return;
  }

  // Update submodule if not skipped (skip when refreshing all to avoid multiple updates)
  if (!skipSubmoduleUpdate) {
    const templateDir = path.join(rootDir, 'fhevm-hardhat-template');
    if (fs.existsSync(templateDir)) {
      updateSubmodule(templateDir);
    }
  }

  if (!fs.existsSync(outputDir)) {
    logger.warning(`Category directory not found: ${outputDir}`);
    logger.info('Creating new category project instead...');
    await createCategory(category, outputDir, true, false);
    return;
  }

  logger.info(`Refreshing category: ${category}`);
  await createCategory(category, outputDir, true, false);
  logger.success(`Category "${category}" refreshed successfully!`);
}

/**
 * Refresh all generated examples and categories
 */
export async function refreshAll(): Promise<void> {
  logger.highlight('\nRefreshing Template and Examples...\n');

  const rootDir = getProjectRoot();
  const templateDir = path.join(rootDir, 'fhevm-hardhat-template');

  // Update submodule/template first
  if (!fs.existsSync(templateDir)) {
    logger.error(`Template directory not found: ${templateDir}`);
    return;
  }

  logger.step('Updating template submodule...');
  logger.log('');
  
  const submoduleResult = updateSubmodule(templateDir);
  
  if (submoduleResult.updated) {
    if (submoduleResult.changed) {
      logger.success('Template updated successfully!');
      logger.log('');
      logger.info('The template has been updated with new changes.');
      logger.log('');
      
      const shouldRebuild = await askConfirmation(
        'Do you want to rebuild all existing examples with the updated template?',
        true
      );

      if (!shouldRebuild) {
        logger.info('Skipping rebuild. Examples will not be refreshed.');
        logger.info('You can run the refresh command again later to rebuild examples.');
        return;
      }

      logger.log('');
    } else {
      logger.info('Template is already up to date.');
      logger.log('');
      logger.info('Rebuilding examples with current template...');
      logger.log('');
    }
  } else {
    logger.warning('Could not update template. Continuing with current version...');
    logger.log('');
  }

  const generatedDirs = findGeneratedExamples();
  
  if (generatedDirs.length === 0) {
    logger.info('No generated examples found in output directory.');
    return;
  }

  logger.info(`Found ${generatedDirs.length} generated example(s)/categorie(s) to refresh.\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const dirName of generatedDirs) {
    try {
      const exampleName = extractExampleName(dirName);
      if (exampleName) {
        await refreshExample(exampleName, true); // Skip submodule update, already done
        successCount++;
        continue;
      }

      const category = extractCategoryName(dirName);
      if (category) {
        await refreshCategory(category, true); // Skip submodule update, already done
        successCount++;
        continue;
      }

      logger.warning(`Unknown directory pattern: ${dirName}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warning(`Failed to refresh ${dirName}: ${errorMessage}`);
      errorCount++;
    }
  }

  logger.log('');
  logger.separator();
  if (errorCount === 0) {
    logger.success(`Successfully refreshed ${successCount} example(s)/categorie(s)!`);
  } else {
    logger.success(`Refreshed ${successCount} example(s)/categorie(s).`);
    logger.warning(`Failed: ${errorCount}`);
  }
  logger.separator();
}

