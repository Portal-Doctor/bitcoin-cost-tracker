'use client';

import { useEffect, useState } from 'react';
import { Box, CircularProgress, Alert, Button, Typography } from '@mui/material';
import { Refresh } from '@mui/icons-material';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function SwaggerUIComponent() {
  const [swaggerSpec, setSwaggerSpec] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSwaggerSpec = async () => {
      try {
        const response = await fetch('/api/swagger');
        if (!response.ok) {
          throw new Error('Failed to fetch Swagger specification');
        }
        const spec = await response.json();
        setSwaggerSpec(spec);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load API documentation');
      } finally {
        setLoading(false);
      }
    };

    fetchSwaggerSpec();
  }, []);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    window.location.reload();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <CircularProgress size={48} sx={{ mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          Loading API documentation...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <Alert severity="error" sx={{ mb: 3, maxWidth: 600 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            ⚠️ Error Loading Documentation
          </Typography>
          <Typography variant="body1">
            {error}
          </Typography>
        </Alert>
        <Button 
          variant="contained"
          startIcon={<Refresh />}
          onClick={handleRetry}
          size="large"
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      '& .swagger-ui': {
        fontFamily: 'inherit',
      },
      '& .swagger-ui .topbar': {
        display: 'none',
      },
      '& .swagger-ui .info': {
        margin: '20px 0',
      },
      '& .swagger-ui .scheme-container': {
        margin: '20px 0',
        padding: '20px',
        backgroundColor: 'background.paper',
        borderRadius: 1,
        boxShadow: 1,
      }
    }}>
      <SwaggerUI 
        spec={swaggerSpec} 
        docExpansion="list"
        defaultModelsExpandDepth={1}
        defaultModelExpandDepth={1}
        tryItOutEnabled={true}
        requestInterceptor={(request: any) => {
          // Add any request interceptors if needed
          return request;
        }}
        responseInterceptor={(response: any) => {
          // Add any response interceptors if needed
          return response;
        }}
      />
    </Box>
  );
}
