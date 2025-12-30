/**
 * Discover task - scan and update configs for new examples
 */

import { logger } from "../utils/logger";
import { findNewExamples, validateExampleFiles } from "../utils/discover";
import { generateDocs } from "./generate-docs";
import { generateExampleFromConfig } from "../utils/example-generation";
import { testGeneratedExample } from "../utils/project-execution";
import * as fs from "fs";
import * as path from "path";
import { getProjectRoot } from "../utils/paths";
import * as kleur from "kleur";
import { ExampleConfig } from "../utils/config";
import { EXAMPLES_CONFIG } from "../utils/docs-config";
import {
  validateCategoriesConfigOrExit,
  normalizeKeyForComparison,
} from "../utils/validate-config";
import {
  addExamplesToCategories,
  validateCategoriesConfigSyntax,
} from "../utils/config-updater";

/**
 * Generate config entry for example
 */
function generateConfigEntry(example: {
  exampleKey: string;
  category: string;
  contractPath: string;
  testPath: string;
  contractName: string;
}): string {
  const rootDir = getProjectRoot();

  // Try to extract description from contract
  let description = "";
  try {
    const content = fs.readFileSync(
      path.join(rootDir, example.contractPath),
      "utf-8"
    );
    const natspecMatch = content.match(/\/\*\*\s*\n\s*\*\s*(.+?)\s*\n/);
    if (natspecMatch) {
      description = natspecMatch[1].trim();
    }
  } catch {
    // Ignore
  }

  description = description || `Example: ${example.contractName}`;

  return `  '${example.exampleKey}': {
    contract: '${example.contractPath}',
    test: '${example.testPath}',
    description: '${description.replace(/'/g, "\\'")}',
    category: '${example.category}',
  },`;
}

/**
 * Derive output path from contract path (same logic as generate-docs.ts)
 * contracts/fundamentals/fhe-operations/FHEAdd.sol -> docs/fundamentals/fhe-operations/fhe-add.md
 */
