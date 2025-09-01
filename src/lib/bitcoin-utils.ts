import { BitcoinTransaction, TransactionNode, TransactionTree, TreeSummary, AddressInfo } from '@/types/bitcoin';

export function parseCSVData(csvData: string): BitcoinTransaction[] {
  const lines = csvData.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.replace(/"/g, ''));
    return {
      confirmed: values[0] === 'true',
      date: values[1],
      type: values[2] as 'Sent to' | 'Received with' | '',
      label: values[3],
      address: values[4],
      amount: parseFloat(values[5]),
      id: values[6]
    };
  });
}

export function getAddressType(address: string): AddressInfo {
  const prefix = address.substring(0, 4);
  
  if (address.startsWith('bc1p')) {
    return {
      address,
      type: 'multisig',
      prefix: 'bc1p',
      description: 'Taproot multisig address'
    };
  } else if (address.startsWith('bc1q')) {
    return {
      address,
      type: 'single-sig',
      prefix: 'bc1q',
      description: 'Native SegWit single-sig address'
    };
  } else if (address.startsWith('3')) {
    return {
      address,
      type: 'multisig',
      prefix: '3',
      description: 'P2SH multisig address'
    };
  } else if (address.startsWith('1')) {
    return {
      address,
      type: 'single-sig',
      prefix: '1',
      description: 'Legacy single-sig address'
    };
  } else {
    return {
      address,
      type: 'unknown',
      prefix: prefix,
      description: 'Unknown address type'
    };
  }
}

export async function buildTransactionTrees(transactions: BitcoinTransaction[]): Promise<TransactionTree[]> {
  console.log('Building transaction trees with UTXO tracing...');
  
  // Group transactions by ID to handle multiple inputs/outputs per transaction
  const txGroups = new Map<string, BitcoinTransaction[]>();
  
  transactions.forEach(tx => {
    if (!txGroups.has(tx.id)) {
      txGroups.set(tx.id, []);
    }
    txGroups.get(tx.id)!.push(tx);
  });

  console.log(`Processing ${txGroups.size} unique transactions...`);

  // Create transaction nodes
  const nodes = new Map<string, TransactionNode>();
  
  txGroups.forEach((txs, txId) => {
    const firstTx = txs[0];
    const inputs: { address: string; amount: number }[] = [];
    const outputs: { address: string; amount: number; isChange: boolean; isExternal: boolean }[] = [];
    
    txs.forEach(tx => {
      if (tx.type === 'Received with') {
        inputs.push({
          address: tx.address,
          amount: Math.abs(tx.amount)
        });
      } else if (tx.type === 'Sent to') {
        outputs.push({
          address: tx.address,
          amount: Math.abs(tx.amount),
          isChange: false, // Will be determined later
          isExternal: true
        });
      }
    });

    // Calculate total amount
    const totalAmount = txs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    nodes.set(txId, {
      id: txId,
      date: firstTx.date,
      confirmed: firstTx.confirmed,
      inputs,
      outputs,
      children: [],
      totalAmount,
      comments: []
    });
  });

  // Build parent-child relationships using UTXO tracing
  console.log('Tracing UTXO relationships...');
  
  // Create a map of output addresses to transaction IDs for quick lookup
  const addressToTxMap = new Map<string, string[]>();
  
  nodes.forEach((node, txId) => {
    node.outputs.forEach(output => {
      if (!addressToTxMap.has(output.address)) {
        addressToTxMap.set(output.address, []);
      }
      addressToTxMap.get(output.address)!.push(txId);
    });
  });

  // Build relationships by checking which transactions spend outputs from other transactions
  let relationshipCount = 0;
  
  for (const [txId, node] of nodes) {
    // For each input in this transaction, check if it's an output from a previous transaction
    for (const input of node.inputs) {
      const sourceTxs = addressToTxMap.get(input.address) || [];
      
      for (const sourceTxId of sourceTxs) {
        if (sourceTxId !== txId) {
          const sourceNode = nodes.get(sourceTxId);
          if (sourceNode) {
            // Check if the source transaction is earlier in time
            const sourceDate = new Date(sourceNode.date);
            const currentDate = new Date(node.date);
            
            if (sourceDate < currentDate) {
              // This is a valid parent-child relationship
              if (!node.children.includes(sourceTxId)) {
                node.children.push(sourceTxId);
                sourceNode.parent = txId;
                relationshipCount++;
                console.log(`Found relationship: ${sourceTxId} -> ${txId} (via ${input.address})`);
              }
            }
          }
        }
      }
    }
  }

  console.log(`Found ${relationshipCount} parent-child relationships`);

  // Identify change addresses and external outputs
  nodes.forEach((node, txId) => {
    const outputAddresses = node.outputs.map(o => o.address);
    const uniqueAddresses = [...new Set(outputAddresses)];
    
    node.outputs.forEach(output => {
      // If this address appears in multiple outputs of the same transaction, it's likely change
      const addressCount = outputAddresses.filter(addr => addr === output.address).length;
      if (addressCount > 1) {
        output.isChange = true;
        output.isExternal = false;
      } else {
        // Check if this address is used in future transactions (indicating it's not change)
        const futureUsage = addressToTxMap.get(output.address) || [];
        const isUsedLater = futureUsage.some(futureTxId => {
          const futureNode = nodes.get(futureTxId);
          return futureNode && new Date(futureNode.date) > new Date(node.date);
        });
        
        if (isUsedLater) {
          output.isChange = false;
          output.isExternal = false; // This is our address being reused
        } else {
          output.isChange = false;
          output.isExternal = true; // External address
        }
      }
    });
  });

  // Find root transactions (those without parents or with external inputs)
  const rootIds = Array.from(nodes.keys()).filter(txId => {
    const node = nodes.get(txId)!;
    // Root transactions are those that either have no parents or have external inputs
    return !node.parent || node.inputs.some(input => {
      const inputUsage = addressToTxMap.get(input.address) || [];
      return inputUsage.length === 0; // External input
    });
  });

  console.log(`Found ${rootIds.length} root transactions`);

  // Add fallback price data to nodes (will be replaced by API calls later)
  nodes.forEach((node, txId) => {
    // Use a fallback price for now - this will be replaced by API calls
    const fallbackPrice = 45000;
    node.price = fallbackPrice;
    node.priceUSD = node.totalAmount * fallbackPrice;
  });

  // Build trees from root transactions
  const trees = rootIds.map(rootId => {
    const treeNodes: Record<string, TransactionNode> = {};
    const visited = new Set<string>();
    
    function traverse(txId: string) {
      if (visited.has(txId)) return;
      visited.add(txId);
      
      const node = nodes.get(txId)!;
      treeNodes[txId] = node;
      
      node.children.forEach(childId => {
        traverse(childId);
      });
    }
    
    traverse(rootId);
    
    const treeNodesArray = Object.values(treeNodes);
    const totalAmount = treeNodesArray.reduce((sum, node) => sum + node.totalAmount, 0);
    const totalValueUSD = treeNodesArray.reduce((sum, node) => sum + (node.priceUSD || 0), 0);
    const dates = treeNodesArray.map(node => new Date(node.date));
    const timestamps = dates.map(date => date.getTime());
    
    return {
      rootId,
      nodes: treeNodes,
      totalAmount,
      totalValueUSD,
      dateRange: {
        start: new Date(Math.min(...timestamps)).toISOString(),
        end: new Date(Math.max(...timestamps)).toISOString()
      }
    };
  });

  // Sort trees by node count (descending) to show trees with most transactions first
  trees.sort((a, b) => Object.keys(b.nodes).length - Object.keys(a.nodes).length);
  
  console.log(`Built ${trees.length} transaction trees`);
  trees.forEach((tree, index) => {
    const nodeCount = Object.keys(tree.nodes).length;
    console.log(`Tree ${index + 1}: ${nodeCount} transactions, ${tree.totalAmount.toFixed(8)} BTC`);
  });

  return trees;
}

