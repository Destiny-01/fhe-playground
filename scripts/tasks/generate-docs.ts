/**
 * Generate docs task - generates GitBook-formatted documentation from contracts and tests
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';
import { readFile, writeFile, ensureDirectory } from '../utils/files';
import { EXAMPLES_CONFIG } from '../utils/docs-config';
import { DocsConfig } from '../utils/config';

/**
 * Get contract name from content
 */
function getContractName(content: string): string {
  const match = content.match(/^\s*contract\s+(\w+)(?:\s+is\s+|\s*\{)/m);
  return match ? match[1] : 'Contract';
}

/**
 * Extract title and description from @title tag and @notice/@description
 */
function extractTitle(content: string): { title: string; description: string; longDescription: string } {
  // Look for @title in the first comment block (can be /// or /** */ format)
  const titleMatch = content.match(/\/\/\/\s*@title\s+(.+?)(?:\n|$)/) || 
                     content.match(/\/\*\*[\s\S]*?@title\s+(.+?)(?:\n|[\s\S]*?\*\/)/);
  
  let title = '';
  let shortDescription = '';
  
  if (titleMatch) {
    const titleLine = titleMatch[1].trim();
    // Check if title contains description separated by dash
    const parts = titleLine.split(/\s*-\s*/);
    if (parts.length > 1) {
      title = parts[0].trim();
      shortDescription = parts.slice(1).join(' - ').trim();
    } else {
      title = titleLine;
      shortDescription = titleLine;
    }
  }
  
  // Look for @notice or @description for longer description (in the contract's first comment block)
  let longDescription = '';
  const lines = content.split('\n');
  
  // Find @notice in /// format
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const noticeMatch = line.match(/\/\/\/\s*@notice\s+(.+)/);
    if (noticeMatch) {
      let description = noticeMatch[1].trim();
      // Collect continuation lines (/// that don't have @ tags)
      let j = i + 1;
      while (j < lines.length && lines[j].trim().startsWith('///') && !lines[j].match(/\/\/\/\s*@/)) {
        const continuation = lines[j].replace(/\/\/\/\s*/, '').trim();
        if (continuation) {
          description += ' ' + continuation;
        }
        j++;
      }
      longDescription = description.trim();
      break;
    }
  }
  
  // If not found in /// format, try /** */ format
  if (!longDescription) {
    const noticeMatch = content.match(/\/\*\*[\s\S]*?@notice\s+([\s\S]+?)(?:\*\s*@|\*\/)/);
    const descMatch = content.match(/\/\*\*[\s\S]*?@description\s+([\s\S]+?)(?:\*\s*@|\*\/)/);
    
    if (noticeMatch) {
      longDescription = noticeMatch[1].trim().replace(/\*\s*/g, '').replace(/\n\s+/g, ' ').trim();
    } else if (descMatch) {
      longDescription = descMatch[1].trim().replace(/\*\s*/g, '').replace(/\n\s+/g, ' ').trim();
    }
  }
  
  return { title, description: shortDescription, longDescription };
}

/**
 * Extract description from content (fallback)
 */
function extractDescription(content: string): string {
  const titleInfo = extractTitle(content);
  if (titleInfo.longDescription) {
    return titleInfo.longDescription;
  }
  if (titleInfo.description) {
    return titleInfo.description;
  }
  
  const commentMatch = content.match(/\/\*\*\s*\n\s*\*\s*(.+?)\s*\n/);
  const noticeMatch = content.match(/@notice\s+(.+)/);

  return commentMatch ? commentMatch[1] : noticeMatch ? noticeMatch[1] : '';
}

/**
 * Interface for code explanations
 */
interface CodeExplanation {
  explanation: string;
  codeBlock: string;
  startLine: number;
  endLine: number;
}

/**
 * Truncate explanation to about 2 lines (not strict)
 */
function truncateExplanation(explanation: string): string {
  const sentences = explanation.split(/[.!?]\s+/).filter(s => s.trim());
  if (sentences.length <= 2) {
    return explanation;
  }
  // Take first 2 sentences, roughly 2 lines
  return sentences.slice(0, 2).join('. ') + '.';
}

