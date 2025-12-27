/**
 * Category configurations - centralized configuration data
 */

import { CategoryConfig } from "./config";

export const CATEGORIES: Record<string, CategoryConfig> = {
  auctions: {
    name: "Auction Examples",
    description:
      "Advanced auction implementations using confidential bids and prices",
    contracts: [
      {
        path: "contracts/auctions/BlindAuction.sol",
        test: "test/blindAuction/BlindAuction.ts",
        fixture: "test/blindAuction/BlindAuction.fixture.ts",
      },
      {
        path: "contracts/auctions/ConfidentialDutchAuction.sol",
        test: "test/confidentialDutchAuction/ConfidentialDutchAuction.ts",
      },
    ],
  },
  openzeppelin: {
    name: "OpenZeppelin Confidential Contracts",
    description:
      "ERC7984 and confidential token implementations using OpenZeppelin library",
    contracts: [
      {
        path: "contracts/openzeppelin-confidential-contracts/ERC7984Example.sol",
        test: "test/openzeppelin-confidential-contracts/confidentialToken/confToken.test.ts",
        fixture:
          "test/openzeppelin-confidential-contracts/confidentialToken/confToken.fixture.ts",
      },
      {
        path: "contracts/openzeppelin-confidential-contracts/ERC7984ERC20WrapperMock.sol",
        test: "test/openzeppelin-confidential-contracts/ERC7984Wrapper.test.ts",
      },
      {
        path: "contracts/openzeppelin-confidential-contracts/SwapERC7984ToERC20.sol",
        test: "test/openzeppelin-confidential-contracts/ERC7984Wrapper.test.ts",
      },
      {
        path: "contracts/openzeppelin-confidential-contracts/SwapERC7984ToERC7984.sol",
        test: "test/openzeppelin-confidential-contracts/ERC7984Wrapper.test.ts",
      },
    ],
    additionalDeps: {
      "@openzeppelin/confidential-contracts": "^0.1.0",
    },
  },
  fundamentals: {
    name: "Fundamentals Examples",
    description:
      "Core FHEVM operations including boolean logic, comparisons, conditionals, and arithmetic operations",
    contracts: [
      {
        path: 'contracts/fundamentals/fhe-permissions/FHEAccessControl.sol',
        test: 'test/fundamentals/fhe-permissions/FHEAccessControl.ts',
      },
      {
        path: "contracts/fundamentals/fhe-handle-lifecycle/FHEHandleLifecycle.sol",
        test: "test/fundamentals/fhe-handle-lifecycle/FHEHandleLifecycle.ts",
      },
      {
        path: "contracts/fundamentals/fhe-boolean-logic/FHEAnd.sol",
        test: "test/fundamentals/fhe-boolean-logic/FHEAnd.ts",
      },
      {
        path: "contracts/fundamentals/fhe-boolean-logic/FHENot.sol",
        test: "test/fundamentals/fhe-boolean-logic/FHENot.ts",
      },
      {
        path: "contracts/fundamentals/fhe-boolean-logic/FHEOr.sol",
        test: "test/fundamentals/fhe-boolean-logic/FHEOr.ts",
      },
      {
        path: "contracts/fundamentals/fhe-boolean-logic/FHEXor.sol",
        test: "test/fundamentals/fhe-boolean-logic/FHEXor.ts",
      },
      {
        path: "contracts/fundamentals/fhe-comparisons/FHEEqual.sol",
        test: "test/fundamentals/fhe-comparisons/FHEEqual.ts",
      },
      {
        path: "contracts/fundamentals/fhe-comparisons/FHEGreaterThan.sol",
        test: "test/fundamentals/fhe-comparisons/FHEGreaterThan.ts",
      },
      {
        path: "contracts/fundamentals/fhe-comparisons/FHEGreaterThanOrEqual.sol",
        test: "test/fundamentals/fhe-comparisons/FHEGreaterThanOrEqual.ts",
      },
      {
        path: "contracts/fundamentals/fhe-comparisons/FHELessThan.sol",
        test: "test/fundamentals/fhe-comparisons/FHELessThan.ts",
      },
      {
        path: "contracts/fundamentals/fhe-comparisons/FHELessThanOrEqual.sol",
        test: "test/fundamentals/fhe-comparisons/FHELessThanOrEqual.ts",
      },
      {
        path: "contracts/fundamentals/fhe-conditionals/FHESelect.sol",
        test: "test/fundamentals/fhe-conditionals/FHESelect.ts",
      },
      {
        path: "contracts/fundamentals/fhe-operations/FHEAdd.sol",
        test: "test/fundamentals/fhe-operations/FHEAdd.ts",
      },
      {
        path: "contracts/fundamentals/fhe-operations/FHEMultiply.sol",
        test: "test/fundamentals/fhe-operations/FHEMultiply.ts",
      },
      {
        path: "contracts/fundamentals/fhe-operations/FHESubtract.sol",
        test: "test/fundamentals/fhe-operations/FHESubtract.ts",
      },
    ],
  },

  decrypt: {
    name: "Decrypt",
    description: "Examples for Decrypt",
    contracts: [
      {
        path: "contracts/decrypt/PublicDecryptMultipleValues.sol",
        test: "test/decrypt/PublicDecryptMultipleValues.ts",
      },
      {
        path: "contracts/decrypt/PublicDecryptSingleValue.sol",
        test: "test/decrypt/PublicDecryptSingleValue.ts",
      },
      {
        path: "contracts/decrypt/UserDecryptMultipleValues.sol",
        test: "test/decrypt/UserDecryptMultipleValues.ts",
      },
      {
        path: "contracts/decrypt/UserDecryptSingleValue.sol",
        test: "test/decrypt/UserDecryptSingleValue.ts",
      },
    ],
  },

  encrypt: {
    name: "Encrypt",
    description: "Examples for Encrypt",
    contracts: [
      {
        path: "contracts/encrypt/EncryptMultipleValues.sol",
        test: "test/encrypt/EncryptMultipleValues.ts",
      },
      {
        path: "contracts/encrypt/EncryptSingleValue.sol",
        test: "test/encrypt/EncryptSingleValue.ts",
      },
    ],
  },

  "anti-patterns": {
    name: "Anti patterns",
    description: "Examples for Anti patterns",
    contracts: [
      {
        path: "contracts/anti-patterns/ViewFunctionAntiPattern.sol",
        test: "test/anti-patterns/ViewFunctionAntiPattern.ts",
      },
      {
        path: "contracts/anti-patterns/GasLimitPitfalls.sol",
        test: "test/anti-patterns/GasLimitPitfalls.ts",
      },
    ],
  },

  'anti-patterns': {
    name: 'Anti patterns',
    description: 'Examples for Anti patterns',
    contracts: [
      {
        path: 'contracts/anti-patterns/IncorrectReencryption.sol',
        test: 'test/anti-patterns/IncorrectReencryption.ts',
      },
      {
        path: 'contracts/anti-patterns/MissingPermissionAntiPattern.sol',
        test: 'test/anti-patterns/MissingPermissionAntiPattern.ts',
      },
      {
        path: 'contracts/anti-patterns/StateManagementMistakes.sol',
        test: 'test/anti-patterns/StateManagementMistakes.ts',
      }
    ],
  },

  'input-proofs': {
    name: 'Input proofs',
    description: 'Examples for Input proofs',
    contracts: [
      {
        path: 'contracts/input-proofs/InputProofBasics.sol',
        test: 'test/input-proofs/InputProofBasics.ts',
      },
      {
        path: 'contracts/input-proofs/InputProofErrorHandling.sol',
        test: 'test/input-proofs/InputProofErrorHandling.ts',
      }
    ],
  },
};
