// scripts/deploy.js - UPDATED VERSION
const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment to Cronos Testnet...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // 1. Deploy MNEE Token
  console.log("\n📦 Deploying MNEE Token...");
  const MNEEToken = await hre.ethers.getContractFactory("MNEEToken");
  const mnee = await MNEEToken.deploy();
  await mnee.deployed();  // Changed from waitForDeployment()
  console.log("✅ MNEE Token deployed to:", mnee.address);

  // 2. Deploy Escrow Contract
  console.log("\n📦 Deploying EcommerceEscrow...");
  const EcommerceEscrow = await hre.ethers.getContractFactory("EcommerceEscrow");
  const escrow = await EcommerceEscrow.deploy(mnee.address);
  await escrow.deployed();  // Changed from waitForDeployment()
  console.log("✅ EcommerceEscrow deployed to:", escrow.address);

  // 3. Transfer initial tokens to escrow
  console.log("\n💰 Transferring initial tokens to Escrow...");
  const initialSupply = hre.ethers.utils.parseUnits("5000", 18); // 5,000 MNEE
  await mnee.transfer(escrow.address, initialSupply);
  console.log("✅ Transferred 5,000 MNEE to escrow");

  // 4. Verify contracts (optional)
  console.log("\n🔍 Verification commands:");
  console.log("Wait 1 minute then run:");
  console.log(`npx hardhat verify --network cronosTestnet ${mnee.address}`);
  console.log(`npx hardhat verify --network cronosTestnet ${escrow.address} "${mnee.address}"`);

  // 5. Save addresses to file
  const addresses = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      mneeToken: mnee.address,
      escrow: escrow.address
    },
    blockExplorer: {
      mnee: `https://testnet.cronoscan.com/address/${mnee.address}`,
      escrow: `https://testnet.cronoscan.com/address/${escrow.address}`
    }
  };

  const fs = require("fs");
  fs.writeFileSync("deployment.json", JSON.stringify(addresses, null, 2));
  
  console.log("\n🎉 DEPLOYMENT COMPLETE!");
  console.log("========================================");
  console.log("MNEE Token:      ", mnee.address);
  console.log("Escrow Contract: ", escrow.address);
  console.log("Deployer:        ", deployer.address);
  console.log("Network:         ", hre.network.name);
  console.log("========================================");
  console.log("\n📋 Addresses saved to deployment.json");
  console.log("\n⚠️  IMPORTANT: Make sure you have TCRO for gas fees!");
  console.log("Get test CRO from: https://cronos.org/faucet");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});