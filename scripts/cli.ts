#!/usr/bin/env node

/**
 * FHEVM Examples Generator - Main CLI Entry Point
 *
 * Usage:
 *   fhe-playground                    # Interactive mode
 *   fhe-playground example <name>     # Create example directly
 *   fhe-playground category <name>    # Create category directly
 *   fhe-playground docs <name>        # Generate docs directly
 *   fhe-playground docs --all         # Generate all docs
 */

import * as path from 'path';
import * as fs from 'fs';
import { logger } from './utils/logger';
import { askQuestion, selectOption, askConfirmation } from './utils/prompts';
import { createExample } from './tasks/create-example';
import { createCategory } from './tasks/create-category';
import { generateDocs, generateAllDocs } from './tasks/generate-docs';
import { addExampleGuide } from './tasks/add-example';
import { discoverAndUpdate } from './tasks/discover';
import { refreshExample, refreshCategory, refreshAll } from './tasks/refresh';
import { generateAllExamples, generateAllCategories } from './tasks/batch';
import { validateAll } from './tasks/validate';
import { listExamples, listCategories, getExamplesForCategory, getExamplesBySubcategory } from './utils/example-helpers';
import { EXAMPLES_MAP } from './utils/examples-config';
import { CATEGORIES } from './utils/categories-config';
import { EXAMPLES_CONFIG } from './utils/docs-config';
import { isHardhatProject, getHardhatConfigPath, addFhevmDependencies, addFhevmPlugin } from './utils/project-setup';
import { getProjectRoot } from './utils/paths';
import { getContractName } from './utils/files';
import * as kleur from 'kleur';

/**
 * Show help message
 */
function showHelp(): void {
  logger.highlight('\nFHEVM Examples Generator\n');
  logger.log('Usage:');
  logger.dim('  ts-node scripts/cli.ts                    # Interactive mode');
  logger.dim('  ts-node scripts/cli.ts example <name>     # Create example directly');
  logger.dim('  ts-node scripts/cli.ts category <name>    # Create category directly');
  logger.dim('  ts-node scripts/cli.ts docs [name]        # Generate docs (all if no name)');
  logger.dim('  ts-node scripts/cli.ts list examples      # List all examples');
  logger.dim('  ts-node scripts/cli.ts list categories    # List all categories');
  logger.dim('  ts-node scripts/cli.ts discover           # Discover and add new examples');
  logger.dim('  ts-node scripts/cli.ts refresh [name]     # Refresh example/category (all if no name)');
  logger.dim('  ts-node scripts/cli.ts validate           # Validate all generated examples');
  logger.dim('  ts-node scripts/cli.ts batch examples     # Generate all examples');
  logger.dim('  ts-node scripts/cli.ts batch categories   # Generate all categories');
  logger.log('');
  logger.log('Options:');
  logger.dim('  --target <dir> Inject into existing Hardhat project (use . for current directory)');
  logger.dim('  --override    Automatically override existing output directory');
  logger.dim('  --install     Install dependencies and run tests after creation');
  logger.log('');
}

/**
 * Show main interactive menu
 */
async function showInteractiveMenu(): Promise<void> {
  logger.highlight('\n╔════════════════════════════════════════╗');
  logger.highlight('║   FHEVM Examples Generator            ║');
  logger.highlight('╚════════════════════════════════════════╝\n');

  const action = await selectOption('What would you like to do?', [
    {
      value: 'example',
      label: 'Create Example',
      description: 'Generate a standalone FHEVM example repository',
    },
    {
      value: 'category',
      label: 'Create Category',
      description: 'Generate a project with all examples from a category',
    },
    {
      value: 'docs',
      label: 'Generate Documentation',
      description: 'Generate GitBook-formatted documentation',
    },
    {
      value: 'add-example',
      label: 'Add New Example',
      description: 'Guide to add a new example to the repository',
    },
    {
      value: 'discover',
      label: 'Discover Examples',
      description: 'Scan and update configs for new examples',
    },
    {
      value: 'refresh',
      label: 'Refresh Examples',
      description: 'Refresh generated examples with updated template',
    },
    {
      value: 'validate',
      label: 'Validate Examples',
      description: 'Test all generated examples',
    },
    {
      value: 'batch',
      label: 'Batch Operations',
      description: 'Generate all examples or categories',
    },
    {
      value: 'exit',
      label: 'Exit',
      description: 'Exit the generator',
    },
  ]);

  switch (action) {
    case 'example':
      await handleExampleInteractive();
      break;
    case 'category':
      await handleCategoryInteractive();
      break;
    case 'docs':
      await handleDocsInteractive();
      break;
    case 'add-example':
      await addExampleGuide();
      break;
    case 'discover':
      await discoverAndUpdate();
      break;
    case 'refresh':
      await handleRefreshInteractive();
      break;
    case 'validate':
      validateAll();
      break;
    case 'batch':
      await handleBatchInteractive();
      break;
    case 'exit':
      logger.log('');
      logger.highlight('👋 Happy coding with FHEVM! See you next time!');
      logger.log('');
      process.exit(0);
  }

  // Ask if user wants to continue
  logger.log('');
  const continue_ = await askConfirmation('Would you like to do something else?', true);
  if (continue_) {
    await showInteractiveMenu();
  } else {
    logger.log('');
    logger.highlight('✨ Thanks for using FHEVM Examples Generator! Happy building! 🚀');
    logger.log('');
  }
}

