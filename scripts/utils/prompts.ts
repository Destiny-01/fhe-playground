/**
 * Interactive prompt utilities using readline
 */

import * as readline from 'readline';
import { logger } from './logger';
import * as kleur from 'kleur';

/**
 * Create readline interface
 */
function createInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Ask a question and return the answer
 */
export function askQuestion(question: string): Promise<string> {
  const rl = createInterface();

  return new Promise((resolve) => {
    rl.question(kleur.cyan(`? `) + question + ' ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Ask for confirmation (yes/no)
 */
export async function askConfirmation(
  question: string,
  defaultValue = true
): Promise<boolean> {
  const defaultText = defaultValue ? 'Y/n' : 'y/N';
  const answer = await askQuestion(`${question} ${kleur.dim(`(${defaultText})`)}`);
  
  if (!answer) {
    return defaultValue;
  }

  const normalized = answer.toLowerCase();
  return normalized === 'y' || normalized === 'yes';
}

/**
 * Ask user to select from options
 */
export async function selectOption<T extends string>(
  question: string,
  options: Array<{ value: T; label: string; description?: string }>,
  allowBack: boolean = false
): Promise<T | null> {
  logger.log('');
  logger.highlight(question);
  logger.log('');

  // Show back option if enabled
  if (allowBack) {
    const backLabel = kleur.bold('Go Back');
    logger.log(`  ${kleur.cyan('0')}. ${backLabel}`);
  }

  options.forEach((option, index) => {
    const num = kleur.cyan(`${index + 1}`);
    const label = kleur.bold(option.label);
    const desc = option.description ? kleur.dim(` - ${option.description}`) : '';
    logger.log(`  ${num}. ${label}${desc}`);
  });

  logger.log('');

  const maxOption = options.length;
  const rangeText = allowBack ? `0-${maxOption}` : `1-${maxOption}`;

  while (true) {
    const answer = await askQuestion(`Select option ${kleur.dim(`(${rangeText})`)}`);
    const index = parseInt(answer, 10);

    // Handle back option (0)
    if (allowBack && index === 0) {
      return null;
    }

    // Handle regular options (1-N)
    const optionIndex = index - 1;
    if (optionIndex >= 0 && optionIndex < options.length) {
      return options[optionIndex].value;
    }

    logger.warning('Invalid selection. Please try again.');
  }
}

