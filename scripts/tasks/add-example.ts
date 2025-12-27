/**
 * Add example task - guide users to add new examples and update configs
 */

import * as path from 'path';
import { logger } from '../utils/logger';
import { askQuestion, askConfirmation, selectOption } from '../utils/prompts';
import { getProjectRoot } from '../utils/paths';
import { findNewExamples, validateExampleFiles } from '../utils/discover';
import { CATEGORIES } from '../utils/categories-config';
import { EXAMPLES_MAP } from '../utils/examples-config';
import * as fs from 'fs';
import * as kleur from 'kleur';

/**
 * Extract description from contract file comments
 */
function extractDescription(contractPath: string): string {
  try {
    const content = fs.readFileSync(contractPath, 'utf-8');
    // Try to extract from NatSpec comment
    const natspecMatch = content.match(/\/\*\*\s*\n\s*\*\s*(.+?)\s*\n/);
    if (natspecMatch) {
      return natspecMatch[1].trim();
    }
    // Try to extract from single line comment
    const singleLineMatch = content.match(/\/\/\s*(.+)/);
    if (singleLineMatch) {
      return singleLineMatch[1].trim();
    }
  } catch {
    // Ignore errors
  }
  return '';
}


/**
 * Add new examples to config
 */
async function addExamplesToConfig(newExamples: Array<{
  exampleKey: string;
  category: string;
  contractPath: string;
  testPath: string;
  contractName: string;
}>): Promise<void> {
  if (newExamples.length === 0) {
    logger.info('No new examples found.');
    return;
  }

  logger.log('');
  logger.highlight('New Examples Found:');
  logger.log('');

  newExamples.forEach((example) => {
    logger.log(`  ${kleur.cyan(example.exampleKey)}`);
    logger.dim(`    Contract: ${example.contractPath}`);
    logger.dim(`    Test: ${example.testPath}`);
    logger.log('');
  });

  const shouldAdd = await askConfirmation(
    'Do you want to add these examples to the configuration?',
    true
  );

  if (!shouldAdd) {
    logger.info('Configuration update cancelled.');
    return;
  }

  // Read current config file
  const configPath = path.join(
    getProjectRoot(),
    'scripts',
    'utils',
    'examples-config.ts'
  );
  let configContent = fs.readFileSync(configPath, 'utf-8');

  // Generate new entries using the exported function
  const rootDir = getProjectRoot();
  const newEntries = newExamples.map((ex) => {
    let description = '';
    try {
      const content = fs.readFileSync(path.join(rootDir, ex.contractPath), 'utf-8');
      const natspecMatch = content.match(/\/\*\*\s*\n\s*\*\s*(.+?)\s*\n/);
      if (natspecMatch) {
        description = natspecMatch[1].trim();
      }
    } catch {
      // Ignore
    }
    description = description || `Example: ${ex.contractName}`;

    return `  '${ex.exampleKey}': {
    contract: '${ex.contractPath}',
    test: '${ex.testPath}',
    description: '${description.replace(/'/g, "\\'")}',
    category: '${ex.category}',
  },`;
  }).join('\n');

  // Find the closing brace of EXAMPLES_MAP and insert before it
  const mapEndIndex = configContent.lastIndexOf('};');
  if (mapEndIndex === -1) {
    logger.error('Could not find EXAMPLES_MAP end in config file');
    return;
  }

  // Insert new entries before the closing brace
  const before = configContent.substring(0, mapEndIndex);
  const after = configContent.substring(mapEndIndex);

  // Add comma to last existing entry if needed
  const needsComma = !before.trim().endsWith(',');
  const comma = needsComma ? ',' : '';

  configContent = before + comma + '\n' + newEntries + '\n' + after;

  // Write updated config
  fs.writeFileSync(configPath, configContent);
  logger.success('Configuration file updated successfully!');
  logger.info('You may need to restart the CLI or reload the config for changes to take effect.');
}

/**
 * Interactive guide to add a new example
 */