function deriveOutputPath(contractPath: string): string {
  // Remove contracts/ prefix
  let relativePath = contractPath.replace(/^contracts\//, "");

  // Get directory and filename
  const dirname = path.dirname(relativePath);
  const basename = path.basename(relativePath, ".sol");

  // Convert contract name to kebab-case for file name
  const kebabCase = basename
    .replace(/([a-z])([A-Z])/g, "$1-$2") // Insert hyphen between lowercase and uppercase
    .toLowerCase();

  // Construct output path
  if (dirname === "." || dirname === "") {
    return `docs/${kebabCase}.md`;
  }
  return `docs/${dirname}/${kebabCase}.md`;
}

/**
 * Derive category display name from contract path
 * contracts/fundamentals/fhe-operations/FHEAdd.sol -> "Fundamentals - FHE Operations"
 */
function deriveCategoryDisplay(contractPath: string): string {
  // Remove contracts/ prefix
  let relativePath = contractPath.replace(/^contracts\//, "");

  // Get directory
  const dirname = path.dirname(relativePath);

  if (dirname === "." || dirname === "") {
    return "Fundamentals";
  }

  // Convert path segments to title case with spaces
  const segments = dirname.split(path.sep);
  const category = segments
    .map((segment) => {
      // Convert kebab-case or snake_case to Title Case
      return segment
        .split(/[-_]/)
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(" ");
    })
    .join(" - ");

  return category;
}

/**
 * Generate docs config entry
 */
function generateDocsConfigEntry(example: {
  exampleKey: string;
  category: string;
  contractPath: string;
  testPath: string;
  contractName: string;
  description: string;
}): string {
  const contractName = path.basename(example.contractPath, ".sol");

  // Generate output filename using nested path structure
  const outputFile = deriveOutputPath(example.contractPath);

  // Derive category display name from path
  const categoryDisplay = deriveCategoryDisplay(example.contractPath);

  // Try to extract title from contract
  let title = contractName.replace(/([A-Z])/g, " $1").trim();

  return `  '${example.exampleKey}': {
    title: '${title}',
    description: '${example.description.replace(/'/g, "\\'")}',
    contract: '${example.contractPath}',
    test: '${example.testPath}',
    output: '${outputFile}',
    category: '${categoryDisplay}',
  },`;
}

/**
 * Discover and update configs
 */
export async function discoverAndUpdate(): Promise<void> {
  // Validate categories config before proceeding
  validateCategoriesConfigOrExit();

  logger.highlight("\nDiscovering New Examples...\n");

  const newExamples = findNewExamples();
  const rootDir = getProjectRoot();

  // Handle new examples if any
  if (newExamples.length === 0) {
    logger.info(
      "No new examples found. All contracts have matching tests and are configured."
    );
    logger.log("");

    // Still check for missing docs even if no new examples
    logger.step("Checking for missing documentation...");
    logger.log("");

    // Check all existing examples for missing docs
    const { EXAMPLES_MAP } = require("../utils/examples-config");
    let docsGenerated = 0;
    let docsSkipped = 0;

    for (const [exampleKey, example] of Object.entries(EXAMPLES_MAP) as Array<
      [string, ExampleConfig]
    >) {
      try {
        const outputFile = deriveOutputPath(example.contract);
        const outputPath = path.join(rootDir, outputFile);

        if (fs.existsSync(outputPath)) {
          docsSkipped++;
          continue;
        }

        // Doc is missing, generate it
        const contractPath = path.join(rootDir, example.contract);
        const testPath = path.join(rootDir, example.test);

        if (!fs.existsSync(contractPath) || !fs.existsSync(testPath)) {
          logger.dim(`  ⊘ ${exampleKey} (contract or test missing)`);
          continue;
        }

        const contractContent = fs.readFileSync(contractPath, "utf-8");
        const testContent = fs.readFileSync(testPath, "utf-8");

        const contractNameMatch =
          contractContent.match(/^\s*contract\s+(\w+)/m);
        const contractName = contractNameMatch
          ? contractNameMatch[1]
          : "Contract";

        let markdown = `${example.description}\n\n`;
        markdown += `{% hint style="info" %}\n`;
        markdown += `To run this example correctly, make sure the files are placed in the following directories:\n\n`;
        markdown += `- \`.sol\` file → \`<your-project-root-dir>/contracts/\`\n`;
        markdown += `- \`.ts\` file → \`<your-project-root-dir>/test/\`\n\n`;
        markdown += `This ensures Hardhat can compile and test your contracts as expected.\n`;
        markdown += `{% endhint %}\n\n`;
        markdown += `{% tabs %}\n\n`;
        markdown += `{% tab title="${contractName}.sol" %}\n\n`;
        markdown += `\`\`\`solidity\n${contractContent}\n\`\`\`\n\n`;
        markdown += `{% endtab %}\n\n`;
        markdown += `{% tab title="${path.basename(example.test)}" %}\n\n`;
        markdown += `\`\`\`typescript\n${testContent}\n\`\`\`\n\n`;
        markdown += `{% endtab %}\n\n`;
        markdown += `{% endtabs %}\n`;

        const docsDir = path.dirname(outputPath);
        if (!fs.existsSync(docsDir)) {
          fs.mkdirSync(docsDir, { recursive: true });
        }

        fs.writeFileSync(outputPath, markdown);
        docsGenerated++;
        logger.dim(`  ✓ ${exampleKey} (regenerated)`);
      } catch (docError) {
        logger.dim(
          `  ✗ ${exampleKey} (${
            docError instanceof Error ? docError.message : "failed"
          })`
        );
      }
    }

    if (docsGenerated > 0) {
      logger.success(
        `Regenerated documentation for ${docsGenerated} example(s)!`
      );
    }
    if (docsSkipped > 0) {
      logger.info(`All other examples already have documentation.`);
    }
    logger.log("");

    return;
  }

  logger.log("");
  logger.highlight("New Examples Found:");
  logger.log("");

  // Validate each example
  const validExamples: typeof newExamples = [];

  for (const example of newExamples) {
    logger.log(`  ${kleur.cyan(example.exampleKey)}`);
    logger.dim(`    Contract: ${example.contractPath}`);
    logger.dim(`    Test: ${example.testPath}`);

    const validation = validateExampleFiles(
      example.contractPath,
      example.testPath
    );
    if (validation.valid) {
      logger.log(`    ${kleur.green("✓ Valid")}`);
      validExamples.push(example);
    } else {
      logger.log(`    ${kleur.red("✗ Invalid:")} ${validation.error}`);
    }
    logger.log("");
  }

  if (validExamples.length === 0) {
    logger.warning("No valid examples to add. Please fix the errors above.");
    return;
  }

  logger.info(`Found ${validExamples.length} valid new example(s).\n`);

  // Read config files
  const configPath = path.join(
    rootDir,
    "scripts",
    "utils",
    "examples-config.ts"
  );
  const docsConfigPath = path.join(
    rootDir,
    "scripts",
    "utils",
    "docs-config.ts"
  );
  const originalConfigContent = fs.readFileSync(configPath, "utf-8");
  const originalDocsConfigContent = fs.existsSync(docsConfigPath)
    ? fs.readFileSync(docsConfigPath, "utf-8")
    : "";

  // Test each example before adding to config
  logger.highlight("Testing Examples...\n");
  logger.info(
    "Generating and testing each example to ensure they work correctly..."
  );
  logger.log("");

  const successfullyTestedExamples: Array<
    (typeof validExamples)[0] & { description: string }
  > = [];
  const failedExamples: Array<{
    example: (typeof validExamples)[0];
    error: string;
  }> = [];

  for (const example of validExamples) {
    logger.log(`Testing: ${kleur.cyan(example.exampleKey)}...`);

    try {
      // Generate example in a temporary location
      const tempOutputDir = path.join(
        rootDir,
        "output",
        `.temp-${example.exampleKey}`
      );

      // Clean up any existing temp directory
      if (fs.existsSync(tempOutputDir)) {
        fs.rmSync(tempOutputDir, { recursive: true, force: true });
      }

      // Create example config from discovered data
      let description = "";
      try {
        const contractContent = fs.readFileSync(
          path.join(rootDir, example.contractPath),
          "utf-8"
        );
        const natspecMatch = contractContent.match(
          /\/\*\*\s*\n\s*\*\s*(.+?)\s*\n/
        );
        if (natspecMatch) {
          description = natspecMatch[1].trim();
        }
      } catch {
        // Ignore
      }
      description = description || `Example: ${example.contractName}`;

      const exampleConfig: ExampleConfig = {
        contract: example.contractPath,
        test: example.testPath,
        description,
      };

      // Generate the example
      logger.dim("  Generating example...");
      await generateExampleFromConfig(
        example.exampleKey,
        exampleConfig,
        tempOutputDir
      );

      // Test the generated example (compile and run tests)
      logger.dim("  Compiling and testing...");
      const testResult = testGeneratedExample(tempOutputDir);

      if (!testResult.success) {
        fs.rmSync(tempOutputDir, { recursive: true, force: true });
        failedExamples.push({
          example,
          error: testResult.error || "Tests failed",
        });
        logger.log(
          `  ${kleur.red("✗ Failed")} - ${testResult.error || "Tests failed"}`
        );
        continue;
      }

      logger.log(`  ${kleur.green("✓ Tests passed")}`);
      successfullyTestedExamples.push({ ...example, description });

      // Generate docs for successfully tested example
      logger.dim("  Generating docs...");
      try {
        // We need to add to docs config first, but let's do it after all tests pass
        // For now, skip docs generation here, we'll do it after config update
        logger.dim("  ⚠ Docs will be generated after config update");
      } catch (docError) {
        logger.warning(`  ⚠ Docs generation will be skipped for now`);
      }

      // Clean up temp directory
      fs.rmSync(tempOutputDir, { recursive: true, force: true });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      failedExamples.push({
        example,
        error: errorMessage,
      });
      logger.log(`  ${kleur.red("✗ Failed:")} ${errorMessage}`);
    }

    logger.log("");
  }

  // Report results summary
  logger.separator();
  logger.highlight("Discovery Summary");
  logger.separator();
  logger.log("");

  const totalExamples =
    successfullyTestedExamples.length + failedExamples.length;
  logger.info(`Total examples discovered: ${totalExamples}`);
  logger.log("");

  if (successfullyTestedExamples.length > 0) {
    logger.success(
      `✓ ${successfullyTestedExamples.length} example(s) passed validation and were added:`
    );
    logger.log("");
    successfullyTestedExamples.forEach((example) => {
      logger.log(`  ${kleur.green("✓")} ${kleur.cyan(example.exampleKey)}`);
    });
    logger.log("");
  }

  if (failedExamples.length > 0) {
    logger.warning(
      `✗ ${failedExamples.length} example(s) failed validation and were NOT added:`
    );
    logger.log("");
    failedExamples.forEach(({ example, error }) => {
      logger.log(`  ${kleur.red("✗")} ${kleur.cyan(example.exampleKey)}`);
      logger.dim(`    Reason: ${error}`);
    });
    logger.log("");
  }

  logger.separator();
  logger.log("");

  if (successfullyTestedExamples.length === 0) {
    logger.warning(
      "No examples passed validation. Configuration was not updated."
    );
    logger.info("Please fix the issues with your examples and try again.");
    return;
  }

  // Update configs only with successfully tested examples
  logger.step("Updating configuration files...");
  logger.log("");

  // Group examples by category
  const examplesByCategory = new Map<
    string,
    typeof successfullyTestedExamples
  >();
  const newCategories: string[] = [];

  for (const example of successfullyTestedExamples) {
    if (!examplesByCategory.has(example.category)) {
      examplesByCategory.set(example.category, []);
    }
    examplesByCategory.get(example.category)!.push(example);
  }

  // Update categories-config.ts using the robust updater
  const categoriesConfigPath = path.join(
    rootDir,
    "scripts",
    "utils",
    "categories-config.ts"
  );

  if (fs.existsSync(categoriesConfigPath)) {
    try {
      // Prepare examples data for the updater
      const examplesForUpdate = successfullyTestedExamples.map((example) => {
        const categoryName =
          example.category.charAt(0).toUpperCase() +
          example.category.slice(1).replace(/-/g, " ");

        return {
          category: example.category,
          contractPath: example.contractPath,
          testPath: example.testPath,
          categoryName,
          categoryDescription: `Examples for ${categoryName}`,
        };
      });

      // Use the robust updater
      addExamplesToCategories(categoriesConfigPath, examplesForUpdate);

      // Validate the result
      if (!validateCategoriesConfigSyntax(categoriesConfigPath)) {
        throw new Error("Generated config failed validation");
      }

      // Check for new categories and create READMEs
      for (const [category] of examplesByCategory.entries()) {
        const categoryDocsDir = path.join(rootDir, "docs", category);
        const categoryReadmePath = path.join(categoryDocsDir, "README.md");

        if (!fs.existsSync(categoryReadmePath)) {
          // Ensure the directory exists
          if (!fs.existsSync(categoryDocsDir)) {
            fs.mkdirSync(categoryDocsDir, { recursive: true });
          }

          const categoryName =
            category.charAt(0).toUpperCase() +
            category.slice(1).replace(/-/g, " ");

          // Create README.md with just the title
          const readmeContent = `# ${categoryName}\n`;
          fs.writeFileSync(categoryReadmePath, readmeContent);
          logger.log(`  Created README.md for category: ${category}`);
          newCategories.push(category);
        }
      }

      logger.success("Updated categories-config.ts");
    } catch (error: any) {
      logger.error(`Failed to update categories-config.ts: ${error.message}`);
      logger.warning("Config file was not updated to prevent corruption");
      throw error;
    }
  }

  // Update examples-config.ts
  let configContent = originalConfigContent;
  const newEntries = successfullyTestedExamples
    .map(generateConfigEntry)
    .join("\n");

  // Find the closing brace of EXAMPLES_MAP and insert before it
  const mapEndIndex = configContent.lastIndexOf("};");
  if (mapEndIndex === -1) {
    logger.error("Could not find EXAMPLES_MAP end in config file");
    return;
  }

  // Insert new entries before the closing brace
  const before = configContent.substring(0, mapEndIndex);
  const after = configContent.substring(mapEndIndex);

  // Add comma to last existing entry if needed
  const trimmedBefore = before.trimEnd();
  const needsComma =
    !trimmedBefore.endsWith(",") && !trimmedBefore.endsWith("{");
  const comma = needsComma ? "," : "";

  configContent = before + comma + "\n" + newEntries + "\n" + after;
  fs.writeFileSync(configPath, configContent);

  // Update docs-config.ts if it exists
  if (originalDocsConfigContent) {
    let docsConfigContent = originalDocsConfigContent;
    const newDocsEntries = successfullyTestedExamples
      .map(generateDocsConfigEntry)
      .join("\n");

    const docsMapEndIndex = docsConfigContent.lastIndexOf("};");
    if (docsMapEndIndex !== -1) {
      const docsBefore = docsConfigContent.substring(0, docsMapEndIndex);
      const docsAfter = docsConfigContent.substring(docsMapEndIndex);
      const docsNeedsComma =
        !docsBefore.trimEnd().endsWith(",") &&
        !docsBefore.trimEnd().endsWith("{");
      const docsComma = docsNeedsComma ? "," : "";
      docsConfigContent =
        docsBefore + docsComma + "\n" + newDocsEntries + "\n" + docsAfter;
      fs.writeFileSync(docsConfigPath, docsConfigContent);
    }
  }

  logger.success(
    `Configuration files updated with ${successfullyTestedExamples.length} new example(s)!`
  );
  logger.log("");

  // Generate docs only for examples that don't have docs yet
  logger.step("Checking and generating documentation...");
  logger.log("");

  let docsGenerated = 0;
  let docsSkipped = 0;

  for (const example of successfullyTestedExamples) {
    try {
      // Use nested path structure matching the contract/test folder structure
      const outputFile = deriveOutputPath(example.contractPath);
      const outputPath = path.join(rootDir, outputFile);

      // Check if docs already exist
      if (fs.existsSync(outputPath)) {
        logger.dim(`  ⊘ ${example.exampleKey} (docs already exist)`);
        docsSkipped++;
        continue;
      }

      // Read contract and test files
      const contractContent = fs.readFileSync(
        path.join(rootDir, example.contractPath),
        "utf-8"
      );
      const testContent = fs.readFileSync(
        path.join(rootDir, example.testPath),
        "utf-8"
      );

      // Extract contract name
      const contractNameMatch = contractContent.match(/^\s*contract\s+(\w+)/m);
      const contractName = contractNameMatch
        ? contractNameMatch[1]
        : "Contract";

      // Generate markdown using the same format as generate-docs.ts
      let markdown = `${example.description}\n\n`;
      markdown += `{% hint style="info" %}\n`;
      markdown += `To run this example correctly, make sure the files are placed in the following directories:\n\n`;
      markdown += `- \`.sol\` file → \`<your-project-root-dir>/contracts/\`\n`;
      markdown += `- \`.ts\` file → \`<your-project-root-dir>/test/\`\n\n`;
      markdown += `This ensures Hardhat can compile and test your contracts as expected.\n`;
      markdown += `{% endhint %}\n\n`;
      markdown += `{% tabs %}\n\n`;
      markdown += `{% tab title="${contractName}.sol" %}\n\n`;
      markdown += `\`\`\`solidity\n${contractContent}\n\`\`\`\n\n`;
      markdown += `{% endtab %}\n\n`;
      markdown += `{% tab title="${path.basename(example.testPath)}" %}\n\n`;
      markdown += `\`\`\`typescript\n${testContent}\n\`\`\`\n\n`;
      markdown += `{% endtab %}\n\n`;
      markdown += `{% endtabs %}\n`;

      // Ensure docs directory exists (with nested structure)
      const docsDir = path.dirname(outputPath);
      if (!fs.existsSync(docsDir)) {
        fs.mkdirSync(docsDir, { recursive: true });
      }

      fs.writeFileSync(outputPath, markdown);
      docsGenerated++;
      logger.dim(`  ✓ ${example.exampleKey}`);
    } catch (docError) {
      logger.dim(
        `  ✗ ${example.exampleKey} (${
          docError instanceof Error ? docError.message : "failed"
        })`
      );
    }
  }

  if (docsGenerated > 0) {
    logger.success(
      `Generated documentation for ${docsGenerated} new example(s)!`
    );
  }
  if (docsSkipped > 0) {
    logger.info(`Skipped ${docsSkipped} example(s) (docs already exist)`);
  }
  logger.log("");

  // Also check ALL existing examples for missing docs
  logger.step("Checking all existing examples for missing documentation...");
  logger.log("");

  const { EXAMPLES_MAP } = require("../utils/examples-config");
  let existingDocsGenerated = 0;
  let existingDocsSkipped = 0;

  for (const [exampleKey, example] of Object.entries(EXAMPLES_MAP) as Array<
    [string, ExampleConfig]
  >) {
    try {
      const outputFile = deriveOutputPath(example.contract);
      const outputPath = path.join(rootDir, outputFile);

      if (fs.existsSync(outputPath)) {
        existingDocsSkipped++;
        continue;
      }

      // Doc is missing, generate it
      const contractPath = path.join(rootDir, example.contract);
      const testPath = path.join(rootDir, example.test);

      if (!fs.existsSync(contractPath) || !fs.existsSync(testPath)) {
        logger.dim(`  ⊘ ${exampleKey} (contract or test missing)`);
        continue;
      }

      const contractContent = fs.readFileSync(contractPath, "utf-8");
      const testContent = fs.readFileSync(testPath, "utf-8");

      const contractNameMatch = contractContent.match(/^\s*contract\s+(\w+)/m);
      const contractName = contractNameMatch
        ? contractNameMatch[1]
        : "Contract";

      let markdown = `${example.description}\n\n`;
      markdown += `{% hint style="info" %}\n`;
      markdown += `To run this example correctly, make sure the files are placed in the following directories:\n\n`;
      markdown += `- \`.sol\` file → \`<your-project-root-dir>/contracts/\`\n`;
      markdown += `- \`.ts\` file → \`<your-project-root-dir>/test/\`\n\n`;
      markdown += `This ensures Hardhat can compile and test your contracts as expected.\n`;
      markdown += `{% endhint %}\n\n`;
      markdown += `{% tabs %}\n\n`;
      markdown += `{% tab title="${contractName}.sol" %}\n\n`;
      markdown += `\`\`\`solidity\n${contractContent}\n\`\`\`\n\n`;
      markdown += `{% endtab %}\n\n`;
      markdown += `{% tab title="${path.basename(example.test)}" %}\n\n`;
      markdown += `\`\`\`typescript\n${testContent}\n\`\`\`\n\n`;
      markdown += `{% endtab %}\n\n`;
      markdown += `{% endtabs %}\n`;

      const docsDir = path.dirname(outputPath);
      if (!fs.existsSync(docsDir)) {
        fs.mkdirSync(docsDir, { recursive: true });
      }

      fs.writeFileSync(outputPath, markdown);
      existingDocsGenerated++;
      logger.dim(`  ✓ ${exampleKey} (regenerated)`);
    } catch (docError) {
      logger.dim(
        `  ✗ ${exampleKey} (${
          docError instanceof Error ? docError.message : "failed"
        })`
      );
    }
  }

  if (existingDocsGenerated > 0) {
    logger.success(
      `Regenerated documentation for ${existingDocsGenerated} existing example(s)!`
    );
  }
  if (existingDocsSkipped > 0 && existingDocsGenerated === 0) {
    logger.info(`All existing examples already have documentation.`);
  }
  logger.log("");

  // Additional info for failed examples (if any)
  if (failedExamples.length > 0) {
    logger.info(
      "Please fix the issues with the failed examples and run discover again to add them."
    );
    logger.log("");
  }

  logger.info("Next steps:");
  logger.log("  - New examples are now available in the CLI");
  logger.log(
    `  - You can generate them with: ${kleur.cyan(
      "npm run cli example <name>"
    )}`
  );
  logger.log(`  - Documentation has been generated in the docs/ folder`);

  // Remind user to update README.md for new categories
  if (newCategories.length > 0) {
    logger.log("");
    logger.warning(`⚠ New category documentation created:`);
    newCategories.forEach((category) => {
      const categoryName =
        category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, " ");
      logger.log(`  - ${kleur.cyan(`docs/${category}/README.md`)}`);
    });
    logger.log("");
    logger.info("Please update the README.md file(s) above with:");
    logger.info("  - A description of the category");
    logger.info("  - References to relevant FHEVM documentation");
    logger.info("  - A list of examples with links to their documentation");
    logger.log("");
  }
}
