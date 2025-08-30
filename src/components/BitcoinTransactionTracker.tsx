'use client';

import { useState } from 'react';
import WalletInput from './WalletInput';
import TransactionList from './TransactionList';
import TransactionSummary from './TransactionSummary';
import { Transaction, TransactionType } from '../types/bitcoin';

export default function BitcoinTransactionTracker() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleWalletSubmit = async (address: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress: address }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data = await response.json();
      setTransactions(data.transactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const purchases = transactions.filter(tx => tx.type === TransactionType.PURCHASE);
  const sells = transactions.filter(tx => tx.type === TransactionType.SELL);
  const moves = transactions.filter(tx => tx.type === TransactionType.MOVE);

  return (
    <div className="space-y-8">
      <WalletInput onSubmit={handleWalletSubmit} loading={loading} />
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Processing transactions...</p>
        </div>
      )}

      {transactions.length > 0 && (
        <>
          <TransactionSummary 
            purchases={purchases}
            sells={sells}
            moves={moves}
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <TransactionList 
              title="Purchases" 
              transactions={purchases}
              type={TransactionType.PURCHASE}
            />
            <TransactionList 
              title="Sells" 
              transactions={sells}
              type={TransactionType.SELL}
            />
            <TransactionList 
              title="Wallet Moves" 
              transactions={moves}
              type={TransactionType.MOVE}
            />
          </div>
        </>
      )}
    </div>
  );
}
