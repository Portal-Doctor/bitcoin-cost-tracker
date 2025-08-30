import { NextRequest, NextResponse } from 'next/server';
import BitcoinCore from 'bitcoin-core';
import axios from 'axios';
import { Transaction, TransactionType } from '../../../types/bitcoin';

// Bitcoin Core client configuration
const bitcoinClient = new BitcoinCore({
  host: process.env.BITCOIN_HOST || 'localhost',
  port: parseInt(process.env.BITCOIN_PORT || '8332'),
  username: process.env.BITCOIN_USERNAME || 'bitcoin',
  password: process.env.BITCOIN_PASSWORD || 'password',
  timeout: 30000,
} as any);

// CoinGecko API for historical price data
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

interface TransactionRequest {
  walletAddress: string;
}

export async function POST(request: NextRequest) {
  try {
    const { walletAddress }: TransactionRequest = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    let transactions: Transaction[];

    if (walletAddress === 'demo') {
      // Return demo data for testing
      transactions = getDemoTransactions();
    } else {
      // Get transactions for the wallet address
      transactions = await getWalletTransactions(walletAddress);
    }
    
    // Fetch historical price data for transaction dates
    const transactionsWithPrices = await addPriceData(transactions);
    
    // Calculate cost basis and profit/loss
    const processedTransactions = calculateCostBasis(transactionsWithPrices);

    return NextResponse.json({
      transactions: processedTransactions,
      count: processedTransactions.length,
    });

  } catch (error) {
    console.error('Error processing transactions:', error);
    return NextResponse.json(
      { error: 'Failed to process transactions' },
      { status: 500 }
    );
  }
}

