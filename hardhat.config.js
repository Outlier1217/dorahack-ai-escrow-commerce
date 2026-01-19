// hardhat.config.js - FINAL WORKING VERSION
require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-ethers");
require("dotenv").config();

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",  // OpenZeppelin ke liye
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.8.18",  // Tumhare contracts ke liye
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  },
  networks: {
    cronosTestnet: {
      url: "https://evm-t3.cronos.org",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 338,
      gasPrice: 5000000000000,
    },
    hardhat: {
      chainId: 31337
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};