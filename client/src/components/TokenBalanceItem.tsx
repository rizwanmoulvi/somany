import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Sparkles, Zap } from 'lucide-react';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';
import { Button } from './ui/button';
import { TeleportToken } from './TeleportToken';
import { TokenBalance } from '../store/tokenStore';
import { formatCurrency, formatTokenAmount, getBlockExplorerUrl, cn } from '../lib/utils';

interface TokenBalanceItemProps {
  balance: TokenBalance;
  isDust: boolean;
  itemVariants: any;
}

const TokenBalanceItem: React.FC<TokenBalanceItemProps> = ({ balance, isDust, itemVariants }) => {
  // Ethereum Sepolia Chain ID
  const SEPOLIA_CHAIN_ID = 11155111;
  const LOCK_CONTRACT_ADDRESS = "0x1231A2cf8D00167BB108498B81ee37a05Df4e12F";
  
  // Check if this token can be teleported (native ETH on Sepolia)
  const canTeleport = balance.chainId === SEPOLIA_CHAIN_ID && 
                      balance.symbol === 'ETH' && 
                      !balance.tokenAddress;
  
  // State for teleport functionality (per token)
  const [teleportPercentage, setTeleportPercentage] = useState(50);
  const [isTeleporting, setIsTeleporting] = useState(false);
  
  // Calculate teleport amount based on percentage
  const maxValueNumber = parseFloat(balance.formattedBalance);
  const teleportAmount = (maxValueNumber * teleportPercentage) / 100;
  const formattedTeleportAmount = teleportAmount.toFixed(6);

  return (
    <motion.div
      key={`${balance.chainId}-${balance.symbol}-${balance.tokenAddress || 'native'}`}
      variants={itemVariants}
      className={cn(
        "p-4 border rounded-lg transition-colors hover:bg-muted/50",
        balance.isConnectedChain && "bg-primary/5 border-primary/20",
        isDust && "border-yellow-200 bg-yellow-50/50",
        canTeleport && "border-blue-200 bg-blue-50/20"
      )}
    >
      <div className="flex items-center justify-between">
        {/* Left: Token Info */}
        <div className="w-1/4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold">
              {balance.symbol.slice(0, 3)}
            </span>
          </div>
          
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1">
              <span className="font-medium truncate">{balance.symbol}</span>
              {balance.isConnectedChain && (
                <Badge variant="success" className="text-xs">
                  Connected
                </Badge>
              )}
              {isDust && (
                <Badge variant="warning" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Dust
                </Badge>
              )}
              {balance.isEstimatedPrice && (
                <Badge variant="outline" className="text-xs">
                  Est. Price
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {balance.chainName} (ID: {balance.chainId})
            </p>
          </div>
        </div>
        
        {/* Middle: Teleport Controls */}
        <div className="w-1/2 px-4">
          {canTeleport ? (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">{formattedTeleportAmount} ETH</span>
                  <span className="text-muted-foreground">{teleportPercentage}%</span>
                </div>
                <Slider
                  value={[teleportPercentage]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(value: number[]) => setTeleportPercentage(value[0])}
                  className="my-1"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0</span>
                  <span>{formatTokenAmount(balance.formattedBalance)}</span>
                </div>
              </div>
              <Button 
                variant="default"
                size="sm"
                className="whitespace-nowrap"
                onClick={() => {
                  // Get a reference to the hidden TeleportToken component and click it
                  const teleportButtons = document.querySelectorAll('button');
                  teleportButtons.forEach(btn => {
                    if (btn.textContent?.includes(`Teleport ${formattedTeleportAmount}`)) {
                      btn.click();
                    }
                  });
                }}
                disabled={isTeleporting || teleportAmount <= 0}
              >
                <Zap className="mr-1 h-3 w-3" />
                {isTeleporting ? "Sending..." : "Teleport"}
              </Button>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <span className="text-xs text-muted-foreground italic">
                Not eligible for teleport
              </span>
            </div>
          )}
        </div>
        
        {/* Right: Prices/Balance */}
        <div className="w-1/4 text-right space-y-1">
          <div className="font-medium">
            {formatTokenAmount(balance.formattedBalance)} {balance.symbol}
          </div>
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs text-muted-foreground">
              {balance.price ? formatCurrency(balance.price) : '—'}
            </span>
            {balance.tokenAddress && (
              <a
                href={getBlockExplorerUrl(balance.chainId, balance.tokenAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <div className="font-semibold text-sm">
            {balance.value ? formatCurrency(balance.value) : '—'}
          </div>
        </div>
      </div>
      
      {/* Hidden TeleportToken component to handle the actual contract interaction */}
      {canTeleport && (
        <div className="hidden">
          <TeleportToken
            chainId={balance.chainId}
            tokenSymbol={balance.symbol}
            maxAmount={formattedTeleportAmount} // Use the amount from the slider
            contractAddress={LOCK_CONTRACT_ADDRESS}
            onTeleportStart={() => setIsTeleporting(true)}
            onTeleportComplete={() => {
              setIsTeleporting(false);
              // You could add toast notification or other feedback here
            }}
            onTeleportError={(error) => {
              setIsTeleporting(false);
              console.error('Teleport failed:', error);
            }}
          />
        </div>
      )}
    </motion.div>
  );
};

export default TokenBalanceItem;
