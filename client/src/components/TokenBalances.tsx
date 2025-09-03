import React, { useEffect, useState } from 'react';
import { useAccount, useBalance, useReadContract, useChainId } from 'wagmi';
import { formatEther, formatUnits, parseAbi, http, createPublicClient } from 'viem';
import { config } from '../wagmi';

// Token data interface
interface TokenBalance {
  chainId: number;
  chainName: string;
  symbol: string;
  balance: string;
  formattedBalance: string;
  tokenName?: string;
  tokenAddress?: string;
  isConnectedChain?: boolean;
  price?: number;
  value?: number;
  isEstimatedPrice?: boolean;
}

// ERC20 ABI for token balances (minimal version for balanceOf)
const erc20Abi = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)'
]);

// Chainlink Price Feed ABIs
const priceFeedAbi = parseAbi([
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function decimals() view returns (uint8)'
]);

const legacyPriceFeedAbi = parseAbi([
  'function latestAnswer() view returns (int256)',
  'function decimals() view returns (uint8)'
]);

// Token mapping with addresses and decimals
const tokenAddresses: Record<number, { [symbol: string]: { address: string, decimals: number } }> = {
  11155111: { // Sepolia
    'USDC': { address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', decimals: 6 }
  }
};

// Chainlink Price Feed mapping
// Contains price feed addresses for various assets across networks
const priceFeedAddresses: Record<number, { [symbol: string]: { address: string, decimals: number, invertRate?: boolean } }> = {
  // Sepolia Price Feeds
  11155111: {
    // Updated to the ETH/USD proxy on Sepolia
    'ETH': { address: '0x694AA1769357215DE4FAC081bf1f309aDC325306', decimals: 8 }, // ETH/USD on Sepolia
    'USDC': { address: '0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E', decimals: 8 } // USDC/USD on Sepolia
  },
  // Optimism Sepolia
  11155420: {
    'ETH': { address: '0x61Ec26aA57019C486B10502285c5A3D4A4750AD7', decimals: 8 } // ETH/USD on OP Sepolia
  },
  // Arbitrum Sepolia
  421614 : {
    'ETH': { address: '0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165', decimals: 8 } // ETH/USD on Arbitrum Sepolia
  },
  // Base Sepolia
  84532 : {
    'ETH': { address: '0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1', decimals: 8 }, // ETH/USD on Base Sepolia
    'USDC': { address: '0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E', decimals: 8 } // USDC/USD on Base Sepolia
  },
  // Zora Sepolia
  999999999 : {
    // Using a different ETH/USD feed
    'ETH': { address: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', decimals: 8 } // ETH/USD on Zora Sepolia
  },
  //Polygon Amoy
  80002 : {
    'POL' : { address: '0x001382149eBa3441043c1c66972b4772963f5D43', decimals: 18 } // POL/USD on Polygon Amoy
  },
  //Scroll Sepolia
  534351 : {
    'ETH': { address: '0x59F1ec1f10bD7eD9B938431086bC1D9e233ECf41', decimals: 8 } // ETH/USD on Scroll Sepolia
  },
  // Celo Alfajores
  44787 : {
    'CELO' : { address: '0x022F9dCC73C5Fb43F2b4eF2EF9ad3eDD1D853946', decimals: 18 } // CELO/USD on Celo
  },
  //Monad Testnet
  10143 : {
    'MON' : { address: '0x0c76859E85727683Eeba0C70Bc2e0F5781337818', decimals: 18 } // Placeholder until a feed is available
  },
  //Unichain Sepolia
  1301 : {
    'ETH' : { address: '0xd9c93081210dFc33326B2af4C2c11848095E6a9a', decimals: 8 } // ETH/USD on Unichain Sepolia
  }

  // More networks will be added as feed addresses are provided
};

// Component to display token balances
const TokenBalances: React.FC = () => {
  const { address, isConnected } = useAccount();
  const currentChainId = useChainId();
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use wagmi's useBalance for the connected chain
  const { data: connectedChainBalance } = useBalance({
    address,
    chainId: currentChainId,
  });

  useEffect(() => {
    if (!isConnected || !address) {
      setBalances([]);
      return;
    }

    // Define a type for price result
    interface PriceResult {
      price: number | undefined;
      isEstimated: boolean;
    }

    // Function to fetch token price from Chainlink Oracle
    const fetchTokenPrice = async (chainId: number, symbol: string, client: any): Promise<PriceResult> => {
      try {
        // Special case - USDC is pegged to USD
        if (symbol === 'USDC' && !priceFeedAddresses[chainId]?.[symbol]) {
          // For USDC we return 1.0 if no oracle is available since it's a stablecoin
          return { price: 1.0, isEstimated: true };
        }
        
        // Check if we have a Chainlink price feed for this token on this chain
        if (!priceFeedAddresses[chainId]?.[symbol]) {
          console.warn(`No price feed found for ${symbol} on chain ${chainId}`);
          // No hardcoded estimate - return undefined to indicate no price available
          return { price: undefined, isEstimated: false };
        }

        const priceFeedInfo = priceFeedAddresses[chainId][symbol];
        
        // Validate address
        if (!priceFeedInfo.address || priceFeedInfo.address.length !== 42) {
          console.warn(`Invalid price feed address for ${symbol} on chain ${chainId}`);
          return { price: undefined, isEstimated: false };
        }
        
        // Get decimals for the price feed
        let feedDecimals = priceFeedInfo.decimals;
        try {
          feedDecimals = Number(await client.readContract({
            address: priceFeedInfo.address as `0x${string}`,
            abi: parseAbi(['function decimals() view returns (uint8)']),
            functionName: 'decimals'
          }));
        } catch (decimalError) {
          console.warn(`Could not get decimals for price feed ${priceFeedInfo.address}, using default ${feedDecimals}`);
        }
        
        let rawPrice: bigint | undefined;
        
        // Try latestRoundData first (newer Chainlink feeds)
        try {
          const priceData = await client.readContract({
            address: priceFeedInfo.address as `0x${string}`,
            abi: priceFeedAbi,
            functionName: 'latestRoundData'
          }) as [bigint, bigint, bigint, bigint, bigint];
          
          // The answer is the second element of the returned data
          rawPrice = priceData[1];
          
        } catch (latestRoundError) {
          console.warn(`latestRoundData failed for ${symbol} on chain ${chainId}, trying latestAnswer...`);
          
          // Try latestAnswer as fallback (older Chainlink feeds)
          try {
            rawPrice = await client.readContract({
              address: priceFeedInfo.address as `0x${string}`,
              abi: legacyPriceFeedAbi,
              functionName: 'latestAnswer'
            }) as bigint;
            
          } catch (latestAnswerError) {
            console.error(`Both latestRoundData and latestAnswer failed for ${symbol} on chain ${chainId}`);
            return { price: undefined, isEstimated: false };
          }
        }
        
        if (!rawPrice) {
          console.warn(`No price data returned for ${symbol} on chain ${chainId}`);
          return { price: undefined, isEstimated: false };
        }
        
        // Convert the price to a readable format (adjust for decimals)
        const price = Number(rawPrice) / 10 ** feedDecimals;
        
        // Return actual price data from oracle
        return { price, isEstimated: false };
      } catch (error) {
        console.error(`Error fetching price for ${symbol} on chain ${chainId}:`, error);
        
        // For critical tokens, provide fallback values as last resort
        if (symbol === 'ETH') return { price: 1800, isEstimated: true };
        if (symbol === 'USDC') return { price: 1.0, isEstimated: true };
        
        return { price: undefined, isEstimated: false };
      }
    };

    const fetchBalances = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedBalances: TokenBalance[] = [];
        const chains = config.chains;
        
        // Add the connected chain balance first using wagmi hook data
        if (connectedChainBalance) {
          const chain = chains.find(c => c.id === currentChainId);
          if (chain) {
            // Create public client for the connected chain
            const publicClient = createPublicClient({
              chain: chain,
              transport: http()
            });
            
            // Fetch the price for the native token from Chainlink or estimated price
            const priceResult = await fetchTokenPrice(currentChainId, connectedChainBalance.symbol, publicClient);
            const formattedBalance = Number(connectedChainBalance.formatted);
            
            // Calculate the USD value if price is available
            const value = priceResult.price ? formattedBalance * priceResult.price : undefined;
            
            fetchedBalances.push({
              chainId: currentChainId,
              chainName: chain.name,
              symbol: connectedChainBalance.symbol,
              balance: connectedChainBalance.value.toString(),
              formattedBalance: connectedChainBalance.formatted,
              isConnectedChain: true,
              price: priceResult.price,
              value,
              isEstimatedPrice: priceResult.isEstimated
            });
            
            // If we're on Sepolia, fetch USDC balance using wagmi hooks
            if (currentChainId === 11155111) {
              try {
                const usdcContract = tokenAddresses[11155111]['USDC'];
                
                const tokenBalance = await publicClient.readContract({
                  address: usdcContract.address as `0x${string}`,
                  abi: erc20Abi,
                  functionName: 'balanceOf',
                  args: [address as `0x${string}`]
                });
                
                const formattedTokenBalance = formatUnits(tokenBalance, usdcContract.decimals);
                
                // Fetch USDC price (typically 1 USD, but still fetch from oracle)
                const tokenPriceResult = await fetchTokenPrice(currentChainId, 'USDC', publicClient);
                const tokenValue = tokenPriceResult.price ? Number(formattedTokenBalance) * tokenPriceResult.price : undefined;
                
                fetchedBalances.push({
                  chainId: currentChainId,
                  chainName: chain.name,
                  symbol: 'USDC',
                  balance: tokenBalance.toString(),
                  formattedBalance: formattedTokenBalance,
                  tokenName: 'USD Coin',
                  tokenAddress: usdcContract.address,
                  isConnectedChain: true,
                  price: tokenPriceResult.price,
                  value: tokenValue,
                  isEstimatedPrice: tokenPriceResult.isEstimated
                });
              } catch (tokenError) {
                console.error('Error fetching USDC on connected chain:', tokenError);
              }
            }
          }
        }

        // Fetch balances for other chains
        for (const chain of chains) {
          // Skip the connected chain as we already have that data
          if (chain.id === currentChainId) continue;
          
          try {
            // Create a public client for this chain
            const publicClient = createPublicClient({
              chain: chain,
              transport: http()
            });
            
            // Get native token balance
            const balance = await publicClient.getBalance({ 
              address: address as `0x${string}`
            });
            
            const formattedBalance = formatEther(balance);
            
            // Get native token price from Chainlink or estimated price
            const nativeSymbol = chain.nativeCurrency.symbol;
            const nativePriceResult = await fetchTokenPrice(chain.id, nativeSymbol, publicClient);
            const nativeValue = nativePriceResult.price ? Number(formattedBalance) * nativePriceResult.price : undefined;
            
            fetchedBalances.push({
              chainId: chain.id,
              chainName: chain.name,
              symbol: nativeSymbol,
              balance: balance.toString(),
              formattedBalance,
              isConnectedChain: false,
              price: nativePriceResult.price,
              value: nativeValue,
              isEstimatedPrice: nativePriceResult.isEstimated
            });
            
            // Check for token balances if defined for this chain
            if (tokenAddresses[chain.id]) {
              for (const [symbol, tokenInfo] of Object.entries(tokenAddresses[chain.id])) {
                try {
                  const tokenBalance = await publicClient.readContract({
                    address: tokenInfo.address as `0x${string}`,
                    abi: erc20Abi,
                    functionName: 'balanceOf',
                    args: [address as `0x${string}`]
                  });
                  
                  const formattedTokenBalance = formatUnits(tokenBalance, tokenInfo.decimals);
                  
                  // Get token price from Chainlink or estimated price
                  const tokenPriceResult = await fetchTokenPrice(chain.id, symbol, publicClient);
                  const tokenValue = tokenPriceResult.price ? Number(formattedTokenBalance) * tokenPriceResult.price : undefined;
                  
                  fetchedBalances.push({
                    chainId: chain.id,
                    chainName: chain.name,
                    symbol,
                    balance: tokenBalance.toString(),
                    formattedBalance: formattedTokenBalance,
                    tokenName: symbol,
                    tokenAddress: tokenInfo.address,
                    isConnectedChain: false,
                    price: tokenPriceResult.price,
                    value: tokenValue,
                    isEstimatedPrice: tokenPriceResult.isEstimated
                  });
                } catch (tokenError) {
                  console.error(`Error fetching ${symbol} on chain ${chain.name}:`, tokenError);
                }
              }
            }
          } catch (chainError) {
            console.error(`Error fetching balance for chain ${chain.name}:`, chainError);
            // Add a placeholder for failed chains
            fetchedBalances.push({
              chainId: chain.id,
              chainName: chain.name,
              symbol: chain.nativeCurrency.symbol,
              balance: '0',
              formattedBalance: '0',
              isConnectedChain: false
            });
          }
        }

        setBalances(fetchedBalances);
      } catch (e) {
        console.error('Error fetching balances:', e);
        setError('Failed to fetch token balances');
      } finally {
        setLoading(false);
      }
    };

    fetchBalances();
  }, [address, isConnected, currentChainId, connectedChainBalance]);

  if (!isConnected) {
    return <div className="mt-8 text-center">Connect your wallet to see balances</div>;
  }

  // Calculate total portfolio value
  const totalValue = balances
    .filter(b => b.value !== undefined)
    .reduce((sum, balance) => sum + (balance.value || 0), 0);
  
  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">Your Token Balances</h2>
      {loading && <div className="mb-4 text-center">Loading balances...</div>}
      {error && <div className="mb-4 text-center text-red-500">{error}</div>}
      
      {totalValue > 0 && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800">Total Portfolio Value</h3>
          <p className="text-2xl font-bold text-green-900">${totalValue.toFixed(2)} USD</p>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left border-b">Network</th>
              <th className="px-4 py-2 text-left border-b">Chain ID</th>
              <th className="px-4 py-2 text-left border-b">Token</th>
              <th className="px-4 py-2 text-right border-b">Balance</th>
              <th className="px-4 py-2 text-right border-b">Price (USD)</th>
              <th className="px-4 py-2 text-right border-b">Value (USD)</th>
              <th className="px-4 py-2 text-center border-b">Status</th>
            </tr>
          </thead>
          <tbody>
            {balances.length > 0 ? (
              balances.map((balance, index) => (
                <tr 
                  key={`${balance.chainId}-${balance.symbol}-${index}`} 
                  className={`hover:bg-gray-50 ${balance.isConnectedChain ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-4 py-2 border-b">{balance.chainName}</td>
                  <td className="px-4 py-2 border-b">{balance.chainId}</td>
                  <td className="px-4 py-2 border-b">{balance.symbol}</td>
                  <td className="px-4 py-2 text-right border-b">
                    {parseFloat(balance.formattedBalance).toFixed(6)} {balance.symbol}
                  </td>
                  <td className="px-4 py-2 text-right border-b">
                    {balance.price !== undefined ? (
                      <div className="flex items-center justify-end">
                        <span>${balance.price.toFixed(2)}</span>
                        {balance.isEstimatedPrice && (
                          <span className="ml-1 px-1 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">Est.</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right border-b">
                    {balance.value !== undefined ? 
                      <span className="font-medium">${balance.value.toFixed(2)}</span> : 
                      <span className="text-gray-500">-</span>
                    }
                  </td>
                  <td className="px-4 py-2 text-center border-b">
                    {balance.isConnectedChain ? 
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Connected
                      </span> : 
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Read-only
                      </span>
                    }
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-2 text-center">
                  {loading ? 'Fetching balances...' : 'No balances found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>* Price data provided by Chainlink Price Feeds when available, estimated prices otherwise</p>
        <p className="flex items-center mt-1">
          <span className="px-1 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">Est.</span>
          <span className="ml-2">= Estimated price (Chainlink oracle not available)</span>
        </p>
      </div>
    </div>
  );
};

export default TokenBalances;
