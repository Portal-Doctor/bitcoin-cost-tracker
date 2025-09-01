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
  { params }: { params: Promise<{ txid: string }> }
) {
  try {
    const { txid } = await params;

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
    console.log(`[buildUTXOTree] Starting tree build for txid: ${rootTxid}`);
    
    // Get all transactions to build the flow
    console.log(`[buildUTXOTree] Fetching all transactions...`);
    const allTransactions = await prisma.walletTransaction.findMany({
      include: {
        walletCSV: {
          select: { walletName: true }
        }
      },
      orderBy: { date: 'asc' }
    });
    console.log(`[buildUTXOTree] Found ${allTransactions.length} total transactions`);

    // Create a map of transactions by txid
    console.log(`[buildUTXOTree] Creating transaction map...`);
    const txMap = new Map<string, any[]>();
    allTransactions.forEach(tx => {
      if (!txMap.has(tx.txid)) {
        txMap.set(tx.txid, []);
      }
      txMap.get(tx.txid)!.push(tx);
    });
    console.log(`[buildUTXOTree] Created map with ${txMap.size} unique transaction IDs`);

    // Build the complete tree starting from the root
    console.log(`[buildUTXOTree] Building complete UTXO node tree...`);
    const rootNode = await buildCompleteUTXONode(rootTransaction, txMap, rootTxid, 0, [rootTxid]);
    
    if (!rootNode) {
      console.log(`[buildUTXOTree] Failed to build root node`);
      return null;
    }

    console.log(`[buildUTXOTree] Successfully built root node with ${rootNode.children.length} children`);

    // Calculate tree statistics
    console.log(`[buildUTXOTree] Calculating tree statistics...`);
    const stats = calculateTreeStats(rootNode);
    console.log(`[buildUTXOTree] Tree stats calculated: ${stats.transactionCount} transactions, ${stats.walletCount} wallets`);

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
  // Add safety check to prevent infinite recursion
  if (level < -5 || level > 5) {
    console.log(`[buildCompleteUTXONode] Stopping recursion at level ${level} for txid: ${transaction.txid}`);
    return null;
  }
  
  if (path.length > 10) {
    console.log(`[buildCompleteUTXONode] Stopping recursion due to path length ${path.length} for txid: ${transaction.txid}`);
    return null;
  }
  try {
    console.log(`[buildCompleteUTXONode] Building node for txid: ${transaction.txid}, level: ${level}, path length: ${path.length}`);
    
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
      path: [...path],
      nodeType: transaction.txid === rootTxid ? 'current' : 'child'
    };

    // Find parent transactions (transactions that created this UTXO as input)
    console.log(`[buildCompleteUTXONode] Finding parent transactions for ${transaction.txid}...`);
    const parentTransactions = await findParentTransactions(transaction, txMap, path);
    console.log(`[buildCompleteUTXONode] Found ${parentTransactions.length} parent transactions`);
    
    // Find child transactions (transactions that spend this UTXO)
    console.log(`[buildCompleteUTXONode] Finding child transactions for ${transaction.txid}...`);
    const childTransactions = await findChildTransactions(transaction, txMap, path);
    console.log(`[buildCompleteUTXONode] Found ${childTransactions.length} child transactions`);
    
    // Build parent nodes (inputs that were combined)
    console.log(`[buildCompleteUTXONode] Building ${parentTransactions.length} parent nodes...`);
    for (let i = 0; i < parentTransactions.length; i++) {
      const parentTx = parentTransactions[i];
      console.log(`[buildCompleteUTXONode] Building parent ${i + 1}/${parentTransactions.length}: ${parentTx.txid}`);
      const parentNode = await buildCompleteUTXONode(parentTx, txMap, rootTxid, level - 1, [...path, parentTx.txid]);
      if (parentNode) {
        parentNode.nodeType = 'parent';
        node.children.unshift(parentNode); // Add parents at the beginning
      }
    }
    
    // Build child nodes (outputs that spend this UTXO)
    console.log(`[buildCompleteUTXONode] Building ${childTransactions.length} child nodes...`);
    for (let i = 0; i < childTransactions.length; i++) {
      const childTx = childTransactions[i];
      console.log(`[buildCompleteUTXONode] Building child ${i + 1}/${childTransactions.length}: ${childTx.txid}`);
      const childNode = await buildCompleteUTXONode(childTx, txMap, rootTxid, level + 1, [...path, childTx.txid]);
      if (childNode) {
        node.children.push(childNode);
      }
    }

    console.log(`[buildCompleteUTXONode] Completed node ${transaction.txid} with ${node.children.length} total children`);
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
    console.log(`[findParentTransactions] Looking for parents of ${childTransaction.txid} (type: ${childTransaction.type})`);
    const parentTransactions: any[] = [];

    // For an input transaction, we need to find the transaction that created this UTXO
    // In Bitcoin, an input references a previous transaction's output
    // We need to find transactions in our system that have this txid as an output
    
    // Look through all transactions to find ones that might have created this UTXO
    for (const [txid, transactions] of txMap.entries()) {
      // Skip if this transaction is already in the path (avoid cycles)
      if (path.includes(txid)) {
        continue;
      }

      for (const tx of transactions) {
        // If this transaction is an output and it's from the same transaction ID as our input
        // and the dates make sense (output before input)
        if (tx.type === 'output' && tx.txid === childTransaction.txid && tx.date < childTransaction.date) {
          console.log(`[findParentTransactions] Found parent transaction: ${tx.txid} (output that created this input)`);
          parentTransactions.push(tx);
        }
      }
    }

    console.log(`[findParentTransactions] Found ${parentTransactions.length} parent transactions for ${childTransaction.txid}`);
    return parentTransactions;

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
    console.log(`[findChildTransactions] Looking for children of ${parentTransaction.txid} (type: ${parentTransaction.type})`);
    const childTransactions: any[] = [];

    // For an output transaction, we need to find transactions that spend this UTXO
    // Look for input transactions that reference this transaction's output
    
    for (const [txid, transactions] of txMap.entries()) {
      // Skip if this transaction is already in the path (avoid cycles)
      if (path.includes(txid)) {
        continue;
      }

      for (const tx of transactions) {
        // If this transaction is an input and it references the parent transaction's output
        // and the dates make sense (input after output)
        if (tx.type === 'input' && tx.txid === parentTransaction.txid && tx.date > parentTransaction.date) {
          console.log(`[findChildTransactions] Found child transaction: ${tx.txid} (input that spends this output)`);
          childTransactions.push(tx);
        }
      }
    }

    console.log(`[findChildTransactions] Found ${childTransactions.length} child transactions for ${parentTransaction.txid}`);
    return childTransactions;

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