async function getWalletTransactions(walletAddress: string): Promise<Transaction[]> {
  try {
    // Get all transactions for the address using searchrawtransactions
    const rawTxs = await (bitcoinClient as any).searchRawTransactions(walletAddress, {
      verbose: true,
      skip: 0,
      count: 1000
    });
    
    const transactions: Transaction[] = [];

    for (const rawTx of rawTxs) {
      try {
        const txid = rawTx.txid;
        const blockInfo = rawTx.blockhash ? await (bitcoinClient as any).getBlock(rawTx.blockhash) : null;
        
        // Determine transaction type based on inputs and outputs
        const type = await determineTransactionType(txid, walletAddress);
        
        // Calculate amount and fee
        const { amount, fee } = await calculateTransactionAmount(txid, walletAddress);
        
        const transaction: Transaction = {
          txid: txid,
          type: type,
          amount: Math.abs(amount),
          fee: fee,
          date: blockInfo ? new Date(blockInfo.time * 1000).toISOString() : new Date().toISOString(),
          blockHeight: blockInfo ? blockInfo.height : 0,
          confirmations: rawTx.confirmations || 0,
          price: null, // Will be added later
          costBasis: null, // Will be calculated later
          profitLoss: null, // Will be calculated later
          addresses: [walletAddress],
        };

        transactions.push(transaction);
      } catch (error) {
        console.error(`Error processing transaction ${rawTx.txid}:`, error);
        continue;
      }
    }

    return transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (error) {
    console.error('Error getting wallet transactions:', error);
    throw error;
  }
}

async function determineTransactionType(txid: string, walletAddress: string): Promise<TransactionType> {
  try {
    const rawTx = await (bitcoinClient as any).getRawTransaction(txid, true);
    
    let inputAmount = 0;
    let outputAmount = 0;
    let isInputFromWallet = false;
    let isOutputToWallet = false;

    // Check inputs
    for (const input of rawTx.vin) {
      if (input.txid) {
        const prevTx = await (bitcoinClient as any).getRawTransaction(input.txid, true);
        const prevOutput = prevTx.vout[input.vout];
        
        if (prevOutput.scriptPubKey.addresses && 
            prevOutput.scriptPubKey.addresses.includes(walletAddress)) {
          inputAmount += prevOutput.value;
          isInputFromWallet = true;
        }
      }
    }

    // Check outputs
    for (const output of rawTx.vout) {
      if (output.scriptPubKey.addresses && 
          output.scriptPubKey.addresses.includes(walletAddress)) {
        outputAmount += output.value;
        isOutputToWallet = true;
      }
    }

    // Determine transaction type
    if (isInputFromWallet && isOutputToWallet) {
      return TransactionType.MOVE;
    } else if (isOutputToWallet && !isInputFromWallet) {
      return TransactionType.PURCHASE;
    } else if (isInputFromWallet && !isOutputToWallet) {
      return TransactionType.SELL;
    } else {
      return TransactionType.MOVE; // Default fallback
    }
  } catch (error) {
    console.error('Error determining transaction type:', error);
    return TransactionType.MOVE;
  }
}

async function calculateTransactionAmount(txid: string, walletAddress: string): Promise<{ amount: number; fee: number }> {
  try {
    const rawTx = await (bitcoinClient as any).getRawTransaction(txid, true);
    
    let inputAmount = 0;
    let outputAmount = 0;

    // Calculate input amount
    for (const input of rawTx.vin) {
      if (input.txid) {
        const prevTx = await (bitcoinClient as any).getRawTransaction(input.txid, true);
        const prevOutput = prevTx.vout[input.vout];
        inputAmount += prevOutput.value;
      }
    }

    // Calculate output amount
    for (const output of rawTx.vout) {
      outputAmount += output.value;
    }

    const fee = inputAmount - outputAmount;
    const amount = Math.abs(outputAmount - inputAmount);

    return { amount, fee };
  } catch (error) {
    console.error('Error calculating transaction amount:', error);
    return { amount: 0, fee: 0 };
  }
}

async function addPriceData(transactions: Transaction[]): Promise<Transaction[]> {
  try {
    // Get unique dates from transactions
    const dates = [...new Set(transactions.map(tx => 
      new Date(tx.date).toISOString().split('T')[0]
    ))];

    // Fetch historical price data for all dates
    const priceData = await fetchHistoricalPrices(dates);
    
    // Add price data to transactions
    return transactions.map(tx => {
      const date = new Date(tx.date).toISOString().split('T')[0];
      const price = priceData[date];
      
      return {
        ...tx,
        price: price ? {
          date: date,
          price: price,
          currency: 'USD'
        } : null
      };
    });
  } catch (error) {
    console.error('Error adding price data:', error);
    return transactions;
  }
}

async function fetchHistoricalPrices(dates: string[]): Promise<Record<string, number>> {
  try {
    const priceData: Record<string, number> = {};
    
    // Fetch price data from CoinGecko
    const response = await axios.get(`${COINGECKO_API}/coins/bitcoin/market_chart`, {
      params: {
        vs_currency: 'usd',
        days: 'max', // Get maximum historical data
        interval: 'daily'
      }
    });

    const prices = response.data.prices;
    
    // Create a map of date to price
    prices.forEach(([timestamp, price]: [number, number]) => {
      const date = new Date(timestamp).toISOString().split('T')[0];
      priceData[date] = price;
    });

    return priceData;
  } catch (error) {
    console.error('Error fetching historical prices:', error);
    return {};
  }
}

function getDemoTransactions(): Transaction[] {
  return [
    {
      txid: 'demo-tx-1',
      type: TransactionType.PURCHASE,
      amount: 0.5,
      fee: 0.0001,
      date: '2023-01-15T10:30:00.000Z',
      blockHeight: 800000,
      confirmations: 1000,
      price: { date: '2023-01-15', price: 21000, currency: 'USD' },
      costBasis: null,
      profitLoss: null,
      addresses: ['demo-address-1'],
    },
    {
      txid: 'demo-tx-2',
      type: TransactionType.PURCHASE,
      amount: 0.3,
      fee: 0.0001,
      date: '2023-03-20T14:45:00.000Z',
      blockHeight: 820000,
      confirmations: 800,
      price: { date: '2023-03-20', price: 28000, currency: 'USD' },
      costBasis: null,
      profitLoss: null,
      addresses: ['demo-address-1'],
    },
    {
      txid: 'demo-tx-3',
      type: TransactionType.SELL,
      amount: 0.2,
      fee: 0.0001,
      date: '2023-06-10T09:15:00.000Z',
      blockHeight: 840000,
      confirmations: 600,
      price: { date: '2023-06-10', price: 30000, currency: 'USD' },
      costBasis: null,
      profitLoss: null,
      addresses: ['demo-address-1'],
    },
    {
      txid: 'demo-tx-4',
      type: TransactionType.MOVE,
      amount: 0.1,
      fee: 0.0001,
      date: '2023-08-05T16:20:00.000Z',
      blockHeight: 860000,
      confirmations: 400,
      price: { date: '2023-08-05', price: 32000, currency: 'USD' },
      costBasis: null,
      profitLoss: null,
      addresses: ['demo-address-1'],
    },
    {
      txid: 'demo-tx-5',
      type: TransactionType.SELL,
      amount: 0.4,
      fee: 0.0001,
      date: '2023-12-01T11:30:00.000Z',
      blockHeight: 880000,
      confirmations: 200,
      price: { date: '2023-12-01', price: 42000, currency: 'USD' },
      costBasis: null,
      profitLoss: null,
      addresses: ['demo-address-1'],
    },
  ];
}

function calculateCostBasis(transactions: Transaction[]): Transaction[] {
  let runningBalance = 0;
  let totalCost = 0;
  const processedTransactions: Transaction[] = [];

  for (const tx of transactions) {
    let costBasis = null;
    let profitLoss = null;

    if (tx.type === TransactionType.PURCHASE) {
      runningBalance += tx.amount;
      if (tx.price) {
        totalCost += tx.amount * tx.price.price;
      }
    } else if (tx.type === TransactionType.SELL) {
      if (runningBalance > 0 && tx.price) {
        const averageCost = totalCost / runningBalance;
        costBasis = averageCost * tx.amount;
        profitLoss = (tx.price.price * tx.amount) - costBasis;
        
        // Update running totals
        const sellRatio = tx.amount / runningBalance;
        totalCost -= totalCost * sellRatio;
        runningBalance -= tx.amount;
      }
    }

    processedTransactions.push({
      ...tx,
      costBasis,
      profitLoss
    });
  }

  return processedTransactions;
}