/**
 * Handle example creation in interactive mode
 */
async function handleExampleInteractive(): Promise<void> {
  logger.log('');
  logger.highlight('Select Category:');
  logger.log('');

  const categoryNames = Object.keys(CATEGORIES);
  const categoryOptions = categoryNames.map((key) => ({
    value: key,
    label: CATEGORIES[key].name,
    description: `${CATEGORIES[key].description} (${getExamplesForCategory(key).length} examples)`,
  }));

  const categoryKey = await selectOption('Select a category:', categoryOptions, true);
  
  // Handle back option
  if (categoryKey === null) {
    return;
  }

  logger.log('');
  logger.highlight('Available Examples:');
  logger.log('');

  // Get examples grouped by subcategory
  const groupedExamples = getExamplesBySubcategory(categoryKey);
  
  // Build flat list of all examples with their indices
  const allExamples: Array<{ key: string; index: number; description: string }> = [];
  let globalIndex = 1;
  
  // Display grouped examples with headers
  groupedExamples.forEach((group) => {
    if (group.examples.length > 0) {
      // Show subcategory header
      logger.log(`  ${kleur.bold().yellow(`📁 ${group.displayName}`)} ${kleur.dim(`(${group.examples.length} example${group.examples.length > 1 ? 's' : ''})`)}`);
      
      // Show examples in this group
      group.examples.forEach((example) => {
        logger.log(`    ${kleur.cyan(`${globalIndex}.`)} ${example.key} ${kleur.dim(`- ${example.description}`)}`);
        allExamples.push({
          key: example.key,
          index: globalIndex,
          description: example.description,
        });
        globalIndex++;
      });
      
      logger.log(''); // Empty line between groups
    }
  });

  // Now ask for selection
  logger.log('');
  logger.highlight('Select an example:');
  logger.log('');
  
  // Show back option
  logger.log(`  ${kleur.cyan('0')}. ${kleur.bold('Go Back')}`);
  
  // Show examples again with indices
  allExamples.forEach((example) => {
    logger.log(`  ${kleur.cyan(`${example.index}.`)} ${example.key} ${kleur.dim(`- ${example.description}`)}`);
  });
  
  logger.log('');
  const answer = await askQuestion(`Select an example ${kleur.dim(`(0-${allExamples.length})`)}: `);
  const selectedIndex = parseInt(answer, 10);
  
  // Handle back option
  if (selectedIndex === 0) {
    // Recursively call to go back to category selection
    await handleExampleInteractive();
    return;
  }
  
  if (isNaN(selectedIndex) || selectedIndex < 1 || selectedIndex > allExamples.length) {
    logger.error(`Invalid selection. Please enter a number between 0 and ${allExamples.length}.`);
    process.exit(1);
  }
  
  const exampleName = allExamples[selectedIndex - 1].key;

  const defaultOutput = path.join(
    process.cwd(),
    'output',
    `fhevm-example-${exampleName}`
  );
  const outputDir = await askQuestion(
    `Output directory ${kleur.dim(`(${defaultOutput})`)}`
  );

  const finalOutputDir = outputDir || defaultOutput;

  logger.log('');
  const installAndTest = await askConfirmation(
    'Install dependencies and run tests after creation?',
    false
  );

  logger.log('');
  await createExample(exampleName, finalOutputDir, undefined, installAndTest);
}

/**
 * Handle category creation in interactive mode
 */
