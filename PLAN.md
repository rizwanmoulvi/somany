# SoMany Dust Aggregation Protocol - Implementation Plan

## Project Vision

SoMany solves the universal DeFi problem of dust tokens - small, worthless token balances scattered across multiple chains that users cannot efficiently convert or utilize. Our protocol aggregates these dust tokens and converts them into SOMI tokens on the Somnia blockchain, providing real value recovery from otherwise unusable assets.

## Top-to-Bottom User Flow

### Current State: Multi-Chain Dust Problem
```
User has scattered dust tokens:
├── Ethereum: 0.01 LINK ($0.15), 0.5 UNI ($3.20), 50 SHIB ($0.45)
├── Polygon: 0.3 MATIC ($0.25), 1000 QUICK ($0.80)
├── Arbitrum: 0.001 ARB ($0.85), 0.02 GMX ($1.40)
├── Base: 0.1 DEGEN ($0.35), 5 AERO ($2.10)
└── Optimism: 0.05 OP ($0.90), 10 VELO ($0.75)

Total Value: ~$11.20 across 10 tokens on 5 chains
Problem: Each conversion would cost $5-15 in gas fees
Result: Dust tokens remain worthless and unused
```

### SoMany Solution: One-Click Aggregation Flow

#### Phase 1: Detection & Planning
```
1. Multi-Chain Scanning
   ├── Connect wallet via RainbowKit
   ├── Scan all configured chains for token balances
   ├── Identify dust tokens (< $5 USD value)
   ├── Check DEX liquidity for each token
   └── Calculate potential SOMI output

2. Smart Route Planning  
   ├── Group tokens by chain for batch processing
   ├── Find optimal DEX routes (1inch, Uniswap, etc.)
   ├── Plan cross-chain bridges to Somnia
   ├── Estimate gas costs and execution time
   └── Generate atomic transaction batches (EIP-5792)
```

#### Phase 2: Atomic Execution (Revolutionary UX)
```
3. One-Click Aggregation
   User clicks "Aggregate All Dust" →
   
   EIP-5792 Atomic Batch Execution:
   ┌─ Chain 1 (Ethereum) ────────────────┐
   │ ├── Approve LINK for DEX             │
   │ ├── Swap LINK → USDC                 │  
   │ ├── Approve UNI for DEX              │
   │ ├── Swap UNI → USDC                  │
   │ ├── Approve SHIB for DEX             │
   │ ├── Swap SHIB → USDC                 │
   │ ├── Approve USDC for bridge          │
   │ └── Bridge USDC to Somnia            │
   └───────────────────────────────────────┘
   
   ┌─ Chain 2 (Polygon) ─────────────────┐
   │ ├── Approve MATIC for DEX            │
   │ ├── Swap MATIC → USDC               │
   │ ├── Approve QUICK for DEX            │
   │ ├── Swap QUICK → USDC               │
   │ ├── Approve USDC for bridge          │
   │ └── Bridge USDC to Somnia            │
   └───────────────────────────────────────┘
   
   [Similar batches for Arbitrum, Base, Optimism]
   
   ┌─ Final Step (Somnia) ───────────────┐
   │ ├── Receive all bridged USDC         │
   │ ├── Approve USDC for Somnia DEX      │
   │ └── Swap USDC → SOMI tokens          │
   └───────────────────────────────────────┘

   Result: Single confirmation, all-or-nothing execution
   User receives: ~$8.50 worth of SOMI tokens
   (After ~$2.70 in optimized gas costs)
```

#### Phase 3: Value Realization
```
4. SOMI Token Utility
   ├── Hold SOMI for governance voting
   ├── Stake SOMI for yield generation  
   ├── Use SOMI in Somnia ecosystem dApps
   ├── Provide SOMI liquidity for trading fees
   └── Convert back to major tokens when needed
```

---

