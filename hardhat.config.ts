import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      blockGasLimit: 1_000_000_000,
      allowUnlimitedContractSize: true,
    },
  },
  solidity: {
    version: "0.8.28",
    settings: {
      viaIR: true,
    },
  },
  paths: {
    artifacts: "./frontend/app/artifacts",
  },
};

export default config;
