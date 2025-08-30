'use client';

import { useState } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  FormControlLabel, 
  Switch, 
  Paper, 
  Typography,
  Alert
} from '@mui/material';
import { AccountBalanceWallet, PlayArrow } from '@mui/icons-material';

interface WalletInputProps {
  onSubmit: (address: string) => void;
}

export default function WalletInput({ onSubmit }: WalletInputProps) {
  const [address, setAddress] = useState('');
  const [demoMode, setDemoMode] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const walletAddress = demoMode ? 'demo' : address.trim();
    if (walletAddress) {
      onSubmit(walletAddress);
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Enter Wallet Address
      </Typography>
      
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
        <TextField
          fullWidth
          label="Bitcoin Address or xpub"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={demoMode}
          placeholder="Enter your Bitcoin address or xpub..."
          variant="outlined"
          sx={{ mb: 2 }}
        />
        
        <FormControlLabel
          control={
            <Switch
              checked={demoMode}
              onChange={(e) => setDemoMode(e.target.checked)}
              color="primary"
            />
          }
          label="Use Demo Data"
          sx={{ mb: 2 }}
        />
        
        {demoMode && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Demo mode will show sample transaction data for testing purposes.
          </Alert>
        )}
        
        <Button
          type="submit"
          variant="contained"
          size="large"
          startIcon={demoMode ? <PlayArrow /> : <AccountBalanceWallet />}
          disabled={!demoMode && !address.trim()}
          sx={{ minWidth: 200 }}
        >
          {demoMode ? 'Load Demo Data' : 'Analyze Transactions'}
        </Button>
      </Box>
    </Paper>
  );
}
