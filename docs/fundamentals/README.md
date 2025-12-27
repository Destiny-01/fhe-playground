# Fundamentals

This section contains fundamental examples covering core FHEVM operations and concepts. These examples demonstrate the building blocks needed to work with fully homomorphic encryption in smart contracts.

## Overview

The fundamentals category covers essential FHE operations including:

- **Boolean Logic** - AND, OR, XOR, and NOT operations on encrypted values
- **Comparisons** - Equality, greater than, less than, and related comparison operations
- **Arithmetic Operations** - Addition, subtraction, multiplication on encrypted values
- **Conditionals** - If-then-else and select operations for conditional logic
- **Permissions** - Access control and permission management for encrypted data
- **Encryption Patterns** - Common patterns for working with encrypted data
- **Handle Lifecycle** - Managing the lifecycle of encrypted value handles

These examples provide the foundation for building more complex privacy-preserving applications.

## Documentation References

- **FHEVM Documentation**: [FHEVM Guide](https://docs.zama.org/protocol/solidity-guides)
- **Operations**: [FHE Operations](https://docs.zama.org/protocol/solidity-guides/smart-contract/operations)
- **Type System**: [Encrypted Types](https://docs.zama.org/protocol/solidity-guides/smart-contract/types)

## Examples by Subcategory

### Boolean Logic

- **[FHE AND](fhe-boolean-logic/fheand.md)** - Performs AND operation on encrypted boolean values
- **[FHE OR](fhe-boolean-logic/fheor.md)** - Performs OR operation on encrypted boolean values
- **[FHE XOR](fhe-boolean-logic/fhexor.md)** - Performs XOR operation on encrypted boolean values
- **[FHE NOT](fhe-boolean-logic/fhenot.md)** - Performs NOT operation on encrypted boolean values

### Comparisons

- **[FHE Equal](fhe-comparisons/fheequal.md)** - Checks if two encrypted values are equal
- **[FHE Greater Than](fhe-comparisons/fhegreater-than.md)** - Compares if one encrypted value is greater than another
- **[FHE Greater Than Or Equal](fhe-comparisons/fhegreater-than-or-equal.md)** - Compares if one encrypted value is greater than or equal to another
- **[FHE Less Than](fhe-comparisons/fheless-than.md)** - Compares if one encrypted value is less than another
- **[FHE Less Than Or Equal](fhe-comparisons/fheless-than-or-equal.md)** - Compares if one encrypted value is less than or equal to another

### Arithmetic Operations

- **[FHE Multiply](fhe-operations/fhemultiply.md)** - Multiplies two encrypted values
- **[FHE Subtract](fhe-operations/fhesubtract.md)** - Subtracts one encrypted value from another

### Conditionals

- **[FHE Select](fhe-conditionals/fheselect.md)** - Selects between two encrypted values based on an encrypted condition

### Permissions

- **[FHE Access Control](fhe-permissions/fheaccess-control.md)** - Demonstrates access control and permission management for encrypted data

### Encryption Patterns

- **[FHE Encryption Patterns](fhe-encryption-patterns/fheencryption-patterns.md)** - Common patterns for working with encrypted data

### Handle Lifecycle

- **[FHE Handle Lifecycle](fhe-handle-lifecycle/fhehandle-lifecycle.md)** - Managing the lifecycle of encrypted value handles
