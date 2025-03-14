require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ethers");
require("@typechain/hardhat");

require('dotenv').config();

const { HardhatUserConfig } = require("hardhat/types");
//const ARBITRUM_ENDPOINT = "0x3c2269811836af69497E5F486A85D7316753cf62";
//const ARBITRUM_CHAINID = 110;

const config = {
  solidity: "0.7.6",
  networks: {
    hardhat: {
      forking: {
        url: process.env.ARBITRUM_URL,
        blockNumber: 315304801,
        accountsBalance: "10000000000000000000000",
      },
    },
    arbitrum_one: {
      url: process.env.ARBITRUM_URL,
      accounts: [process.env.PRIVATE_KEY]
    }
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  }
};

module.exports = config;