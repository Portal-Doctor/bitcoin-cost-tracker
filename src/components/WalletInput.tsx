'use client';

import { useState } from 'react';

interface WalletInputProps {
  onSubmit: (address: string) => void;
  loading: boolean;
}

export default function WalletInput({ onSubmit, loading }: WalletInputProps) {
  const [address, setAddress] = useState<string>('');
  const [demoMode, setDemoMode] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (address.trim() || demoMode) {
      onSubmit(demoMode ? 'demo' : address.trim());
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Enter Wallet Address
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="demo-mode"
            checked={demoMode}
            onChange={(e) => setDemoMode(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="demo-mode" className="ml-2 text-sm text-gray-700">
            Demo Mode (use sample data)
          </label>
        </div>
        
        <div>
          <label htmlFor="wallet-address" className="block text-sm font-medium text-gray-700 mb-2">
            XPub Address or Bitcoin Address
          </label>
          <input
            type="text"
            id="wallet-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={demoMode ? "Demo mode - no address needed" : "Enter your xpub address or Bitcoin address"}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading || demoMode}
          />
          <p className="mt-1 text-sm text-gray-500">
            {demoMode 
              ? "Demo mode will show sample transaction data for testing"
              : "Enter your extended public key (xpub) or a specific Bitcoin address to track transactions"
            }
          </p>
        </div>
        
        <button
          type="submit"
          disabled={(!address.trim() && !demoMode) || loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Processing...' : (demoMode ? 'Load Demo Data' : 'Track Transactions')}
        </button>
      </form>
    </div>
  );
}