async function handleCategoryInteractive(): Promise<void> {
  logger.log('');
  logger.highlight('Available Categories:');
  logger.log('');

  const categoryNames = Object.keys(CATEGORIES);
  const options = categoryNames.map((key) => ({
    value: key,
    label: CATEGORIES[key].name,
    description: `${CATEGORIES[key].description} (${CATEGORIES[key].contracts.length} contracts)`,
  }));

  const category = await selectOption('Select a category to create:', options, true);
  
  // Handle back option
  if (category === null) {
    return;
  }

  const defaultOutput = path.join(
    process.cwd(),
    'output',
    `fhevm-examples-${category}`
  );
  const outputDir = await askQuestion(
    `Output directory ${kleur.dim(`(${defaultOutput})`)}`
  );

  const finalOutputDir = outputDir || defaultOutput;

  logger.log('');
  const installAndTest = await askConfirmation(
    'Install dependencies and run tests after creation?',
    false
  );

  logger.log('');
  await createCategory(category, finalOutputDir, undefined, installAndTest);
}

/**
 * Handle docs generation in interactive mode
 */
async function handleDocsInteractive(): Promise<void> {
  logger.log('');
  const action = await selectOption('What would you like to do?', [
    {
      value: 'single',
      label: 'Generate Single Documentation',
      description: 'Generate docs for one example',
    },
    {
      value: 'all',
      label: 'Generate All Documentation',
      description: 'Generate docs for all examples',
    },
  ]);

  if (action === 'all') {
    logger.log('');
    generateAllDocs();
  } else {
    logger.log('');
    logger.highlight('Available Examples:');
    logger.log('');

    const exampleNames = Object.keys(EXAMPLES_CONFIG);
    const options = exampleNames.map((name) => ({
      value: name,
      label: EXAMPLES_CONFIG[name].title,
      description: EXAMPLES_CONFIG[name].category,
    }));

    const exampleName = await selectOption(
      'Select an example to generate docs for:',
      options,
      true
    );
    
    // Handle back option
    if (exampleName === null) {
      return;
    }

  logger.log('');
  generateDocs(exampleName);
  }
}

/**
 * Handle refresh in interactive mode
 */
async function handleRefreshInteractive(): Promise<void> {
  logger.log('');
  const action = await selectOption('What would you like to refresh?', [
    {
      value: 'all',
      label: 'All Examples',
      description: 'Refresh all generated examples and categories',
    },
    {
      value: 'example',
      label: 'Single Example',
      description: 'Refresh a specific example',
    },
    {
      value: 'category',
      label: 'Single Category',
      description: 'Refresh a specific category',
    },
  ]);

  if (action === 'all') {
    await refreshAll();
  } else if (action === 'example') {
    logger.log('');
    const exampleKeys = Object.keys(EXAMPLES_MAP);
    const options = exampleKeys.map((key) => ({
      value: key,
      label: key,
      description: EXAMPLES_MAP[key].description,
    }));
    const exampleName = await selectOption('Select example to refresh:', options, true);
    
    // Handle back option
    if (exampleName === null) {
      return;
    }
    
    await refreshExample(exampleName);
  } else if (action === 'category') {
    logger.log('');
    const categoryKeys = Object.keys(CATEGORIES);
    const options = categoryKeys.map((key) => ({
      value: key,
      label: CATEGORIES[key].name,
      description: CATEGORIES[key].description,
    }));
    const category = await selectOption('Select category to refresh:', options, true);
    
    // Handle back option
    if (category === null) {
      return;
    }
    
    await refreshCategory(category);
  }
}

/**
 * Handle batch operations in interactive mode
 */
async function handleBatchInteractive(): Promise<void> {
  logger.log('');
  const action = await selectOption('What would you like to generate?', [
    {
      value: 'all-examples',
      label: 'All Examples',
      description: 'Generate all examples',
    },
    {
      value: 'all-categories',
      label: 'All Categories',
      description: 'Generate all categories',
    },
  ]);

  const override = await askConfirmation('Override existing directories?', false);
  const install = await askConfirmation('Install dependencies and run tests?', false);

  logger.log('');
  if (action === 'all-examples') {
    await generateAllExamples(override, install);
  } else {
    await generateAllCategories(override, install);
  }
}

/**
 * Inject example into existing Hardhat project
 */
