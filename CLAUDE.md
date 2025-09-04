# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SoMany is a revolutionary multi-chain dust aggregation protocol built with modern Web3 technologies. The application enables users to discover, aggregate, and convert scattered dust tokens across multiple blockchain networks into valuable SOMI tokens on the Somnia blockchain. Features a cutting-edge UI built with Next.js, shadcn/ui, Framer Motion, and comprehensive Web3 integration.

## Commands

### Client Development
All development commands are run from the `client/` directory:

```bash
cd client
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Build for production
npm start        # Start production server
```

### Linting and Type Checking
```bash
cd client
npm run build    # This also performs type checking via TypeScript
```

**Build Notes:**
- PostCSS configuration was fixed to resolve build issues
- Tailwind CSS references exist but package isn't installed (uses CDN or different approach)

## Architecture Overview

### Project Structure
```
Somany/
├── client/                 # Next.js frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/         # Next.js pages
│   │   ├── styles/        # CSS styles
│   │   └── wagmi.ts       # Web3 configuration
│   ├── package.json       # Frontend dependencies
│   └── next.config.js     # Next.js configuration
└── server/                # Minimal server directory (currently unused)
```

### Core Technologies

**Frontend Stack:**
- **Next.js 15**: React framework with App Router
- **TypeScript 5.5**: Type safety and development experience
- **Tailwind CSS 3.4**: Utility-first CSS framework with custom design system
- **shadcn/ui**: Modern, accessible component library
- **Framer Motion**: Advanced animations and transitions
- **Lucide React**: Beautiful icon library

**Web3 Integration:**
- **RainbowKit 2.2+**: Wallet connection UI library
- **wagmi 2.15+**: React hooks for Ethereum
- **viem 2.29**: Low-level Ethereum library
- **TanStack Query 5**: Data fetching, caching, and state management

**State Management:**
- **Zustand**: Lightweight state management
- **React Hot Toast**: Toast notifications

### Web3 Configuration (`client/src/wagmi.ts`)

The application is configured to work with multiple testnet networks:

**Standard Testnets:**
- Sepolia, Optimism Sepolia, Base Sepolia, Arbitrum Sepolia
- Polygon Amoy, Scroll Sepolia, Filecoin Calibration, Celo Alfajores

**Custom Network Definitions:**
- Zora Sepolia, zkSync Sepolia, Gnosis Chiado
- ApeChain Testnet, World Chain Sepolia, Monad Testnet
- Unichain Sepolia, Zircuit Garfield, Citrea Testnet, Flow EVM Testnet

### Modern Component Architecture

#### TokenBalances Component (`client/src/components/TokenBalances.tsx`)
- **Modern UI**: Built with shadcn/ui components and Framer Motion animations
- **TanStack Query**: Efficient data fetching with caching and background updates
- **Zustand Integration**: Connected to global state management
- **Price Integration**: Uses Chainlink Price Feeds for real-time USD valuations
- **Dust Detection**: Automatically identifies and highlights dust tokens
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Interactive Elements**: Hover effects, animated loading states, and smooth transitions

#### Custom Hooks (`client/src/hooks/useTokenBalances.ts`)
- **Data Fetching**: Centralized token balance fetching logic
- **Multi-Chain Support**: Parallel requests across all configured networks
- **Error Handling**: Graceful degradation and retry mechanisms
- **Caching Strategy**: Optimized for performance with 2-minute stale time

#### State Management (`client/src/store/tokenStore.ts`)
- **Zustand Store**: Centralized state for token balances and dust detection
- **Computed Values**: Real-time portfolio calculations
- **Selection Logic**: Dust token selection and aggregation planning

#### Price Feed Architecture
```typescript
// Price feed configuration per network
priceFeedAddresses: Record<number, { [symbol: string]: { 
  address: string, 
  decimals: number, 
  invertRate?: boolean 
}}>
```

Key price feeds include:
- ETH/USD feeds across multiple testnets
- USDC/USD where available
- Native token feeds (POL, CELO, MON, etc.)

### Modern Design System

#### Styling Architecture
- **Tailwind CSS 3.4**: Complete utility-first framework with custom configuration
- **CSS Custom Properties**: HSL-based color system for consistent theming
- **shadcn/ui Components**: Pre-built accessible components with consistent styling
- **Grid Background**: Custom CSS background pattern with subtle dots and lines
- **Responsive Design**: Mobile-first approach with adaptive layouts

#### Component Library (`client/src/components/ui/`)
- **Card**: Flexible container component with consistent shadows and borders
- **Button**: Multiple variants (default, destructive, outline, secondary, ghost)
- **Badge**: Status indicators with color-coded variants
- **Skeleton**: Loading state placeholders with subtle animations

#### Design Tokens
- **Colors**: Primary/secondary/muted color scales with dark mode support
- **Typography**: Consistent font sizing and spacing scales
- **Animations**: Framer Motion integration for smooth micro-interactions
- **Spacing**: Consistent padding/margin system throughout components

### Key Patterns & Best Practices

1. **Modern React Patterns**:
   - Custom hooks for data fetching (`useTokenBalances`)
   - Zustand for global state management
   - TanStack Query for server state with optimistic updates
   - Framer Motion for declarative animations

2. **Multi-Chain Architecture**:
   - Parallel data fetching across networks
   - Centralized RPC client management with viem
   - Chain-specific error handling and fallbacks
   - Automatic dust token detection and categorization

3. **Price Feed Integration**:
   - Primary: Chainlink `latestRoundData()` with proper decimals handling
   - Fallback: Legacy `latestAnswer()` for older feeds
   - Emergency: Hardcoded estimates for critical tokens (ETH: $1800, USDC: $1.00)

4. **Performance Optimizations**:
   - Query caching with 2-minute stale time
   - Background refetching for fresh data
   - Skeleton loading states for better UX
   - Optimized re-renders with proper dependency arrays

5. **Design System Implementation**:
   - Consistent component API across all UI elements
   - HSL color system for theme flexibility
   - Responsive breakpoints with mobile-first approach
   - Accessibility considerations in all interactive elements

### Development Notes

- **Project ID**: Currently uses placeholder "YOUR_PROJECT_ID" in wagmi config - replace with actual WalletConnect project ID for production
- **Network Focus**: Currently emphasizes testnet networks; mainnet chains are commented out
- **Server Directory**: Exists but unused - client is a standalone Next.js app
- **Price Feed Reliability**: Some feeds may be testnet-specific and less reliable than mainnet equivalents

### Performance Considerations

- **Concurrent Requests**: Fetches balances from multiple chains in parallel
- **Client-Side Caching**: Leverages TanStack Query for efficient data management
- **Price Feed Caching**: Oracle calls cached at component level
- **Optimized Rendering**: Connected chain highlighted with priority display