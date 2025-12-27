/**
 * Project execution utilities - running npm commands and testing projects
 */

import { execSync } from 'child_process';
import { logger } from './logger';

/**
 * Install dependencies, compile, and run tests in a project directory
 */
export function installAndTest(projectDir: string): void {
  logger.log('');
  logger.step('Installing dependencies...');
  
  try {
    execSync('npm install', {
      cwd: projectDir,
      stdio: 'inherit',
    });
    logger.success('Dependencies installed');
  } catch (error) {
    logger.error(`Failed to install dependencies: ${error}`);
  }

  logger.log('');
  logger.step('Compiling contracts...');
  
  try {
    execSync('npm run compile', {
      cwd: projectDir,
      stdio: 'inherit',
    });
    logger.success('Contracts compiled');
  } catch (error) {
    logger.warning(`Compilation failed: ${error}`);
    return;
  }

  logger.log('');
  logger.step('Running tests...');
  
  try {
    execSync('npm run test', {
      cwd: projectDir,
      stdio: 'inherit',
    });
    logger.success('Tests passed');
  } catch (error) {
    logger.warning(`Tests failed: ${error}`);
  }

  logger.log('');
  logger.info('Project setup complete!');
}

/**
 * Test generated example (compile and run tests) - used for validation
 */
export function testGeneratedExample(outputDir: string): { success: boolean; error?: string } {
  try {
    // Install dependencies first
    execSync('npm install', {
      cwd: outputDir,
      stdio: 'pipe',
      timeout: 120000,
    });

    // Compile contracts
    try {
      execSync('npm run compile', {
        cwd: outputDir,
        stdio: 'pipe',
        timeout: 60000,
      });
    } catch (compileError) {
      // Re-throw compilation errors - @dev is a valid NatSpec tag and shouldn't cause errors
        throw compileError;
    }

    // Run tests - capture output for debugging
    try {
      const testOutput = execSync('npm run test', {
        cwd: outputDir,
        stdio: 'pipe',
        timeout: 120000,
        encoding: 'utf-8',
      });
      // Log successful test output if needed
      if (testOutput && testOutput.length > 0) {
        // Tests passed
      }
    } catch (testError: any) {
      // Capture and log test error details
      const testErrorOutput = testError.stdout?.toString() || testError.stderr?.toString() || testError.message || String(testError);
      // Throw with more details
      throw new Error(`Test failed: ${testErrorOutput}`);
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}

