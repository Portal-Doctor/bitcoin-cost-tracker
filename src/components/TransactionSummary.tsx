'use client';

import { Box, Paper, Typography, Chip } from '@mui/material';
import { TrendingUp, TrendingDown, SwapHoriz, AttachMoney } from '@mui/icons-material';
import { Transaction } from '../types/bitcoin';

interface TransactionSummaryProps {
  purchases: Transaction[];
  sells: Transaction[];
  moves: Transaction[];
}

export default function TransactionSummary({ purchases, sells, moves }: TransactionSummaryProps) {
  const totalPurchases = purchases.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const totalSells = sells.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const totalMoves = moves.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const totalFees = [...purchases, ...sells, ...moves].reduce((sum, tx) => sum + (tx.fee || 0), 0);
  
  const totalCost = purchases.reduce((sum, tx) => {
    const price = tx.price?.price || 0;
    return sum + (Math.abs(tx.amount) * price);
  }, 0);
  
  const totalRevenue = sells.reduce((sum, tx) => {
    const price = tx.price?.price || 0;
    return sum + (Math.abs(tx.amount) * price);
  }, 0);
  
  const profitLoss = totalRevenue - totalCost;
  const remainingBalance = totalPurchases - totalSells;

  const summaryItems = [
    {
      title: 'Total Purchases',
      value: `${totalPurchases.toFixed(8)} BTC`,
      color: 'success' as const,
      icon: <TrendingUp />,
    },
    {
      title: 'Total Sells',
      value: `${totalSells.toFixed(8)} BTC`,
      color: 'error' as const,
      icon: <TrendingDown />,
    },
    {
      title: 'Wallet Moves',
      value: `${totalMoves.toFixed(8)} BTC`,
      color: 'info' as const,
      icon: <SwapHoriz />,
    },
    {
      title: 'Total Fees',
      value: `${totalFees.toFixed(8)} BTC`,
      color: 'warning' as const,
      icon: <AttachMoney />,
    },
    {
      title: 'Remaining Balance',
      value: `${remainingBalance.toFixed(8)} BTC`,
      color: remainingBalance >= 0 ? 'success' : 'error' as const,
      icon: <AttachMoney />,
    },
    {
      title: 'P&L',
      value: `$${profitLoss.toFixed(2)}`,
      color: profitLoss >= 0 ? 'success' : 'error' as const,
      icon: profitLoss >= 0 ? <TrendingUp /> : <TrendingDown />,
    },
  ];

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Transaction Summary
      </Typography>
      
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
        gap: 2 
      }}>
        {summaryItems.map((item, index) => (
          <Box
            key={index}
            sx={{
              p: 2,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              textAlign: 'center',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
              <Box sx={{ color: `${item.color}.main`, mr: 1 }}>
                {item.icon}
              </Box>
              <Typography variant="subtitle2" color="text.secondary">
                {item.title}
              </Typography>
            </Box>
            <Typography variant="h6" color={`${item.color}.main`} sx={{ fontWeight: 'bold' }}>
              {item.value}
            </Typography>
          </Box>
        ))}
      </Box>
      
      <Box sx={{ mt: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip 
          label={`${purchases.length} Purchases`} 
          color="success" 
          variant="outlined" 
          size="small" 
        />
        <Chip 
          label={`${sells.length} Sells`} 
          color="error" 
          variant="outlined" 
          size="small" 
        />
        <Chip 
          label={`${moves.length} Moves`} 
          color="info" 
          variant="outlined" 
          size="small" 
        />
      </Box>
    </Paper>
  );
}
