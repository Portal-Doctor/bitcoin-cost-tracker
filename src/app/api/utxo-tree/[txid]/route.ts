import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface UTXONode {
  txid: string;
  walletName: string;
  date: string;
  type: 'input' | 'output';
  value: number;
  priceUSD: number | null;
  balance: number;
  fee: number;
  label: string;
  confirmed: boolean;
  children: UTXONode[];
  level: number;
  path: string[];
  nodeType: 'parent' | 'current' | 'child'; // To distinguish the relationship
}

interface UTXOTreeData {
  root: UTXONode;
  totalFlow: number;
  initialValue: number;
  finalValue: number;
  valueChange: number;
  valueChangePercent: number;
  transactionCount: number;
  walletCount: number;
  dateRange: {
    start: string;
    end: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { txid: string } }
) {
  try {
    const txid = params.txid;

    if (!txid) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    console.log(`Building UTXO tree for transaction: ${txid}`);

    // Find the root transaction
    const rootTransaction = await prisma.walletTransaction.findFirst({
      where: { txid: txid },
      include: {
        walletCSV: {
          select: { walletName: true }
        }
      }
    });

    if (!rootTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Build the UTXO tree
    const treeData = await buildUTXOTree(rootTransaction, txid);

    if (!treeData) {
      return NextResponse.json(
        { error: 'Failed to build UTXO tree' },
        { status: 500 }
      );
    }

    return NextResponse.json(treeData);

  } catch (error) {
    console.error('Error building UTXO tree:', error);
    return NextResponse.json(
      { error: 'Failed to build UTXO tree' },
      { status: 500 }
    );
  }
}

async function buildUTXOTree(rootTransaction: any, rootTxid: string): Promise<UTXOTreeData | null> {
  try {
    // Get all transactions to build the flow
    const allTransactions = await prisma.walletTransaction.findMany({
      include: {
        walletCSV: {
          select: { walletName: true }
        }
      },
      orderBy: { date: 'asc' }
    });

    // Create a map of transactions by txid
    const txMap = new Map<string, any[]>();
    allTransactions.forEach(tx => {
      if (!txMap.has(tx.txid)) {
        txMap.set(tx.txid, []);
      }
      txMap.get(tx.txid)!.push(tx);
    });

    // Build the complete tree starting from the root
    const rootNode = await buildCompleteUTXONode(rootTransaction, txMap, rootTxid, 0, [rootTxid]);
    
    if (!rootNode) {
      return null;
    }

    // Calculate tree statistics
    const stats = calculateTreeStats(rootNode);

    return {
      root: rootNode,
      ...stats
    };

  } catch (error) {
    console.error('Error in buildUTXOTree:', error);
    return null;
  }
}

async function buildCompleteUTXONode(
  transaction: any, 
  txMap: Map<string, any[]>, 
  rootTxid: string, 
  level: number, 
  path: string[]
): Promise<UTXONode | null> {
  try {
    // Create the current node
    const node: UTXONode = {
      txid: transaction.txid,
      walletName: transaction.walletCSV.walletName,
      date: transaction.date.toISOString(),
      type: transaction.type as 'input' | 'output',
      value: transaction.value,
      priceUSD: transaction.priceUSD,
      balance: transaction.balance,
      fee: transaction.fee,
      label: transaction.label,
      confirmed: transaction.confirmed,
      children: [],
      level,
      path: [...path]
    };

    // Find parent transactions (transactions that created this UTXO as input)
    const parentTransactions = await findParentTransactions(transaction, txMap, path);
    
    // Find child transactions (transactions that spend this UTXO)
    const childTransactions = await findChildTransactions(transaction, txMap, path);
    
    // Build parent nodes (inputs that were combined)
    for (const parentTx of parentTransactions) {
      const parentNode = await buildCompleteUTXONode(parentTx, txMap, rootTxid, level - 1, [...path, parentTx.txid]);
      if (parentNode) {
        node.children.unshift(parentNode); // Add parents at the beginning
      }
    }
    
    // Build child nodes (outputs that spend this UTXO)
    for (const childTx of childTransactions) {
      const childNode = await buildCompleteUTXONode(childTx, txMap, rootTxid, level + 1, [...path, childTx.txid]);
      if (childNode) {
        node.children.push(childNode);
      }
    }

    return node;

  } catch (error) {
    console.error('Error building complete UTXO node:', error);
    return null;
  }
}

async function findParentTransactions(
  childTransaction: any, 
  txMap: Map<string, any[]>, 
  path: string[]
): Promise<any[]> {
  try {
    const parentTransactions: any[] = [];

    // Look for transactions that might have created this UTXO
    for (const [txid, transactions] of txMap.entries()) {
      // Skip if this transaction is already in the path (avoid cycles)
      if (path.includes(txid)) {
        continue;
      }

      // Check if any of these transactions could be the parent of this UTXO
      for (const tx of transactions) {
        // If this transaction is an output and the child is an input, it might be related
        if (tx.type === 'output' && childTransaction.type === 'input') {
          // Check if the dates make sense (parent should be before child)
          if (tx.date < childTransaction.date) {
            // Check if the amounts are related (simplified heuristic)
            const amountRatio = Math.abs(childTransaction.value) / Math.abs(tx.value);
            if (amountRatio > 0.1 && amountRatio < 10) { // Within reasonable range
              parentTransactions.push(tx);
            }
          }
        }
      }
    }

    // Sort by date and limit to prevent infinite trees
    return parentTransactions
      .sort((a, b) => b.date.getTime() - a.date.getTime()) // Reverse sort for parents
      .slice(0, 3); // Limit to 3 parents to prevent explosion

  } catch (error) {
    console.error('Error finding parent transactions:', error);
    return [];
  }
}

async function findChildTransactions(
  parentTransaction: any, 
  txMap: Map<string, any[]>, 
  path: string[]
): Promise<any[]> {
  try {
    const childTransactions: any[] = [];
    const parentTxid = parentTransaction.txid;

    // Look for transactions that might be spending this UTXO
    // This is a simplified approach - in a real implementation, you'd need to track actual UTXO outputs
    for (const [txid, transactions] of txMap.entries()) {
      // Skip if this transaction is already in the path (avoid cycles)
      if (path.includes(txid)) {
        continue;
      }

      // Check if any of these transactions could be spending the parent UTXO
      // This is a heuristic - in reality, you'd need to track actual UTXO references
      for (const tx of transactions) {
        // If this transaction is an input and the parent was an output, it might be related
        if (tx.type === 'input' && parentTransaction.type === 'output') {
          // Check if the dates make sense (child should be after parent)
          if (tx.date > parentTransaction.date) {
            // Check if the amounts are related (simplified heuristic)
            const amountRatio = Math.abs(tx.value) / Math.abs(parentTransaction.value);
            if (amountRatio > 0.1 && amountRatio < 10) { // Within reasonable range
              childTransactions.push(tx);
            }
          }
        }
      }
    }

    // Sort by date and limit to prevent infinite trees
    return childTransactions
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5); // Limit to 5 children to prevent explosion

  } catch (error) {
    console.error('Error finding child transactions:', error);
    return [];
  }
}

