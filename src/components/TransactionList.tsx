'use client';

import { Box, Paper, Typography, List, ListItem, Chip, Divider } from '@mui/material';
import { TrendingUp, TrendingDown, SwapHoriz } from '@mui/icons-material';
import { Transaction } from '../types/bitcoin';
import CommentSection from './CommentSection';

interface TransactionListProps {
  title: string;
  transactions: Transaction[];
  type: 'purchase' | 'sell' | 'move';
}

export default function TransactionList({ title, transactions, type }: TransactionListProps) {
  const getTypeIcon = () => {
    switch (type) {
      case 'purchase':
        return <TrendingUp color="success" />;
      case 'sell':
        return <TrendingDown color="error" />;
      case 'move':
        return <SwapHoriz color="info" />;
      default:
        return null;
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case 'purchase':
        return 'success';
      case 'sell':
        return 'error';
      case 'move':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatAmount = (amount: number) => {
    return `${Math.abs(amount).toFixed(8)} BTC`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (transactions.length === 0) {
    return (
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          {getTypeIcon()}
          <Typography variant="h6" sx={{ ml: 1 }}>
            {title}
          </Typography>
          <Chip 
            label="0" 
            color={getTypeColor() as any} 
            size="small" 
            sx={{ ml: 'auto' }} 
          />
        </Box>
        <Typography color="text.secondary" variant="body2">
          No {type} transactions found.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={1} sx={{ mb: 3 }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {getTypeIcon()}
          <Typography variant="h6" sx={{ ml: 1 }}>
            {title}
          </Typography>
          <Chip 
            label={transactions.length} 
            color={getTypeColor() as any} 
            size="small" 
            sx={{ ml: 'auto' }} 
          />
        </Box>
      </Box>
      
      <List sx={{ p: 0 }}>
        {transactions.map((transaction, index) => (
          <Box key={transaction.txid}>
            <ListItem sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', mb: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                    {transaction.txid.substring(0, 16)}...
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(transaction.date)}
                  </Typography>
                </Box>
                
                <Box sx={{ textAlign: 'right', ml: 2 }}>
                  <Typography variant="h6" color={`${getTypeColor()}.main`} sx={{ fontWeight: 'bold' }}>
                    {formatAmount(transaction.amount)}
                  </Typography>
                  {transaction.price && (
                    <Typography variant="body2" color="text.secondary">
                      {formatPrice(transaction.price.price)}
                    </Typography>
                  )}
                  {transaction.fee && transaction.fee > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      Fee: {formatAmount(transaction.fee)}
                    </Typography>
                  )}
                </Box>
              </Box>
              
              {transaction.costBasis && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Cost Basis: {formatPrice(transaction.costBasis)}
                  </Typography>
                </Box>
              )}
              
              {transaction.profitLoss && (
                <Box sx={{ mb: 1 }}>
                  <Typography 
                    variant="body2" 
                    color={transaction.profitLoss >= 0 ? 'success.main' : 'error.main'}
                  >
                    P&L: {formatPrice(transaction.profitLoss)}
                  </Typography>
                </Box>
              )}
              
                             {/* Address Information */}
               <Box sx={{ mt: 2, mb: 1 }}>
                 <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                   Addresses:
                 </Typography>
                 <Box sx={{ mt: 1 }}>
                   {transaction.addresses.length > 0 ? (
                     transaction.addresses.map((addr, addrIndex) => (
                       <Box key={addrIndex} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                         <Box
                           sx={{
                             width: 8,
                             height: 8,
                             borderRadius: '50%',
                             mr: 1,
                             bgcolor: addr.isInputAddress && addr.isOutputAddress 
                               ? 'warning.main' 
                               : addr.isInputAddress 
                                 ? 'error.main' 
                                 : 'success.main'
                           }}
                         />
                         <Typography variant="caption" sx={{ fontFamily: 'monospace', mr: 1 }}>
                           {addr.address.substring(0, 8)}...{addr.address.substring(addr.address.length - 8)}
                         </Typography>
                         <Chip 
                           label={addr.type} 
                           size="small" 
                           variant="outlined"
                           color={addr.type === 'multi-sig' ? 'warning' : 'default'}
                           sx={{ mr: 1, fontSize: '0.7rem' }}
                         />
                         <Typography variant="caption" color="text.secondary">
                           {addr.scriptType}
                         </Typography>
                       </Box>
                     ))
                   ) : (
                     <Typography variant="caption" color="text.secondary">
                       No address information available
                     </Typography>
                   )}
                 </Box>
               </Box>
               
               <CommentSection txid={transaction.txid} />
             </ListItem>
             {index < transactions.length - 1 && <Divider />}
           </Box>
         ))}
       </List>
     </Paper>
   );
 }