/**
 * Extract @dev comments from TypeScript test files
 */
function extractExplanationsFromTest(testContent: string): CodeExplanation[] {
  const explanations: CodeExplanation[] = [];
  const lines = testContent.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Match // @dev (TypeScript comment format)
    let explainMatch = line.match(/\/\/\s*@dev\s+(.+)/);
    let explanation = explainMatch ? explainMatch[1].trim() : '';
    let lastCommentLine = i;
    
    // If we found @dev, check for continuation lines
    if (explanation) {
      let j = i + 1;
      while (j < lines.length && lines[j].trim().startsWith('//') && !lines[j].match(/\/\/\s*@/)) {
        const continuation = lines[j].replace(/\/\/\s*/, '').trim();
        if (continuation) {
          explanation += ' ' + continuation;
        }
        lastCommentLine = j;
        j++;
      }
      i = j - 1;
    }
    
    if (explanation) {
      explanation = truncateExplanation(explanation);
      
      // Find the code block that follows (test case, function, etc.)
      let codeStart = lastCommentLine + 1;
      while (codeStart < lines.length && 
             (lines[codeStart].trim() === '' || 
              lines[codeStart].trim().startsWith('//'))) {
        codeStart++;
      }
      
      if (codeStart < lines.length) {
        // For tests, find the test case or function block
        let codeEnd = codeStart;
        let braceCount = 0;
        let inBlock = false;
        
        // Check if it's a test case or function
        if (lines[codeStart].match(/^\s*(it|describe|before|beforeEach|after|afterEach|async\s+function|function)\s*\(/)) {
          inBlock = true;
        }
        
        if (inBlock) {
          for (let j = codeStart; j < lines.length; j++) {
            const openBraces = (lines[j].match(/{/g) || []).length;
            const closeBraces = (lines[j].match(/}/g) || []).length;
            braceCount += openBraces - closeBraces;
            
            if (braceCount === 0 && j > codeStart) {
              codeEnd = j;
              break;
            }
          }
        } else {
          // For single statements
          for (let j = codeStart; j < lines.length; j++) {
            if (lines[j].includes(';') || lines[j].includes('}')) {
              codeEnd = j;
              break;
            }
            if (j > codeStart && (lines[j].match(/@dev/) || lines[j].match(/^\s*(it|describe|function)/))) {
              codeEnd = j - 1;
              break;
            }
          }
        }
        
        const codeBlock = lines.slice(codeStart, codeEnd + 1).join('\n');
        
        if (codeBlock.trim()) {
          explanations.push({
            explanation,
            codeBlock: codeBlock.trim(),
            startLine: codeStart + 1,
            endLine: codeEnd + 1
          });
        }
      }
    }
  }
  
  return explanations;
}

/**
 * Extract @dev comments and their associated code blocks
 */
