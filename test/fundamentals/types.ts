import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

export interface Signers {
  owner: HardhatEthersSigner;
  alice: HardhatEthersSigner;
}

