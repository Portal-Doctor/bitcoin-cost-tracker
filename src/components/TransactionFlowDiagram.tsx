'use client';

import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  IconButton,
  Collapse,
  Tooltip
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  ArrowDownward,
  CurrencyBitcoin,
  Security,
  Input,
  Output,
  AttachMoney
} from '@mui/icons-material';
import { TransactionNode, TransactionTree } from '@/types/bitcoin';
import { getAddressType, formatBitcoinAmount, formatUSD } from '@/lib/bitcoin-utils';

interface TransactionFlowDiagramProps {
  tree: TransactionTree;
  expandedNodes: Set<string>;
  onToggleNode: (nodeId: string) => void;
}

export default function TransactionFlowDiagram({
  tree,
  expandedNodes,
  onToggleNode
}: TransactionFlowDiagramProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const renderTransactionBox = (node: TransactionNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const isHovered = hoveredNode === node.id;

    return (
      <Box key={node.id} sx={{ position: 'relative' }}>
        {/* Connection line from parent */}
        {depth > 0 && (
          <Box
            sx={{
              position: 'absolute',
              left: -20,
              top: -10,
              width: 2,
              height: 20,
              bgcolor: 'primary.main',
              zIndex: 1
            }}
          />
        )}

        <Paper
          elevation={isHovered ? 8 : 2}
          sx={{
            p: 2,
            mb: 2,
            ml: depth * 4,
            border: `2px solid ${node.confirmed ? '#4caf50' : '#ff9800'}`,
            borderRadius: 2,
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: 8
            },
            position: 'relative',
            zIndex: 2
          }}
          onMouseEnter={() => setHoveredNode(node.id)}
          onMouseLeave={() => setHoveredNode(null)}
          onClick={() => onToggleNode(node.id)}
        >
          {/* Transaction Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ flexGrow: 1, fontFamily: 'monospace' }}>
              {node.id.substring(0, 8)}...
            </Typography>
            <Chip
              label={node.confirmed ? 'Confirmed' : 'Pending'}
              color={node.confirmed ? 'success' : 'warning'}
              size="small"
              sx={{ mr: 1 }}
            />
            {hasChildren && (
              <IconButton size="small">
                {isExpanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            )}
          </Box>

          {/* Amount and Date */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CurrencyBitcoin sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="body1" fontWeight="bold">
                  {formatBitcoinAmount(node.totalAmount)}
                </Typography>
              </Box>
              {node.priceUSD && (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <AttachMoney sx={{ mr: 1, color: 'success.main', fontSize: 16 }} />
                  <Typography variant="body2" color="success.main" fontWeight="bold">
                    {formatUSD(node.priceUSD)}
                  </Typography>
                </Box>
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">
              {new Date(node.date).toLocaleDateString()}
            </Typography>
          </Box>

          {/* Inputs and Outputs Summary */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Input sx={{ mr: 0.5, color: 'error.main' }} />
              <Typography variant="caption">
                {node.inputs.length} inputs
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Output sx={{ mr: 0.5, color: 'success.main' }} />
              <Typography variant="caption">
                {node.outputs.length} outputs
              </Typography>
            </Box>
          </Box>

          {/* Address Types Summary */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {node.inputs.map((input, index) => {
              const addressInfo = getAddressType(input.address);
              return (
                <Tooltip key={`input-${index}`} title={`${input.address} - ${formatBitcoinAmount(input.amount)}`}>
                  <Chip
                    label={addressInfo.type}
                    size="small"
                    color={addressInfo.type === 'multisig' ? 'secondary' : 'primary'}
                    icon={<Security />}
                    sx={{ fontSize: '0.7rem' }}
                  />
                </Tooltip>
              );
            })}
            {node.outputs.map((output, index) => {
              const addressInfo = getAddressType(output.address);
              return (
                <Tooltip key={`output-${index}`} title={`${output.address} - ${formatBitcoinAmount(output.amount)}${output.isChange ? ' (change)' : ''}${output.isExternal ? ' (external)' : ''}`}>
                  <Chip
                    label={`${addressInfo.type}${output.isChange ? '-C' : ''}${output.isExternal ? '-E' : ''}`}
                    size="small"
                    color={output.isChange ? 'warning' : output.isExternal ? 'error' : 'success'}
                    icon={<Security />}
                    sx={{ fontSize: '0.7rem' }}
                  />
                </Tooltip>
              );
            })}
          </Box>

          {/* Arrow pointing down if has children */}
          {hasChildren && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
              <ArrowDownward sx={{ color: 'primary.main' }} />
            </Box>
          )}
        </Paper>

        {/* Child transactions */}
        {hasChildren && (
          <Collapse in={isExpanded}>
            <Box sx={{ position: 'relative' }}>
              {/* Vertical connection line */}
              <Box
                sx={{
                  position: 'absolute',
                  left: depth * 4 + 20,
                  top: 0,
                  width: 2,
                  height: '100%',
                  bgcolor: 'primary.main',
                  zIndex: 1
                }}
              />
              {node.children.map(childId => {
                const childNode = tree.nodes[childId];
                if (childNode) {
                  return renderTransactionBox(childNode, depth + 1);
                }
                return null;
              })}
            </Box>
          </Collapse>
        )}
      </Box>
    );
  };

  const rootNode = tree.nodes[tree.rootId];

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        UTXO Flow Visualization
      </Typography>
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Click on transactions to expand/collapse. Hover for details.
        </Typography>
      </Box>
      {renderTransactionBox(rootNode)}
    </Box>
  );
}
