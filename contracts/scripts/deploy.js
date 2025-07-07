const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying SonicSphere contract...");

  // Get the contract factory
  const SonicSphere = await ethers.getContractFactory("SonicSphere");

  // Deploy the contract
  const sonicSphere = await SonicSphere.deploy();

  // Wait for deployment to finish
  await sonicSphere.waitForDeployment();

  // Get the contract address
  const address = await sonicSphere.getAddress();
  console.log("SonicSphere deployed to:", address);
}

// Run the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 