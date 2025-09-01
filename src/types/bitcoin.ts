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

export interface BitcoinTransaction {
  confirmed: boolean;
  date: string;
  type: 'Sent to' | 'Received with' | '';
  label: string;
  address: string;
  amount: number;
  id: string;
}

export interface TransactionNode {
  id: string;
  date: string;
  confirmed: boolean;
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
  children: string[]; // IDs of child transactions
  parent?: string; // ID of parent transaction
  totalAmount: number;
  comments: string[];
  price?: number; // USD price at transaction time
  priceUSD?: number; // USD value of transaction
}

export interface TransactionInput {
  address: string;
  amount: number;
  sourceTxId?: string; // ID of transaction that created this UTXO
}

export interface TransactionOutput {
  address: string;
  amount: number;
  isChange: boolean;
  isExternal: boolean;
}

export interface TransactionTree {
  rootId: string;
  nodes: Record<string, TransactionNode>;
  totalAmount: number;
  totalValueUSD?: number; // Total USD value of the tree
  dateRange: {
    start: string;
    end: string;
  };
  chainLength?: number; // Number of transactions in UTXO chain
  description?: string; // Description of the tree/chain
}

export interface TreeSummary {
  id: string;
  rootId: string;
  totalAmount: number;
  totalValueUSD?: number; // Total USD value of the tree
  dateRange: {
    start: string;
    end: string;
  };
  transactionCount: number;
  description: string;
}

export interface AddressInfo {
  address: string;
  type: 'single-sig' | 'multisig' | 'unknown';
  prefix: string;
  description?: string;
}

export interface PriceData {
  date: string;
  price: number;
  currency: string;
}

export interface TreeComment {
  id: string;
  treeId: string;
  nodeId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
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

export interface WalletCSVData {
  walletName: string;
  addresses: string[];
  transactions: Array<{
    id: string;
    date: string;
    label: string;
    value: number; // in sats
    balance: number; // in sats
    fee: number; // in sats
    txid: string;
    type: string;
    confirmed: boolean;
  }>;
}
