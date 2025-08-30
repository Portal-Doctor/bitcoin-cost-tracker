'use client';

import { Transaction } from '../types/bitcoin';

interface TransactionSummaryProps {
  purchases: Transaction[];
  sells: Transaction[];
  moves: Transaction[];
}

export default function TransactionSummary({ purchases, sells, moves }: TransactionSummaryProps) {
  const formatAmount = (amount: number) => {
    return `${amount.toFixed(8)} BTC`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const calculateTotalAmount = (transactions: Transaction[]) => {
    return transactions.reduce((sum, tx) => sum + tx.amount, 0);
  };

  const calculateTotalFees = (transactions: Transaction[]) => {
    return transactions.reduce((sum, tx) => sum + tx.fee, 0);
  };

  const calculateAveragePrice = (transactions: Transaction[]) => {
    const transactionsWithPrice = transactions.filter(tx => tx.price);
    if (transactionsWithPrice.length === 0) return 0;
    
    const totalValue = transactionsWithPrice.reduce((sum, tx) => {
      return sum + (tx.price!.price * tx.amount);
    }, 0);
    
    const totalAmount = transactionsWithPrice.reduce((sum, tx) => sum + tx.amount, 0);
    return totalAmount > 0 ? totalValue / totalAmount : 0;
  };

  const calculateTotalProfitLoss = () => {
    return sells.reduce((sum, tx) => {
      return sum + (tx.profitLoss || 0);
    }, 0);
  };

  const calculateRemainingBalance = () => {
    const totalPurchased = calculateTotalAmount(purchases);
    const totalSold = calculateTotalAmount(sells);
    const totalMoved = calculateTotalAmount(moves);
    return totalPurchased - totalSold - totalMoved;
  };

  const totalPurchases = calculateTotalAmount(purchases);
  const totalSells = calculateTotalAmount(sells);
  const totalMoves = calculateTotalAmount(moves);
  const totalFees = calculateTotalFees([...purchases, ...sells, ...moves]);
  const averagePurchasePrice = calculateAveragePrice(purchases);
  const averageSellPrice = calculateAveragePrice(sells);
  const totalProfitLoss = calculateTotalProfitLoss();
  const remainingBalance = calculateRemainingBalance();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Transaction Summary</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{formatAmount(totalPurchases)}</div>
          <div className="text-sm text-gray-600">Total Purchases</div>
          {averagePurchasePrice > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              Avg: {formatPrice(averagePurchasePrice)}
            </div>
          )}
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{formatAmount(totalSells)}</div>
          <div className="text-sm text-gray-600">Total Sells</div>
          {averageSellPrice > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              Avg: {formatPrice(averageSellPrice)}
            </div>
          )}
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{formatAmount(totalMoves)}</div>
          <div className="text-sm text-gray-600">Total Moves</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-600">{formatAmount(remainingBalance)}</div>
          <div className="text-sm text-gray-600">Remaining Balance</div>
        </div>
      </div>
      
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">{formatAmount(totalFees)}</div>
            <div className="text-sm text-gray-600">Total Fees</div>
          </div>
          
          <div className="text-center">
            <div className={`text-lg font-semibold ${totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPrice(totalProfitLoss)}
            </div>
            <div className="text-sm text-gray-600">Total P&L</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {purchases.length + sells.length + moves.length}
            </div>
            <div className="text-sm text-gray-600">Total Transactions</div>
          </div>
        </div>
      </div>
    </div>
  );
}