## Technical Implementation Strategy

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                      │
├─────────────────────────────────────────────────────────────┤
│  Multi-Chain Detection  │  EIP-5792 Integration  │  UI/UX  │
├─────────────────────────────────────────────────────────────┤
│                    Backend Services Layer                   │
├─────────────────────────────────────────────────────────────┤
│  DEX Aggregators   │  Bridge Services   │  Price Oracles   │
├─────────────────────────────────────────────────────────────┤
│                    Blockchain Layer                        │
├─────────────────────────────────────────────────────────────┤
│  Ethereum  │  Polygon  │  Arbitrum  │  Base  │  Somnia    │
└─────────────────────────────────────────────────────────────┘
```

### Core Technologies Stack

#### Frontend Foundation (Existing)
- **Next.js 15**: React framework with SSR
- **RainbowKit 2.2+**: Wallet connection and management  
- **wagmi 2.15+**: React hooks for Ethereum interactions
- **viem 2.29**: Low-level Ethereum client
- **TypeScript 5.5**: Type safety across the application

#### New Integrations Required
- **EIP-5792**: Atomic transaction batching
- **DEX Aggregators**: 1inch, ParaSwap, 0x Protocol
- **Bridge Protocols**: LayerZero, Axelar, Wormhole
- **Chainlink Oracles**: Real-time price feeds (already integrated)

### Implementation Phases

#### Phase 1: Enhanced Token Detection (Weeks 1-2)
**Current State**: Basic balance detection across testnets
**Enhancement**: Production-ready multi-chain dust detection

```typescript
interface DustDetectionService {
  // Scan all chains for token balances
  scanUserTokens(address: string): Promise<TokenBalance[]>;
  
  // Identify dust tokens based on USD value
  identifyDustTokens(tokens: TokenBalance[]): Promise<DustToken[]>;
  
  // Check DEX liquidity availability
  validateLiquidity(token: DustToken): Promise<boolean>;
  
  // Estimate conversion potential
  estimateConversion(dustTokens: DustToken[]): Promise<ConversionEstimate>;
}

// Enhanced dust detection with liquidity checks
const dustTokens = await dustDetector.identifyDustTokens(allTokens, {
  dustThresholdUSD: 5.0,
  minLiquidityUSD: 1000,
  excludeStablecoins: true,
  excludeNativeTokens: false
});
```

**Deliverables:**
- Enhanced `TokenBalances` component with dust identification
- Liquidity validation service
- Conversion estimation engine
- Gas cost calculator

#### Phase 2: EIP-5792 Atomic Batching (Weeks 3-5)
**Core Innovation**: Transform multi-step process into single atomic transaction

```typescript
class AtomicDustAggregator {
  // Check wallet's EIP-5792 capabilities
  async checkCapabilities(): Promise<WalletCapabilities> {
    const capabilities = await walletClient.getCapabilities();
    return {
      supportsAtomic: capabilities.atomic === 'supported',
      supportsPaymaster: capabilities.paymasterService?.supported,
      supportsAuxiliaryFunds: capabilities.auxiliaryFunds?.supported
    };
  }

  // Build atomic batch for dust conversion
  async buildAtomicBatch(dustTokens: DustToken[]): Promise<BatchCall[]> {
    const calls: BatchCall[] = [];
    
    for (const token of dustTokens) {
      // Add approve call
      calls.push(this.buildApproveCall(token));
      
      // Add swap call  
      calls.push(await this.buildSwapCall(token));
    }
    
    // Add bridge calls
    calls.push(...await this.buildBridgeCalls());
    
    // Add final SOMI conversion
    calls.push(await this.buildSOMIConversionCall());
    
    return calls;
  }

