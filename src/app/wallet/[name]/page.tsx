'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Divider,
  Link,
  Tooltip
} from '@mui/material';
import {
  ArrowBack,
  AccountBalanceWallet,
  TrendingUp,
  TrendingDown,
  CalendarToday,
  CheckCircle,
  Schedule,
  AccountTree,
  OpenInNew
} from '@mui/icons-material';
import { WalletTransaction, WalletStats } from '@/lib/wallet-service';
import { WalletService } from '@/lib/wallet-service';
import TransactionLabelEditor from '@/components/TransactionLabelEditor';
import { TransactionLabel } from '@/lib/label-service';
import TransactionSearch from '@/components/TransactionSearch';
import WalletTransactionSearch from '@/components/WalletTransactionSearch';

interface WalletTransactionData {
  id: string;
  date: string;
  confirmed: boolean;
  type: string;
  address: string;
  amount: number;
  price?: number;
  priceUSD?: number;
  label: string;
  value: number; // in sats
  balance: number; // in sats
  fee: number; // in sats
  txid: string;
  inTransactionTree?: boolean;
  treeId?: string;
  walletRelationship?: string;
}

export default function WalletPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const walletName = params.name as string;
  const highlightTxid = searchParams.get('txid');
  
  const [walletTransactions, setWalletTransactions] = useState<WalletTransactionData[]>([]);
  const [walletStats, setWalletStats] = useState<WalletStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightedRow, setHighlightedRow] = useState<string | null>(null);
  const [transactionLabels, setTransactionLabels] = useState<Map<string, TransactionLabel>>(new Map());
  const [showAmountInBTC, setShowAmountInBTC] = useState(false);
  const [showUSDValue, setShowUSDValue] = useState(true); // true = USD Value, false = USD Cost of 1 Bitcoin

  useEffect(() => {
    if (walletName) {
      loadWalletTransactions();
    }
  }, [walletName]);

  useEffect(() => {
    if (highlightTxid && walletTransactions.length > 0) {
      setHighlightedRow(highlightTxid);
      
      // Scroll to the highlighted transaction after a short delay
      setTimeout(() => {
        const element = document.getElementById(`tx-${highlightTxid}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
  }, [highlightTxid, walletTransactions]);

  const loadWalletTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load wallet data
      const walletDataResponse = await fetch('/api/wallets/data');
      if (!walletDataResponse.ok) {
        throw new Error('Failed to load wallet data');
      }

      // Load transaction labels for this wallet
      const labelsResponse = await fetch(`/api/transaction-labels?walletName=${walletName}`);
      if (labelsResponse.ok) {
        const labelsData = await labelsResponse.json();
        const labelsMap = new Map<string, TransactionLabel>();
        labelsData.labels?.forEach((label: TransactionLabel) => {
          labelsMap.set(label.txid, label);
        });
        setTransactionLabels(labelsMap);
      }
      const walletDataResult = await walletDataResponse.json();

      // Find this specific wallet
      const thisWallet = walletDataResult.walletData?.find((w: any) => w.walletName === walletName);
      if (!thisWallet) {
        throw new Error('Wallet not found');
      }

      // Convert wallet transactions to display format
      const displayTransactions: WalletTransactionData[] = thisWallet.transactions.map((tx: any) => ({
        id: tx.txid,
        date: tx.date,
        confirmed: tx.confirmed,
        type: tx.type,
        address: '', // We don't have addresses in wallet CSV
        amount: WalletService.satsToBTC(tx.value),
        price: tx.priceUSD ? tx.priceUSD / (Math.abs(tx.value) / 100000000) : 45000, // Calculate BTC price from USD value
        priceUSD: tx.priceUSD || null,
        label: tx.label,
        value: tx.value,
        balance: tx.balance,
        fee: tx.fee,
        txid: tx.txid,
        inTransactionTree: false, // Will be updated below
        treeId: undefined
      }));

      // Check which transactions connect to other wallets
      const allWalletData = walletDataResult.walletData || [];
      const transactionToWallets = new Map<string, string[]>();
      
      allWalletData.forEach((wallet: any) => {
        wallet.transactions.forEach((tx: any) => {
          const txid = tx.txid;
          if (!transactionToWallets.has(txid)) {
            transactionToWallets.set(txid, []);
          }
          transactionToWallets.get(txid)!.push(wallet.walletName);
        });
      });

      // Mark transactions that connect to other wallets
      displayTransactions.forEach(tx => {
        const connectedWallets = transactionToWallets.get(tx.txid);
        if (connectedWallets && connectedWallets.length > 1) {
          tx.inTransactionTree = true;
          tx.treeId = tx.txid; // Use txid as tree ID for now
          // Create wallet relationship string
          const otherWallets = connectedWallets.filter(w => w !== walletName);
          tx.walletRelationship = otherWallets.join(' -> ');
        }
      });

      setWalletTransactions(displayTransactions);

      // Calculate wallet statistics
      const walletTxs = WalletService.matchTransactionsToWallets(walletDataResult.walletData || []);
      const stats = WalletService.getWalletStats(walletTxs, walletName);
      setWalletStats(stats);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatAmount = (amount: number) => {
    return `${amount >= 0 ? '+' : ''}${amount.toFixed(8)} BTC`;
  };

  const formatSats = (sats: number) => {
    return `${sats >= 0 ? '+' : ''}${sats.toLocaleString()} sats`;
  };

  const formatUSD = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleLabelChange = (txid: string, label: TransactionLabel | null) => {
    const newLabels = new Map(transactionLabels);
    if (label) {
      newLabels.set(txid, label);
    } else {
      newLabels.delete(txid);
    }
    setTransactionLabels(newLabels);
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
        <Button variant="contained" onClick={loadWalletTransactions}>
          Retry
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => router.back()}
          sx={{ mb: 2 }}
        >
          Back
        </Button>
        
        <Typography variant="h3" component="h1" gutterBottom>
          <AccountBalanceWallet sx={{ mr: 2, verticalAlign: 'middle' }} />
          {walletName} Wallet
        </Typography>
        
                 <Typography variant="body1" color="text.secondary">
           Transaction history and statistics for {walletName} wallet
         </Typography>
       </Box>

              {/* Transaction Search */}
       <TransactionSearch />

       {/* Wallet-Specific Search */}
       <WalletTransactionSearch 
         walletName={walletName}
         transactions={walletTransactions.map(tx => ({
           txid: tx.txid,
           date: tx.date,
           type: tx.type,
           value: tx.value,
           label: tx.label
         }))}
       />

       {/* Wallet Statistics */}
      {walletStats && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Wallet Statistics
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(5, 1fr)' }, gap: 3 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Received
                </Typography>
                <Typography variant="h5" color="success.main">
                  {formatSats(walletStats.totalReceived)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatAmount(WalletService.satsToBTC(walletStats.totalReceived))}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Sent
                </Typography>
                <Typography variant="h5" color="error.main">
                  {formatSats(walletStats.totalSent)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatAmount(WalletService.satsToBTC(walletStats.totalSent))}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Balance
                </Typography>
                <Typography variant="h5" color={walletStats.balance >= 0 ? 'success.main' : 'error.main'}>
                  {formatSats(walletStats.balance)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatAmount(WalletService.satsToBTC(walletStats.balance))}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Fees
                </Typography>
                <Typography variant="h5" color="warning.main">
                  {formatSats(walletStats.totalFees)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatAmount(WalletService.satsToBTC(walletStats.totalFees))}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Transactions
                </Typography>
                <Typography variant="h5">
                  {walletStats.transactionCount}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Transactions Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Transactions ({walletTransactions.length})
          </Typography>
          
          {walletTransactions.length === 0 ? (
            <Alert severity="info">
              No transactions found for this wallet. Make sure the wallet CSV file contains valid transaction data.
            </Alert>
          ) : (
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Label</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                        <Typography variant="subtitle2">
                          Amount ({showAmountInBTC ? 'BTC' : 'sats'})
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setShowAmountInBTC(!showAmountInBTC)}
                          sx={{ minWidth: 'auto', px: 1 }}
                        >
                          {showAmountInBTC ? 'sats' : 'BTC'}
                        </Button>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
          <Typography variant="subtitle2">
            {showUSDValue ? 'USD Value' : 'Bitcoin Price'}
          </Typography>
          <Button size="small" variant="outlined" onClick={() => setShowUSDValue(!showUSDValue)} sx={{ minWidth: 'auto', px: 1 }}>
            {showUSDValue ? 'Cost' : 'Value'}
          </Button>
        </Box>
      </TableCell>
                    <TableCell align="right">Fee (sats)</TableCell>
                    <TableCell align="right">Balance (sats)</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell>Relationships</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {walletTransactions.map((tx) => (
                    <TableRow 
                      key={tx.id} 
                      hover
                      id={`tx-${tx.txid}`}
                      sx={{
                        backgroundColor: highlightedRow === tx.txid ? 'action.hover' : 'inherit',
                        '&:hover': {
                          backgroundColor: highlightedRow === tx.txid ? 'action.hover' : undefined
                        }
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CalendarToday sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                          {formatDate(tx.date)}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ flexGrow: 1 }}>
                            {transactionLabels.get(tx.txid)?.label || tx.label || 'No label'}
                          </Typography>
                          <TransactionLabelEditor
                            txid={tx.txid}
                            walletName={walletName}
                            currentLabel={transactionLabels.get(tx.txid)?.label || tx.label}
                            onLabelChange={(label) => handleLabelChange(tx.txid, label)}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={tx.type === 'input' ? 'Received' : 'Sent'}
                          color={tx.type === 'input' ? 'success' : 'error'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          color={tx.value >= 0 ? 'success.main' : 'error.main'}
                          fontWeight="bold"
                        >
                          {showAmountInBTC ? formatAmount(tx.amount) : formatSats(tx.value)}
                        </Typography>
                      </TableCell>
                            <TableCell align="right">
        <Typography variant="body2" color="text.secondary">
          {tx.priceUSD ? (showUSDValue ? formatUSD(tx.priceUSD) : formatUSD(tx.priceUSD / Math.abs(tx.value) * 100000000)) : 'N/A'}
        </Typography>
      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">
                          {tx.fee > 0 ? formatSats(tx.fee) : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">
                          {formatSats(tx.balance)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {tx.confirmed ? (
                          <Tooltip title="Confirmed">
                            <CheckCircle sx={{ fontSize: 20, color: 'success.main' }} />
                          </Tooltip>
                        ) : (
                          <Tooltip title="Pending">
                            <Schedule sx={{ fontSize: 20, color: 'warning.main' }} />
                          </Tooltip>
                        )}
                      </TableCell>
                                             <TableCell>
                         <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                       <Button
                              variant="outlined"
                              size="small"
                              onClick={() => router.push(`/utxo-tree/${tx.txid}`)}
                              sx={{ mb: 0.5, minWidth: 'auto', px: 1 }}
                              title="View UTXO Tree"
                            >
                              <AccountTree sx={{ fontSize: 16 }} />
                            </Button>
                           
                                                       {tx.inTransactionTree && (
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => router.push(`/tree/${tx.treeId}`)}
                                sx={{ mb: 0.5, minWidth: 'auto', px: 1 }}
                                title="View Tree"
                              >
                                <AccountTree sx={{ fontSize: 16 }} />
                                <OpenInNew sx={{ fontSize: 14, ml: 0.5 }} />
                              </Button>
                            )}
                           
                           {tx.walletRelationship && tx.walletRelationship !== 'Unknown' && (
                             <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                               {tx.walletRelationship.split(' -> ').map((wallet, index) => {
                                 if (wallet === walletName || wallet === 'external') return null;
                                 return (
                                   <Chip
                                     key={index}
                                     label={wallet}
                                     size="small"
                                     variant="outlined"
                                     color="secondary"
                                     clickable
                                     onClick={() => router.push(`/wallet/${wallet}?txid=${tx.txid}`)}
                                     sx={{ cursor: 'pointer' }}
                                   />
                                 );
                               })}
                             </Box>
                           )}
                         </Box>
                       </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