function calculateTreeStats(rootNode: UTXONode) {
  const allNodes: UTXONode[] = [];
  const walletSet = new Set<string>();
  const dates: string[] = [];
  
  // Collect all nodes
  function collectNodes(node: UTXONode) {
    allNodes.push(node);
    walletSet.add(node.walletName);
    dates.push(node.date);
    
    for (const child of node.children) {
      collectNodes(child);
    }
  }
  
  collectNodes(rootNode);
  
  // Calculate statistics
  const totalFlow = allNodes.reduce((sum, node) => sum + Math.abs(node.value), 0);
  
  // Find initial and final values
  const sortedNodes = allNodes.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const initialNode = sortedNodes[0];
  const finalNode = sortedNodes[sortedNodes.length - 1];
  
  const initialValue = initialNode.priceUSD || 0;
  const finalValue = finalNode.priceUSD || 0;
  const valueChange = finalValue - initialValue;
  const valueChangePercent = initialValue > 0 ? (valueChange / initialValue) * 100 : 0;
  
  const sortedDates = dates.sort();
  
  return {
    totalFlow,
    initialValue,
    finalValue,
    valueChange,
    valueChangePercent,
    transactionCount: allNodes.length,
    walletCount: walletSet.size,
    dateRange: {
      start: sortedDates[0],
      end: sortedDates[sortedDates.length - 1]
    }
  };
}