export async function addExampleGuide(): Promise<void> {
  logger.highlight('\n╔════════════════════════════════════════╗');
  logger.highlight('║   Add New Example Guide                ║');
  logger.highlight('╚════════════════════════════════════════╝\n');

  logger.info('This guide will help you add a new FHEVM example to the repository.');
  logger.log('');
  logger.info('Before starting, make sure you have:');
  logger.dim('  1. Written your Solidity contract');
  logger.dim('  2. Written the corresponding test file');
  logger.dim('  3. Named them with matching names (e.g., MyContract.sol and MyContract.ts)');
  logger.log('');

  const ready = await askConfirmation(
    'Have you created your contract and test files?',
    false
  );

  if (!ready) {
    logger.log('');
    logger.info('Next steps:');
    logger.log('');
    logger.highlight('1. Create your contract file:');
    logger.log('   - Place it in: contracts/<category>/<ContractName>.sol');
    logger.log('   - Use PascalCase for the contract name (e.g., MyExample.sol)');
    logger.log('   - Add a description in the contract comments if possible');
    logger.log('');
    logger.highlight('2. Create your test file:');
    logger.log('   - Place it in: test/<category>/<ContractName>.ts');
    logger.log('   - The test file name MUST match the contract name');
    logger.log('   - Example: If contract is MyExample.sol, test must be MyExample.ts');
    logger.log('');
    logger.info('Once you have both files ready, run this command again.');
    return;
  }

  logger.log('');

  // Step 1: Select category
  logger.highlight('Step 1: Select Category\n');
  logger.info('Choose the category where your contract and test files are located:');
  logger.log('');
  
  const categoryKeys = Object.keys(CATEGORIES);
  const categoryOptions = categoryKeys.map((key) => ({
    value: key,
    label: CATEGORIES[key].name,
    description: CATEGORIES[key].description,
  }));

  const category = await selectOption('Select the category for your example:', categoryOptions, true);
  
  // Handle back option
  if (category === null) {
    return;
  }
  
  const categoryDir = path.join(getProjectRoot(), 'contracts', category);
  const testCategoryDir = path.join(getProjectRoot(), 'test', category);

  logger.log('');
  logger.info(`Selected category: ${kleur.cyan(category)}`);
  logger.info(`  ${CATEGORIES[category].name}`);
  logger.log('');
  logger.info('Expected file locations:');
  logger.log(`  Contract: ${kleur.dim(categoryDir)}/<YourContract>.sol`);
  logger.log(`  Test:     ${kleur.dim(testCategoryDir)}/<YourContract>.ts`);
  logger.log('');

  // Step 2: Get contract name
  logger.highlight('Step 2: Enter Contract Name\n');
  logger.info('Enter the name of your contract (the filename without .sol extension)');
  logger.dim('  Example: If your file is "MyExample.sol", enter "MyExample"');
  logger.log('');
  
  const contractName = await askQuestion('Contract name (PascalCase):');
  
  if (!contractName || !/^[A-Z][a-zA-Z0-9]*$/.test(contractName)) {
    logger.error('Invalid contract name. Must be PascalCase (e.g., MyExample)');
    logger.log('');
    logger.info('PascalCase means:');
    logger.dim('  - Starts with an uppercase letter');
    logger.dim('  - Each word starts with uppercase (e.g., MyExample, UserDecrypt)');
    logger.dim('  - No spaces or special characters');
    return;
  }

  const contractFileName = `${contractName}.sol`;
  const testFileName = `${contractName}.ts`;
  const contractPath = path.join(categoryDir, contractFileName);
  const testPath = path.join(getProjectRoot(), 'test', category, testFileName);

  logger.log('');
  logger.info('Checking for files...');
  logger.dim(`  Contract: ${contractPath}`);
  logger.dim(`  Test:     ${testPath}`);
  logger.log('');

  // Check if files exist
  const contractExists = fs.existsSync(contractPath);
  const testExists = fs.existsSync(testPath);

  if (!contractExists && !testExists) {
    logger.warning('Neither contract nor test file exists yet.');
    logger.log('');
    logger.info('Next steps:');
    logger.log('');
    logger.highlight('1. Create your contract file:');
    logger.log(`   Location: ${kleur.cyan(contractPath)}`);
    logger.log(`   - Write your Solidity contract`);
    logger.log(`   - Use the contract name: ${kleur.bold(contractName)}`);
    logger.log(`   - Add a description comment at the top if possible`);
    logger.log('');
    logger.highlight('2. Create your test file:');
    logger.log(`   Location: ${kleur.cyan(testPath)}`);
    logger.log(`   - Write your Hardhat test file`);
    logger.log(`   - The filename MUST be: ${kleur.bold(testFileName)}`);
    logger.log(`   - Important: The test filename must match the contract name exactly`);
    logger.log('');
    logger.highlight('3. After creating both files:');
    logger.log(`   Run: ${kleur.cyan('npm run cli discover')}`);
    logger.log('   This will automatically add your example to the configuration.');
    logger.log('');
    logger.info('Once both files are created, you can run this guide again or use the discover command.');
    return;
  }

  if (!contractExists) {
    logger.error(`✗ Contract file not found`);
    logger.log('');
    logger.info(`Expected location: ${kleur.cyan(contractPath)}`);
    logger.log('');
    logger.info('Next steps:');
    logger.log(`  1. Create the contract file at the location above`);
    logger.log(`  2. Make sure it's named: ${kleur.bold(contractFileName)}`);
    logger.log(`  3. Run this command again or use: ${kleur.cyan('npm run cli discover')}`);
    return;
  }

  if (!testExists) {
    logger.error(`✗ Test file not found`);
    logger.log('');
    logger.info(`Expected location: ${kleur.cyan(testPath)}`);
    logger.info(`Expected filename: ${kleur.bold(testFileName)}`);
    logger.log('');
    logger.warning('Important: The test file name MUST match the contract name exactly!');
    logger.log('');
    logger.info('Next steps:');
    logger.log(`  1. Create the test file at: ${testPath}`);
    logger.log(`  2. Name it exactly: ${kleur.bold(testFileName)}`);
    logger.log(`  3. Make sure the name matches your contract: ${contractName}`);
    logger.log(`  4. Run this command again or use: ${kleur.cyan('npm run cli discover')}`);
    return;
  }

  // Validate the files
  logger.log('');
  logger.step('Validating files...');
  logger.log('');
  
  const relativeContractPath = path.relative(getProjectRoot(), contractPath);
  const relativeTestPath = path.relative(getProjectRoot(), testPath);
  const validation = validateExampleFiles(relativeContractPath, relativeTestPath);

  if (!validation.valid) {
    logger.error(`Validation failed: ${validation.error || 'Unknown error'}`);
    logger.log('');
    logger.info('Please fix the issue and try again.');
    return;
  }

  logger.success('✓ Contract file found');
  logger.success(`✓ Test file found`);
  logger.success('✓ Files validated successfully!');
  logger.log('');

  // Run discovery to update configs
  logger.step('Scanning for new examples...');
  logger.log('');
  
  const newExamples = findNewExamples();
  const relativeContractPathForSearch = relativeContractPath.replace(/\\/g, '/');
  
  const thisExample = newExamples.find(
    (ex) =>
      ex.contractPath === relativeContractPathForSearch ||
      ex.contractPath.replace(/\\/g, '/') === relativeContractPathForSearch ||
      path.basename(ex.contractPath, '.sol') === contractName
  );

  if (thisExample) {
    logger.info(`Found new example: ${kleur.cyan(thisExample.exampleKey)}`);
    logger.log('');
    
    const shouldAdd = await askConfirmation(
      'Add this example to the configuration?',
      true
    );

    if (shouldAdd) {
      // Read current config file and update it
      const configPath = path.join(
        getProjectRoot(),
        'scripts',
        'utils',
        'examples-config.ts'
      );
      let configContent = fs.readFileSync(configPath, 'utf-8');

      // Generate new entry
      let description = '';
      try {
        const content = fs.readFileSync(contractPath, 'utf-8');
        const natspecMatch = content.match(/\/\*\*\s*\n\s*\*\s*(.+?)\s*\n/);
        if (natspecMatch) {
          description = natspecMatch[1].trim();
        }
      } catch {
        // Ignore
      }
      description = description || `Example: ${contractName}`;

      const newEntry = `  '${thisExample.exampleKey}': {
    contract: '${thisExample.contractPath}',
    test: '${thisExample.testPath}',
    description: '${description.replace(/'/g, "\\'")}',
    category: '${thisExample.category}',
  },`;

      // Find the closing brace of EXAMPLES_MAP and insert before it
      const mapEndIndex = configContent.lastIndexOf('};');
      if (mapEndIndex === -1) {
        logger.error('Could not find EXAMPLES_MAP end in config file');
        return;
      }

      // Insert new entry before the closing brace
      const before = configContent.substring(0, mapEndIndex);
      const after = configContent.substring(mapEndIndex);

      // Add comma to last existing entry if needed
      const trimmedBefore = before.trimEnd();
      const needsComma = !trimmedBefore.endsWith(',') && !trimmedBefore.endsWith('{');
      const comma = needsComma ? ',' : '';

      configContent = before + comma + '\n' + newEntry + '\n' + after;

      // Write updated config
      fs.writeFileSync(configPath, configContent);
      logger.success('✓ Configuration file updated successfully!');
      logger.log('');
      logger.info('Next steps:');
      logger.log('  1. Your example is now available in the CLI');
      logger.log(`  2. You can generate it with: ${kleur.cyan(`npm run cli example ${thisExample.exampleKey}`)}`);
      logger.log(`  3. Or generate docs with: ${kleur.cyan(`npm run cli docs ${thisExample.exampleKey}`)}`);
    } else {
      logger.info('Configuration update cancelled.');
      logger.info('You can manually add it to scripts/utils/examples-config.ts or run the discover command later.');
    }
  } else {
    // Check if it's already in config
    const exampleKey = contractName
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase();
    
    if (EXAMPLES_MAP[exampleKey]) {
      logger.info(`This example (${kleur.cyan(exampleKey)}) is already in the configuration.`);
      logger.log('');
      logger.info('You can generate it with:');
      logger.log(`  ${kleur.cyan(`npm run cli example ${exampleKey}`)}`);
    } else {
      logger.warning('Example not found in discovery scan.');
      logger.log('');
      logger.info('This might happen if:');
      logger.dim('  - The contract/test structure doesn\'t match expected patterns');
      logger.dim('  - There are file path issues');
      logger.log('');
      logger.info('You can try running the discover command manually:');
      logger.log(`  ${kleur.cyan('npm run cli discover')}`);
      logger.log('');
      logger.info('Or manually add it to scripts/utils/examples-config.ts');
    }
  }
  
  logger.log('');
}