export function generateTreeSummaries(trees: TransactionTree[]): TreeSummary[] {
  // Sort trees by node count (descending) to show trees with most transactions first
  const sortedTrees = trees.sort((a, b) => Object.keys(b.nodes).length - Object.keys(a.nodes).length);
  
  return sortedTrees.map((tree, index) => {
    const nodeCount = Object.keys(tree.nodes).length;
    
    // Handle both regular transaction trees and UTXO trees
    let rootNode;
    if (tree.rootId && tree.nodes[tree.rootId]) {
      rootNode = tree.nodes[tree.rootId];
    } else {
      // For UTXO trees, get the first node
      const nodeIds = Object.keys(tree.nodes);
      rootNode = nodeIds.length > 0 ? tree.nodes[nodeIds[0]] : null;
    }
    
    if (!rootNode) {
      console.warn(`Tree ${index} has no valid root node`);
      return {
        id: `tree-${index}`,
        rootId: tree.rootId || `unknown-${index}`,
        totalAmount: tree.totalAmount || 0,
        totalValueUSD: tree.totalValueUSD || 0,
        dateRange: tree.dateRange || { start: new Date().toISOString(), end: new Date().toISOString() },
        transactionCount: nodeCount,
        description: `Tree with ${nodeCount} transactions`
      };
    }
    
    // Safely access inputs and outputs
    const inputs = rootNode.inputs || [];
    const outputs = rootNode.outputs || [];
    
    const inputCount = inputs.length;
    const outputCount = outputs.length;
    const externalOutputs = outputs.filter((o: any) => o.isExternal).length;
    const changeOutputs = outputs.filter((o: any) => o.isChange).length;
    
    let description = `Tree with ${inputCount} inputs and ${outputCount} outputs`;
    if (externalOutputs > 0) {
      description += ` (${externalOutputs} external)`;
    }
    if (changeOutputs > 0) {
      description += ` (${changeOutputs} change)`;
    }
    
    // Add UTXO chain info if available
    if (tree.chainLength) {
      description = `UTXO Chain: ${tree.chainLength} transactions showing coin movement between wallets`;
    }
    
    if (tree.dateRange && tree.dateRange.start) {
      description += ` on ${new Date(tree.dateRange.start).toLocaleDateString()}`;
    }
    
    return {
      id: `tree-${index}`,
      rootId: tree.rootId || `unknown-${index}`,
      totalAmount: tree.totalAmount || 0,
      totalValueUSD: tree.totalValueUSD || 0,
      dateRange: tree.dateRange || { start: new Date().toISOString(), end: new Date().toISOString() },
      transactionCount: nodeCount,
      description
    };
  });
}

export function formatBitcoinAmount(amount: number): string {
  return `${amount.toFixed(8)} BTC`;
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}
