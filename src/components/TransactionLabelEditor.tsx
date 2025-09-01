'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  Chip,
  Box,
  Typography,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Edit,
  Delete,
  Label,
  Save,
  Cancel,
  Add
} from '@mui/icons-material';
import { LabelService, TransactionLabel } from '@/lib/label-service';

interface TransactionLabelEditorProps {
  txid: string;
  walletName: string;
  currentLabel?: string;
  onLabelChange?: (label: TransactionLabel | null) => void;
}

const LABEL_COLORS = [
  { name: 'Default', value: '#1976d2' },
  { name: 'Red', value: '#d32f2f' },
  { name: 'Green', value: '#388e3c' },
  { name: 'Orange', value: '#f57c00' },
  { name: 'Purple', value: '#7b1fa2' },
  { name: 'Teal', value: '#00796b' },
  { name: 'Pink', value: '#c2185b' },
  { name: 'Brown', value: '#5d4037' },
];

export default function TransactionLabelEditor({ 
  txid, 
  walletName, 
  currentLabel,
  onLabelChange 
}: TransactionLabelEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [color, setColor] = useState('#1976d2');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingLabel, setExistingLabel] = useState<TransactionLabel | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadExistingLabel();
    }
  }, [isOpen, txid, walletName]);

  const loadExistingLabel = async () => {
    try {
      setLoading(true);
      const existing = await LabelService.getLabel(txid, walletName);
      setExistingLabel(existing);
      if (existing) {
        setLabel(existing.label);
        setColor(existing.color || '#1976d2');
      } else {
        setLabel(currentLabel || '');
        setColor('#1976d2');
      }
    } catch (error) {
      console.error('Error loading existing label:', error);
      setError('Failed to load existing label');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setError(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    setLabel('');
    setColor('#1976d2');
    setError(null);
  };

  const handleSave = async () => {
    if (!label.trim()) {
      setError('Label cannot be empty');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await LabelService.upsertLabel(txid, walletName, label.trim(), color);
      
      if (result) {
        setExistingLabel(result);
        onLabelChange?.(result);
        handleClose();
      } else {
        setError('Failed to save label');
      }
    } catch (error) {
      console.error('Error saving label:', error);
      setError('Failed to save label');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingLabel) return;

    try {
      setLoading(true);
      setError(null);

      const success = await LabelService.deleteLabel(txid, walletName);
      
      if (success) {
        setExistingLabel(null);
        onLabelChange?.(null);
        handleClose();
      } else {
        setError('Failed to delete label');
      }
    } catch (error) {
      console.error('Error deleting label:', error);
      setError('Failed to delete label');
    } finally {
      setLoading(false);
    }
  };

  const displayLabel = existingLabel?.label || currentLabel;

  return (
    <>
      {/* Display current label or edit button */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {displayLabel ? (
          <Chip
            label={displayLabel}
            size="small"
            icon={<Label />}
            sx={{
              backgroundColor: existingLabel?.color || '#1976d2',
              color: 'white',
              '&:hover': {
                backgroundColor: existingLabel?.color || '#1976d2',
                opacity: 0.8
              }
            }}
            onClick={handleOpen}
            clickable
          />
        ) : (
          <IconButton
            size="small"
            onClick={handleOpen}
            sx={{ color: 'text.secondary' }}
          >
            <Add />
          </IconButton>
        )}
        
        {existingLabel && (
          <IconButton
            size="small"
            onClick={handleDelete}
            sx={{ color: 'error.main' }}
            disabled={loading}
          >
            <Delete />
          </IconButton>
        )}
      </Box>

      {/* Label Editor Dialog */}
      <Dialog open={isOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Label />
            {existingLabel ? 'Edit Transaction Label' : 'Add Transaction Label'}
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              fullWidth
              multiline
              rows={2}
              placeholder="Enter a label for this transaction..."
              disabled={loading}
            />
            
            <FormControl fullWidth>
              <InputLabel>Color</InputLabel>
              <Select
                value={color}
                onChange={(e) => setColor(e.target.value)}
                label="Color"
                disabled={loading}
              >
                {LABEL_COLORS.map((colorOption) => (
                  <MenuItem key={colorOption.value} value={colorOption.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          backgroundColor: colorOption.value,
                          border: '1px solid #ccc'
                        }}
                      />
                      {colorOption.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Preview:
              </Typography>
              <Chip
                label={label || 'Sample Label'}
                size="small"
                icon={<Label />}
                sx={{
                  backgroundColor: color,
                  color: 'white'
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} /> : <Save />}
            disabled={loading || !label.trim()}
          >
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
