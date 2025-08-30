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
  amount: number;
  address: string;
  scriptPubKey: string;
}

export interface AddressInfo {
  address: string;
  type: 'single-sig' | 'multi-sig' | 'unknown';
  scriptType: string;
  isChangeAddress?: boolean;
  isInputAddress: boolean;
  isOutputAddress: boolean;
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
  addresses: AddressInfo[];
  inputAddresses: AddressInfo[];
  outputAddresses: AddressInfo[];
}

export interface TransactionSummary {
  totalPurchases: number;
  totalSells: number;
  totalMoves: number;
  totalFees: number;
  remainingBalance: number;
  totalProfitLoss: number;
  averagePurchasePrice: number;
  averageSellPrice: number;
}

export interface WalletConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}
