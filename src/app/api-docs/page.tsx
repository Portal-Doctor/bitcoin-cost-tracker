import { Container, Typography, Box, Paper, Button } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import SwaggerUIComponent from '../../components/SwaggerUI';

export default function ApiDocsPage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <Paper elevation={1} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Container maxWidth="xl" sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
                API Documentation
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                Interactive documentation for the Bitcoin Cost Basis Tracker API
              </Typography>
            </Box>
            <Button
              href="/"
              variant="contained"
              startIcon={<ArrowBack />}
              sx={{ minWidth: 120 }}
            >
              Back to App
            </Button>
          </Box>
        </Container>
      </Paper>
      
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <SwaggerUIComponent />
      </Container>
    </Box>
  );
}
