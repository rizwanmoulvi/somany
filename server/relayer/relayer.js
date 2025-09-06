// bridge-relayer.js
// Relayer that listens to EthLock on source chain and mints on destination chain.

const { ethers } = require("ethers");
require("dotenv").config();

/// CONFIG
const SRC_RPC = process.env.SRC_RPC;  // Source chain RPC (Sepolia)
const DST_RPC = process.env.DST_RPC;  // Destination chain RPC (Lasna)
const RELAYER_PRIVATE_KEY = process.env.PRIVATE_KEY; // Same relayer key allowed on mintable token

const LOCK_CONTRACT = process.env.LOCK_CONTRACT; // deployed EthLock
const TOKEN_CONTRACT = process.env.TOKEN_CONTRACT; // deployed RelayerMintableToken



async function main() {
  // Providers (using ethers v6 syntax)
  const srcProvider = new ethers.JsonRpcProvider(SRC_RPC);
  const dstProvider = new ethers.JsonRpcProvider(DST_RPC);

  // Relayer signer (for minting)
  const wallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, dstProvider);

  // ABIs
  const lockAbi = [
    "event EthLocked(address indexed user, uint256 amount, uint256 originChainId)"
  ];
  const tokenAbi = [
    "function mint(address to, uint256 amount) external",
    "function decimals() view returns (uint8)"
  ];

  // Contracts
  const lock = new ethers.Contract(LOCK_CONTRACT, lockAbi, srcProvider);
  const token = new ethers.Contract(TOKEN_CONTRACT, tokenAbi, wallet);

  const decimals = await token.decimals();

  console.log("Relayer listening for EthLocked events...");

  // For ethers v6, we need to use a different approach for event listening
  // since the direct contract.on() method may behave differently
  let lastBlockChecked = await srcProvider.getBlockNumber();
  console.log(`Starting to poll from block ${lastBlockChecked}`);

  // Set up polling for events since event filters might have issues with some RPC endpoints
  async function pollForEvents() {
    try {
      const currentBlock = await srcProvider.getBlockNumber();
      
      if (currentBlock > lastBlockChecked) {
        console.log(`Checking for events from block ${lastBlockChecked + 1} to ${currentBlock}`);
        
        // Query for EthLocked events in the block range
        const events = await lock.queryFilter("EthLocked", lastBlockChecked + 1, currentBlock);
        
        for (const event of events) {
          const [user, amount, originChainId] = event.args;
          console.log(`Detected lock: user=${user}, amount=${amount}, chain=${originChainId}`);
          
          try {
            // Here we simply mirror 1 ETH = 1 Token (assuming 18 decimals)
            const mintAmount = amount; // already in wei, matches 18 decimals
            const tx = await token.mint(user, mintAmount);
            console.log("Mint tx sent:", tx.hash);
            await tx.wait();
            console.log("Minted successfully for", user);
          } catch (err) {
            console.error("Mint failed:", err);
          }
        }
        
        lastBlockChecked = currentBlock;
      }
    } catch (error) {
      console.error("Error polling for events:", error);
    }
    
    // Schedule the next poll
    setTimeout(pollForEvents, 10000); // Poll every 10 seconds
  }

  // Start polling
  pollForEvents();
}

main().catch(console.error);