  // Execute atomic batch with EIP-5792
  async executeAtomicAggregation(batchCalls: BatchCall[]): Promise<string> {
    const batchId = await walletClient.sendCalls({
      version: "2.0.0",
      chainId: getCurrentChainId(),
      calls: batchCalls,
      capabilities: {
        atomic: { required: true }
      }
    });
    
    return batchId;
  }
}
```

**Deliverables:**
- EIP-5792 integration with wagmi/viem
- Atomic batch builder service
- Transaction status monitoring
- Fallback to sequential execution

#### Phase 3: DEX Integration Layer (Weeks 4-7)
**Multi-DEX Aggregation**: Find optimal swap routes across all major DEXs

```typescript
class DEXAggregationService {
  private aggregators = {
    ethereum: new OneInchAggregator(),
    polygon: new ParaSwapAggregator(),
    arbitrum: new ZeroXAggregator(),
    base: new UniswapAggregator(),
    optimism: new VelodromeAggregator()
  };

  // Get best swap route across all DEXs
  async getBestRoute(token: DustToken): Promise<SwapRoute> {
    const aggregator = this.aggregators[token.chainId];
    
    const routes = await Promise.allSettled([
      aggregator.getQuote(token, USDC_ADDRESS),
      this.getBackupRoute(token),
      this.getDirectRoute(token)
    ]);
    
    return this.selectOptimalRoute(routes);
  }

  // Execute swap with slippage protection
  async executeSwap(route: SwapRoute): Promise<TransactionResult> {
    return route.execute({
      slippageTolerance: 0.5, // 0.5%
      deadline: Date.now() + 1800000, // 30 minutes
      gasLimit: route.estimatedGas * 1.2 // 20% buffer
    });
  }
}

// Integration with major DEX APIs
const DEX_ENDPOINTS = {
  '1inch': 'https://api.1inch.dev/swap/v5.2/',
  'paraswap': 'https://apiv5.paraswap.io/',
  '0x': 'https://api.0x.org/swap/v1/',
  'uniswap': 'https://api.uniswap.org/v1/'
};
```

**Deliverables:**
- Multi-DEX aggregation service
- Slippage protection mechanisms
- Gas optimization algorithms
- Route comparison engine

#### Phase 4: Cross-Chain Bridge Integration (Weeks 6-9)
**Bridge Aggregation**: Optimize cross-chain transfers to Somnia

```typescript
class BridgeAggregationService {
  private bridges = {
    layerzero: new LayerZeroBridge(),
    axelar: new AxelarBridge(),
    wormhole: new WormholeBridge(),
    synapse: new SynapseBridge()
  };

  // Find optimal bridge for each chain → Somnia transfer  
  async getOptimalBridge(fromChain: number, amount: string): Promise<BridgeOption> {
    const options = await Promise.allSettled([
      this.bridges.layerzero.quote(fromChain, SOMNIA_CHAIN_ID, amount),
      this.bridges.axelar.quote(fromChain, SOMNIA_CHAIN_ID, amount),
      this.bridges.wormhole.quote(fromChain, SOMNIA_CHAIN_ID, amount)
    ]);

    return this.selectBestBridge(options, {
      prioritize: 'speed', // or 'cost' or 'security'
      maxTimeMinutes: 30,
      maxCostPercentage: 2.0
    });
  }

  // Execute bridge transfer
  async executeBridge(option: BridgeOption): Promise<BridgeResult> {
    const bridge = this.bridges[option.protocol];
    
    return bridge.transfer({
      fromChain: option.fromChain,
      toChain: SOMNIA_CHAIN_ID,
      token: USDC_ADDRESS,
      amount: option.amount,
      recipient: option.recipient,
      gasLimit: option.estimatedGas * 1.3
    });
  }
}

