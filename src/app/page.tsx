'use client';

import { Container, Typography, Box, Paper } from '@mui/material';
import BitcoinTransactionTracker from '../components/BitcoinTransactionTracker';

export default function Home() {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 4, position: 'relative' }}>
        <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'text.primary' }}>
          Bitcoin Cost Basis Tracker
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          Track your Bitcoin transactions, purchases, and cost basis
        </Typography>
        
        {/* Subtle API Documentation link in top-right corner */}
        <Box sx={{ position: 'absolute', top: 0, right: 0 }}>
          <a
            href="/api-docs"
            style={{ textDecoration: 'none' }}
          >
            <Paper
              elevation={1}
              sx={{
                px: 2,
                py: 0.5,
                bgcolor: 'grey.100',
                color: 'text.secondary',
                cursor: 'pointer',
                fontSize: '0.875rem',
                '&:hover': {
                  bgcolor: 'grey.200',
                  color: 'text.primary',
                  transition: 'all 0.2s ease-in-out',
                }
              }}
            >
              📚 API Docs
            </Paper>
          </a>
        </Box>
      </Box>
      
      <Paper elevation={3} sx={{ p: 3 }}>
        <BitcoinTransactionTracker />
      </Paper>
    </Container>
  );
}
