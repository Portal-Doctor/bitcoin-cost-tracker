import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database-service';

export async function POST(request: NextRequest) {
  try {
    console.log('Building enhanced transaction trees with UTXO tracing...');

    // Get all transactions from the database
    const trees = await DatabaseService.getTransactionTrees();
    
    if (trees.length === 0) {
      return NextResponse.json({
        error: 'No transaction trees found. Please load transactions first.'
      }, { status: 400 });
    }

    // Extract all transactions from all trees
    const allTransactions: any[] = [];
    trees.forEach((tree: any) => {
      Object.values(tree.nodes).forEach((node: any) => {
        // Handle both input and output addresses safely
        let address = '';
        let type = '';
        
        if (node.inputs && node.inputs.length > 0 && node.inputs[0].address) {
          address = node.inputs[0].address;
          type = 'Received with';
        } else if (node.outputs && node.outputs.length > 0 && node.outputs[0].address) {
          address = node.outputs[0].address;
          type = 'Sent to';
        } else {
          // Skip transactions without valid addresses
          return;
        }
        
        allTransactions.push({
          id: node.id,
          date: node.date,
          confirmed: node.confirmed,
          type,
          address,
          amount: node.totalAmount || 0
        });
      });
    });

    console.log(`Processing ${allTransactions.length} transactions for enhanced tree building...`);

    // Build enhanced trees using a simplified approach
    const enhancedTrees = await buildSimplifiedEnhancedTrees(allTransactions);

    return NextResponse.json({
      success: true,
      message: `Built ${enhancedTrees.length} enhanced transaction trees`,
      trees: enhancedTrees,
      treeCount: enhancedTrees.length,
      totalTransactions: allTransactions.length
    });
  } catch (error) {
    console.error('Error building enhanced transaction trees:', error);
    return NextResponse.json(
      { error: 'Failed to build enhanced transaction trees: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * Build enhanced transaction trees using a simplified approach
 */
async function buildSimplifiedEnhancedTrees(transactions: any[]): Promise<any[]> {
  console.log('Building simplified enhanced transaction trees...');
  
  // Group transactions by ID
  const txGroups = new Map<string, any[]>();
  transactions.forEach(tx => {
    if (!txGroups.has(tx.id)) {
      txGroups.set(tx.id, []);
    }
    txGroups.get(tx.id)!.push(tx);
  });

  console.log(`Found ${txGroups.size} unique transaction IDs`);

  // Create transaction nodes
  const nodes = new Map<string, any>();
  
  txGroups.forEach((txs, txId) => {
    const firstTx = txs[0];
    const inputs: any[] = [];
    const outputs: any[] = [];
    
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
          isChange: false,
          isExternal: true
        });
      }
    });

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

  // Build relationships by checking which transactions spend outputs from other transactions
  console.log('Building transaction relationships...');
  
  // Create a map of output addresses to transaction IDs
  const addressToTxMap = new Map<string, string[]>();
  
  nodes.forEach((node, txId) => {
    node.outputs.forEach((output: any) => {
      if (!addressToTxMap.has(output.address)) {
        addressToTxMap.set(output.address, []);
      }
      addressToTxMap.get(output.address)!.push(txId);
    });
  });

  // Check for relationships
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

  // Find root transactions (those without parents or with external inputs)
  const rootIds = Array.from(nodes.keys()).filter(txId => {
    const node = nodes.get(txId)!;
    // Root transactions are those that either have no parents or have external inputs
    return !node.parent || node.inputs.some((input: any) => {
      const inputUsage = addressToTxMap.get(input.address) || [];
      return inputUsage.length === 0; // External input
    });
  });

  console.log(`Found ${rootIds.length} root transactions`);

  // Build trees from root transactions
  const trees = rootIds.map(rootId => {
    const treeNodes: Record<string, any> = {};
    const visited = new Set<string>();
    
    function traverse(txId: string) {
      if (visited.has(txId)) return;
      visited.add(txId);
      
      const node = nodes.get(txId)!;
      treeNodes[txId] = node;
      
      node.children.forEach((childId: string) => {
        traverse(childId);
      });
    }
    
    traverse(rootId);
    
    const treeNodesArray = Object.values(treeNodes);
    const totalAmount = treeNodesArray.reduce((sum: number, node: any) => sum + node.totalAmount, 0);
    const dates = treeNodesArray.map((node: any) => new Date(node.date));
    const timestamps = dates.map(date => date.getTime());
    
    return {
      rootId,
      nodes: treeNodes,
      totalAmount,
      dateRange: {
        start: new Date(Math.min(...timestamps)).toISOString(),
        end: new Date(Math.max(...timestamps)).toISOString()
      }
    };
  });

  // Sort trees by node count (descending)
  trees.sort((a, b) => Object.keys(b.nodes).length - Object.keys(a.nodes).length);
  
  console.log(`Built ${trees.length} enhanced transaction trees`);
  trees.forEach((tree, index) => {
    const nodeCount = Object.keys(tree.nodes).length;
    console.log(`Tree ${index + 1}: ${nodeCount} transactions, ${tree.totalAmount.toFixed(8)} BTC`);
  });

  return trees;
}

export async function GET(request: NextRequest) {
  try {
    // Return information about the enhanced tree building process
    return NextResponse.json({
      message: 'Enhanced transaction tree building endpoint',
      description: 'Use POST to build enhanced transaction trees with improved relationship detection',
      features: [
        'Improved parent-child relationship detection',
        'Better identification of transaction chains',
        'Enhanced tree structure based on address reuse patterns'
      ]
    });
  } catch (error) {
    console.error('Error in enhanced trees endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to get enhanced trees information' },
      { status: 500 }
    );
  }
}