// Bridge protocol configurations
const BRIDGE_CONFIGS = {
  layerzero: {
    endpoint: 'https://api.layerzero.network/',
    supportedChains: [1, 137, 42161, 8453, 10],
    avgTimeMinutes: 5,
    feePercentage: 0.1
  },
  axelar: {
    endpoint: 'https://api.axelarscan.io/',
    supportedChains: [1, 137, 42161, 8453],
    avgTimeMinutes: 3,
    feePercentage: 0.15
  }
};
```

**Deliverables:**
- Multi-bridge aggregation service
- Bridge comparison algorithms  
- Cross-chain transaction tracking
- Failure recovery mechanisms

#### Phase 5: Somnia Integration (Weeks 8-10)
**Final Conversion**: Convert bridged stablecoins to SOMI tokens

```typescript
class SomniaIntegrationService {
  private somniaConfig = {
    chainId: 5031,
    rpcUrl: 'https://api.infra.mainnet.somnia.network/',
    dexRouter: '0x...', // Somnia DEX router address
    somiToken: '0x...', // SOMI token contract address
    usdcToken: '0x...', // USDC on Somnia
    multicall: '0x5e44F178E8cF9B2F5409B6f18ce936aB817C5a11'
  };

  // Convert all received USDC to SOMI tokens
  async convertToSOMI(usdcAmount: string, userAddress: string): Promise<ConversionResult> {
    // Get current SOMI exchange rate
    const somiRate = await this.getSOMIExchangeRate(usdcAmount);
    
    // Calculate minimum SOMI output with slippage protection
    const minSOMIOut = somiRate.expectedSOMI * 0.995; // 0.5% slippage
    
    // Execute swap on Somnia DEX
    const swapTx = await this.somniaClient.writeContract({
      address: this.somniaConfig.dexRouter,
      abi: SomniaRouterABI,
      functionName: 'swapExactTokensForTokens',
      args: [
        usdcAmount,
        minSOMIOut,
        [this.somniaConfig.usdcToken, this.somniaConfig.somiToken],
        userAddress,
        Math.floor(Date.now() / 1000) + 1800 // 30 min deadline
      ]
    });

    return {
      transactionHash: swapTx,
      somiReceived: somiRate.expectedSOMI,
      conversionRate: somiRate.rate,
      gasUsed: await this.estimateGasUsed(swapTx)
    };
  }

  // Get real-time SOMI exchange rate
  private async getSOMIExchangeRate(usdcAmount: string): Promise<ExchangeRate> {
    const reserves = await this.somniaClient.readContract({
      address: this.somniaConfig.dexRouter,
      abi: SomniaRouterABI,
      functionName: 'getAmountsOut',
      args: [usdcAmount, [this.somniaConfig.usdcToken, this.somniaConfig.somiToken]]
    });

    return {
      expectedSOMI: reserves[1],
      rate: Number(reserves[1]) / Number(usdcAmount),
      priceImpact: await this.calculatePriceImpact(usdcAmount)
    };
  }
}

// Somnia chain configuration for wagmi
const somniaMainnet: Chain = {
  id: 5031,
  name: 'Somnia',
  nativeCurrency: { name: 'Somnia', symbol: 'SOMI', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://api.infra.mainnet.somnia.network/'] }
  },
  blockExplorers: {
    default: { name: 'Somnia Explorer', url: 'https://explorer.somnia.network' }
  },
  contracts: {
    multicall3: { address: '0x5e44F178E8cF9B2F5409B6f18ce936aB817C5a11' }
  }
};
```

**Deliverables:**
- Somnia blockchain integration
- SOMI token conversion logic
- Real-time exchange rate feeds
- Transaction monitoring dashboard

#### Phase 6: Advanced Features & Optimization (Weeks 11-12)
**Premium Features**: Paymaster support, advanced analytics, custom strategies

```typescript
// Gasless transactions with paymaster
const gaslessAggregation = await walletClient.sendCalls({
  calls: dustConversionBatch,
  capabilities: {
    atomic: { required: true },
    paymasterService: {
      url: "https://api.somany.network/paymaster",
      context: {
        sponsorshipPolicy: "dust-aggregation",
        maxGasSponsorship: "0.01" // Up to $10 in gas
      }
    }
  }
});

