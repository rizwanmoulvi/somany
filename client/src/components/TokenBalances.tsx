import React, { useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { useTokenBalances } from '../hooks/useTokenBalances';
import { useTokenStore } from '../store/tokenStore';
import { formatCurrency } from '../lib/utils';
import { cn } from '../lib/utils';
import TokenBalanceItem from './TokenBalanceItem';
import TeleportedNetwork from './TeleportedNetwork';

const TokenBalances: React.FC = () => {
  const { isConnected } = useAccount();
  const { data: balances, isLoading, error } = useTokenBalances();
  
  const { 
    setBalances, 
    setDustTokens, 
    totalPortfolioValue, 
    dustTokens,
    dustThresholdUSD 
  } = useTokenStore();

  useEffect(() => {
    if (balances) {
      setBalances(balances);
      
      // Identify and set dust tokens
      const dustCandidates = balances
        .filter(token => token.value && token.value < dustThresholdUSD && token.value > 0.01)
        .map(token => ({
          ...token,
          isDust: true,
          isSelected: false,
          conversionEstimate: token.value ? token.value * 0.85 : 0
        }));
      
      setDustTokens(dustCandidates);
    }
  }, [balances, setBalances, setDustTokens, dustThresholdUSD]);

  if (!isConnected) {
    return (
      <div className="w-full max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <Card className="relative overflow-hidden border-dashed border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-purple-50/30">
            <CardContent className="py-16 px-8">
              {/* Background decoration */}
              <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
              
              {/* Content */}
              <div className="relative z-10">
                <motion.div
                  className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-6"
                  animate={{ 
                    rotate: [0, 5, -5, 0],
                    scale: [1, 1.05, 1]
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <Wallet className="h-10 w-10 text-primary" />
                </motion.div>
                
                <h3 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                  Connect Your Wallet
                </h3>
                
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
                  Connect your wallet to discover and aggregate your token balances across{' '}
                  <span className="font-semibold text-foreground">multiple blockchain networks</span>.
                  Start your dust aggregation journey today.
                </p>

                {/* Feature preview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                  <motion.div
                    className="flex items-center gap-3 p-4 bg-background/50 rounded-lg border border-primary/10"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium">Multi-Chain Detection</span>
                  </motion.div>
                  
                  <motion.div
                    className="flex items-center gap-3 p-4 bg-background/50 rounded-lg border border-primary/10"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium">Real-Time Pricing</span>
                  </motion.div>
                  
                  <motion.div
                    className="flex items-center gap-3 p-4 bg-background/50 rounded-lg border border-primary/10"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium">Dust Aggregation</span>
                  </motion.div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      className="w-full max-w-6xl mx-auto mt-8 space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Teleported Network */}
      {isConnected && (
        <TeleportedNetwork />
      )}
      
      {/* Portfolio Overview */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Portfolio Overview
            </CardTitle>
            <CardDescription>
              Your token balances across multiple blockchain networks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <motion.div 
                className="text-center p-6 rounded-lg bg-muted/30 border"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Portfolio Value</p>
                  <div className="text-4xl font-bold">
                    {isLoading ? (
                      <Skeleton className="h-12 w-40 mx-auto" />
                    ) : (
                      formatCurrency(totalPortfolioValue)
                    )}
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                className="text-center p-6 rounded-lg bg-muted/30 border"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Networks</p>
                  <div className="text-3xl font-bold">
                    {isLoading ? (
                      <Skeleton className="h-10 w-16 mx-auto" />
                    ) : (
                      balances?.reduce((acc, balance, index, arr) => 
                        acc + (arr.findIndex(b => b.chainId === balance.chainId) === index ? 1 : 0), 0
                      ) || 0
                    )}
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                className="text-center p-6 rounded-lg bg-muted/30 border"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1">
                    <Sparkles className="h-4 w-4" />
                    Dust Tokens
                  </p>
                  <div className="text-3xl font-bold">
                    {isLoading ? (
                      <Skeleton className="h-10 w-16 mx-auto" />
                    ) : (
                      dustTokens.length
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Token Balances */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Token Balances</CardTitle>
            <CardDescription>
              Live balances with real-time pricing from Chainlink oracles
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-destructive">Failed to fetch token balances</p>
                <p className="text-sm text-muted-foreground mt-1">{String(error)}</p>
              </div>
            ) : balances && balances.length > 0 ? (
              <div className="space-y-2">
                {balances.map((balance) => {
                  const isDust = dustTokens.some(dust => 
                    dust.chainId === balance.chainId && dust.symbol === balance.symbol
                  );
                  
                  return (
                    <TokenBalanceItem 
                      key={`${balance.chainId}-${balance.symbol}-${balance.tokenAddress || 'native'}`}
                      balance={balance}
                      isDust={isDust}
                      itemVariants={itemVariants}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No token balances found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Footer Note */}
      <motion.div variants={itemVariants} className="text-center">
        <p className="text-xs text-muted-foreground">
          * Price data provided by Chainlink Price Feeds when available, estimated prices otherwise
        </p>
      </motion.div>
    </motion.div>
  );
};

export default TokenBalances;
