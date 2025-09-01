'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Box,
  Chip,
  Alert,
  Divider,
  LinearProgress,
  CircularProgress
} from '@mui/material';
import {
  Refresh,
  FolderOpen
} from '@mui/icons-material';
import { WalletTransaction, WalletService } from '@/lib/wallet-service';
import { WalletCSVData } from '@/types/bitcoin';

interface WalletInfo {
  id: string;
  name: string;
  addressCount: number;
  transactionCount: number;
  addresses: string[];
  totalAddresses: number;
}

export default function WalletsPage() {
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = async () => {
    try {
      setLoading(true);
      setProgress(0);
      setProgressText('Loading wallet CSV files...');

      // Load wallets from API
      const response = await fetch('/api/wallets');
      if (response.ok) {
        const data = await response.json();
        setWallets(data.wallets || []);
        setProgress(50);
        setProgressText('Loading transaction data...');

        // Get wallet data for matching
        const walletDataResponse = await fetch('/api/wallets/data');
        if (walletDataResponse.ok) {
          const walletDataResult = await walletDataResponse.json();
          const matchedTransactions = WalletService.matchTransactionsToWallets(walletDataResult.walletData || []);
          setWalletTransactions(matchedTransactions);
        }
        
        setProgress(100);
        setProgressText('Complete!');
      }
    } catch (error) {
      console.error('Error loading wallets:', error);
      setProgressText('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const getWalletStats = (walletName: string) => {
    return WalletService.getWalletStats(walletTransactions, walletName);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          Wallet Management
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
          Wallet data is loaded from CSV files in /tmp/wallets directory
        </Typography>
      </Box>

      {loading && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress size={40} sx={{ mb: 2 }} />
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {progressText}
          </Typography>
          <Box sx={{ width: '100%', maxWidth: 400, mx: 'auto' }}>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={loadWallets}
          size="large"
        >
          Refresh Wallets
        </Button>
      </Box>

      {wallets.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <CardContent>
            <FolderOpen sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No wallet CSV files found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Place your wallet CSV files in the /tmp/wallets directory with the format: walletname-anything.csv
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Instructions:</strong>
                <br />• Export each wallet as a CSV file
                <br />• Name files as: walletname-anything.csv (e.g., &quot;hardware-export.csv&quot;, &quot;mobile-backup.csv&quot;)
                <br />• Place files in /tmp/wallets directory
                <br />• Click &quot;Refresh Wallets&quot; to load them
              </Typography>
            </Alert>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={loadWallets}
            >
              Refresh Wallets
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'grid', gap: 3 }}>
          {wallets.map((wallet) => {
            const stats = getWalletStats(wallet.name);
            return (
              <Card key={wallet.id} sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h5" gutterBottom>
                      {wallet.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      CSV File: {wallet.name}-*.csv
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip 
                      label={`${wallet.totalAddresses} addresses`} 
                      color="primary" 
                      size="small" 
                    />
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Total Received
                    </Typography>
                    <Typography variant="h6" color="success.main">
                      {WalletService.satsToBTC(stats.totalReceived).toFixed(8)} BTC
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Total Sent
                    </Typography>
                    <Typography variant="h6" color="error.main">
                      {WalletService.satsToBTC(stats.totalSent).toFixed(8)} BTC
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Balance
                    </Typography>
                    <Typography variant="h6" color={stats.balance >= 0 ? 'success.main' : 'error.main'}>
                      {WalletService.satsToBTC(stats.balance).toFixed(8)} BTC
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Transactions
                    </Typography>
                    <Typography variant="h6">
                      {stats.transactionCount}
                    </Typography>
                  </Box>
                </Box>
              </Card>
            );
          })}
        </Box>
      )}
    </Container>
  );
}
