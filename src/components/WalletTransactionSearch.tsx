'use client';

import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  Search,
  AccountBalanceWallet
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

interface WalletTransactionSearchProps {
  walletName: string;
  transactions: Array<{
    txid: string;
    date: string;
    type: string;
    value: number;
    label: string;
  }>;
}

export default function WalletTransactionSearch({ walletName, transactions }: WalletTransactionSearchProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundTransaction, setFoundTransaction] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    try {
      setSearching(true);
      setError(null);
      setFoundTransaction(null);

      // Search within the current wallet's transactions
      const found = transactions.find(tx => 
        tx.txid.toLowerCase().includes(searchTerm.toLowerCase())
      );

      if (found) {
        setFoundTransaction(found);
      } else {
        setError('Transaction not found in this wallet');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const handleViewTransaction = (txid: string) => {
    // Scroll to the transaction in the current page
    const element = document.getElementById(`tx-${txid}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add a brief highlight effect
      element.style.backgroundColor = '#e3f2fd';
      setTimeout(() => {
        element.style.backgroundColor = '';
      }, 2000);
    }
  };

  const formatSats = (sats: number) => {
    return `${sats >= 0 ? '+' : ''}${sats.toLocaleString()} sats`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Search in {walletName}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Search for transactions within this wallet
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <TextField
          fullWidth
          label="Transaction ID"
          placeholder="Enter transaction ID or partial ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={searching}
          size="small"
          sx={{ flexGrow: 1 }}
        />
        <Button
          variant="outlined"
          startIcon={searching ? <CircularProgress size={16} /> : <Search />}
          onClick={handleSearch}
          disabled={searching || !searchTerm.trim()}
          size="small"
        >
          {searching ? 'Searching...' : 'Search'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {foundTransaction && (
        <Alert severity="success" sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <Box>
              <Typography variant="body2" fontWeight="bold">
                Transaction Found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Date: {formatDate(foundTransaction.date)} | 
                Amount: {formatSats(foundTransaction.value)} | 
                Type: {foundTransaction.type}
              </Typography>
              {foundTransaction.label && (
                <Typography variant="body2" color="text.secondary">
                  Label: {foundTransaction.label}
                </Typography>
              )}
            </Box>
            <Button
              variant="outlined"
              size="small"
              onClick={() => handleViewTransaction(foundTransaction.txid)}
            >
              View
            </Button>
          </Box>
        </Alert>
      )}
    </Paper>
  );
}
