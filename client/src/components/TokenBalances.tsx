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
}

// ERC20 ABI for token balances (minimal version for balanceOf)
const erc20Abi = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)'
]);

// Token mapping with addresses and decimals
const tokenAddresses: Record<number, { [symbol: string]: { address: string, decimals: number } }> = {
  11155111: { // Sepolia
    'USDC': { address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', decimals: 6 }
  }
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
            fetchedBalances.push({
              chainId: currentChainId,
              chainName: chain.name,
              symbol: connectedChainBalance.symbol,
              balance: connectedChainBalance.value.toString(),
              formattedBalance: connectedChainBalance.formatted,
              isConnectedChain: true
            });
            
            // If we're on Sepolia, fetch USDC balance using wagmi hooks
            if (currentChainId === 11155111) {
              try {
                const usdcContract = tokenAddresses[11155111]['USDC'];
                
                const publicClient = createPublicClient({
                  chain: chain,
                  transport: http()
                });
                
                const tokenBalance = await publicClient.readContract({
                  address: usdcContract.address as `0x${string}`,
                  abi: erc20Abi,
                  functionName: 'balanceOf',
                  args: [address as `0x${string}`]
                });
                
                fetchedBalances.push({
                  chainId: currentChainId,
                  chainName: chain.name,
                  symbol: 'USDC',
                  balance: tokenBalance.toString(),
                  formattedBalance: formatUnits(tokenBalance, usdcContract.decimals),
                  tokenName: 'USD Coin',
                  tokenAddress: usdcContract.address,
                  isConnectedChain: true
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
            
            fetchedBalances.push({
              chainId: chain.id,
              chainName: chain.name,
              symbol: chain.nativeCurrency.symbol,
              balance: balance.toString(),
              formattedBalance: formatEther(balance),
              isConnectedChain: false
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
                  
                  fetchedBalances.push({
                    chainId: chain.id,
                    chainName: chain.name,
                    symbol,
                    balance: tokenBalance.toString(),
                    formattedBalance: formatUnits(tokenBalance, tokenInfo.decimals),
                    tokenName: symbol,
                    tokenAddress: tokenInfo.address,
                    isConnectedChain: false
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

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">Your Token Balances</h2>
      {loading && <div className="mb-4 text-center">Loading balances...</div>}
      {error && <div className="mb-4 text-center text-red-500">{error}</div>}
      
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left border-b">Network</th>
              <th className="px-4 py-2 text-left border-b">Chain ID</th>
              <th className="px-4 py-2 text-left border-b">Token</th>
              <th className="px-4 py-2 text-right border-b">Balance</th>
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
                <td colSpan={5} className="px-4 py-2 text-center">
                  {loading ? 'Fetching balances...' : 'No balances found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TokenBalances;
