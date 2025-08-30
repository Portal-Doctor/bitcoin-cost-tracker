'use client';

import BitcoinTransactionTracker from '../components/BitcoinTransactionTracker';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Bitcoin Cost Basis Tracker
          </h1>
          <p className="text-lg text-gray-600">
            Track your Bitcoin transactions, purchases, and cost basis
          </p>
        </div>
        
        <BitcoinTransactionTracker />
      </div>
    </main>
  );
}
