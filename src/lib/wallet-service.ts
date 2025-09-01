import { WalletCSVData } from '@/types/bitcoin';

export interface WalletTransaction {
  walletName: string;
  transactionId: string;
  date: string;
  label: string;
  value: number; // in sats
  balance: number; // in sats
  fee: number; // in sats
  type: 'input' | 'output';
  confirmed: boolean;
}

export interface WalletStats {
  totalReceived: number;
  totalSent: number;
  balance: number;
  transactionCount: number;
  totalFees: number;
}

export interface TransactionTreeWalletInfo {
  walletName: string;
  transactionId: string;
  label: string;
  value: number;
  type: 'input' | 'output';
}

export class WalletService {
  /**
   * Match wallet transactions to main transaction data using transaction IDs
   */
  static matchTransactionsToWallets(
    walletData: WalletCSVData[]
  ): WalletTransaction[] {
    const walletTransactions: WalletTransaction[] = [];

    walletData.forEach(wallet => {
      wallet.transactions.forEach(tx => {
        walletTransactions.push({
          walletName: wallet.walletName,
          transactionId: tx.txid,
          date: tx.date,
          label: tx.label,
          value: tx.value,
          balance: tx.balance,
          fee: tx.fee,
          type: tx.type as 'input' | 'output',
          confirmed: tx.confirmed
        });
      });
    });

    return walletTransactions;
  }

  /**
   * Get wallet statistics
   */
  static getWalletStats(
    walletTransactions: WalletTransaction[],
    walletName: string
  ): WalletStats {
    const walletTxs = walletTransactions.filter(tx => tx.walletName === walletName);
    
    const totalReceived = walletTxs
      .filter(tx => tx.type === 'input')
      .reduce((sum, tx) => sum + tx.value, 0);
    
    const totalSent = Math.abs(walletTxs
      .filter(tx => tx.type === 'output')
      .reduce((sum, tx) => sum + tx.value, 0));
    
    const totalFees = walletTxs.reduce((sum, tx) => sum + tx.fee, 0);
    
    return {
      totalReceived,
      totalSent,
      balance: totalReceived - totalSent - totalFees,
      transactionCount: walletTxs.length,
      totalFees
    };
  }

  /**
   * Find wallet information for a specific transaction ID
   */
  static findWalletForTransaction(
    transactionId: string,
    walletData: WalletCSVData[]
  ): TransactionTreeWalletInfo | null {
    for (const wallet of walletData) {
      const tx = wallet.transactions.find(t => t.txid === transactionId);
      if (tx) {
        return {
          walletName: wallet.walletName,
          transactionId: tx.txid,
          label: tx.label,
          value: tx.value,
          type: tx.type as 'input' | 'output'
        };
      }
    }
    return null;
  }

  /**
   * Get all wallet information for transaction trees
   */
  static getWalletInfoForTransactions(
    transactionIds: string[],
    walletData: WalletCSVData[]
  ): Map<string, TransactionTreeWalletInfo> {
    const walletInfoMap = new Map<string, TransactionTreeWalletInfo>();
    
    transactionIds.forEach(txId => {
      const walletInfo = this.findWalletForTransaction(txId, walletData);
      if (walletInfo) {
        walletInfoMap.set(txId, walletInfo);
      }
    });
    
    return walletInfoMap;
  }

  /**
   * Convert sats to BTC
   */
  static satsToBTC(sats: number): number {
    return sats / 100000000;
  }

  /**
   * Convert BTC to sats
   */
  static btcToSats(btc: number): number {
    return Math.round(btc * 100000000);
  }
}
