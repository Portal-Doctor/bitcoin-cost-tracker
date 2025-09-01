'use client';

import { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Card, 
  CardContent, 
  Box,
  Chip,
  Button,
  CircularProgress,
  LinearProgress,
  Alert
} from '@mui/material';
import { 
  AccountBalanceWallet, 
  CurrencyBitcoin, 
  TrendingUp,
  Refresh,
  Link as LinkIcon,
  AttachMoney
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import TransactionSearch from '@/components/TransactionSearch';

interface WalletInfo {
  id: string;
  name: string;
  addressCount: number;
  transactionCount: number;
  addresses: string[];
  totalAddresses: number;
  relationshipCount?: number;
}

interface WalletRelationship {
  walletName: string;
  transactionCount: number;
  transactions: string[];
}

export default function HomePage() {
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [walletRelationships, setWalletRelationships] = useState<Map<string, WalletRelationship[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletProgress, setWalletProgress] = useState(0);
  const [walletProgressText, setWalletProgressText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [loadingDb, setLoadingDb] = useState(false);
  const [dbProgress, setDbProgress] = useState(0);
  const [dbProgressText, setDbProgressText] = useState('');
  const [priceStatus, setPriceStatus] = useState<any>(null);
  const [updatingPrices, setUpdatingPrices] = useState(false);
  const [priceProgress, setPriceProgress] = useState(0);
  const [priceProgressText, setPriceProgressText] = useState('');
  const router = useRouter();

  useEffect(() => {
    checkDatabaseStatus();
    checkPriceStatus();
    loadWallets(false); // Load wallets silently on startup
  }, []);

  const checkDatabaseStatus = async () => {
    try {
      const response = await fetch('/api/database/status');
      if (response.ok) {
        const status = await response.json();
        setDbStatus(status);
      }
    } catch (error) {
      console.error('Error checking database status:', error);
    }
  };

  const checkPriceStatus = async () => {
    try {
      const response = await fetch('/api/database/update-prices');
      if (response.ok) {
        const status = await response.json();
        setPriceStatus(status);
      }
    } catch (error) {
      console.error('Error checking price status:', error);
    }
  };

  const loadWallets = async (showProgress = true) => {
    try {
      if (showProgress) {
        setWalletLoading(true);
        setWalletProgress(0);
        setWalletProgressText('Loading wallet CSV files...');
      }

      // Load wallets from API
      const response = await fetch('/api/wallets');
      if (response.ok) {
        const data = await response.json();
        console.log('Frontend: Received wallet data:', data);
        console.log('Frontend: Number of wallets:', data.wallets?.length || 0);
        console.log('Frontend: Wallet names:', data.wallets?.map((w: any) => w.name).join(', ') || 'none');
        
        setWallets(data.wallets || []);
        
        if (showProgress) {
          setWalletProgress(50);
          setWalletProgressText('Loading wallet relationships...');
        }

        // Load wallet relationships
        await loadWalletRelationships(data.wallets || []);
        
        if (showProgress) {
          setWalletProgress(100);
          setWalletProgressText('Complete!');
        }
      } else {
        throw new Error('Failed to load wallets');
      }
    } catch (error) {
      console.error('Error loading wallets:', error);
      if (showProgress) {
        setWalletProgressText('Error loading wallets');
      }
    } finally {
      if (showProgress) {
        setWalletLoading(false);
      }
      setLoading(false);
    }
  };

  const loadWalletRelationships = async (wallets: WalletInfo[]) => {
    try {
      // Load wallet data to find relationships
      const response = await fetch('/api/wallets/data');
      if (response.ok) {
        const walletDataResult = await response.json();
        const walletData = walletDataResult.walletData || [];
        
        const relationshipsMap = new Map<string, WalletRelationship[]>();
        
        // Initialize relationships for each wallet
        wallets.forEach(wallet => {
          relationshipsMap.set(wallet.name, []);
        });

        // Create a map of transaction IDs to wallets
        const transactionToWallets = new Map<string, string[]>();
        
        walletData.forEach((wallet: any) => {
          wallet.transactions.forEach((tx: any) => {
            const txid = tx.txid;
            if (!transactionToWallets.has(txid)) {
              transactionToWallets.set(txid, []);
            }
            transactionToWallets.get(txid)!.push(wallet.walletName);
          });
        });

        // Find transactions that connect multiple wallets
        transactionToWallets.forEach((walletNames, txid) => {
          if (walletNames.length > 1) {
            // This transaction connects multiple wallets
            walletNames.forEach(walletName => {
              const relatedWallets = walletNames.filter(name => name !== walletName);
              
              relatedWallets.forEach(relatedWallet => {
                const currentRelationships = relationshipsMap.get(walletName) || [];
                const existingRelationship = currentRelationships.find(r => r.walletName === relatedWallet);
                
                if (existingRelationship) {
                  existingRelationship.transactionCount++;
                  existingRelationship.transactions.push(txid);
                } else {
                  currentRelationships.push({
                    walletName: relatedWallet,
                    transactionCount: 1,
                    transactions: [txid]
                  });
                }
                
                relationshipsMap.set(walletName, currentRelationships);
              });
            });
          }
        });

        setWalletRelationships(relationshipsMap);

        // Update wallet relationship counts
        const updatedWallets = wallets.map(wallet => ({
          ...wallet,
          relationshipCount: relationshipsMap.get(wallet.name)?.length || 0
        }));
        setWallets(updatedWallets);
        
        console.log('Wallet relationships loaded:', relationshipsMap);
      }
    } catch (error) {
      console.error('Error loading wallet relationships:', error);
    }
  };

  const handleLoadWalletsClick = () => {
    loadWallets(true);
  };

  const handleViewWallet = (walletName: string) => {
    router.push(`/wallet/${walletName}`);
  };

  const handleViewWalletTransaction = (walletName: string, txid: string) => {
    router.push(`/wallet/${walletName}?txid=${txid}`);
  };

  const clearAndReloadWallets = async () => {
    try {
      setLoadingDb(true);
      setDbProgress(0);
      setDbProgressText('Clearing wallet data...');

      // Clear all wallet data
      const clearResponse = await fetch('/api/database/clear-wallets', {
        method: 'POST'
      });

      if (!clearResponse.ok) {
        throw new Error('Failed to clear wallet data');
      }

      setDbProgress(25);
      setDbProgressText('Loading fresh wallet data...');

      // Load wallets fresh
      const loadResponse = await fetch('/api/database/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'wallets' })
      });

      if (loadResponse.ok) {
        const result = await loadResponse.json();
        setDbProgress(100);
        setDbProgressText(`Loaded ${result.count} wallets to database`);
        
        // Refresh database status
        await checkDatabaseStatus();
        
        // Reload wallets from database
        await loadWallets(true);
      } else {
        throw new Error('Failed to load wallets to database');
      }
    } catch (error) {
      console.error('Error clearing and reloading wallets:', error);
      setDbProgressText('Error clearing and reloading wallets');
    } finally {
      setLoadingDb(false);
    }
  };

  const loadWalletsToDatabase = async () => {
    try {
      setLoadingDb(true);
      setDbProgress(0);
      setDbProgressText('Loading wallet data to database...');

      const response = await fetch('/api/database/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'wallets' })
      });

      if (response.ok) {
        const result = await response.json();
        setDbProgress(100);
        setDbProgressText(`Loaded ${result.count} wallets to database`);
        
        // Refresh database status
        await checkDatabaseStatus();
        
        // Reload wallets from database
        await loadWallets(true);
      } else {
        throw new Error('Failed to load wallets to database');
      }
    } catch (error) {
      console.error('Error loading wallets to database:', error);
      setDbProgressText('Error loading wallets to database');
    } finally {
      setLoadingDb(false);
    }
  };

  const loadTransactionTrees = async () => {
    try {
      setLoadingDb(true);
      setDbProgress(0);
      setDbProgressText('Loading transaction trees to database...');

      const response = await fetch('/api/database/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'trees' })
      });

      if (response.ok) {
        const result = await response.json();
        setDbProgress(100);
        setDbProgressText(`Loaded ${result.count} transaction trees to database`);
        
        // Refresh database status
        await checkDatabaseStatus();
      } else {
        throw new Error('Failed to load transaction trees to database');
      }
    } catch (error) {
      console.error('Error loading transaction trees to database:', error);
      setDbProgressText('Error loading transaction trees to database');
    } finally {
      setLoadingDb(false);
    }
  };

  const loadAllData = async () => {
    try {
      setLoadingDb(true);
      setDbProgress(0);
      setDbProgressText('Loading all data to database...');

      const response = await fetch('/api/database/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'all' })
      });

      if (response.ok) {
        const result = await response.json();
        setDbProgress(100);
        setDbProgressText(`Loaded ${result.wallets?.count || 0} wallets and ${result.trees?.count || 0} transaction trees to database`);
        
        // Refresh database status
        await checkDatabaseStatus();
        
        // Reload wallets from database
        await loadWallets(true);
      } else {
        throw new Error('Failed to load all data to database');
      }
    } catch (error) {
      console.error('Error loading all data to database:', error);
      setDbProgressText('Error loading all data to database');
    } finally {
      setLoadingDb(false);
    }
  };

  const clearAndReloadAll = async () => {
    try {
      setLoadingDb(true);
      setDbProgress(0);
      setDbProgressText('Clearing all data...');

      // Clear wallet data
      const clearResponse = await fetch('/api/database/clear-wallets', {
        method: 'POST'
      });

      if (!clearResponse.ok) {
        throw new Error('Failed to clear wallet data');
      }

      setDbProgress(25);
      setDbProgressText('Loading all data to database...');

      // Load all data (wallets and transaction trees)
      const loadResponse = await fetch('/api/database/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'all' })
      });

      if (loadResponse.ok) {
        const result = await loadResponse.json();
        setDbProgress(100);
        setDbProgressText(`Loaded ${result.wallets?.count || 0} wallets and ${result.trees?.count || 0} transaction trees to database`);
        
        // Refresh database status
        await checkDatabaseStatus();
        
        // Reload wallets from database
        await loadWallets(true);
      } else {
        throw new Error('Failed to load all data to database');
      }
    } catch (error) {
      console.error('Error clearing and reloading all data:', error);
      setDbProgressText('Error clearing and reloading all data');
    } finally {
      setLoadingDb(false);
    }
  };

  const updatePrices = async () => {
    try {
      setUpdatingPrices(true);
      setPriceProgress(0);
      setPriceProgressText('Fetching Bitcoin prices from Yahoo Finance...');

      const response = await fetch('/api/database/update-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const result = await response.json();
        setPriceProgress(100);
        setPriceProgressText(`Updated ${result.updatedCount} transactions with price data`);
        
        // Refresh price status
        await checkPriceStatus();
      } else {
        throw new Error('Failed to update prices');
      }
    } catch (error) {
      console.error('Error updating prices:', error);
      setPriceProgressText('Error updating prices');
    } finally {
      setUpdatingPrices(false);
    }
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
        <Button variant="contained" onClick={() => loadWallets(true)}>
          Retry
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          <CurrencyBitcoin sx={{ mr: 2, verticalAlign: 'middle' }} />
          Bitcoin Wallet Dashboard
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Explore your Bitcoin wallets and their transaction relationships
        </Typography>
      </Box>

      {/* Transaction Search Section */}
      <TransactionSearch />

      {/* Database Status Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          <AccountBalanceWallet sx={{ mr: 1, verticalAlign: 'middle' }} />
          Database Status
        </Typography>
        
        {dbStatus && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Chip 
                label={`Transaction Trees: ${dbStatus.transactionTrees.count}`}
                color={dbStatus.transactionTrees.loaded ? 'success' : 'warning'}
                variant="outlined"
              />
              <Chip 
                label={`Wallets: ${dbStatus.walletData.count}`}
                color={dbStatus.walletData.loaded ? 'success' : 'warning'}
                variant="outlined"
              />
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={loadWalletsToDatabase}
                disabled={loadingDb}
                size="small"
              >
                Load Wallets
              </Button>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={loadTransactionTrees}
                disabled={loadingDb}
                size="small"
              >
                Load Transaction Trees
              </Button>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<Refresh />}
                onClick={loadAllData}
                disabled={loadingDb}
                size="small"
              >
                Load All Data
              </Button>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<Refresh />}
                onClick={clearAndReloadWallets}
                disabled={loadingDb}
                size="small"
              >
                Clear & Reload Wallets
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Refresh />}
                onClick={clearAndReloadAll}
                disabled={loadingDb}
                size="small"
              >
                Clear & Reload All
              </Button>
            </Box>
          </Box>
        )}

        {loadingDb && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {dbProgressText}
            </Typography>
            <Box sx={{ width: '100%', maxWidth: 400, mx: 'auto' }}>
              <LinearProgress 
                variant="determinate" 
                value={dbProgress} 
                sx={{ height: 6, borderRadius: 3 }}
              />
            </Box>
          </Box>
        )}
      </Box>

      {/* Price Management Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          <AttachMoney sx={{ mr: 1, verticalAlign: 'middle' }} />
          Price Management
        </Typography>
        
        {priceStatus && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Chip 
                label={`${priceStatus.transactionsWithPrice}/${priceStatus.totalTransactions} transactions priced (${priceStatus.percentageComplete}%)`}
                color={priceStatus.needsUpdate ? 'warning' : 'success'}
                variant="outlined"
              />
              <Chip 
                label={`Price cache: ${priceStatus.cacheStats?.size || 0} entries`}
                color="info"
                variant="outlined"
              />
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={updatePrices}
                disabled={updatingPrices || !priceStatus.needsUpdate}
                size="small"
              >
                Update Missing Prices
              </Button>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={checkPriceStatus}
                disabled={updatingPrices}
                size="small"
              >
                Refresh Status
              </Button>
            </Box>
          </Box>
        )}

        {updatingPrices && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {priceProgressText}
            </Typography>
            <Box sx={{ width: '100%', maxWidth: 400, mx: 'auto' }}>
              <LinearProgress 
                variant="determinate" 
                value={priceProgress} 
                sx={{ height: 6, borderRadius: 3 }}
              />
            </Box>
          </Box>
        )}
      </Box>

      {/* Wallet Management Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" gutterBottom>
            <AccountBalanceWallet sx={{ mr: 1, verticalAlign: 'middle' }} />
            Wallet Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={handleLoadWalletsClick}
            disabled={walletLoading}
          >
            {walletLoading ? 'Loading...' : 'Load Wallets'}
          </Button>
        </Box>

        {walletLoading && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {walletProgressText}
            </Typography>
            <Box sx={{ width: '100%', maxWidth: 400, mx: 'auto' }}>
              <LinearProgress 
                variant="determinate" 
                value={walletProgress} 
                sx={{ height: 6, borderRadius: 3 }}
              />
            </Box>
          </Box>
        )}

        {wallets.length === 0 ? (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>No wallets loaded.</strong> Click &quot;Load Wallets&quot; to read CSV files from /tmp/wallets directory and identify which transactions belong to each wallet.
            </Typography>
          </Alert>
        ) : (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
            gap: 3 
          }}>
            {wallets.map((wallet) => {
              const relationships = walletRelationships.get(wallet.name) || [];
              return (
                <Card 
                  key={wallet.id}
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: 6,
                      transform: 'translateY(-2px)',
                      transition: 'all 0.2s ease-in-out'
                    }
                  }}
                  onClick={() => handleViewWallet(wallet.name)}
                >
                  <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <AccountBalanceWallet sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
                        {wallet.name}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Chip 
                        icon={<TrendingUp />}
                        label={`${wallet.transactionCount} transactions`}
                        size="small"
                        sx={{ mr: 1, mb: 1 }}
                      />
                      <Chip 
                        icon={<LinkIcon />}
                        label={`${wallet.relationshipCount || 0} relationships`}
                        size="small"
                        color={wallet.relationshipCount && wallet.relationshipCount > 0 ? 'secondary' : 'default'}
                      />
                    </Box>

                    {/* Show related wallets */}
                    {relationships.length > 0 && (
                      <Box sx={{ mt: 'auto' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                          Related Wallets:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {relationships.slice(0, 3).map((rel) => (
                            <Chip
                              key={rel.walletName}
                              label={`${rel.walletName} (${rel.transactionCount})`}
                              size="small"
                              variant="outlined"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewWallet(rel.walletName);
                              }}
                              sx={{ cursor: 'pointer' }}
                            />
                          ))}
                          {relationships.length > 3 && (
                            <Chip
                              label={`+${relationships.length - 3} more`}
                              size="small"
                              variant="outlined"
                              color="default"
                            />
                          )}
                        </Box>
                      </Box>
                    )}

                    <Button
                      variant="outlined"
                      size="small"
                      sx={{ mt: 2 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewWallet(wallet.name);
                      }}
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </Box>
    </Container>
  );
}
