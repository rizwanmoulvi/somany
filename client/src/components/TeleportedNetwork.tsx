import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { formatEther, parseAbi, createPublicClient, http } from 'viem';
import { motion } from 'framer-motion';
import { Wallet, ExternalLink, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { getChainIconUrl, formatCurrency, formatTokenAmount, cn } from '../lib/utils';

// ERC-20 ABI for balance checking
const erc20Abi = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)'
]);

// EthLock contract ABI
const ethLockAbi = parseAbi([
  'function lockedBalances(address user) view returns (uint256)'
]);

// Chainlink Price Feed ABI
const priceFeedAbi = parseAbi([
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function decimals() view returns (uint8)'
]);

interface TeleportedNetworkProps {
  className?: string;
}

const TeleportedNetwork: React.FC<TeleportedNetworkProps> = ({ className }) => {
  const { address, isConnected } = useAccount();
  
  // Network constants
  const SONIC_CHAIN_ID = 14601;
  const SONIC_RPC_URL = 'https://rpc.testnet.soniclabs.com';
  const SONIC_NETWORK_NAME = 'Sonic Testnet';
  const WETH_TOKEN_ADDRESS = '0xB5A3BA529840fE3bB07526688Aaa100F497C5d97';
  const ETH_LOCK_ADDRESS = '0x1231A2cf8D00167BB108498B81ee37a05Df4e12F'; // On Sepolia
  const SEPOLIA_RPC_URL = 'https://eth-sepolia.blastapi.io/136bb64a-7b61-439f-9ac7-2c3d0b92404f';
  const SEPOLIA_CHAIN_ID = 11155111;
  const ETH_USD_PRICE_FEED = '0x694AA1769357215DE4FAC081bf1f309aDC325306'; // ETH/USD Price Feed on Sepolia
  
  // State for balances and prices
  const [wethBalance, setWethBalance] = useState<string>('0');
  const [lockedEthBalance, setLockedEthBalance] = useState<string>('0');
  const [ethPrice, setEthPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch balances when connected
  useEffect(() => {
    const fetchBalances = async () => {
      if (!isConnected || !address) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Create clients
        const sonicClient = createPublicClient({
          chain: {
            id: SONIC_CHAIN_ID,
            name: SONIC_NETWORK_NAME,
            network: 'sonic',
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: {
              default: { http: [SONIC_RPC_URL] },
              public: { http: [SONIC_RPC_URL] },
            },
          },
          transport: http()
        });
        
        const sepoliaClient = createPublicClient({
          chain: {
            id: SEPOLIA_CHAIN_ID,
            name: 'Sepolia',
            network: 'sepolia',
            nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: {
              default: { http: [SEPOLIA_RPC_URL] },
              public: { http: [SEPOLIA_RPC_URL] },
            },
          },
          transport: http()
        });
        
        // Fetch wETH balance on Sonic
        const wethBalanceRaw = await sonicClient.readContract({
          address: WETH_TOKEN_ADDRESS as `0x${string}`,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address as `0x${string}`]
        });
        
        // Fetch locked ETH balance on Sepolia
        const lockedEthBalanceRaw = await sepoliaClient.readContract({
          address: ETH_LOCK_ADDRESS as `0x${string}`,
          abi: ethLockAbi,
          functionName: 'lockedBalances',
          args: [address as `0x${string}`]
        });
        
        // Fetch ETH/USD price from Chainlink
        const [roundData, priceFeedDecimals] = await Promise.all([
          sepoliaClient.readContract({
            address: ETH_USD_PRICE_FEED as `0x${string}`,
            abi: priceFeedAbi,
            functionName: 'latestRoundData'
          }),
          sepoliaClient.readContract({
            address: ETH_USD_PRICE_FEED as `0x${string}`,
            abi: priceFeedAbi,
            functionName: 'decimals'
          })
        ]);
        
        // Calculate ETH price in USD
        const priceData = roundData as any;
        const price = Number(priceData[1]) / 10 ** Number(priceFeedDecimals as number);
        
        // Format balances and set price
        setWethBalance(formatEther(wethBalanceRaw as bigint));
        setLockedEthBalance(formatEther(lockedEthBalanceRaw as bigint));
        setEthPrice(price);
      } catch (err) {
        console.error('Error fetching teleported balances:', err);
        setError('Failed to fetch teleported token balances');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBalances();
  }, [address, isConnected]);
  
  // If user isn't connected, show a message
  if (!isConnected) {
    return null; // Don't show anything if not connected
  }
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };
  
  return (
    <motion.div
      className={cn("w-full max-w-6xl mx-auto mb-6", className)}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 via-background to-purple-50/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <Zap className="h-5 w-5" />
                Teleported Assets
              </CardTitle>
              <CardDescription>
                View your assets that have been teleported across networks
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
              Cross-Chain Bridge
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <p>{error}</p>
              <p className="text-sm mt-2">Please check your network connection and try again.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Network Info Card */}
              <Card className="bg-white/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full border-2 border-blue-100 overflow-hidden">
                      <img 
                        src="https://icons.llamao.fi/icons/chains/rsz_sonic.jpg" 
                        alt="Sonic Network"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=Sonic&background=random&color=fff&size=128`;
                        }}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-blue-700">Sonic Testnet</h3>
                      <p className="text-sm text-muted-foreground">Network ID: {SONIC_CHAIN_ID}</p>
                      <div className="mt-2 flex gap-2">
                        <Badge variant="secondary" className="text-xs">Testnet</Badge>
                        <Badge variant="outline" className="text-xs bg-green-100 text-green-700">Active</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* wETH Balance Card */}
              <Card className="bg-white/50">
                <CardContent className="pt-6">
                  <div className="flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-medium text-muted-foreground">Wrapped ETH Balance</h3>
                      <div className="flex items-center gap-1">
                        <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700">
                          w
                        </div>
                        <span className="font-semibold">wETH</span>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <div className="text-2xl font-bold">
                        {formatTokenAmount(wethBalance)} wETH
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ≈ {ethPrice !== null ? formatCurrency(parseFloat(wethBalance) * ethPrice) : 'Loading price...'}
                      </div>
                    </div>
                    
                    <div className="mt-4 text-xs text-blue-600">
                      <a 
                        href={`https://blockscout.sonic.ooo/address/${WETH_TOKEN_ADDRESS}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:underline"
                      >
                        View on Explorer <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Locked ETH Card */}
              <Card className="bg-white/50">
                <CardContent className="pt-6">
                  <div className="flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-medium text-muted-foreground">Locked ETH</h3>
                      <div className="flex items-center gap-1">
                        <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold">
                          🔒
                        </div>
                        <span className="font-semibold">ETH</span>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <div className="text-2xl font-bold">
                        {formatTokenAmount(lockedEthBalance)} ETH
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ≈ {ethPrice !== null ? formatCurrency(parseFloat(lockedEthBalance) * ethPrice) : 'Loading price...'}
                      </div>
                    </div>
                    
                    <div className="mt-4 text-xs text-blue-600">
                      <a 
                        href={`https://sepolia.etherscan.io/address/${ETH_LOCK_ADDRESS}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:underline"
                      >
                        View on Etherscan <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TeleportedNetwork;
