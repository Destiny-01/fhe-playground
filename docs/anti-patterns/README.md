# Anti-Patterns

This section contains examples of common mistakes and anti-patterns when developing with FHEVM. These examples demonstrate what NOT to do and explain why certain patterns can lead to errors, security issues, or unexpected behavior.

## Overview

Anti-pattern examples help developers:

- Identify common mistakes when working with FHE operations
- Understand why certain patterns fail
- Learn best practices by seeing what to avoid
- Recognize potential gas limit issues with FHE operations

These examples highlight common pitfalls including incorrect permission setup, gas limit problems, and improper use of view functions with encrypted data.

## Documentation References

- **FHEVM Documentation**: [Best Practices](https://docs.zama.ai/protocol/solidity-guides)
- **Permissions**: [FHE Permissions](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl)

## Examples

- **[View Function Anti-Pattern](view-function-anti-pattern.md)** - Shows incorrect usage of view functions with encrypted data and explains why it fails
- **[Gas Limit Pitfalls](gas-limit-pitfalls.md)** - Demonstrates how FHE operations can exceed block gas limits and shows patterns to avoid this issue
- **[Incorrect Reencryption](incorrect-reencryption.md)** - Common mistakes when reencrypting values and how to properly handle reencryption
- **[Missing Permission Anti-Pattern](missing-permission-anti-pattern.md)** - Demonstrates what happens when you forget FHE.allowThis() and how to properly set up permissions
- **[State Management Mistakes](state-management-mistakes.md)** - Common pitfalls when managing encrypted state variables and how to avoid losing permissions