async function injectExampleIntoProject(
  exampleName: string,
  targetDir: string,
  install: boolean
): Promise<void> {
  const rootDir = getProjectRoot();

  // Validate example
  if (!EXAMPLES_MAP[exampleName]) {
    logger.error(
      `Unknown example: ${exampleName}\n\nAvailable examples:\n${Object.keys(
        EXAMPLES_MAP
      )
        .map((k) => `  - ${k}`)
        .join('\n')}`
    );
    return;
  }

  // Check if target directory exists
  if (!fs.existsSync(targetDir)) {
    logger.error(`Target directory does not exist: ${targetDir}`);
    return;
  }

  // Check if it's a Hardhat project
  logger.step('Checking if target is a Hardhat project...');
  if (!isHardhatProject(targetDir)) {
    logger.error(
      `Target directory is not a Hardhat project.\n\n` +
      `When using --target, the directory must be a Hardhat project.\n` +
      `Expected to find hardhat.config.ts, hardhat.config.js, or hardhat.config.cjs\n\n` +
      `Current directory: ${targetDir}`
    );
    return;
  }
  logger.success('Hardhat project detected');

  const example = EXAMPLES_MAP[exampleName];
  const contractPath = path.join(rootDir, example.contract);
  const testPath = path.join(rootDir, example.test);

  // Validate paths
  if (!fs.existsSync(contractPath)) {
    logger.error(`Contract not found: ${example.contract}`);
    return;
  }
  if (!fs.existsSync(testPath)) {
    logger.error(`Test not found: ${example.test}`);
    return;
  }

  logger.log('');
  logger.info(`Injecting example "${exampleName}" into project: ${targetDir}`);
  logger.log('');

  // Step 1: Update package.json with FHEVM dependencies
  logger.step('Updating package.json with FHEVM dependencies...');
  const packageJsonPath = path.join(targetDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    logger.error(`package.json not found in target directory`);
    return;
  }
  addFhevmDependencies(packageJsonPath);
  logger.log('');

  // Step 2: Update hardhat.config with FHEVM plugin
  logger.step('Updating hardhat.config with FHEVM plugin...');
  const configPath = getHardhatConfigPath(targetDir);
  if (configPath) {
    addFhevmPlugin(configPath);
  } else {
    logger.warning('Could not find hardhat.config file');
  }
  logger.log('');

  // Step 3: Copy contract
  logger.step('Copying contract...');
  const contractName = getContractName(contractPath);
  if (!contractName) {
    logger.error('Could not extract contract name from contract file');
    return;
  }

  const contractsDir = path.join(targetDir, 'contracts');
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  const destContractPath = path.join(contractsDir, `${contractName}.sol`);
  
  // Check if contract already exists
  if (fs.existsSync(destContractPath)) {
    logger.warning(`Contract ${contractName}.sol already exists in contracts/`);
    const shouldOverwrite = await askConfirmation(
      'Do you want to overwrite it?',
      false
    );
    if (!shouldOverwrite) {
      logger.info('Skipping contract copy');
    } else {
      fs.copyFileSync(contractPath, destContractPath);
      logger.success(`Contract copied: ${contractName}.sol`);
    }
  } else {
    fs.copyFileSync(contractPath, destContractPath);
    logger.success(`Contract copied: ${contractName}.sol`);
  }
  logger.log('');

  // Step 4: Copy test
  logger.step('Copying test...');
  const testDir = path.join(targetDir, 'test');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const destTestPath = path.join(testDir, path.basename(testPath));
  
  // Check if test already exists
  if (fs.existsSync(destTestPath)) {
    logger.warning(`Test ${path.basename(testPath)} already exists in test/`);
    const shouldOverwrite = await askConfirmation(
      'Do you want to overwrite it?',
      false
    );
    if (!shouldOverwrite) {
      logger.info('Skipping test copy');
    } else {
      fs.copyFileSync(testPath, destTestPath);
      logger.success(`Test copied: ${path.basename(testPath)}`);
    }
  } else {
    fs.copyFileSync(testPath, destTestPath);
    logger.success(`Test copied: ${path.basename(testPath)}`);
  }

  // Copy test fixture if it exists
  if (example.testFixture) {
    const fixtureSourcePath = path.join(rootDir, example.testFixture);
    if (fs.existsSync(fixtureSourcePath)) {
      const destFixturePath = path.join(testDir, path.basename(example.testFixture));
      fs.copyFileSync(fixtureSourcePath, destFixturePath);
      logger.success(`Test fixture copied: ${path.basename(example.testFixture)}`);
    }
  }
  logger.log('');

  // Summary
  logger.separator();
  logger.success(`Example "${exampleName}" injected successfully!`);
  logger.log('');
  logger.info('Next steps:');
  logger.log(`  1. Install dependencies: ${kleur.cyan('npm install')}`);
  logger.log(`  2. Compile: ${kleur.cyan('npm run compile')}`);
  logger.log(`  3. Run tests: ${kleur.cyan('npm run test')}`);
  logger.separator();

  // Optionally install and run tests
  if (install) {
    logger.log('');
    const { installAndTest } = await import('./utils/project-execution');
    installAndTest(targetDir);
  }
}