function extractExplanations(contractContent: string): CodeExplanation[] {
  const explanations: CodeExplanation[] = [];
  const lines = contractContent.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Match /// @dev (single line or start of multi-line)
    let explainMatch = line.match(/\/\/\/\s*@dev\s+(.+)/);
    let explanation = explainMatch ? explainMatch[1].trim() : '';
    let lastCommentLine = i;
    
    // If we found @dev, check for continuation lines (/// lines that continue the explanation)
    if (explanation) {
      let j = i + 1;
      // Collect continuation lines (/// that don't have @dev)
      while (j < lines.length && lines[j].trim().startsWith('///') && !lines[j].match(/\/\/\/\s*@/)) {
        const continuation = lines[j].replace(/\/\/\/\s*/, '').trim();
        if (continuation) {
          explanation += ' ' + continuation;
        }
        lastCommentLine = j;
        j++;
      }
      // Skip the continuation lines we just processed
      i = j - 1;
    }
    
    // Match /** @dev (start of multi-line comment block)
    if (!explanation && line.match(/\/\*\*\s*@dev\s+(.+)/)) {
      explainMatch = line.match(/\/\*\*\s*@dev\s+(.+)/);
      if (explainMatch) {
        explanation = explainMatch[1].trim();
        // Collect continuation lines in the comment block
        let j = i + 1;
        while (j < lines.length && !lines[j].match(/\*\//)) {
          const continuation = lines[j].replace(/^\s*\*\s*/, '').trim();
          if (continuation && !continuation.match(/^@/)) {
            explanation += ' ' + continuation;
          }
          lastCommentLine = j;
          j++;
        }
        // Remove trailing */ if present
        explanation = explanation.replace(/\s*\*\/\s*$/, '').trim();
        // Skip past the closing */
        if (j < lines.length && lines[j].match(/\*\//)) {
          lastCommentLine = j;
          i = j;
        }
      }
    }
    
    if (explanation) {
      
      // Find the code block that follows this comment
      // Skip empty lines and comments until we find actual code
      let codeStart = lastCommentLine + 1;
      while (codeStart < lines.length && 
             (lines[codeStart].trim() === '' || 
              lines[codeStart].trim().startsWith('//') ||
              lines[codeStart].trim().startsWith('*'))) {
        codeStart++;
      }
      
      if (codeStart < lines.length) {
        // Determine the code block - could be a function, a statement, or multiple lines
        let codeEnd = codeStart;
        let braceCount = 0;
        let inFunction = false;
        
        // Check if it's a function (starts with function keyword)
        if (lines[codeStart].match(/^\s*(function|constructor|modifier|event|struct|enum|mapping|using)\s+/)) {
          inFunction = true;
        }
        
        // For functions, find the matching closing brace
        if (inFunction) {
          for (let j = codeStart; j < lines.length; j++) {
            const openBraces = (lines[j].match(/{/g) || []).length;
            const closeBraces = (lines[j].match(/}/g) || []).length;
            braceCount += openBraces - closeBraces;
            
            if (braceCount === 0 && j > codeStart) {
              codeEnd = j;
              break;
            }
          }
        } else {
          // For single/multi-line statements, find the next semicolon or closing brace
          for (let j = codeStart; j < lines.length; j++) {
            if (lines[j].includes(';') || lines[j].includes('}')) {
              codeEnd = j;
              break;
            }
            // If we hit another @dev or function declaration, stop
            if (j > codeStart && (lines[j].match(/@dev/) || lines[j].match(/^\s*(function|constructor)/))) {
              codeEnd = j - 1;
              break;
            }
          }
        }
        
        // Extract the code block
        const codeBlock = lines.slice(codeStart, codeEnd + 1).join('\n');
        
        if (codeBlock.trim() && explanation) {
          // Truncate explanation to about 2 lines
          const truncatedExplanation = truncateExplanation(explanation);
          explanations.push({
            explanation: truncatedExplanation,
            codeBlock: codeBlock.trim(),
            startLine: codeStart + 1,
            endLine: codeEnd + 1
          });
        }
      }
    }
  }
  
  return explanations;
}

/**
 * Generate GitBook markdown content
 */
function generateGitBookMarkdown(
  config: Required<DocsConfig>,
  contractContent: string,
  testContent: string
): string {
  const contractName = getContractName(contractContent);
  
  // Use config title and description (already extracted in generateDocs)
  const title = config.title;
  const description = config.description;

  let markdown = '';
  
  // Add title if we have one
  if (title) {
    markdown += `# ${title}\n\n`;
  }
  
  // Add description (will be longer if @notice/@description is provided)
  markdown += `${description}\n\n`;

  // Add hint block with folder structure derived from contract path
  const contractDir = path.dirname(config.contract);
  const testDir = path.dirname(config.test);
  
  markdown += `{% hint style="info" %}\n`;
  markdown += `To run this example correctly, make sure the files are placed in the following directories:\n\n`;
  
  if (contractDir !== 'contracts' && contractDir !== '.') {
    markdown += `- \`.sol\` file → \`<your-project-root-dir>/${contractDir}/\`\n`;
  } else {
    markdown += `- \`.sol\` file → \`<your-project-root-dir>/contracts/\`\n`;
  }
  
  if (testDir !== 'test' && testDir !== '.') {
    markdown += `- \`.ts\` file → \`<your-project-root-dir>/${testDir}/\`\n`;
  } else {
    markdown += `- \`.ts\` file → \`<your-project-root-dir>/test/\`\n`;
  }
  
  markdown += `\nThis ensures Hardhat can compile and test your contracts as expected.\n`;
  markdown += `{% endhint %}\n\n`;

  // Add tabs for contract and test
  markdown += `{% tabs %}\n\n`;

  // Contract tab
  markdown += `{% tab title="${contractName}.sol" %}\n\n`;
  markdown += `\`\`\`solidity\n`;
  markdown += contractContent;
  markdown += `\n\`\`\`\n\n`;
  markdown += `{% endtab %}\n\n`;

  // Test tab
  const testFileName = path.basename(config.test);
  markdown += `{% tab title="${testFileName}" %}\n\n`;
  markdown += `\`\`\`typescript\n`;
  markdown += testContent;
  markdown += `\n\`\`\`\n\n`;
  markdown += `{% endtab %}\n\n`;

  markdown += `{% endtabs %}\n\n`;

  // Extract explanations from contract and test
  const contractExplanations = extractExplanations(contractContent);
  const testExplanations = extractExplanationsFromTest(testContent);
  
  // Only show section if we have explanations
  if (contractExplanations.length > 0 || testExplanations.length > 0) {
    markdown += `## Implementation Details\n\n`;
    markdown += `{% tabs %}\n\n`;
    
    // Contract explanations tab
    if (contractExplanations.length > 0) {
      markdown += `{% tab title="${contractName}.sol" %}\n\n`;
      contractExplanations.forEach((explanation, index) => {
        markdown += `### ${index + 1}. ${explanation.explanation}\n\n`;
        markdown += `\`\`\`solidity\n`;
        markdown += explanation.codeBlock;
        markdown += `\n\`\`\`\n\n`;
      });
      markdown += `{% endtab %}\n\n`;
    }
    
    // Test explanations tab
    if (testExplanations.length > 0) {
      markdown += `{% tab title="${testFileName}" %}\n\n`;
      testExplanations.forEach((explanation, index) => {
        markdown += `### ${index + 1}. ${explanation.explanation}\n\n`;
        markdown += `\`\`\`typescript\n`;
        markdown += explanation.codeBlock;
        markdown += `\n\`\`\`\n\n`;
      });
      markdown += `{% endtab %}\n\n`;
    }
    
    markdown += `{% endtabs %}\n\n`;
  }

  return markdown;
}

/**
 * Update SUMMARY.md with new documentation entry
 */
function updateSummary(exampleName: string, config: DocsConfig): void {
  const summaryPath = path.join(process.cwd(), 'docs', 'SUMMARY.md');

  if (!fs.existsSync(summaryPath)) {
    logger.warning('Creating new SUMMARY.md');
    const summary = `## Basic\n\n`;
    writeFile(summaryPath, summary);
  }

  const summary = readFile(summaryPath);
  const outputFileName = path.basename(config.output);
  const linkText = config.title;
  const link = `- [${linkText}](${outputFileName})`;

  // Check if already in summary
  if (summary.includes(outputFileName)) {
    logger.info('Example already in SUMMARY.md');
    return;
  }

  // Add to appropriate category
  const categoryHeader = `## ${config.category}`;
  let updatedSummary: string;

  if (summary.includes(categoryHeader)) {
    // Add under existing category
    const lines = summary.split('\n');
    const categoryIndex = lines.findIndex(
      (line) => line.trim() === categoryHeader
    );

    // Find next category or end
    let insertIndex = categoryIndex + 1;
    while (
      insertIndex < lines.length &&
      !lines[insertIndex].startsWith('##')
    ) {
      if (lines[insertIndex].trim() === '') {
        break;
      }
      insertIndex++;
    }

    lines.splice(insertIndex, 0, link);
    updatedSummary = lines.join('\n');
  } else {
    // Add new category
    updatedSummary = summary.trim() + `\n\n${categoryHeader}\n\n${link}\n`;
  }

  writeFile(summaryPath, updatedSummary);
  logger.success('Updated SUMMARY.md');
}

/**
 * Derive output path from contract path
 * contracts/fundamentals/fhe-operations/FHEAdd.sol -> docs/fundamentals/fhe-operations/fhe-add.md
 */
function deriveOutputPath(contractPath: string): string {
  // Remove contracts/ prefix
  let relativePath = contractPath.replace(/^contracts\//, '');
  
  // Get directory and filename
  const dirname = path.dirname(relativePath);
  const basename = path.basename(relativePath, '.sol');
  
  // Convert contract name to kebab-case for file name
  const kebabCase = basename
    .replace(/([a-z])([A-Z])/g, '$1-$2') // Insert hyphen between lowercase and uppercase
    .toLowerCase();
  
  // Construct output path
  if (dirname === '.' || dirname === '') {
    return `docs/${kebabCase}.md`;
  }
  return `docs/${dirname}/${kebabCase}.md`;
}

/**
 * Derive category from contract path
 * contracts/fundamentals/fhe-operations/FHEAdd.sol -> "Fundamentals - FHE Operations"
 */
function deriveCategory(contractPath: string): string {
  // Remove contracts/ prefix
  let relativePath = contractPath.replace(/^contracts\//, '');
  
  // Get directory
  const dirname = path.dirname(relativePath);
  
  if (dirname === '.' || dirname === '') {
    return 'Fundamentals';
  }
  
  // Convert path segments to title case with spaces
  const segments = dirname.split(path.sep);
  const category = segments
    .map(segment => {
      // Convert kebab-case or snake_case to Title Case
      return segment
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    })
    .join(' - ');
  
  return category;
}

/**
 * Generate documentation for a single example
 */
export function generateDocs(exampleName: string, updateSummaryFile = true): void {
  const config = EXAMPLES_CONFIG[exampleName];

  if (!config) {
    logger.error(
      `Unknown example: ${exampleName}\n\nAvailable examples:\n${Object.keys(
        EXAMPLES_CONFIG
      )
        .map((k) => `  - ${k}`)
        .join('\n')}`
    );
    return;
  }

  // Read contract file first to extract title and description
  const contractContent = readFile(path.join(process.cwd(), config.contract));
  
  // Auto-derive output path and category from contract path if not explicitly set
  const outputPath = config.output || deriveOutputPath(config.contract);
  const category = config.category || deriveCategory(config.contract);
  
  // Extract title and description from contract if not explicitly set
  const titleInfo = extractTitle(contractContent);
  const title = config.title || titleInfo.title || exampleName;
  const description = config.description || titleInfo.longDescription || titleInfo.description || '';
  
  // Create enhanced config with all required values (non-optional)
  const enhancedConfig: Required<DocsConfig> = {
    title,
    description,
    contract: config.contract,
    test: config.test,
    output: outputPath,
    category,
  };

  logger.info(`Generating documentation for: ${title}`);

  // Read test file
  const testContent = readFile(path.join(process.cwd(), config.test));

  // Generate GitBook markdown
  const markdown = generateGitBookMarkdown(
    enhancedConfig,
    contractContent,
    testContent
  );

  // Write output file
  const fullOutputPath = path.join(process.cwd(), enhancedConfig.output);
  ensureDirectory(path.dirname(fullOutputPath));
  writeFile(fullOutputPath, markdown);
  logger.success(`Documentation generated: ${enhancedConfig.output}`);

  // Update SUMMARY.md
  if (updateSummaryFile) {
    updateSummary(exampleName, enhancedConfig);
  }
}

/**
 * Generate documentation for all examples
 */
export function generateAllDocs(): void {
  logger.info('Generating documentation for all examples...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const exampleName of Object.keys(EXAMPLES_CONFIG)) {
    try {
      generateDocs(exampleName, false);
      successCount++;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.warning(`Failed to generate docs for ${exampleName}: ${errorMessage}`);
      errorCount++;
    }
  }

  // Update summary once at the end
  logger.info('\nUpdating SUMMARY.md...');
  for (const exampleName of Object.keys(EXAMPLES_CONFIG)) {
    const config = EXAMPLES_CONFIG[exampleName];
    updateSummary(exampleName, config);
  }

  logger.separator();
  logger.success(`Generated ${successCount} documentation files`);
  if (errorCount > 0) {
    logger.warning(`Failed: ${errorCount}`);
  }
  logger.separator();
}

