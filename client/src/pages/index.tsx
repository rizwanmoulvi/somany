import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { NextPage } from 'next';
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import TokenBalances from '../components/TokenBalances';

const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>SoMany Wallet Balances</title>
        <meta
          content="View token balances across multiple networks"
          name="description"
        />
        <link href="/favicon.ico" rel="icon" />
      </Head>

      <main className={styles.main}>
        <div className="flex justify-end w-full mb-4">
          <ConnectButton />
        </div>

        <h1 className={styles.title}>
          SoMany Wallet Balances
        </h1>

        <p className={styles.description}>
          View your token balances across multiple testnet networks
        </p>

        <TokenBalances />
      </main>

      <footer className={styles.footer}>
        <a href="https://rainbow.me" rel="noopener noreferrer" target="_blank">
          Made with ❤️ by your frens at 🌈
        </a>
      </footer>
    </div>
  );
};

export default Home;
