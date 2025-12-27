# Decryption Examples

This section contains examples demonstrating how to decrypt encrypted values using FHEVM. Decryption allows users or contracts to retrieve the plaintext value from encrypted data, provided they have the necessary permissions.

## Overview

The decryption examples cover two main approaches:

- **User Decryption** - Allows specific users to decrypt values they have permission to access
- **Public Decryption** - Allows anyone to decrypt publicly decryptable values

These examples demonstrate proper permission setup and common pitfalls when working with decryption.

## Documentation References

- **FHEVM Documentation**: [Decryption Guide](https://docs.zama.org/protocol/solidity-guides/smart-contract/oracle)
- **FHE Library**: [@fhevm/solidity FHE Library](https://docs.zama.org/protocol/solidity-guides)
- **Permissions**: [FHE Permissions](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl)

## Examples

- **[User Decrypt Single Value](user-decrypt-single-value.md)** - Demonstrates user decryption of a single encrypted value with proper permission setup
- **[User Decrypt Multiple Values](user-decrypt-multiple-values.md)** - Shows how to decrypt multiple encrypted values in a single operation
- **[Public Decrypt Single Value](public-decrypt-single-value.md)** - Example of public decryption for a single value
- **[Public Decrypt Multiple Values](public-decrypt-multiple-values.md)** - Demonstrates public decryption for multiple values
