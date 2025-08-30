'use client';

import { useState } from 'react';
import { Box, Alert, CircularProgress, Typography } from '@mui/material';
import { Transaction } from '../types/bitcoin';
import WalletInput from './WalletInput';
import TransactionList from './TransactionList';
import TransactionSummary from './TransactionSummary';

export default function BitcoinTransactionTracker() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWalletSubmit = async (walletAddress: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const purchases = transactions.filter(tx => tx.type === 'purchase');
  const sells = transactions.filter(tx => tx.type === 'sell');
  const moves = transactions.filter(tx => tx.type === 'move');

  return (
    <Box>
      <WalletInput onSubmit={handleWalletSubmit} />
      
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      
      {transactions.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <TransactionSummary 
            purchases={purchases} 
            sells={sells} 
            moves={moves} 
          />
          
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" gutterBottom>
              Transaction Details
            </Typography>
            
            <TransactionList 
              title="Purchases" 
              transactions={purchases} 
              type="purchase" 
            />
            
            <TransactionList 
              title="Sells" 
              transactions={sells} 
              type="sell" 
            />
            
            <TransactionList 
              title="Wallet Moves" 
              transactions={moves} 
              type="move" 
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}
