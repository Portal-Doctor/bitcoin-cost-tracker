'use client';

import { Transaction, TransactionType } from '../types/bitcoin';
import CommentSection from './CommentSection';

interface TransactionListProps {
  title: string;
  transactions: Transaction[];
  type: TransactionType;
}

export default function TransactionList({ title, transactions, type }: TransactionListProps) {
  const getTypeColor = (type: TransactionType) => {
    switch (type) {
      case TransactionType.PURCHASE:
        return 'text-green-600 bg-green-50 border-green-200';
      case TransactionType.SELL:
        return 'text-red-600 bg-red-50 border-red-200';
      case TransactionType.MOVE:
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatAmount = (amount: number) => {
    return `${amount.toFixed(8)} BTC`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <p className="text-gray-500 text-center py-8">No {title.toLowerCase()} found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      
      <div className="space-y-3">
        {transactions.map((tx) => (
          <div key={tx.txid} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getTypeColor(type)}`}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </span>
              <span className="text-sm text-gray-500">{formatDate(tx.date)}</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Amount:</span>
                <span className="font-medium">{formatAmount(tx.amount)}</span>
              </div>
              
              {tx.price && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Price:</span>
                  <span className="font-medium">{formatPrice(tx.price.price)}</span>
                </div>
              )}
              
              {tx.costBasis && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Cost Basis:</span>
                  <span className="font-medium">{formatPrice(tx.costBasis)}</span>
                </div>
              )}
              
              {tx.profitLoss !== null && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">P&L:</span>
                  <span className={`font-medium ${tx.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPrice(tx.profitLoss)}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Fee:</span>
                <span className="font-medium">{formatAmount(tx.fee)}</span>
              </div>
              
              <div className="pt-2 border-t">
                <p className="text-xs text-gray-500 font-mono break-all">
                  TXID: {tx.txid}
                </p>
              </div>
              
              {/* Comment Section */}
              <CommentSection txid={tx.txid} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
