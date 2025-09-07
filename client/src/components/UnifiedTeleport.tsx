import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseEther } from 'viem';
import { useAccount, useChainId, useWriteContract, useSwitchChain } from 'wagmi';
import { sepolia, baseSepolia } from 'wagmi/chains';
import { Zap, Check, Clock, AlertCircle, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useTokenBalances } from '../hooks/useTokenBalances';
import { useTokenStore } from '../store/tokenStore';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { formatTokenAmount, formatCurrency } from '../lib/utils';

// Chain configurations
const TELEPORT_CONFIGS = {
  11155111: { // Ethereum Sepolia
    name: "Ethereum Sepolia",
    symbol: "ETH",
    lockContract: "0x1231A2cf8D00167BB108498B81ee37a05Df4e12F",
    icon: "⟠"
  },
  84532: { // Base Sepolia
    name: "Base Sepolia", 
    symbol: "ETH",
    lockContract: "0x983e5918fa2335a004f28E7901aBDd3f2C2324dF",
    icon: "🔵"
  }
};

// EthLock ABI
const lockAbi = [
  {
    inputs: [],
    name: 'lock',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
];

interface ChainBalance {
  chainId: number;
  balance: string;
  value: number;
  price: number;
}

interface UnifiedTeleportProps {
  chainBalances: ChainBalance[];
  onTeleportComplete?: () => void;
}

type TeleportStep = 'config' | 'executing' | 'completed';
type TransactionStatus = 'pending' | 'switching' | 'signing' | 'confirming' | 'completed' | 'error';

interface ChainProgress {
  chainId: number;
  status: TransactionStatus;
  txHash?: string;
  error?: string;
  amount: string;
}

export const UnifiedTeleport: React.FC<UnifiedTeleportProps> = ({
  chainBalances,
  onTeleportComplete
}) => {
  const { address, isConnected } = useAccount();
  const currentChainId = useChainId();
  const { refetch: refetchBalances } = useTokenBalances();
  const { triggerTeleportRefresh } = useTokenStore();
  const queryClient = useQueryClient();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();

  // State - using refs and stable state to prevent refreshes during chain switches
  const [step, setStep] = useState<TeleportStep>('config');
  const [chainAmounts, setChainAmounts] = useState<Record<number, { percentage: number; amount: string }>>({});
  const [chainProgress, setChainProgress] = useState<ChainProgress[]>([]);
  const [currentExecutingChain, setCurrentExecutingChain] = useState<number | null>(null);
  
  // Use ref for execution chain to avoid triggering re-renders during switches
  const executionChainIdRef = useRef<number>(currentChainId);
  const isExecutingRef = useRef<boolean>(false);
  
  // Stable initial chain ID - don't update during execution
  const [initialChainId] = useState<number>(currentChainId);

  // Initialize chain amounts - only when not executing to prevent disruption
  useEffect(() => {
    // Don't reinitialize during execution
    if (isExecutingRef.current) return;
    
    const initialAmounts: Record<number, { percentage: number; amount: string }> = {};
    chainBalances.forEach(({ chainId, balance }) => {
      if (TELEPORT_CONFIGS[chainId as keyof typeof TELEPORT_CONFIGS] && parseFloat(balance) > 0) {
        initialAmounts[chainId] = {
          percentage: 50,
          amount: (parseFloat(balance) * 0.5).toFixed(6)
        };
      }
    });
    setChainAmounts(initialAmounts);
    executionChainIdRef.current = currentChainId; // Update ref without triggering re-render
  }, [chainBalances]);

  // Only update execution chain ref when not executing
  useEffect(() => {
    if (!isExecutingRef.current) {
      executionChainIdRef.current = currentChainId;
    }
  }, [currentChainId]);

  // Update amount when percentage changes
  const updateChainAmount = (chainId: number, percentage: number) => {
    const chainBalance = chainBalances.find(b => b.chainId === chainId);
    if (chainBalance) {
      const amount = (parseFloat(chainBalance.balance) * percentage / 100).toFixed(6);
      setChainAmounts(prev => ({
        ...prev,
        [chainId]: { percentage, amount }
      }));
    }
  };

  // Calculate total value
  const totalValue = Object.entries(chainAmounts).reduce((total, [chainId, { amount }]) => {
    const chainBalance = chainBalances.find(b => b.chainId === Number(chainId));
    return total + (parseFloat(amount) * (chainBalance?.price || 0));
  }, 0);

  // Get chains with amounts > 0
  const activeTeleports = Object.entries(chainAmounts).filter(([_, { amount }]) => parseFloat(amount) > 0);

  // Poll relayer for mint completions
  const pollForMintCompletions = async (expectedMints: number) => {
    if (!address) return;
    
    let completedMints = 0;
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes total
    const pollInterval = 2000; // 2 seconds between polls
    const relayerUrl = process.env.NEXT_PUBLIC_RELAYER_URL || 'http://localhost:3001';
    
    const poll = async (): Promise<void> => {
      attempts++;
      console.log(`Checking relayer for mint completions (attempt ${attempts}/${maxAttempts})...`);
      
      try {
        // Check if relayer has completed a mint for this user
        const response = await fetch(`${relayerUrl}/api/mint-status/${address}`);
        const data = await response.json();
        
        if (data.completed) {
          completedMints++;
          console.log(`Relayer confirmed mint completion ${completedMints}/${expectedMints}:`, data);
          
          toast.success(`Mint completed from ${data.sourceChain}! (${completedMints}/${expectedMints})`, {
            duration: 2000
          });
          
          // If we've received all expected mints, refresh balances and complete
          if (completedMints >= expectedMints) {
            console.log('All mints completed, refreshing balances...');
            
            // Force refresh all balances
            queryClient.invalidateQueries({ queryKey: ['tokenBalances'] });
            await refetchBalances();
            triggerTeleportRefresh();
            
            toast.success('All teleports processed! Balances updated! ✨', {
              duration: 3000
            });
            
            if (onTeleportComplete) onTeleportComplete();
            // Reset execution flag after all completions
            isExecutingRef.current = false;
            return;
          }
        }
        
        // Continue polling if we haven't received all mints yet
        if (attempts >= maxAttempts) {
          console.warn('Timeout waiting for all mint completions');
          toast('⚠️ Some mints may still be processing. Check balances in a moment.', {
            duration: 3000
          });
          
          // Still refresh balances in case some completed
          queryClient.invalidateQueries({ queryKey: ['tokenBalances'] });
          await refetchBalances();
          triggerTeleportRefresh();
          
          if (onTeleportComplete) onTeleportComplete();
          // Reset execution flag after timeout
          isExecutingRef.current = false;
          return;
        }
        
        // Schedule next poll
        setTimeout(poll, pollInterval);
      } catch (error) {
        console.error('Error checking relayer status:', error);
        if (attempts >= maxAttempts) {
          toast.error('Unable to confirm all completions. Please check balances manually.', {
            duration: 3000
          });
          
          // Still refresh balances
          queryClient.invalidateQueries({ queryKey: ['tokenBalances'] });
          await refetchBalances();
          triggerTeleportRefresh();
          
          if (onTeleportComplete) onTeleportComplete();
          // Reset execution flag on error
          isExecutingRef.current = false;
        } else {
          setTimeout(poll, pollInterval);
        }
      }
    };
    
    // Start polling after a short delay to allow transactions to be mined
    setTimeout(poll, 3000);
  };

  // Execute teleports
  const executeTeleports = async () => {
    if (!isConnected || activeTeleports.length === 0) return;

    // Mark as executing to prevent component refreshes
    isExecutingRef.current = true;
    
    setStep('executing');
    const initialProgress: ChainProgress[] = activeTeleports.map(([chainId, { amount }]) => ({
      chainId: Number(chainId),
      status: 'pending',
      amount
    }));
    setChainProgress(initialProgress);

    // Show initial toast
    toast.loading(`Starting teleport from ${activeTeleports.length} chains...`, {
      id: 'unified-teleport',
      duration: Infinity
    });

    // Execute each chain sequentially
    for (let i = 0; i < activeTeleports.length; i++) {
      const [chainIdStr, { amount }] = activeTeleports[i];
      const chainId = Number(chainIdStr);
      const config = TELEPORT_CONFIGS[chainId as keyof typeof TELEPORT_CONFIGS];
      
      if (!config) continue;

      setCurrentExecutingChain(chainId);
      
      try {
        // Update progress: switching chain
        setChainProgress(prev => prev.map(p => 
          p.chainId === chainId ? { ...p, status: 'switching' } : p
        ));

        toast.loading(`Step ${i + 1}/${activeTeleports.length}: Switch to ${config.name}`, {
          id: 'unified-teleport',
          duration: Infinity
        });

        // Switch to target chain if needed
        if (executionChainIdRef.current !== chainId) {
          // Get the proper chain object from wagmi
          const targetChain = chainId === 11155111 ? sepolia : baseSepolia;
          console.log(`Switching from chain ${executionChainIdRef.current} to ${targetChain.id} (${targetChain.name})`);
          
          await switchChainAsync({ chainId: targetChain.id });
          // Update our execution chain ref (no re-render)
          executionChainIdRef.current = targetChain.id;
          // Wait for the switch to complete
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          console.log(`Chain switch completed for ${config.name}`);
        }

        // Update progress: signing transaction
        setChainProgress(prev => prev.map(p => 
          p.chainId === chainId ? { ...p, status: 'signing' } : p
        ));

        toast.loading(`Step ${i + 1}/${activeTeleports.length}: Sign transaction on ${config.name}`, {
          id: 'unified-teleport',
          duration: Infinity
        });

        // Execute transaction (wagmi handles chainId automatically based on current chain)
        console.log(`Executing lock transaction on ${config.name}:`, {
          contract: config.lockContract,
          amount: amount,
          chainId: chainId
        });
        
        const txHash = await writeContractAsync({
          address: config.lockContract as `0x${string}`,
          abi: lockAbi,
          functionName: 'lock',
          value: parseEther(amount)
        });
        
        console.log(`Transaction sent on ${config.name}:`, txHash);

        // Update progress: confirming
        setChainProgress(prev => prev.map(p => 
          p.chainId === chainId ? { ...p, status: 'confirming', txHash } : p
        ));

        toast.loading(`Step ${i + 1}/${activeTeleports.length}: Confirming on ${config.name}...`, {
          id: 'unified-teleport',
          duration: Infinity
        });

        // Wait for transaction confirmation (we don't wait for relayer here)
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Update progress: completed
        setChainProgress(prev => prev.map(p => 
          p.chainId === chainId ? { ...p, status: 'completed' } : p
        ));

      } catch (error: any) {
        console.error(`Error teleporting from ${config.name}:`, error);
        setChainProgress(prev => prev.map(p => 
          p.chainId === chainId ? { ...p, status: 'error', error: error.message } : p
        ));
        
        toast.error(`Failed on ${config.name}: ${error.shortMessage || error.message}`, {
          id: 'unified-teleport',
          duration: 5000
        });
        
        // Reset execution flag on error
        isExecutingRef.current = false;
        return; // Stop execution on error
      }
    }

    // All completed successfully
    setCurrentExecutingChain(null);
    setStep('completed');
    
    toast.success(`Successfully teleported from ${activeTeleports.length} chains! 🚀`, {
      id: 'unified-teleport',
      duration: 3000
    });

    // Poll relayer for mint completions
    await pollForMintCompletions(activeTeleports.length);
    
    // Reset execution flag after completion
    isExecutingRef.current = false;
  };

  // Reset to configuration
  const resetTeleport = () => {
    setStep('config');
    setChainProgress([]);
    setCurrentExecutingChain(null);
    // Reset execution flag
    isExecutingRef.current = false;
    // Reset execution chain ref to current chain
    executionChainIdRef.current = currentChainId;
  };

  if (step === 'config') {
    return (
      <Card className="w-full border-blue-200 bg-gradient-to-br from-blue-50/30 to-purple-50/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            Multi-Chain Teleport
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Set amounts for each chain and teleport them all in sequence
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Chain Configuration */}
          <div className="space-y-4">
            {chainBalances.map(({ chainId, balance, price }) => {
              const config = TELEPORT_CONFIGS[chainId as keyof typeof TELEPORT_CONFIGS];
              const chainAmount = chainAmounts[chainId];
              
              if (!config || parseFloat(balance) <= 0) return null;

              return (
                <div key={chainId} className="p-4 rounded-lg border bg-white/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{config.icon}</span>
                      <div>
                        <h4 className="font-medium">{config.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Balance: {formatTokenAmount(balance)} ETH
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {chainAmount ? formatTokenAmount(chainAmount.amount) : '0'} ETH
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {chainAmount ? formatCurrency(parseFloat(chainAmount.amount) * price) : '$0'}
                      </div>
                    </div>
                  </div>
                  
                  {chainAmount && (
                    <>
                      <Slider
                        value={[chainAmount.percentage]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(value) => updateChainAmount(chainId, value[0])}
                        className="my-3"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0%</span>
                        <span>{chainAmount.percentage}%</span>
                        <span>100%</span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary */}
          {activeTeleports.length > 0 && (
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <h4 className="font-medium mb-2">Teleport Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Total Chains:</span>
                  <span className="font-medium">{activeTeleports.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Value:</span>
                  <span className="font-medium">{formatCurrency(totalValue)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          <Button 
            onClick={executeTeleports}
            disabled={!isConnected || activeTeleports.length === 0}
            className="w-full"
            size="lg"
          >
            <Zap className="mr-2 h-4 w-4" />
            Start Multi-Chain Teleport ({activeTeleports.length} chains)
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border-blue-200 bg-gradient-to-br from-blue-50/30 to-purple-50/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-600" />
          {step === 'executing' ? 'Executing Teleports...' : 'Teleport Complete!'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Overview */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span>Progress</span>
            <span>{chainProgress.filter(p => p.status === 'completed').length} / {chainProgress.length}</span>
          </div>
          <Progress 
            value={(chainProgress.filter(p => p.status === 'completed').length / chainProgress.length) * 100} 
            className="h-2"
          />
        </div>

        {/* Chain Progress */}
        <div className="space-y-3">
          {chainProgress.map(({ chainId, status, txHash, error, amount }) => {
            const config = TELEPORT_CONFIGS[chainId as keyof typeof TELEPORT_CONFIGS];
            const isCurrentlyExecuting = currentExecutingChain === chainId;
            
            return (
              <motion.div
                key={chainId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-3 rounded-lg border ${
                  isCurrentlyExecuting ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{config?.icon}</span>
                    <div>
                      <div className="font-medium">{config?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatTokenAmount(amount)} ETH
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {status === 'pending' && (
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        Waiting
                      </Badge>
                    )}
                    {status === 'switching' && (
                      <Badge variant="outline">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Switching
                      </Badge>
                    )}
                    {status === 'signing' && (
                      <Badge variant="outline">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Sign Transaction
                      </Badge>
                    )}
                    {status === 'confirming' && (
                      <Badge variant="outline">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Confirming
                      </Badge>
                    )}
                    {status === 'completed' && (
                      <Badge variant="default" className="bg-green-500">
                        <Check className="h-3 w-3 mr-1" />
                        Complete
                      </Badge>
                    )}
                    {status === 'error' && (
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Error
                      </Badge>
                    )}
                  </div>
                </div>
                
                {txHash && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    TX: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                  </div>
                )}
                {error && (
                  <div className="mt-2 text-xs text-red-600">
                    {error}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          {step === 'completed' && (
            <Button onClick={resetTeleport} variant="outline" className="flex-1">
              Teleport Again
            </Button>
          )}
          {step === 'executing' && (
            <Button disabled className="flex-1">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};