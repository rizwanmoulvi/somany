import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  arbitrum,
  arbitrumSepolia,
  base,
  baseSepolia,
  celoAlfajores,
  filecoinCalibration,
  gnosis,
  mainnet,
  optimism,
  optimismSepolia,
  polygon,
  polygonAmoy,
  scrollSepolia,
  sepolia,
  type Chain,
} from 'wagmi/chains';

// Define the chains that aren't included in wagmi by default


const zoraSepolia: Chain = {
  id: 999999999, // Using placeholder since you provided this ID
  name: 'Zora Sepolia',
  nativeCurrency: {
    name: 'Sepolia Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://sepolia.rpc.zora.energy'] },
    public: { http: ['https://sepolia.rpc.zora.energy'] },
  },
  blockExplorers: {
    default: { name: 'Zora Explorer', url: 'https://sepolia.explorer.zora.energy' },
  },
  testnet: true,
};

const zkSyncSepolia: Chain = {
  id: 300,
  name: 'zkSync Sepolia',
  nativeCurrency: {
    name: 'Sepolia Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://sepolia.era.zksync.dev'] },
    public: { http: ['https://sepolia.era.zksync.dev'] },
  },
  blockExplorers: {
    default: { name: 'ZkSync Explorer', url: 'https://sepolia.explorer.zksync.io' },
  },
  testnet: true,
};

const gnosisChiado: Chain = {
  id: 10200,
  name: 'Gnosis Chiado Testnet',
  nativeCurrency: {
    name: 'Chiado xDAI',
    symbol: 'XDAI',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://rpc.chiadochain.net'] },
    public: { http: ['https://rpc.chiadochain.net'] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://blockscout.chiadochain.net' },
  },
  testnet: true,
};

const apeChainTestnet: Chain = {
  id: 33111,
  name: 'ApeChain Testnet',
  nativeCurrency: {
    name: 'ApeCoin',
    symbol: 'APE',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://curtis.rpc.caldera.xyz/http'] },
    public: { http: ['https://curtis.rpc.caldera.xyz/http'] },
  },
  blockExplorers: {
    default: { name: 'ApeChain Explorer', url: 'https://curtis.explorer.caldera.xyz/' },
  },
  testnet: true,
};

const worldChainSepolia: Chain = {
  id: 4801,
  name: 'World Chain Sepolia',
  nativeCurrency: {
    name: 'Sepolia Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://worldchain-sepolia.gateway.tenderly.co'] },
    public: { http: ['https://worldchain-sepolia.gateway.tenderly.co'] },
  },
  blockExplorers: {
    default: { name: 'World Chain Explorer', url: 'https://explorer-sepolia.worldchain.space' },
  },
  testnet: true,
};

const monadTestnet: Chain = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: {
    name: 'Monad',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz'] },
    public: { http: ['https://testnet-rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://explorer.monad.xyz/testnet' },
  },
  testnet: true,
};

const unichainSepolia: Chain = {
  id: 1301,
  name: 'Unichain Sepolia',
  nativeCurrency: {
    name: 'Sepolia Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://sepolia.unichain.org'] },
    public: { http: ['https://sepolia.unichain.org'] },
  },
  blockExplorers: {
    default: { name: 'Unichain Explorer', url: 'https://sepolia-explorer.unichain.ca' },
  },
  testnet: true,
};

const zircuitGarfieldTestnet: Chain = {
  id: 48898,
  name: 'Zircuit Garfield Testnet',
  nativeCurrency: {
    name: 'Zircuit Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://garfield-testnet.zircuit.com'] },
    public: { http: ['https://garfield-testnet.zircuit.com'] },
  },
  blockExplorers: {
    default: { name: 'Zircuit Explorer', url: 'https://garfield-explorer.zircuit.com' },
  },
  testnet: true,
};

const citreaTestnet: Chain = {
  id: 5115,
  name: 'Citrea Testnet',
  nativeCurrency: {
    name: 'Citrea Bitcoin',
    symbol: 'CBTC',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.citrea.xyz'] },
    public: { http: ['https://rpc.testnet.citrea.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Citrea Explorer', url: 'https://explorer-testnet.citrea.xyz' },
  },
  testnet: true,
};

const flowEvmTestnet: Chain = {
  id: 545,
  name: 'Flow EVM Testnet',
  nativeCurrency: {
    name: 'Flow',
    symbol: 'FLOW',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://testnet.evm.nodes.onflow.org'] },
    public: { http: ['https://testnet.evm.nodes.onflow.org'] },
  },
  blockExplorers: {
    default: { name: 'Flow Explorer', url: 'https://testnet.flowdiver.io' },
  },
  testnet: true,
};

export const config = getDefaultConfig({
  appName: 'SoMany Wallet Balance',
  projectId: 'YOUR_PROJECT_ID',
  chains: [
    // Mainnets
    // mainnet,
    // polygon,
    // optimism,
    // arbitrum,
    // base,
    
    // Testnets
    sepolia,
    optimismSepolia,
    baseSepolia,
    zoraSepolia,
    arbitrumSepolia,
    zkSyncSepolia,
    polygonAmoy,
    scrollSepolia,
    filecoinCalibration,
    celoAlfajores,
    gnosisChiado,
    apeChainTestnet,
    worldChainSepolia,
    monadTestnet,
    unichainSepolia,
    zircuitGarfieldTestnet,
    citreaTestnet,
    flowEvmTestnet,
  ],
  ssr: true,
});
