/**
 * Batch generation tasks
 */

import * as path from 'path';
import { logger } from '../utils/logger';
import { createExample } from './create-example';
import { createCategory } from './create-category';
import { EXAMPLES_MAP } from '../utils/examples-config';
import { CATEGORIES } from '../utils/categories-config';
import { getExamplesForCategory } from '../utils/example-helpers';

/**
 * Generate all examples
 */
export async function generateAllExamples(override = false, installAndTest = false): Promise<void> {
  logger.highlight('\nGenerating All Examples...\n');

  const exampleKeys = Object.keys(EXAMPLES_MAP);
  logger.info(`Found ${exampleKeys.length} example(s) to generate.\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const exampleKey of exampleKeys) {
    try {
      const outputDir = path.join(
        process.cwd(),
        'output',
        `fhevm-example-${exampleKey}`
      );

      logger.log(`Generating: ${exampleKey}`);
      await createExample(exampleKey, outputDir, override, installAndTest);
      successCount++;
      logger.log('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warning(`Failed to generate ${exampleKey}: ${errorMessage}`);
      errorCount++;
    }
  }

  logger.separator();
  if (errorCount === 0) {
    logger.success(`Successfully generated ${successCount} example(s)!`);
  } else {
    logger.success(`Generated ${successCount} example(s).`);
    logger.warning(`Failed: ${errorCount}`);
  }
  logger.separator();
}

/**
 * Generate all categories
 */
export async function generateAllCategories(override = false, installAndTest = false): Promise<void> {
  logger.highlight('\nGenerating All Categories...\n');

  const categoryKeys = Object.keys(CATEGORIES);
  logger.info(`Found ${categoryKeys.length} category/categories to generate.\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const categoryKey of categoryKeys) {
    try {
      const outputDir = path.join(
        process.cwd(),
        'output',
        `fhevm-examples-${categoryKey}`
      );

      logger.log(`Generating: ${categoryKey}`);
      await createCategory(categoryKey, outputDir, override, installAndTest);
      successCount++;
      logger.log('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warning(`Failed to generate ${categoryKey}: ${errorMessage}`);
      errorCount++;
    }
  }

  logger.separator();
  if (errorCount === 0) {
    logger.success(`Successfully generated ${successCount} category/categories!`);
  } else {
    logger.success(`Generated ${successCount} category/categories.`);
    logger.warning(`Failed: ${errorCount}`);
  }
  logger.separator();
}

