# Input Proofs Examples

This section contains examples demonstrating how to use input proofs with FHEVM. Input proofs are zero-knowledge proofs that verify encrypted inputs are within valid ranges without revealing the actual values.

## Overview

The input proof examples cover:

- **Basic Input Proofs** - Fundamental concepts of input proof validation
- **Error Handling** - How to handle invalid input proofs and edge cases
- **Multi-Input Validation** - Validating multiple encrypted inputs in a single operation

Input proofs are essential for ensuring that encrypted values submitted to contracts are within expected ranges (e.g., 0-255 for euint8) without revealing the actual values.

## Documentation References

- **FHEVM Documentation**: [Input Proofs Guide](https://docs.zama.org/protocol/solidity-guides/smart-contract/input-proofs)
- **FHE Library**: [@fhevm/solidity FHE Library](https://docs.zama.org/protocol/solidity-guides)
- **Relayer SDK**: [FHEVM Relayer SDK](https://docs.zama.org/protocol/relayer-sdk-guides/fhevm-relayer/input)

## Examples

- **[Input Proof Basics](input-proof-basics.md)** - Demonstrates basic input proof validation and how to accept encrypted inputs from users
- **[Input Proof Error Handling](input-proof-error-handling.md)** - Shows how to handle invalid input proofs and common error scenarios
- **[Multi-Input Validation](multi-input-validation.md)** - Validates multiple encrypted inputs in a single transaction with proper error handling

## Key Concepts

### Input Proof Validation

Input proofs ensure that:
- Encrypted values are within valid ranges for their type
- Values haven't been tampered with
- The encryption was performed correctly
- The proof is cryptographically valid

### Range Validation

Different encrypted types have different valid ranges:
- `euint8`: 0 to 255
- `euint16`: 0 to 65,535
- `euint32`: 0 to 4,294,967,295
- `euint64`: 0 to 18,446,744,073,709,551,615

Input proofs verify values are within these ranges without revealing the actual values.

### Error Handling

When input proofs are invalid:
- Contracts should revert with appropriate error messages
- Users should be able to understand why their input was rejected
- Contracts should handle edge cases gracefully
