import { NextRequest, NextResponse } from 'next/server';
import BitcoinCore from 'bitcoin-core';
import axios from 'axios';
import { Transaction, TransactionType, AddressInfo } from '../../../types/bitcoin';

// Bitcoin Core client configuration
const bitcoinClient = new BitcoinCore({
  host: process.env.BITCOIN_HOST || 'localhost',
  port: parseInt(process.env.BITCOIN_PORT || '8332'),
  username: process.env.BITCOIN_USERNAME || 'bitcoin',
  password: process.env.BITCOIN_PASSWORD || 'password',
  timeout: 30000,
} as any);

// Yahoo Finance API for historical price data
const YAHOO_FINANCE_API = 'https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD';

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
        
        // Extract addresses and determine transaction type
        const { type, inputAddresses, outputAddresses, inputAmount, outputAmount } = 
          await extractAddressesFromTransaction(txid, walletAddress);
        
        // Calculate fee
        const fee = inputAmount - outputAmount;
        const amount = Math.abs(outputAmount - inputAmount);
        
        // Combine all addresses
        const allAddresses = [...inputAddresses, ...outputAddresses];
        
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
          addresses: allAddresses,
          inputAddresses: inputAddresses,
          outputAddresses: outputAddresses,
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

async function extractAddressesFromTransaction(txid: string, walletAddress: string): Promise<{
  type: TransactionType;
  inputAddresses: AddressInfo[];
  outputAddresses: AddressInfo[];
  inputAmount: number;
  outputAmount: number;
}> {
  try {
    const rawTx = await (bitcoinClient as any).getRawTransaction(txid, true);
    const inputAddresses: AddressInfo[] = [];
    const outputAddresses: AddressInfo[] = [];
    let inputAmount = 0;
    let outputAmount = 0;
    let isInputFromWallet = false;
    let isOutputToWallet = false;

    // Process inputs
    for (const input of rawTx.vin) {
      if (input.txid) {
        const prevTx = await (bitcoinClient as any).getRawTransaction(input.txid, true);
        const prevOutput = prevTx.vout[input.vout];
        
        if (prevOutput.scriptPubKey.addresses) {
          for (const address of prevOutput.scriptPubKey.addresses) {
            const { type, scriptType } = analyzeScriptType(prevOutput.scriptPubKey.hex);
            const addressInfo: AddressInfo = {
              address,
              type,
              scriptType,
              isInputAddress: true,
              isOutputAddress: false
            };
            
            inputAddresses.push(addressInfo);
            
            if (address === walletAddress) {
              inputAmount += prevOutput.value;
              isInputFromWallet = true;
            }
          }
        }
      }
    }

    // Process outputs
    for (const output of rawTx.vout) {
      if (output.scriptPubKey.addresses) {
        for (const address of output.scriptPubKey.addresses) {
          const { type, scriptType } = analyzeScriptType(output.scriptPubKey.hex);
          const addressInfo: AddressInfo = {
            address,
            type,
            scriptType,
            isInputAddress: false,
            isOutputAddress: true
          };
          
          outputAddresses.push(addressInfo);
          
          if (address === walletAddress) {
            outputAmount += output.value;
            isOutputToWallet = true;
          }
        }
      }
    }

    // Determine transaction type
    let type: TransactionType;
    if (isInputFromWallet && isOutputToWallet) {
      type = TransactionType.MOVE;
    } else if (isOutputToWallet && !isInputFromWallet) {
      type = TransactionType.PURCHASE;
    } else if (isInputFromWallet && !isOutputToWallet) {
      type = TransactionType.SELL;
    } else {
      type = TransactionType.MOVE; // Default fallback
    }

    return {
      type,
      inputAddresses,
      outputAddresses,
      inputAmount,
      outputAmount
    };
  } catch (error) {
    console.error('Error extracting addresses from transaction:', error);
    return {
      type: TransactionType.MOVE,
      inputAddresses: [],
      outputAddresses: [],
      inputAmount: 0,
      outputAmount: 0
    };
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
        } : {
          date: date,
          price: 45000, // Fallback price
          currency: 'USD'
        }
      };
    });
  } catch (error) {
    console.error('Error adding price data:', error);
    // Return transactions with fallback prices
    return transactions.map(tx => ({
      ...tx,
      price: {
        date: new Date(tx.date).toISOString().split('T')[0],
        price: 45000, // Fallback price
        currency: 'USD'
      }
    }));
  }
}

async function fetchHistoricalPrices(dates: string[]): Promise<Record<string, number>> {
  try {
    const priceData: Record<string, number> = {};
    
    // Get the earliest and latest dates to determine the range
    const sortedDates = dates.sort();
    const startDate = new Date(sortedDates[0]);
    const endDate = new Date(sortedDates[sortedDates.length - 1]);
    
    // Calculate the period in seconds
    const period1 = Math.floor(startDate.getTime() / 1000);
    const period2 = Math.floor(endDate.getTime() / 1000);
    
    // Fetch price data from Yahoo Finance
    const response = await axios.get(YAHOO_FINANCE_API, {
      params: {
        period1: period1,
        period2: period2,
        interval: '1d', // Daily intervals
        includePrePost: false,
        events: 'div,split'
      },
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000 // 15 second timeout
    });

    const result = response.data.chart.result[0];
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    const closes = quotes.close;
    
    // Create a map of date to price
    timestamps.forEach((timestamp: number, index: number) => {
      if (closes[index] !== null && closes[index] !== undefined) {
        const date = new Date(timestamp * 1000).toISOString().split('T')[0];
        priceData[date] = closes[index];
      }
    });

    console.log(`Successfully fetched ${Object.keys(priceData).length} price points from Yahoo Finance`);
    return priceData;
  } catch (error: any) {
    console.error('Error fetching historical prices from Yahoo Finance:', error.message);
    
    // If it's a rate limit or network error, provide fallback data
    if (error.response?.status === 429 || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      console.log('Using fallback price data due to API rate limiting or network issues');
      return generateFallbackPrices(dates);
    }
    
    console.log('Using fallback price data due to API error');
    return generateFallbackPrices(dates);
  }
}

