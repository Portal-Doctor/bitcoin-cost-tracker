'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Box,
  TextField,
  IconButton,
  Chip,
  LinearProgress,
  CircularProgress,
  Divider,
  Alert,
  Paper,
  Collapse,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import {
  ArrowBack,
  ExpandMore,
  ExpandLess,
  Add,
  Save,
  CurrencyBitcoin,
  AccountTree,
  CalendarToday,
  TrendingUp,
  Security,
  Input,
  Output,
  AccountTree as TreeIcon,
  Timeline,
  AttachMoney,
  Delete,
  AccountBalanceWallet
} from '@mui/icons-material';
import { TransactionTree, TransactionNode, AddressInfo } from '@/types/bitcoin';
import { parseCSVData, buildTransactionTrees, getAddressType, formatBitcoinAmount, formatUSD, formatDate } from '@/lib/bitcoin-utils';
import TransactionFlowDiagram from '@/components/TransactionFlowDiagram';
import TransactionSearch from '@/components/TransactionSearch';

interface WalletInfo {
  walletName: string;
  transactionId: string;
  label: string;
  value: number;
  valueBTC: number;
  type: 'input' | 'output';
}

export default function TreeExplorePage() {
  const params = useParams();
  const router = useRouter();
  const treeId = params.id as string;
  
  const [tree, setTree] = useState<TransactionTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('Loading tree data...');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, string>>({});
  const [newComments, setNewComments] = useState<Record<string, string>>({});
  const [savingComment, setSavingComment] = useState(false);
  const [walletInfo, setWalletInfo] = useState<Record<string, WalletInfo>>({});
  const [viewMode, setViewMode] = useState<'detailed' | 'flow'>('detailed');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (treeId) {
      loadTreeData();
    }
  }, [treeId]);

  const loadTreeData = async () => {
    try {
      setLoading(true);
      setProgress(0);
      setProgressText('Loading wallet relationship data...');

      // Check if this is a wallet relationship tree (transaction ID)
      const isWalletRelationshipTree = treeId.length === 64; // Bitcoin transaction IDs are 64 characters

      if (isWalletRelationshipTree) {
        // Load wallet data to find relationships for this transaction
        const response = await fetch('/api/wallets/data');
        if (!response.ok) {
          throw new Error('Failed to fetch wallet data');
        }

        const walletDataResult = await response.json();
        const walletData = walletDataResult.walletData || [];
        
        setProgress(50);
        setProgressText('Finding wallet relationships...');

        // Find wallets that contain this transaction
        const relatedWallets = walletData.filter((wallet: any) => 
          wallet.transactions.some((tx: any) => tx.txid === treeId)
        );

        if (relatedWallets.length === 0) {
          throw new Error(`Transaction ${treeId} not found in any wallet`);
        }

        setProgress(85);
        setProgressText('Building relationship tree...');

        // Build the relationship node and calculate totals
        const walletTransactions = relatedWallets.map((wallet: any) => {
          const tx = wallet.transactions.find((t: any) => t.txid === treeId);
          return {
            walletName: wallet.walletName,
            transactionId: tx.txid,
            label: tx.label,
            value: tx.value,
            valueBTC: tx.value / 100000000,
            type: tx.type as 'input' | 'output',
            date: tx.date
          };
        });

        // Calculate totals from wallet transactions
        const totalAmount = walletTransactions.reduce((sum: number, tx: any) => sum + Math.abs(tx.value), 0);
        const totalValueUSD = (totalAmount / 100000000) * 45000; // Convert sats to BTC, then to USD
        const dates = walletTransactions.map((tx: any) => new Date(tx.date)).sort((a: Date, b: Date) => a.getTime() - b.getTime());
        const dateRange = {
          start: dates[0]?.toISOString() || new Date().toISOString(),
          end: dates[dates.length - 1]?.toISOString() || new Date().toISOString()
        };

        // Create a relationship tree structure
        const relationshipTree: any = {
          treeId: treeId,
          rootId: treeId,
          totalAmount: totalAmount,
          totalValueUSD: totalValueUSD,
          dateRange: dateRange,
          nodes: {},
          description: `Wallet Relationship Tree for Transaction ${treeId.substring(0, 8)}... - ${relatedWallets.length} wallets connected`,
          walletRelationship: true
        };

        // Build the relationship node
        const relationshipNode = {
          id: treeId,
          date: walletTransactions[0]?.date || new Date().toISOString(),
          confirmed: true,
          totalAmount: totalAmount,
          price: 45000,
          priceUSD: totalValueUSD,
          inputs: [],
          outputs: [],
          children: [],
          relatedWallets: relatedWallets.map((w: any) => w.walletName),
          walletTransactions: walletTransactions
        };

        relationshipTree.nodes[treeId] = relationshipNode;
        setTree(relationshipTree);

        setProgress(100);
        setProgressText('Complete!');
      } else {
        // Original transaction tree loading logic
        setProgressText('Loading transaction data...');

        // Fetch transaction trees from database
        const response = await fetch('/api/transactions');
        if (!response.ok) {
          throw new Error('Failed to fetch transaction data');
        }

        const transactionTrees = await response.json();
        setProgress(50);
        setProgressText('Finding specific tree...');

        // Find the specific tree by ID
        const targetTree = transactionTrees.find((t: any) => t.treeId === treeId);
        if (!targetTree) {
          throw new Error(`Tree ${treeId} not found`);
        }

        setProgress(85);
        setProgressText('Loading wallet information...');

        // Load wallet information for this tree's transactions
        await loadWalletInfo(targetTree);

        setProgress(95);
        setProgressText('Loading comments...');

        // Load comments for this tree
        await loadComments(treeId);

        setProgress(100);
        setProgressText('Complete!');

        setTree(targetTree);
      }
    } catch (error) {
      console.error('Error loading tree data:', error);
      setError(error instanceof Error ? error.message : 'Error loading tree data');
    } finally {
      setLoading(false);
    }
  };

  const loadWalletInfo = async (tree: any) => {
    try {
      // Collect all transaction IDs from the tree
      const transactionIds = Object.keys(tree.nodes);

      if (transactionIds.length > 0) {
        const response = await fetch(`/api/wallets/tree-info?transactionIds=${transactionIds.join(',')}`);
        if (response.ok) {
          const data = await response.json();
          setWalletInfo(data.walletInfo || {});
        }
      }
    } catch (error) {
      console.error('Error loading wallet info:', error);
    }
  };

  const loadComments = async (treeId: string) => {
    try {
      const response = await fetch(`/api/comments?treeId=${treeId}`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || {});
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const toggleNodeExpansion = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const addComment = (nodeId: string) => {
    setNewComments(prev => ({
      ...prev,
      [nodeId]: ''
    }));
  };

  const saveComment = async (nodeId: string, comment: string) => {
    if (!tree) return;
    
    try {
      setSavingComment(true);
      
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          treeId: treeId,
          nodeId: nodeId,
          content: comment
        }),
      });

      if (response.ok) {
        setComments(prev => ({
          ...prev,
          [nodeId]: comment
        }));
        setNewComments(prev => {
          const newState = { ...prev };
          delete newState[nodeId];
          return newState;
        });
      } else {
        throw new Error('Failed to save comment');
      }
    } catch (error) {
      console.error('Error saving comment:', error);
      alert('Failed to save comment');
    } finally {
      setSavingComment(false);
    }
  };

  const deleteComment = async (nodeId: string) => {
    if (!tree) return;
    
    try {
      const response = await fetch(`/api/comments?treeId=${treeId}&nodeId=${nodeId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const newComments = { ...comments };
        delete newComments[nodeId];
        setComments(newComments);
      } else {
        throw new Error('Failed to delete comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment');
    }
  };

  const renderTransactionNode = (node: TransactionNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const addressInfo = getAddressType(node.inputs[0]?.address || '');
    const isWalletRelationshipNode = (node as any).walletTransactions;
    
    return (
      <Box key={node.id} sx={{ ml: depth * 3 }}>
        <Card 
          sx={{ 
            mb: 2,
            borderLeft: `4px solid ${node.confirmed ? '#4caf50' : '#ff9800'}`,
            '&:hover': {
              boxShadow: 3,
              transform: 'translateX(2px)',
              transition: 'all 0.2s ease-in-out'
            }
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                Transaction {node.id.substring(0, 8)}...
              </Typography>
              <Chip 
                label={node.confirmed ? 'Confirmed' : 'Pending'}
                color={node.confirmed ? 'success' : 'warning'}
                size="small"
                sx={{ mr: 1 }}
              />
              {hasChildren && (
                <IconButton 
                  onClick={() => toggleNodeExpansion(node.id)}
                  size="small"
                >
                  {isExpanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              )}
            </Box>

            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              gap: 2, 
              mb: 2 
            }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  <CalendarToday sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                  Date
                </Typography>
                <Typography variant="body2">
                  {formatDate(node.date)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  <CurrencyBitcoin sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                  Amount
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {formatBitcoinAmount(node.totalAmount)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  <AttachMoney sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                  Value
                </Typography>
                <Typography variant="body2" fontWeight="bold" color="success.main">
                  {node.priceUSD ? formatUSD(node.priceUSD) : 'N/A'}
                </Typography>
                {node.price && (
                  <Typography variant="caption" color="text.secondary">
                    @ {formatUSD(node.price)}/BTC
                  </Typography>
                )}
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Inputs */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                <Input sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                Inputs ({node.inputs.length})
              </Typography>
              {node.inputs.map((input, index) => {
                const inputAddressInfo = getAddressType(input.address);
                return (
                  <Paper key={index} sx={{ p: 1, mb: 1, bgcolor: 'grey.50' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body2" fontFamily="monospace">
                          {input.address}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatBitcoinAmount(input.amount)}
                          {(input as any).sourceWallet && (input as any).sourceWallet !== 'external' && (
                            <span> • From {(input as any).sourceWallet}</span>
                          )}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        {(input as any).sourceWallet && (input as any).sourceWallet !== 'external' && (
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<AccountBalanceWallet />}
                            onClick={() => router.push(`/wallet/${(input as any).sourceWallet}`)}
                            sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                          >
                            {(input as any).sourceWallet}
                          </Button>
                        )}
                        <Chip
                          label={inputAddressInfo.type}
                          size="small"
                          color={inputAddressInfo.type === 'multisig' ? 'secondary' : 'primary'}
                          icon={<Security />}
                        />
                      </Box>
                    </Box>
                  </Paper>
                );
              })}
            </Box>

            {/* Outputs */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                <Output sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                Outputs ({node.outputs.length})
              </Typography>
              {node.outputs.map((output, index) => {
                const outputAddressInfo = getAddressType(output.address);
                return (
                  <Paper key={index} sx={{ p: 1, mb: 1, bgcolor: 'grey.50' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body2" fontFamily="monospace">
                          {output.address}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatBitcoinAmount(output.amount)}
                          {(output as any).destinationWallet && (output as any).destinationWallet !== 'external' && (
                            <span> • To {(output as any).destinationWallet}</span>
                          )}
                          {output.isChange && ' (change)'}
                          {output.isExternal && ' (external)'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        {(output as any).destinationWallet && (output as any).destinationWallet !== 'external' && (
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<AccountBalanceWallet />}
                            onClick={() => router.push(`/wallet/${(output as any).destinationWallet}`)}
                            sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                          >
                            {(output as any).destinationWallet}
                          </Button>
                        )}
                        <Chip
                          label={outputAddressInfo.type}
                          size="small"
                          color={outputAddressInfo.type === 'multisig' ? 'secondary' : 'primary'}
                          icon={<Security />}
                        />
                      </Box>
                    </Box>
                  </Paper>
                );
              })}
            </Box>

            {/* Wallet Relationships */}
            {(node as any).relatedWallets && (node as any).relatedWallets.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  <AccountBalanceWallet sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                  Related Wallets
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {(node as any).relatedWallets.map((walletName: string) => (
                    <Button
                      key={walletName}
                      variant="outlined"
                      size="small"
                      startIcon={<AccountBalanceWallet />}
                      onClick={() => router.push(`/wallet/${walletName}`)}
                      sx={{ textTransform: 'none' }}
                    >
                      {walletName}
                    </Button>
                  ))}
                </Box>
              </Box>
            )}

            {/* Wallet Relationship Details */}
            {isWalletRelationshipNode && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  <AccountBalanceWallet sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                  Wallet Transaction Details
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {(node as any).walletTransactions.map((walletTx: any, index: number) => (
                    <Paper key={index} sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {walletTx.walletName}
                        </Typography>
                        <Chip
                          label={walletTx.type === 'input' ? 'Received' : 'Sent'}
                          color={walletTx.type === 'input' ? 'success' : 'error'}
                          size="small"
                        />
                      </Box>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Amount
                          </Typography>
                          <Typography variant="body2" fontWeight="bold" color={walletTx.value >= 0 ? 'success.main' : 'error.main'}>
                            {walletTx.value >= 0 ? '+' : ''}{walletTx.value.toLocaleString()} sats
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {walletTx.valueBTC.toFixed(8)} BTC
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Label
                          </Typography>
                          <Typography variant="body2">
                            {walletTx.label || 'No label'}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Date
                          </Typography>
                          <Typography variant="body2">
                            {formatDate(walletTx.date)}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ mt: 1 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<AccountBalanceWallet />}
                          onClick={() => router.push(`/wallet/${walletTx.walletName}?txid=${walletTx.transactionId}`)}
                          sx={{ textTransform: 'none' }}
                        >
                          View in {walletTx.walletName}
                        </Button>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              </Box>
            )}

            {/* Transaction Type */}
            {(node as any).transactionType && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Transaction Type
                </Typography>
                <Chip
                  label={(node as any).transactionType}
                  color={
                    (node as any).transactionType === 'received' ? 'success' :
                    (node as any).transactionType === 'sent' ? 'error' :
                    (node as any).transactionType === 'internal' ? 'info' : 'default'
                  }
                  size="small"
                />
              </Box>
            )}

            {/* Comments */}
            <Box sx={{ mt: 2 }}>
              {comments[node.id] && (
                <Paper sx={{ p: 2, mb: 1, bgcolor: 'info.50', position: 'relative' }}>
                  <Typography variant="body2">
                    {comments[node.id]}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => deleteComment(node.id)}
                    sx={{ position: 'absolute', top: 4, right: 4 }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Paper>
              )}
              
              {newComments[node.id] && (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <TextField
                    multiline
                    rows={2}
                    placeholder="Add a comment about this transaction..."
                    size="small"
                    sx={{ flexGrow: 1 }}
                    autoFocus
                    disabled={savingComment}
                    value={newComments[node.id]}
                    onChange={(e) => setNewComments(prev => ({ ...prev, [node.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        const target = e.target as HTMLInputElement;
                        saveComment(node.id, target.value);
                      }
                    }}
                  />
                  <Button
                    variant="contained"
                    size="small"
                    disabled={savingComment}
                    onClick={() => {
                      const input = document.querySelector(`textarea[placeholder*="comment"]`) as HTMLInputElement;
                      if (input) {
                        saveComment(node.id, input.value);
                      }
                    }}
                  >
                    {savingComment ? <CircularProgress size={16} /> : <Save />}
                  </Button>
                </Box>
              )}
              {!comments[node.id] && !newComments[node.id] && (
                <Button
                  startIcon={<Add />}
                  onClick={() => addComment(node.id)}
                  size="small"
                >
                  Add Comment
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Child transactions */}
        <Collapse in={isExpanded}>
          {node.children.map(childId => {
            const childNode = tree?.nodes[childId];
            if (childNode) {
              return renderTransactionNode(childNode, depth + 1);
            }
            return null;
          })}
        </Collapse>
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

  if (error || !tree) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Tree not found'}
        </Alert>
        <Button variant="contained" onClick={() => router.push('/')}>
          Back to Trees
        </Button>
      </Container>
    );
  }

  const rootNode = tree.nodes[tree.rootId];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.push('/')}
          sx={{ mb: 2 }}
        >
          Back to Trees
        </Button>

                 <Typography variant="h4" component="h1" gutterBottom>
           <AccountTree sx={{ mr: 2, verticalAlign: 'middle' }} />
           {(tree as any).walletRelationship ? 'Wallet Relationship Tree' : 'Transaction Tree Explorer'}
         </Typography>

         {/* Transaction Search */}
         <TransactionSearch />
        
        {(tree as any).walletRelationship && (
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            This transaction connects {(tree.nodes[tree.rootId] as any)?.relatedWallets?.length || 0} wallets. 
            Below you can see how each wallet experienced this transaction.
          </Typography>
        )}

        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', md: (tree as any).walletRelationship ? 'repeat(4, 1fr)' : 'repeat(4, 1fr)' },
            gap: 3 
          }}>
            <Box>
              <Typography variant="h6" color="primary">
                {(tree as any).walletRelationship ? 
                  formatBitcoinAmount(tree.totalAmount / 100000000) : 
                  formatBitcoinAmount(tree.totalAmount)
                }
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {(tree as any).walletRelationship ? 'Total Transaction Amount' : 'Total Tree Amount'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="h6" color="success.main">
                {tree.totalValueUSD ? formatUSD(tree.totalValueUSD) : 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total USD Value
              </Typography>
            </Box>
            <Box>
              <Typography variant="h6">
                {(tree as any).walletRelationship ? 
                  (tree.nodes[tree.rootId] as any)?.relatedWallets?.length || 0 :
                  Object.keys(tree.nodes).length
                }
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {(tree as any).walletRelationship ? 'Connected Wallets' : 'Total Transactions'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="h6">
                {formatDate(tree.dateRange.start)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {(tree as any).walletRelationship ? 'Transaction Date' : 'Date Range'}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* View Mode Toggle - Only for regular transaction trees */}
        {!(tree as any).walletRelationship && (
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, newMode) => newMode && setViewMode(newMode)}
              aria-label="view mode"
            >
              <ToggleButton value="detailed" aria-label="detailed view">
                <TreeIcon sx={{ mr: 1 }} />
                Detailed View
              </ToggleButton>
              <ToggleButton value="flow" aria-label="flow diagram">
                <Timeline sx={{ mr: 1 }} />
                Flow Diagram
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}
      </Box>

      {(tree as any).walletRelationship ? (
        <>
          <Typography variant="h5" gutterBottom>
            Wallet Relationship Details
          </Typography>
          {renderTransactionNode(rootNode)}
        </>
      ) : viewMode === 'detailed' ? (
        <>
          <Typography variant="h5" gutterBottom>
            Transaction Flow
          </Typography>
          {renderTransactionNode(rootNode)}
        </>
      ) : (
        <Paper elevation={2}>
          <TransactionFlowDiagram
            tree={tree}
            expandedNodes={expandedNodes}
            onToggleNode={toggleNodeExpansion}
          />
        </Paper>
      )}
    </Container>
  );
}