/**
 * Parse arguments and extract flags
 */
function parseArgs(args: string[]): { 
  args: string[]; 
  override?: boolean;
  install?: boolean;
  target?: string;
} {
  const overrideIndex = args.indexOf('--override');
  const installIndex = args.indexOf('--install');
  const targetIndex = args.findIndex((arg, i) => 
    arg === '--target' && i < args.length - 1
  );
  
  const override = overrideIndex !== -1 ? true : undefined;
  const install = installIndex !== -1 ? true : undefined;
  const target = targetIndex !== -1 ? args[targetIndex + 1] : undefined;
  
  // Remove flags and their values from args
  const indicesToRemove = new Set<number>();
  if (overrideIndex !== -1) indicesToRemove.add(overrideIndex);
  if (installIndex !== -1) indicesToRemove.add(installIndex);
  if (targetIndex !== -1) {
    indicesToRemove.add(targetIndex);
    indicesToRemove.add(targetIndex + 1);
  }
  
  const filteredArgs = args.filter((_, i) => !indicesToRemove.has(i));
  
  return { args: filteredArgs, override, install, target };
}

/**
 * Handle direct command execution
 */
async function handleDirectCommand(rawArgs: string[]): Promise<void> {
  const { args, override, install, target } = parseArgs(rawArgs);
  const command = args[0];

  switch (command) {
    case 'example': {
      if (args.length < 2) {
        logger.error('Example name is required. Usage: example <name> [--target <dir>] [--override] [--install]');
      }
      const exampleName = args[1];
      
      // If --target is provided, inject into existing project
      if (target) {
        const targetDir = path.resolve(target === '.' ? process.cwd() : target);
        await injectExampleIntoProject(exampleName, targetDir, install || false);
      } else {
        // Default behavior: create new standalone project
        const outputDir =
          args[2] ||
          path.join(process.cwd(), 'output', `fhevm-example-${exampleName}`);
        await createExample(exampleName, outputDir, override, install || false);
      }
      break;
    }

    case 'category': {
      if (args.length < 2) {
        logger.error('Category name is required. Usage: category <name> [--override] [--install]');
      }
      const category = args[1];
      const outputDir =
        args[2] ||
        path.join(process.cwd(), 'output', `fhevm-examples-${category}`);
      await createCategory(category, outputDir, override, install || false);
      break;
    }

    case 'docs': {
      // If no argument provided, default to all
      if (args.length < 2 || args[1] === '--all') {
        generateAllDocs();
      } else {
        generateDocs(args[1]);
      }
      break;
    }

    case 'list': {
      if (args.length < 2) {
        logger.error('List what? Usage: list examples | list categories');
      }
      const listType = args[1];
      if (listType === 'examples') {
        listExamples();
      } else if (listType === 'categories') {
        listCategories();
      } else {
        logger.error(`Unknown list type: ${listType}. Use 'examples' or 'categories'`);
      }
      break;
    }

    case 'discover': {
      await discoverAndUpdate();
      break;
    }

    case 'refresh': {
      if (args.length < 2) {
        await refreshAll();
      } else {
        const name = args[1];
        // Check if it's an example or category
        if (EXAMPLES_MAP[name]) {
          await refreshExample(name);
        } else if (CATEGORIES[name]) {
          await refreshCategory(name);
        } else {
          logger.error(`Unknown example or category: ${name}`);
        }
      }
      break;
    }

    case 'validate': {
      validateAll();
      break;
    }

    case 'batch': {
      if (args.length < 2) {
        logger.error('Batch what? Usage: batch examples | batch categories');
      }
      const batchType = args[1];
      if (batchType === 'examples') {
        await generateAllExamples(override, install || false);
      } else if (batchType === 'categories') {
        await generateAllCategories(override, install || false);
      } else {
        logger.error(`Unknown batch type: ${batchType}. Use 'examples' or 'categories'`);
      }
      break;
    }

    case 'help':
    case '--help':
    case '-h': {
      showHelp();
      break;
    }

    default: {
      logger.error(`Unknown command: ${command}. Use 'help' for usage information.`);
    }
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // If no arguments, show interactive menu
  if (args.length === 0) {
    await showInteractiveMenu();
  } else {
    // Handle direct command
    await handleDirectCommand(args);
  }
}

// Run main
main().catch((error) => {
  logger.error(`Unexpected error: ${error.message}`);
});

