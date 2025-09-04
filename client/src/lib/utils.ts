import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(value)
}

export function formatTokenAmount(amount: string | number, decimals = 6): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (num === 0) return '0'
  if (num < 0.000001) return '< 0.000001'
  return num.toFixed(decimals).replace(/\.?0+$/, '')
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.substring(0, chars + 2)}...${address.substring(42 - chars)}`
}

export function getBlockExplorerUrl(chainId: number, hash: string): string {
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io',
    137: 'https://polygonscan.com',
    42161: 'https://arbiscan.io',
    8453: 'https://basescan.org',
    10: 'https://optimistic.etherscan.io',
    11155111: 'https://sepolia.etherscan.io',
    5031: 'https://explorer.somnia.network',
    50312: 'https://shannon-explorer.somnia.network',
  }
  
  return `${explorers[chainId] || 'https://etherscan.io'}/tx/${hash}`
}