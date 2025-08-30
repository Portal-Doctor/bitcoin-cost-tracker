export enum TransactionType {
  PURCHASE = 'purchase',
  SELL = 'sell',
  MOVE = 'move'
}

export interface BitcoinPrice {
  date: string;
  price: number;
  currency: string;
}

export interface UTXO {
  txid: string;
  vout: number;
  address: string;
  amount: number;
  confirmations: number;
  spendable: boolean;
}

export interface Transaction {
  txid: string;
  type: TransactionType;
  amount: number;
  fee: number;
  date: string;
  blockHeight: number;
  confirmations: number;
  price: BitcoinPrice | null;
  costBasis: number | null;
  profitLoss: number | null;
  addresses: string[];
  description?: string;
}

export interface TransactionSummary {
  totalPurchases: number;
  totalSells: number;
  totalMoves: number;
  totalFees: number;
  averagePurchasePrice: number;
  averageSellPrice: number;
  totalProfitLoss: number;
  remainingBalance: number;
}

export interface WalletConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  timeout?: number;
}
