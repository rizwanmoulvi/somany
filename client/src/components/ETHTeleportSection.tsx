import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { UnifiedTeleport } from './UnifiedTeleport';
import { TokenBalance } from '../store/tokenStore';
import { formatTokenAmount, formatCurrency, getChainIconUrl } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Zap, ExternalLink } from 'lucide-react';

// Supported teleport chains
const TELEPORT_CONFIGS = {
  11155111: { // Ethereum Sepolia
    name: "Ethereum Sepolia",
    symbol: "ETH",
    lockContract: "0x1231A2cf8D00167BB108498B81ee37a05Df4e12F",
    explorerUrl: "https://sepolia.etherscan.io"
  },
  84532: { // Base Sepolia
    name: "Base Sepolia", 
    symbol: "ETH",
    lockContract: "0x983e5918fa2335a004f28E7901aBDd3f2C2324dF",
    explorerUrl: "https://base-sepolia.blockscout.com"
  }
};

interface ETHTeleportSectionProps {
  balances: TokenBalance[];
  itemVariants: any;
}

interface ChainBalance {
  chainId: number;
  balance: string;
  value: number;
  price: number;
}

export const ETHTeleportSection: React.FC<ETHTeleportSectionProps> = memo(({
  balances,
  itemVariants
}) => {
  // Filter for teleportable ETH balances
  const teleportableBalances = balances.filter(balance => 
    TELEPORT_CONFIGS[balance.chainId as keyof typeof TELEPORT_CONFIGS] && 
    balance.symbol === 'ETH' && 
    !balance.tokenAddress &&
    parseFloat(balance.formattedBalance) > 0
  );

  // Convert to format expected by UnifiedTeleport
  const chainBalances: ChainBalance[] = teleportableBalances.map(balance => ({
    chainId: balance.chainId,
    balance: balance.formattedBalance,
    value: balance.value || 0,
    price: balance.price || 0
  }));

  // If no teleportable balances, don't render
  if (teleportableBalances.length === 0) {
    return null;
  }

  // Calculate total ETH and value
  const totalETH = teleportableBalances.reduce((sum, balance) => 
    sum + parseFloat(balance.formattedBalance), 0
  );
  const totalValue = teleportableBalances.reduce((sum, balance) => 
    sum + (balance.value || 0), 0
  );

  return (
    <motion.div
      variants={itemVariants}
      className="mb-6"
    >
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50/30 to-purple-50/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              <span>ETH Teleport Center</span>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                {teleportableBalances.length} chains
              </Badge>
            </div>
            <div className="text-right text-sm">
              <div className="font-medium">
                {formatTokenAmount(totalETH.toString())} ETH
              </div>
              <div className="text-muted-foreground">
                {formatCurrency(totalValue)}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Chain Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {teleportableBalances.map((balance) => {
              const config = TELEPORT_CONFIGS[balance.chainId as keyof typeof TELEPORT_CONFIGS];
              
              return (
                <div 
                  key={balance.chainId}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/50 border"
                >
                  <div className="flex items-center gap-3">
                    <img 
                      src={getChainIconUrl(balance.chainId)} 
                      alt={balance.chainName}
                      className="h-8 w-8 rounded-full border"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${balance.chainName.slice(0,2)}&background=random&color=fff&size=64`;
                      }}
                    />
                    <div>
                      <div className="font-medium text-sm">{config.name}</div>
                      <div className="text-xs text-muted-foreground">
                        ID: {balance.chainId}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium text-sm">
                      {formatTokenAmount(balance.formattedBalance)} ETH
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {balance.value ? formatCurrency(balance.value) : '—'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Unified Teleport Interface */}
          <UnifiedTeleport 
            key="unified-teleport-stable" // Stable key to prevent remounting
            chainBalances={chainBalances}
            onTeleportComplete={() => {
              // Additional refresh when teleports complete
              console.log('All teleports completed! ETH balances will refresh automatically.');
            }}
          />

          {/* Explorer Links */}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {teleportableBalances.map((balance) => {
              const config = TELEPORT_CONFIGS[balance.chainId as keyof typeof TELEPORT_CONFIGS];
              
              return (
                <a
                  key={balance.chainId}
                  href={`${config.explorerUrl}/address/${config.lockContract}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                >
                  View {config.name} contract
                  <ExternalLink className="h-3 w-3" />
                </a>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});