// Advanced analytics and reporting
class AggregationAnalytics {
  async generateReport(aggregationId: string): Promise<AggregationReport> {
    return {
      totalDustValue: "11.20",
      totalGasCost: "2.70", 
      finalSOMIReceived: "8.50",
      conversionEfficiency: "75.9%",
      timeToComplete: "45 seconds",
      chainsProcessed: 5,
      tokensConverted: 10,
      bridgeFeesTotal: "0.85",
      dexSlippageTotal: "0.15",
      carbonFootprint: "minimal" // Somnia is eco-friendly
    };
  }
}

// Custom aggregation strategies
const strategies = {
  maxValue: "Optimize for maximum SOMI output",
  minGas: "Optimize for lowest gas costs", 
  fastest: "Optimize for fastest execution",
  balanced: "Balance all factors"
};
```

**Deliverables:**
- Paymaster integration for gasless transactions
- Advanced analytics dashboard
- Custom aggregation strategies
- Performance monitoring tools

---

## Success Metrics & Expected Impact

### User Experience Transformation
| Metric | Before SoMany | After SoMany | Improvement |
|--------|---------------|--------------|-------------|
| Steps Required | 8+ transactions | 1 transaction | 87.5% reduction |
| Time to Complete | 5-10 minutes | 30-60 seconds | 90% faster |
| Success Rate | ~20% completion | ~80% completion | 4x improvement |
| Gas Efficiency | $50-100 costs | $20-40 costs | 60% savings |
| User Friction | Very High | Very Low | Massive reduction |

### Business Impact Projections
- **Monthly Active Users**: 10K+ (6 months post-launch)
- **Total Value Locked**: $50M+ in dust aggregated
- **Revenue**: $500K+ monthly (1% service fee)
- **SOMI Token Demand**: Continuous buy pressure from conversions
- **Market Position**: #1 dust aggregation protocol in DeFi

### Technical Achievements
- **First EIP-5792 Dust Aggregator**: Technology leadership
- **Multi-Chain Atomicity**: Industry-first atomic cross-chain dust conversion
- **Sub-Second Finality**: Leveraging Somnia's performance capabilities
- **Gasless Option**: Lower barrier to entry for small holders

---

## Risk Assessment & Mitigation

### Technical Risks
1. **EIP-5792 Adoption**: Limited wallet support
   - *Mitigation*: Graceful fallback to sequential execution
2. **Bridge Failures**: Cross-chain transaction failures
   - *Mitigation*: Multi-bridge redundancy and retry mechanisms
3. **DEX Liquidity**: Insufficient liquidity for dust tokens
   - *Mitigation*: Liquidity validation before aggregation

### Market Risks  
1. **Dust Token Volatility**: Token values fluctuating during conversion
   - *Mitigation*: Fast execution and slippage protection
2. **Gas Price Spikes**: Making small conversions uneconomical
   - *Mitigation*: Dynamic gas optimization and paymaster support

### Regulatory Risks
1. **DeFi Regulations**: Changing regulatory landscape
   - *Mitigation*: Compliance monitoring and legal advisory

---

## Go-to-Market Strategy

### Phase 1: MVP Launch (Months 1-3)
- Launch on testnets with core functionality
- Gather user feedback and iterate
- Build initial community and partnerships

### Phase 2: Mainnet Launch (Months 4-6)  
- Deploy to major EVM chains
- Integrate with popular wallets
- Launch marketing campaign highlighting EIP-5792 innovation

### Phase 3: Scale & Optimize (Months 7-12)
- Add more chains and tokens
- Introduce premium features
- Expand to institutional users

### Revenue Streams
1. **Service Fees**: 0.5-1% on each aggregation
2. **Premium Features**: Advanced strategies, analytics
3. **Paymaster Sponsorship**: Partner integrations
4. **SOMI Token Economics**: Protocol-owned liquidity

---

This implementation plan transforms SoMany from a simple balance viewer into the premier dust aggregation protocol in DeFi, leveraging cutting-edge technology (EIP-5792) to deliver unprecedented user experience and value recovery for the billions of dollars in dust tokens currently trapped across the ecosystem.