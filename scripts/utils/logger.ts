/**
 * Logger utility with beautiful, minimal formatting
 */

import * as kleur from 'kleur';

export const logger = {
  success: (message: string): void => {
    console.log(kleur.green('✓'), message);
  },

  error: (message: string): never => {
    console.error(kleur.red('✗'), message);
    process.exit(1);
  },

  info: (message: string): void => {
    console.log(kleur.blue('ℹ'), message);
  },

  warning: (message: string): void => {
    console.log(kleur.yellow('⚠'), message);
  },

  step: (message: string): void => {
    console.log(kleur.cyan('→'), message);
  },

  log: (message: string): void => {
    console.log(message);
  },

  dim: (message: string): void => {
    console.log(kleur.dim(message));
  },

  highlight: (message: string): void => {
    console.log(kleur.bold().cyan(message));
  },

  separator: (char: string = '─', length: number = 60): void => {
    console.log(kleur.gray(char.repeat(length)));
  },
};

