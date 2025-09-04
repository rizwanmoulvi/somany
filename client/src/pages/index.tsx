import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { NextPage } from 'next';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { Sparkles, Zap } from 'lucide-react';
import TokenBalances from '../components/TokenBalances';

const Home: NextPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Head>
        <title>SoMany - Multi-Chain Dust Aggregation Protocol</title>
        <meta
          content="Aggregate dust tokens across multiple blockchain networks into valuable SOMI tokens"
          name="description"
        />
        <link href="/favicon.ico" rel="icon" />
      </Head>

      <main className="container mx-auto px-4 py-8 flex-1">
        {/* Header */}
        <motion.div 
          className="flex flex-col sm:flex-row items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
            <motion.h1 
              className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              SoMany
            </motion.h1>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <ConnectButton />
          </motion.div>
        </motion.div>

        {/* Hero Section */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="relative">
            {/* Floating elements */}
            <motion.div
              className="absolute -top-4 left-1/4 w-2 h-2 bg-primary/30 rounded-full"
              animate={{ 
                y: [0, -10, 0],
                opacity: [0.3, 0.8, 0.3]
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <motion.div
              className="absolute -top-2 right-1/3 w-1.5 h-1.5 bg-yellow-500/40 rounded-full"
              animate={{ 
                y: [0, -8, 0],
                opacity: [0.4, 0.9, 0.4]
              }}
              transition={{ 
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1
              }}
            />
            
            {/* Main hero content */}
            <div className="relative z-10 pt-12">

              <motion.h2 
                className="text-4xl md:text-6xl font-bold mb-6 leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.7 }}
              >
                <span className="bg-gradient-to-r from-gray-900 via-primary to-purple-600 bg-clip-text text-transparent">
                  Transform Your Dust
                </span>
                <br />
                <span className="bg-gradient-to-r from-primary to-yellow-500 bg-clip-text text-transparent">
                  into Value
                </span>
              </motion.h2>
              
              <motion.p 
                className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.9 }}
              >
                Discover and aggregate your scattered dust tokens across{' '}
                <span className="font-semibold text-foreground">multiple blockchain networks</span>. 
                Convert worthless small balances into valuable{' '}
                <span className="font-semibold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                  SOMI tokens
                </span>{' '}
                with our revolutionary one-click aggregation protocol.
              </motion.p>

              {/* Feature highlights */}
              <motion.div
                className="flex flex-wrap justify-center gap-4 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.1 }}
              >
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  One-Click Aggregation
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  Multi-Chain Support
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm font-medium">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                  EIP-5792 Powered
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <TokenBalances />
      </main>

      {/* Footer */}
      <motion.footer 
        className="border-t mt-16 py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1 }}
      >
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground text-sm">
            Built with ❤️ for the DeFi community • Powered by{' '}
            <a 
              href="https://somnia.network" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Somnia Network
            </a>
          </p>
        </div>
      </motion.footer>
    </div>
  );
};

export default Home;