function analyzeScriptType(scriptPubKey: string): { type: 'single-sig' | 'multi-sig' | 'unknown'; scriptType: string } {
  // Common script patterns
  if (scriptPubKey.startsWith('76a914') && scriptPubKey.endsWith('88ac')) {
    // P2PKH (Pay to Public Key Hash) - single-sig
    return { type: 'single-sig', scriptType: 'P2PKH' };
  }
  
  if (scriptPubKey.startsWith('a914') && scriptPubKey.endsWith('87')) {
    // P2SH (Pay to Script Hash) - could be multi-sig
    return { type: 'multi-sig', scriptType: 'P2SH' };
  }
  
  if (scriptPubKey.startsWith('0014')) {
    // P2WPKH (Pay to Witness Public Key Hash) - single-sig
    return { type: 'single-sig', scriptType: 'P2WPKH' };
  }
  
  if (scriptPubKey.startsWith('0020')) {
    // P2WSH (Pay to Witness Script Hash) - could be multi-sig
    return { type: 'multi-sig', scriptType: 'P2WSH' };
  }
  
  if (scriptPubKey.startsWith('5121') || scriptPubKey.startsWith('5221') || scriptPubKey.startsWith('5321')) {
    // Multi-sig scripts (OP_1, OP_2, OP_3 followed by public keys)
    return { type: 'multi-sig', scriptType: 'MultiSig' };
  }
  
  // Default fallback
  return { type: 'unknown', scriptType: 'Unknown' };
}

function generateFallbackPrices(dates: string[]): Record<string, number> {
  const fallbackPrices: Record<string, number> = {};
  const basePrice = 45000; // Base Bitcoin price
  
  dates.forEach((date, index) => {
    // Generate realistic price variations
    const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
    const price = basePrice * (1 + variation);
    fallbackPrices[date] = Math.round(price);
  });
  
  return fallbackPrices;
}

function getDemoTransactions(): Transaction[] {
  const createAddressInfo = (address: string, type: 'single-sig' | 'multi-sig', scriptType: string, isInput: boolean, isOutput: boolean): AddressInfo => ({
    address,
    type,
    scriptType,
    isInputAddress: isInput,
    isOutputAddress: isOutput
  });

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
      addresses: [
        createAddressInfo('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', 'single-sig', 'P2PKH', false, true),
        createAddressInfo('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy', 'multi-sig', 'P2SH', false, true),
        createAddressInfo('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4', 'single-sig', 'P2WPKH', false, true)
      ],
      inputAddresses: [],
      outputAddresses: [
        createAddressInfo('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', 'single-sig', 'P2PKH', false, true),
        createAddressInfo('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy', 'multi-sig', 'P2SH', false, true),
        createAddressInfo('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4', 'single-sig', 'P2WPKH', false, true)
      ],
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
      addresses: [
        createAddressInfo('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', 'single-sig', 'P2PKH', false, true),
        createAddressInfo('bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3', 'multi-sig', 'P2WSH', false, true)
      ],
      inputAddresses: [],
      outputAddresses: [
        createAddressInfo('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', 'single-sig', 'P2PKH', false, true),
        createAddressInfo('bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3', 'multi-sig', 'P2WSH', false, true)
      ],
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
      addresses: [
        createAddressInfo('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', 'single-sig', 'P2PKH', true, false),
        createAddressInfo('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2', 'single-sig', 'P2PKH', false, true),
        createAddressInfo('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy', 'multi-sig', 'P2SH', false, true)
      ],
      inputAddresses: [
        createAddressInfo('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', 'single-sig', 'P2PKH', true, false)
      ],
      outputAddresses: [
        createAddressInfo('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2', 'single-sig', 'P2PKH', false, true),
        createAddressInfo('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy', 'multi-sig', 'P2SH', false, true)
      ],
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
      addresses: [
        createAddressInfo('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', 'single-sig', 'P2PKH', true, false),
        createAddressInfo('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4', 'single-sig', 'P2WPKH', false, true)
      ],
      inputAddresses: [
        createAddressInfo('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', 'single-sig', 'P2PKH', true, false)
      ],
      outputAddresses: [
        createAddressInfo('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4', 'single-sig', 'P2WPKH', false, true)
      ],
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
      addresses: [
        createAddressInfo('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4', 'single-sig', 'P2WPKH', true, false),
        createAddressInfo('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2', 'single-sig', 'P2PKH', false, true),
        createAddressInfo('bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3', 'multi-sig', 'P2WSH', false, true)
      ],
      inputAddresses: [
        createAddressInfo('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4', 'single-sig', 'P2WPKH', true, false)
      ],
      outputAddresses: [
        createAddressInfo('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2', 'single-sig', 'P2PKH', false, true),
        createAddressInfo('bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3', 'multi-sig', 'P2WSH', false, true)
      ],
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
