# Identity Examples

This section contains examples demonstrating how to build privacy-preserving identity verification systems using FHEVM. These examples show how sensitive personal information can be verified without revealing the actual data.

## Overview

The identity examples cover various identity verification use cases:

- **Age Verification** - Verify users meet minimum age requirements without revealing exact age
- **Credit Score Checks** - Check credit scores against thresholds while keeping scores private
- **Encrypted KYC** - Know Your Customer verification with encrypted personal data

These examples demonstrate how FHEVM enables privacy-preserving identity systems where verification can occur without exposing sensitive personal information.

## Documentation References

- **FHEVM Documentation**: [FHEVM Guide](https://docs.zama.org/protocol/solidity-guides)
- **FHE Library**: [@fhevm/solidity FHE Library](https://docs.zama.org/protocol/solidity-guides)
- **Permissions**: [FHE Permissions](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl)
- **Input Proofs**: [Input Proofs Guide](https://docs.zama.org/protocol/solidity-guides/smart-contract/input-proofs)

## Examples

- **[Age Verification](age-verification.md)** - Verify users meet minimum age requirements without revealing their exact age
- **[Credit Score Check](credit-score-check.md)** - Check if credit scores meet thresholds while keeping the actual score private
- **[Encrypted KYC](encrypted-kyc.md)** - Comprehensive Know Your Customer verification with encrypted personal information

## Key Concepts

### Threshold Verification

Many identity examples use threshold-based verification where:
1. Users submit encrypted personal data (age, credit score, etc.)
2. The contract compares the encrypted value against a threshold
3. Returns an encrypted boolean result indicating if the threshold is met
4. Only the user can decrypt the result, maintaining privacy

### Privacy-Preserving Checks

Identity verification with FHEVM allows:
- Verification without revealing actual values
- Users maintain control over their personal data
- Compliance with privacy regulations
- Transparent verification processes

### Encrypted Comparisons

Identity checks often require comparing encrypted values to thresholds:
- Using `FHE.gt()` or `FHE.gte()` for threshold checks
- Proper permission setup for comparison results
- Allowing users to decrypt verification results
