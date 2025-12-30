# Gaming Examples

This section contains examples demonstrating how to build provably fair gaming applications using FHEVM. These examples show how encrypted values can be used to create transparent and fair gaming experiences while maintaining privacy.

## Overview

The gaming examples cover various game mechanics that leverage fully homomorphic encryption:

- **Commit-Reveal Games** - Games where players commit encrypted choices that are revealed later
- **Provably Fair Randomness** - Using encrypted random number generation for fairness verification
- **Private Lotteries** - Lotteries with encrypted tickets and winning numbers
- **Card Games** - Evaluating game outcomes with encrypted cards

These examples demonstrate how FHEVM enables trustless gaming applications where fairness can be verified without revealing sensitive information until the appropriate time.

## Documentation References

- **FHEVM Documentation**: [FHEVM Guide](https://docs.zama.org/protocol/solidity-guides)
- **FHE Library**: [@fhevm/solidity FHE Library](https://docs.zama.org/protocol/solidity-guides)
- **Permissions**: [FHE Permissions](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl)
- **Input Proofs**: [Input Proofs Guide](https://docs.zama.org/protocol/solidity-guides/smart-contract/input-proofs)

## Examples

- **[Rock Paper Scissors](rock-paper-scissors.md)** - A commit-reveal Rock-Paper-Scissors game where players submit encrypted choices that are compared to determine the winner
- **[Encrypted Dice](encrypted-dice.md)** - Provably fair dice rolling using encrypted random number generation
- **[Poker Hand](poker-hand.md)** - Poker hand evaluation with encrypted cards, demonstrating how to work with multiple encrypted values
- **[Private Lottery](private-lottery.md)** - A private lottery system with encrypted tickets and winning numbers, showing how to compare encrypted values to determine winners

## Key Concepts

### Commit-Reveal Pattern

Many gaming examples use a commit-reveal pattern where:
1. Players commit encrypted choices/values
2. Once all commitments are made, values are made publicly decryptable
3. Results are computed and verified using decryption proofs

This ensures fairness by preventing players from seeing each other's choices before committing.

### Provably Fair Randomness

Encrypted random number generation allows for provably fair games where:
- Random values are generated on-chain in encrypted form
- Values are made publicly decryptable for verification
- Anyone can verify the randomness was fair by checking the decryption proof

### Encrypted Comparisons

Gaming applications often need to compare encrypted values (e.g., ticket numbers vs winning number). This requires:
- Proper permission setup using `FHE.allowThis()` before comparisons
- Understanding how encrypted equality checks work
- Managing permissions for both operands in comparisons
