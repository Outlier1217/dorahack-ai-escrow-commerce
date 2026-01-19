// scripts/distribute-tokens.js
const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Distributing MNEE tokens for testing...");
  
  // Connect to Cronos Testnet
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", (await deployer.getBalance()).toString());

  // Attach to deployed MNEE contract
  const MNEE_ADDRESS = "0x8Cd07e40C2801037dcaDA66CCe182F13CC3724c0";
  const MNEE = await ethers.getContractFactory("MNEEToken");
  const mnee = await MNEE.attach(MNEE_ADDRESS);
  
  console.log("MNEE Token attached:", mnee.address);

  // Test wallets to receive tokens
  const testWallets = [
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Hardhat default #0
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Hardhat default #1
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Hardhat default #2
  ];

  // Transfer 1000 MNEE to each test wallet
  for (let i = 0; i < testWallets.length; i++) {
    const wallet = testWallets[i];
    const amount = ethers.utils.parseUnits("1000", 18);
    
    console.log(`\n${i+1}. Transferring to ${wallet}...`);
    
    try {
      const tx = await mnee.transfer(wallet, amount);
      await tx.wait();
      console.log(`   ✅ Sent 1000 MNEE to ${wallet}`);
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
  }

  console.log("\n🎉 Token distribution complete!");
  console.log("\n📋 Test Wallets with MNEE:");
  for (let i = 0; i < testWallets.length; i++) {
    const balance = await mnee.balanceOf(testWallets[i]);
    console.log(`${i+1}. ${testWallets[i]} - ${ethers.utils.formatEther(balance)} MNEE`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });