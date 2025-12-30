/**
 * Example configurations - centralized configuration data
 */

import { ExampleConfig } from "./config";

export const EXAMPLES_MAP: Record<string, ExampleConfig> = {
  "fhe-counter": {
    contract: "contracts/basic/FHECounter.sol",
    test: "test/basic/FHECounter.ts",
    description:
      "A simple FHE counter demonstrating basic encrypted operations",
    category: "basic",
  },
  "fhe-add": {
    contract: "contracts/basic/fhe-operations/FHEAdd.sol",
    test: "test/basic/fhe-operations/FHEAdd.ts",
    description: "Demonstrates FHE addition operations",
    category: "basic",
  },
  "fhe-if-then-else": {
    contract: "contracts/basic/fhe-operations/FHEIfThenElse.sol",
    test: "test/basic/fhe-operations/FHEIfThenElse.ts",
    description: "Shows conditional operations on encrypted values",
    category: "basic",
  },
  "erc7984-example": {
    contract:
      "contracts/openzeppelin-confidential-contracts/ERC7984Example.sol",
    test: "test/openzeppelin-confidential-contracts/confidentialToken/confToken.test.ts",
    testFixture:
      "test/openzeppelin-confidential-contracts/confidentialToken/confToken.fixture.ts",
    description: "ERC7984 confidential token standard implementation",
    category: "openzeppelin",
  },

  fhecounter: {
    contract: "contracts/basic/FHECounter.sol",
    test: "test/basic/FHECounter.ts",
    description: "Example: FHECounter",
    category: "basic",
  },
  fheadd: {
    contract: "contracts/basic/fhe-operations/FHEAdd.sol",
    test: "test/basic/fhe-operations/FHEAdd.ts",
    description: "Example: FHEAdd",
    category: "basic",
  },
  "fheif-then-else": {
    contract: "contracts/basic/fhe-operations/FHEIfThenElse.sol",
    test: "test/basic/fhe-operations/FHEIfThenElse.ts",
    description: "Example: FHEIfThenElse",
    category: "basic",
  },

  fheand: {
    contract: "contracts/fundamentals/fhe-boolean-logic/FHEAnd.sol",
    test: "test/fundamentals/fhe-boolean-logic/FHEAnd.ts",
    description: "Example: FHEAnd",
    category: "fundamentals",
  },
  fhenot: {
    contract: "contracts/fundamentals/fhe-boolean-logic/FHENot.sol",
    test: "test/fundamentals/fhe-boolean-logic/FHENot.ts",
    description: "Example: FHENot",
    category: "fundamentals",
  },
  fheor: {
    contract: "contracts/fundamentals/fhe-boolean-logic/FHEOr.sol",
    test: "test/fundamentals/fhe-boolean-logic/FHEOr.ts",
    description: "Example: FHEOr",
    category: "fundamentals",
  },
  fhexor: {
    contract: "contracts/fundamentals/fhe-boolean-logic/FHEXor.sol",
    test: "test/fundamentals/fhe-boolean-logic/FHEXor.ts",
    description: "Example: FHEXor",
    category: "fundamentals",
  },
  fheequal: {
    contract: "contracts/fundamentals/fhe-comparisons/FHEEqual.sol",
    test: "test/fundamentals/fhe-comparisons/FHEEqual.ts",
    description: "Example: FHEEqual",
    category: "fundamentals",
  },
  "fhegreater-than": {
    contract: "contracts/fundamentals/fhe-comparisons/FHEGreaterThan.sol",
    test: "test/fundamentals/fhe-comparisons/FHEGreaterThan.ts",
    description: "Example: FHEGreaterThan",
    category: "fundamentals",
  },
  "fhegreater-than-or-equal": {
    contract:
      "contracts/fundamentals/fhe-comparisons/FHEGreaterThanOrEqual.sol",
    test: "test/fundamentals/fhe-comparisons/FHEGreaterThanOrEqual.ts",
    description: "Example: FHEGreaterThanOrEqual",
    category: "fundamentals",
  },
  "fheless-than": {
    contract: "contracts/fundamentals/fhe-comparisons/FHELessThan.sol",
    test: "test/fundamentals/fhe-comparisons/FHELessThan.ts",
    description: "Example: FHELessThan",
    category: "fundamentals",
  },
  "fheless-than-or-equal": {
    contract: "contracts/fundamentals/fhe-comparisons/FHELessThanOrEqual.sol",
    test: "test/fundamentals/fhe-comparisons/FHELessThanOrEqual.ts",
    description: "Example: FHELessThanOrEqual",
    category: "fundamentals",
  },
  fheselect: {
    contract: "contracts/fundamentals/fhe-conditionals/FHESelect.sol",
    test: "test/fundamentals/fhe-conditionals/FHESelect.ts",
    description: "Example: FHESelect",
    category: "fundamentals",
  },
  fhemultiply: {
    contract: "contracts/fundamentals/fhe-operations/FHEMultiply.sol",
    test: "test/fundamentals/fhe-operations/FHEMultiply.ts",
    description: "Example: FHEMultiply",
    category: "fundamentals",
  },
  fhesubtract: {
    contract: "contracts/fundamentals/fhe-operations/FHESubtract.sol",
    test: "test/fundamentals/fhe-operations/FHESubtract.ts",
    description: "Example: FHESubtract",
    category: "fundamentals",
  },

  "fheencryption-patterns": {
    contract:
      "contracts/fundamentals/fhe-encryption-patterns/FHEEncryptionPatterns.sol",
    test: "test/fundamentals/fhe-encryption-patterns/FHEEncryptionPatterns.ts",
    description: "Example: FHEEncryptionPatterns",
    category: "fundamentals",
  },
  "fhehandle-lifecycle": {
    contract:
      "contracts/fundamentals/fhe-handle-lifecycle/FHEHandleLifecycle.sol",
    test: "test/fundamentals/fhe-handle-lifecycle/FHEHandleLifecycle.ts",
    description: "Example: FHEHandleLifecycle",
    category: "fundamentals",
  },

  "user-decrypt-multiple-values": {
    contract: "contracts/decrypt/UserDecryptMultipleValues.sol",
    test: "test/decrypt/UserDecryptMultipleValues.ts",
    description: "Example: UserDecryptMultipleValues",
    category: "decrypt",
  },
  "user-decrypt-single-value": {
    contract: "contracts/decrypt/UserDecryptSingleValue.sol",
    test: "test/decrypt/UserDecryptSingleValue.ts",
    description: "Example: UserDecryptSingleValue",
    category: "decrypt",
  },

  'public-decrypt-multiple-values': {
    contract: 'contracts/decrypt/PublicDecryptMultipleValues.sol',
    test: 'test/decrypt/PublicDecryptMultipleValues.ts',
    description: '@notice Simple counter to assign a unique ID to each new game.',
    category: 'decrypt',
  },
  'public-decrypt-single-value': {
    contract: 'contracts/decrypt/PublicDecryptSingleValue.sol',
    test: 'test/decrypt/PublicDecryptSingleValue.ts',
    description: '@notice Simple counter to assign a unique ID to each new game.',
    category: 'decrypt',
  },
  'encrypt-multiple-values': {
    contract: 'contracts/encrypt/EncryptMultipleValues.sol',
    test: 'test/encrypt/EncryptMultipleValues.ts',
    description: 'Example: EncryptMultipleValues',
    category: 'encrypt',
  },
  'encrypt-single-value': {
    contract: 'contracts/encrypt/EncryptSingleValue.sol',
    test: 'test/encrypt/EncryptSingleValue.ts',
    description: 'Example: EncryptSingleValue',
    category: 'encrypt',
  },

  'view-function-anti-pattern': {
    contract: 'contracts/anti-patterns/ViewFunctionAntiPattern.sol',
    test: 'test/anti-patterns/ViewFunctionAntiPattern.ts',
    description: 'Example: ViewFunctionAntiPattern',
    category: 'anti-patterns',
  },

  'gas-limit-pitfalls': {
    contract: 'contracts/anti-patterns/GasLimitPitfalls.sol',
    test: 'test/anti-patterns/GasLimitPitfalls.ts',
    description: 'Example: GasLimitPitfalls',
    category: 'anti-patterns',
  },
  'fheaccess-control': {
    contract: 'contracts/fundamentals/fhe-permissions/FHEAccessControl.sol',
    test: 'test/fundamentals/fhe-permissions/FHEAccessControl.ts',
    description: 'Example: FHEAccessControl',
    category: 'fundamentals',
  },

  'incorrect-reencryption': {
    contract: 'contracts/anti-patterns/IncorrectReencryption.sol',
    test: 'test/anti-patterns/IncorrectReencryption.ts',
    description: 'Example: IncorrectReencryption',
    category: 'anti-patterns',
  },
  'missing-permission-anti-pattern': {
    contract: 'contracts/anti-patterns/MissingPermissionAntiPattern.sol',
    test: 'test/anti-patterns/MissingPermissionAntiPattern.ts',
    description: 'Example: MissingPermissionAntiPattern',
    category: 'anti-patterns',
  },
  'state-management-mistakes': {
    contract: 'contracts/anti-patterns/StateManagementMistakes.sol',
    test: 'test/anti-patterns/StateManagementMistakes.ts',
    description: 'Example: StateManagementMistakes',
    category: 'anti-patterns',
  },
  'input-proof-basics': {
    contract: 'contracts/input-proofs/InputProofBasics.sol',
    test: 'test/input-proofs/InputProofBasics.ts',
    description: 'Example: InputProofBasics',
    category: 'input-proofs',
  },
  'input-proof-error-handling': {
    contract: 'contracts/input-proofs/InputProofErrorHandling.sol',
    test: 'test/input-proofs/InputProofErrorHandling.ts',
    description: 'Example: InputProofErrorHandling',
    category: 'input-proofs',
  },

  'encrypted-dice': {
    contract: 'contracts/gaming/EncryptedDice.sol',
    test: 'test/gaming/EncryptedDice.ts',
    description: 'Example: EncryptedDice',
    category: 'gaming',
  },
  'poker-hand': {
    contract: 'contracts/gaming/PokerHand.sol',
    test: 'test/gaming/PokerHand.ts',
    description: 'Example: PokerHand',
    category: 'gaming',
  },
  'rock-paper-scissors': {
    contract: 'contracts/gaming/RockPaperScissors.sol',
    test: 'test/gaming/RockPaperScissors.ts',
    description: 'Example: RockPaperScissors',
    category: 'gaming',
  },
  'age-verification': {
    contract: 'contracts/identity/AgeVerification.sol',
    test: 'test/identity/AgeVerification.ts',
    description: 'Example: AgeVerification',
    category: 'identity',
  },
  'credit-score-check': {
    contract: 'contracts/identity/CreditScoreCheck.sol',
    test: 'test/identity/CreditScoreCheck.ts',
    description: 'Example: CreditScoreCheck',
    category: 'identity',
  },
  'encrypted-kyc': {
    contract: 'contracts/identity/EncryptedKYC.sol',
    test: 'test/identity/EncryptedKYC.ts',
    description: 'Example: EncryptedKYC',
    category: 'identity',
  },
  'multi-input-validation': {
    contract: 'contracts/input-proofs/MultiInputValidation.sol',
    test: 'test/input-proofs/MultiInputValidation.ts',
    description: 'Example: MultiInputValidation',
    category: 'input-proofs',
  },

  'private-lottery': {
    contract: 'contracts/gaming/PrivateLottery.sol',
    test: 'test/gaming/PrivateLottery.ts',
    description: 'Example: PrivateLottery',
    category: 'gaming',
  },

  'erc7984example': {
    contract: 'contracts/openzeppelin/ERC7984Example.sol',
    test: 'test/openzeppelin/ERC7984Example.ts',
    description: 'Example: ERC7984Example',
    category: 'openzeppelin',
  },

  'vesting-wallet-example': {
    contract: 'contracts/openzeppelin/VestingWalletExample.sol',
    test: 'test/openzeppelin/VestingWalletExample.ts',
    description: '@title VestingWalletExample',
    category: 'openzeppelin',
  },

  'erc7984erc20wrapper-example': {
    contract: 'contracts/openzeppelin/ERC7984ERC20WrapperExample.sol',
    test: 'test/openzeppelin/ERC7984ERC20WrapperExample.ts',
    description: 'Example: ERC7984ERC20WrapperExample',
    category: 'openzeppelin',
  },
  'swap-erc7984to-erc20': {
    contract: 'contracts/openzeppelin/SwapERC7984ToERC20.sol',
    test: 'test/openzeppelin/SwapERC7984ToERC20.ts',
    description: 'Example: SwapERC7984ToERC20',
    category: 'openzeppelin',
  },
  'swap-erc7984to-erc7984': {
    contract: 'contracts/openzeppelin/SwapERC7984ToERC7984.sol',
    test: 'test/openzeppelin/SwapERC7984ToERC7984.ts',
    description: 'Example: SwapERC7984ToERC7984',
    category: 'openzeppelin',
  },
};
