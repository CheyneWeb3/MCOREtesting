import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "@nomiclabs/hardhat-vyper";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const FUJI_RPC_URL = process.env.FUJI_RPC_URL || "";
const SNOWTRACE_API_KEY = process.env.SNOWTRACE_API_KEY || "";

const accounts =
  /^0x[a-fA-F0-9]{64}$/.test(PRIVATE_KEY) ? [PRIVATE_KEY] : [];

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.30",
        settings: {
          optimizer: { enabled: true, runs: 200 },
          evmVersion: "cancun",
          viaIR: false,
        },
      },
    ],
  },
  vyper: {
    compilers: [{ version: "0.3.10" }],
  },
  networks: {
    avalancheFuji: {
      url: FUJI_RPC_URL,
      accounts,
      chainId: 43113,
    },
  },
  etherscan: {
    apiKey: {
      avalancheFujiTestnet: SNOWTRACE_API_KEY,
    },
  },
};

export default config;
