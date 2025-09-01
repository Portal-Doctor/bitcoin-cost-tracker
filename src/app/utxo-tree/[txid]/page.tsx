'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Divider
} from '@mui/material';
import {
  ArrowBack,
  AccountBalanceWallet,
  TrendingUp,
  TrendingDown,
  AccountTree,
  OpenInNew,
  CurrencyBitcoin,
  AttachMoney,
  Home
} from '@mui/icons-material';
import { WalletService } from '@/lib/wallet-service';

interface UTXONode {
  txid: string;
  walletName: string;
  date: string;
  type: 'input' | 'output';
  value: number; // in sats
  priceUSD: number | null;
  balance: number; // in sats
  fee: number; // in sats
  label: string;
  confirmed: boolean;
  children: UTXONode[];
  level: number;
  path: string[];
  nodeType: 'parent' | 'current' | 'child'; // To distinguish the relationship
}

interface UTXOTreeData {
  root: UTXONode;
  totalFlow: number; // in sats
  initialValue: number; // in USD
  finalValue: number; // in USD
  valueChange: number; // in USD
  valueChangePercent: number;
  transactionCount: number;
  walletCount: number;
  dateRange: {
    start: string;
    end: string;
  };
}

export default function UTXOTreePage() {
  const params = useParams();
  const router = useRouter();
  const txid = params.txid as string;
  
  const [utxoTree, setUtxoTree] = useState<UTXOTreeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (txid) {
      loadUTXOTree();
    }
  }, [txid]);

  const loadUTXOTree = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/utxo-tree/${txid}`);
      if (!response.ok) {
        throw new Error('Failed to load UTXO tree');
      }

      const data = await response.json();
      setUtxoTree(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load UTXO tree');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatSats = (sats: number) => {
    return `${sats >= 0 ? '+' : ''}${sats.toLocaleString()} sats`;
  };

  const formatAmount = (amount: number) => {
    return `${amount >= 0 ? '+' : ''}${amount.toFixed(8)} BTC`;
  };

  const formatUSD = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatUSDChange = (amount: number) => {
    const formatted = formatUSD(Math.abs(amount));
    return amount >= 0 ? `+${formatted}` : `-${formatted}`;
  };

  const renderUTXONode = (node: UTXONode, depth: number = 0) => {
    const indent = depth * 40;
    
    // Determine card styling based on node type
    let cardStyle = {
      ml: indent,
      border: '1px solid #e0e0e0',
      backgroundColor: 'white'
    };
    
    if (node.txid === txid) {
      cardStyle = {
        ...cardStyle,
        border: '2px solid #1976d2',
        backgroundColor: '#f3f8ff'
      };
    } else if (node.nodeType === 'parent') {
      cardStyle = {
        ...cardStyle,
        border: '1px solid #ff9800',
        backgroundColor: '#fff3e0'
      };
    }
    
    return (
      <Box key={`${node.txid}-${node.walletName}-${node.type}`} sx={{ mb: 2 }}>
        <Card sx={cardStyle}>
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Chip
                label={node.type === 'input' ? 'Received' : 'Sent'}
                color={node.type === 'input' ? 'success' : 'error'}
                size="small"
                variant="outlined"
              />
              <Typography variant="body2" color="text.secondary">
                {formatDate(node.date)}
              </Typography>
              <Chip
                label={node.walletName}
                size="small"
                variant="outlined"
                color="primary"
                clickable
                onClick={() => router.push(`/wallet/${node.walletName}?txid=${node.txid}`)}
              />
                             {node.txid === txid && (
                 <Chip
                   label="Root UTXO"
                   size="small"
                   color="primary"
                   variant="filled"
                 />
               )}
               {node.nodeType === 'parent' && (
                 <Chip
                   label="Input UTXO"
                   size="small"
                   color="warning"
                   variant="filled"
                 />
               )}
               {node.nodeType === 'child' && node.txid !== txid && (
                 <Chip
                   label="Output UTXO"
                   size="small"
                   color="secondary"
                   variant="filled"
                 />
               )}
            </Box>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 1 }}>
              <Typography variant="body2">
                <strong>Amount:</strong> {formatSats(node.value)} ({formatAmount(WalletService.satsToBTC(node.value))})
              </Typography>
              {node.priceUSD && (
                <Typography variant="body2">
                  <strong>USD Value:</strong> {formatUSD(node.priceUSD)}
                </Typography>
              )}
              <Typography variant="body2">
                <strong>Balance:</strong> {formatSats(node.balance)}
              </Typography>
              {node.fee > 0 && (
                <Typography variant="body2">
                  <strong>Fee:</strong> {formatSats(node.fee)}
                </Typography>
              )}
            </Box>
            
            {node.label && (
              <Typography variant="body2" color="text.secondary">
                <strong>Label:</strong> {node.label}
              </Typography>
            )}
            
            <Typography variant="caption" color="text.secondary">
              TXID: {node.txid}
            </Typography>
          </CardContent>
        </Card>
        
        {node.children.length > 0 && (
          <Box sx={{ mt: 1 }}>
            {node.children.map((child, index) => (
              <Box key={index} sx={{ position: 'relative' }}>
                <Box
                  sx={{
                    position: 'absolute',
                    left: indent + 20,
                    top: -10,
                    width: 2,
                    height: 20,
                    backgroundColor: '#e0e0e0',
                    zIndex: 0
                  }}
                />
                {renderUTXONode(child, depth + 1)}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={loadUTXOTree}>
          Retry
        </Button>
      </Container>
    );
  }

  if (!utxoTree) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="info">
          UTXO tree not found. The transaction may not be part of a UTXO flow.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => router.back()}
          >
            Back
          </Button>
          <Button
            variant="outlined"
            startIcon={<Home />}
            onClick={() => router.push('/')}
          >
            Home
          </Button>
        </Box>
        
        <Typography variant="h3" component="h1" gutterBottom>
          <AccountTree sx={{ mr: 2, verticalAlign: 'middle' }} />
          UTXO Tree
        </Typography>
        
        <Typography variant="body1" color="text.secondary">
          Tracking UTXO flow for transaction {txid}
        </Typography>
      </Box>

      {/* UTXO Tree Summary */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            UTXO Flow Summary
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 3, mb: 3 }}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Total Flow
              </Typography>
              <Typography variant="h5" color="primary.main">
                {formatSats(utxoTree.totalFlow)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatAmount(WalletService.satsToBTC(utxoTree.totalFlow))}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Initial Value
              </Typography>
              <Typography variant="h5" color="success.main">
                {formatUSD(utxoTree.initialValue)}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Final Value
              </Typography>
              <Typography variant="h5" color="error.main">
                {formatUSD(utxoTree.finalValue)}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Value Change
              </Typography>
              <Typography 
                variant="h5" 
                color={utxoTree.valueChange >= 0 ? 'success.main' : 'error.main'}
              >
                {formatUSDChange(utxoTree.valueChange)}
              </Typography>
              <Typography 
                variant="body2" 
                color={utxoTree.valueChange >= 0 ? 'success.main' : 'error.main'}
              >
                ({utxoTree.valueChangePercent >= 0 ? '+' : ''}{utxoTree.valueChangePercent.toFixed(2)}%)
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Transactions
              </Typography>
              <Typography variant="h6">
                {utxoTree.transactionCount}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Wallets Involved
              </Typography>
              <Typography variant="h6">
                {utxoTree.walletCount}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Date Range
              </Typography>
              <Typography variant="body2">
                {formatDate(utxoTree.dateRange.start)} - {formatDate(utxoTree.dateRange.end)}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* UTXO Tree Visualization */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            UTXO Flow Tree
          </Typography>
          
          <Paper sx={{ p: 3, backgroundColor: '#fafafa' }}>
            {renderUTXONode(utxoTree.root)}
          </Paper>
        </CardContent>
      </Card>
    </Container>
  );
}
