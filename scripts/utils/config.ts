/**
 * Shared configuration types and constants
 */

// Example configuration interface
export interface ExampleConfig {
  contract: string;
  test: string;
  testFixture?: string;
  description: string;
  category?: string; // Category key (e.g., 'basic', 'auctions')
}

// Contract item interface for categories
export interface ContractItem {
  path: string;
  test: string;
  fixture?: string;
  additionalFiles?: string[];
}

// Category configuration interface
export interface CategoryConfig {
  name: string;
  description: string;
  contracts: ContractItem[];
  additionalDeps?: Record<string, string>;
}

// Documentation configuration interface
export interface DocsConfig {
  title: string;
  description: string;
  contract: string;
  test: string;
  output: string;
  category: string;
}

