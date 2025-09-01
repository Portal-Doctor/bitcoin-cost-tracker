'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Search,
  AccountBalanceWallet,
  AccountTree,
  OpenInNew
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

interface SearchResult {
  txid: string;
  wallets: {
    walletName: string;
    date: string;
    type: string;
    value: number;
    label: string;
  }[];
}

export default function TransactionSearch() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    try {
      setSearching(true);
      setError(null);
      setResults(null);

      // Search for the transaction across all wallets
      const response = await fetch(`/api/transactions/search?txid=${searchTerm.trim()}`);
      
      if (!response.ok) {
        throw new Error('Failed to search for transaction');
      }

      const data = await response.json();
      
      if (data.found) {
        setResults(data.result);
        setShowResults(true);
      } else {
        setError('Transaction not found in any wallet');
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

  // Add keyboard shortcut for quick search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="transaction"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleWalletClick = (walletName: string, txid: string) => {
    router.push(`/wallet/${walletName}?txid=${txid}`);
    setShowResults(false);
  };

  const handleTreeView = (txid: string) => {
    router.push(`/tree/${txid}`);
    setShowResults(false);
  };

  const formatSats = (sats: number) => {
    return `${sats >= 0 ? '+' : ''}${sats.toLocaleString()} sats`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Search Transactions
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enter a transaction ID to find which wallets contain it (Ctrl+K to focus)
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <TextField
            fullWidth
            label="Transaction ID"
            placeholder="Enter 64-character transaction ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={searching}
            sx={{ flexGrow: 1 }}
          />
          <Button
            variant="contained"
            startIcon={searching ? <CircularProgress size={16} /> : <Search />}
            onClick={handleSearch}
            disabled={searching || !searchTerm.trim()}
          >
            {searching ? 'Searching...' : 'Search'}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {/* Search Results Dialog */}
      <Dialog 
        open={showResults} 
        onClose={() => setShowResults(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Search />
            Transaction Found
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {results && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Transaction ID: {results.txid}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Found in {results.wallets.length} wallet{results.wallets.length > 1 ? 's' : ''}
              </Typography>

              <List>
                {results.wallets.map((wallet, index) => (
                  <Box key={wallet.walletName}>
                    <ListItem disablePadding>
                      <ListItemButton onClick={() => handleWalletClick(wallet.walletName, results.txid)}>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <AccountBalanceWallet sx={{ fontSize: 16 }} />
                              {wallet.walletName}
                              <Chip
                                label={wallet.type === 'input' ? 'Received' : 'Sent'}
                                color={wallet.type === 'input' ? 'success' : 'error'}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="body2">
                                Date: {formatDate(wallet.date)}
                              </Typography>
                              <Typography variant="body2">
                                Amount: {formatSats(wallet.value)}
                              </Typography>
                              {wallet.label && (
                                <Typography variant="body2">
                                  Label: {wallet.label}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                    {index < results.wallets.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>

              {results.wallets.length > 1 && (
                <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    View Transaction Relationships
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<AccountTree />}
                    onClick={() => handleTreeView(results.txid)}
                    fullWidth
                  >
                    View Wallet Relationship Tree
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setShowResults(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
