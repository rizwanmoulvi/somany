// bridge-relayer.js
// Relayer that listens to EthLock on source chain and mints on destination chain.

const { ethers } = require("ethers");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

/// CONFIG
// Support multiple source chains
const SOURCE_CHAINS = [
  {
    name: "Ethereum Sepolia",
    rpc: process.env.ETH_SEPOLIA_RPC,
    lockContract: process.env.ETH_SEPOLIA_LOCK_CONTRACT,
    chainId: 11155111
  },
  {
    name: "Base Sepolia", 
    rpc: process.env.BASE_SEPOLIA_RPC,
    lockContract: process.env.BASE_SEPOLIA_LOCK_CONTRACT,
    chainId: 84532
  }
];

const DST_RPC = process.env.DST_RPC;  // Destination chain RPC (Lasna)
const RELAYER_PRIVATE_KEY = process.env.PRIVATE_KEY; // Same relayer key allowed on mintable token
const TOKEN_CONTRACT = process.env.TOKEN_CONTRACT; // deployed RelayerMintableToken

// Store completed mints for frontend to query
const completedMints = new Map(); // user address -> Array of { txHash, amount, timestamp, sourceChain, consumed: false }

// Setup Express server for frontend communication
const app = express();
app.use(cors());
app.use(express.json());

// Endpoint to check if minting is complete for a user
app.get('/api/mint-status/:userAddress', (req, res) => {
  const userAddress = req.params.userAddress.toLowerCase();
  const userMints = completedMints.get(userAddress) || [];
  
  // Find the first unconsumed mint
  const availableMint = userMints.find(mint => !mint.consumed);
  
  if (availableMint) {
    // Mark as consumed
    availableMint.consumed = true;
    
    // Clean up old consumed mints (keep only last 5 for safety)
    const unconsumedMints = userMints.filter(mint => !mint.consumed);
    const recentConsumedMints = userMints.filter(mint => mint.consumed).slice(-5);
    completedMints.set(userAddress, [...unconsumedMints, ...recentConsumedMints]);
    
    res.json({ 
      completed: true, 
      txHash: availableMint.txHash, 
      amount: availableMint.amount,
      timestamp: availableMint.timestamp,
      sourceChain: availableMint.sourceChain 
    });
  } else {
    res.json({ completed: false });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'relayer' });
});

// Start the HTTP server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Relayer API server listening on port ${PORT}`);
});

async function main() {
  // Destination provider and relayer signer
  const dstProvider = new ethers.JsonRpcProvider(DST_RPC);
  const wallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, dstProvider);

  // ABIs
  const lockAbi = [
    "event EthLocked(address indexed user, uint256 amount, uint256 originChainId)"
  ];
  const tokenAbi = [
    "function mint(address to, uint256 amount) external",
    "function decimals() view returns (uint8)"
  ];

  // Destination token contract
  const token = new ethers.Contract(TOKEN_CONTRACT, tokenAbi, wallet);
  const decimals = await token.decimals();

  console.log("Relayer listening for EthLocked events on multiple chains...");

  // Setup for each source chain
  const chainSetups = [];
  for (const chain of SOURCE_CHAINS) {
    if (!chain.rpc || !chain.lockContract) {
      console.log(`Skipping ${chain.name} - missing RPC or contract address`);
      continue;
    }

    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const lockContract = new ethers.Contract(chain.lockContract, lockAbi, provider);
    const lastBlockChecked = await provider.getBlockNumber();
    
    console.log(`${chain.name}: Starting to poll from block ${lastBlockChecked}`);
    
    chainSetups.push({
      ...chain,
      provider,
      lockContract,
      lastBlockChecked
    });
  }

  // Set up polling for events across all chains - run in parallel
  async function pollForEvents() {
    console.log(`\n⚡ Polling ${chainSetups.length} chains in parallel...`);
    
    // Create parallel polling tasks for all chains
    const pollPromises = chainSetups.map(async (chainSetup) => {
      try {
        const currentBlock = await chainSetup.provider.getBlockNumber();
        
        if (currentBlock > chainSetup.lastBlockChecked) {
          console.log(`${chainSetup.name}: Checking for events from block ${chainSetup.lastBlockChecked + 1} to ${currentBlock}`);
          
          // Query for EthLocked events in the block range
          const events = await chainSetup.lockContract.queryFilter("EthLocked", chainSetup.lastBlockChecked + 1, currentBlock);
          
          for (const event of events) {
            const [user, amount, originChainId] = event.args;
            console.log(`${chainSetup.name}: Detected lock: user=${user}, amount=${amount}, chain=${originChainId}`);
            
            try {
              // Here we simply mirror 1 ETH = 1 Token (assuming 18 decimals)
              const mintAmount = amount; // already in wei, matches 18 decimals
              const tx = await token.mint(user, mintAmount);
              console.log(`${chainSetup.name}: Mint tx sent:`, tx.hash);
              await tx.wait();
              console.log(`${chainSetup.name}: Minted successfully for`, user);
              
              // Store completion data for frontend to query
              const userAddress = user.toLowerCase();
              const userMints = completedMints.get(userAddress) || [];
              userMints.push({
                txHash: tx.hash,
                amount: mintAmount.toString(),
                timestamp: Date.now(),
                sourceChain: chainSetup.name,
                consumed: false
              });
              completedMints.set(userAddress, userMints);
              console.log(`${chainSetup.name}: Mint completion stored for ${user}`);
            } catch (err) {
              console.error(`${chainSetup.name}: Mint failed:`, err);
            }
          }
          
          chainSetup.lastBlockChecked = currentBlock;
        }
      } catch (error) {
        console.error(`${chainSetup.name}: Error polling for events:`, error);
      }
    });
    
    // Execute all chain polling operations in parallel
    await Promise.allSettled(pollPromises);
    
    // Schedule the next poll (reduced frequency to avoid rate limits)
    setTimeout(pollForEvents, 15000); // Poll every 15 seconds
  }

  // Start polling
  pollForEvents();
}

main().catch(console.error);
