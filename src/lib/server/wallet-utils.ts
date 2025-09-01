import { promises as fs } from 'fs';
import path from 'path';
import { WalletCSVData } from '../../types/bitcoin';

/**
 * Read wallet CSV files from /tmp/wallets directory
 * Filename format: walletname-anything.csv
 * Wallet name is extracted from the part before the last "-"
 */
export async function readWalletCSVFiles(): Promise<WalletCSVData[]> {
  try {
    const walletDir = path.join(process.cwd(), 'tmp', 'wallets');
    console.log('Reading wallet CSV files from:', walletDir);
    
    // Check if directory exists
    try {
      await fs.access(walletDir);
    } catch {
      console.log('Wallet directory does not exist:', walletDir);
      return [];
    }
    
    const files = await fs.readdir(walletDir);
    const csvFiles = files.filter(file => file.endsWith('.csv'));
    
    console.log('Found CSV files:', csvFiles);
    
    const walletData: WalletCSVData[] = [];
    
    for (const file of csvFiles) {
      try {
        // Extract wallet name from filename (part before last "-")
        const fileName = path.basename(file, '.csv');
        const lastDashIndex = fileName.lastIndexOf('-');
        const walletName = lastDashIndex !== -1 
          ? fileName.substring(0, lastDashIndex) 
          : fileName;
        
        console.log(`Processing wallet: ${walletName} from file: ${file}`);
        
        const filePath = path.join(walletDir, file);
        const csvContent = await fs.readFile(filePath, 'utf-8');
        
        const walletInfo = parseWalletCSV(csvContent, walletName);
        walletData.push(walletInfo);
        
        console.log(`Loaded ${walletInfo.addresses.length} addresses and ${walletInfo.transactions.length} transactions for wallet: ${walletName}`);
      } catch (error) {
        console.error(`Error processing file ${file}:`, error);
      }
    }
    
    return walletData;
  } catch (error) {
    console.error('Error reading wallet CSV files:', error);
    return [];
  }
}

/**
 * Parse a wallet CSV file and extract addresses and transactions
 * New format: Date (UTC),Label,Value,Balance,Fee,Txid
 */
export function parseWalletCSV(csvContent: string, walletName: string): WalletCSVData {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  
  const addresses = new Set<string>();
  const transactions: Array<{
    id: string;
    date: string;
    label: string;
    value: number; // in sats
    balance: number; // in sats
    fee: number; // in sats
    txid: string;
    type: string;
    confirmed: boolean;
  }> = [];

  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = line.split(',').map(v => v.replace(/"/g, '').trim());
    
    // Map CSV columns to our data structure
    const date = values[headers.indexOf('Date (UTC)')] || values[headers.indexOf('Date')];
    const label = values[headers.indexOf('Label')];
    const value = parseInt(values[headers.indexOf('Value')]);
    const balance = parseInt(values[headers.indexOf('Balance')]);
    const fee = parseInt(values[headers.indexOf('Fee')] || '0');
    const txid = values[headers.indexOf('Txid')] || values[headers.indexOf('ID')];

    if (txid && txid.trim()) {
      // Determine transaction type based on value
      const type = value >= 0 ? 'input' : 'output';
      
      transactions.push({
        id: txid.trim(),
        date: date || '',
        label: label || '',
        value,
        balance,
        fee,
        txid: txid.trim(),
        type,
        confirmed: true // Assume confirmed for wallet transactions
      });
    }
  }

  return {
    walletName,
    addresses: Array.from(addresses), // We'll populate addresses from main transaction data
    transactions
  };
}
