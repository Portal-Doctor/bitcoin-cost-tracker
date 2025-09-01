import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    console.log('Loading UTXO trees from database...');

    // Get all UTXO flows from the database
    const flows = await prisma.uTXOFlow.findMany({
      orderBy: { blockTime: 'desc' },
      include: {
        networkTransaction: true
      }
    });

    if (flows.length === 0) {
      return NextResponse.json([]);
    }

    console.log(`Found ${flows.length} UTXO flows in database`);

    // Group flows by transaction ID
    const flowsByTx = new Map<string, any[]>();
    flows.forEach(flow => {
      if (!flowsByTx.has(flow.txid)) {
        flowsByTx.set(flow.txid, []);
      }
      flowsByTx.get(flow.txid)!.push({
        fromWallet: flow.fromWallet,
        toWallet: flow.toWallet,
        fromAddress: flow.fromAddress,
        toAddress: flow.toAddress,
        amount: flow.amount,
        txid: flow.txid,
        date: flow.blockTime?.toISOString() || new Date().toISOString(),
        fee: flow.fee,
        blockHeight: flow.blockHeight,
        flowType: flow.flowType,
        isChange: flow.isChange
      });
    });

    console.log(`Found ${flowsByTx.size} unique transactions with flows`);

    // Create one tree per wallet
    const trees = await buildWalletTrees(flowsByTx);

    console.log(`Returning ${trees.length} wallet trees`);
    return NextResponse.json(trees);
  } catch (error) {
    console.error('Error loading UTXO trees:', error);
    return NextResponse.json(
      { error: 'Failed to load UTXO trees' },
      { status: 500 }
    );
  }
}

/**
 * Build one tree per wallet showing all transactions for that wallet
 */
async function buildWalletTrees(flowsByTx: Map<string, any[]>): Promise<any[]> {
  console.log('Building wallet trees...');
  
  // Get all unique wallets from the flows
  const allWallets = new Set<string>();
  flowsByTx.forEach(txFlows => {
    txFlows.forEach(flow => {
      if (flow.fromWallet) allWallets.add(flow.fromWallet);
      if (flow.toWallet) allWallets.add(flow.toWallet);
    });
  });

  console.log(`Found ${allWallets.size} unique wallets: ${Array.from(allWallets).join(', ')}`);

  // Create one tree per wallet
  const trees: any[] = [];
  
  for (const walletName of allWallets) {
    console.log(`Building tree for wallet: ${walletName}`);
    
    // Find all transactions that involve this wallet
    const walletTransactions = new Map<string, any>();
    
    for (const [txid, txFlows] of flowsByTx) {
      const walletFlows = txFlows.filter(f => f.fromWallet === walletName || f.toWallet === walletName);
      
      if (walletFlows.length > 0) {
        walletTransactions.set(txid, {
          txid,
          flows: txFlows,
          date: txFlows[0]?.date || new Date().toISOString(),
          totalAmount: txFlows.reduce((sum: number, f: any) => sum + f.amount, 0),
          walletFlows: walletFlows,
          // Determine transaction type for this wallet
          type: determineTransactionType(walletFlows, walletName)
        });
      }
    }

    if (walletTransactions.size === 0) continue;

    // Sort transactions by date
    const sortedTransactions = Array.from(walletTransactions.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Build the tree structure
    const nodes: Record<string, any> = {};
    const dates = sortedTransactions.map((t: any) => new Date(t.date));
    const timestamps = dates.map(date => date.getTime());
    
    sortedTransactions.forEach((tx: any, index: number) => {
      const nodeId = tx.txid;
      
      // Group flows by wallet relationship
      const walletFlows = new Map<string, any[]>();
      tx.flows.forEach((flow: any) => {
        const key = `${flow.fromWallet || 'external'} -> ${flow.toWallet || 'external'}`;
        if (!walletFlows.has(key)) {
          walletFlows.set(key, []);
        }
        walletFlows.get(key)!.push(flow);
      });

      // Build inputs and outputs for this wallet's perspective
      const inputs = tx.walletFlows
        .filter((f: any) => f.toWallet === walletName)
        .map((f: any) => ({
          address: f.toAddress,
          amount: f.amount || 0,
          wallet: f.fromWallet || 'external',
          sourceWallet: f.fromWallet || 'external'
        }));

      const outputs = tx.walletFlows
        .filter((f: any) => f.fromWallet === walletName)
        .map((f: any) => ({
          address: f.fromAddress,
          amount: f.amount || 0,
          wallet: f.toWallet || 'external',
          destinationWallet: f.toWallet || 'external',
          isChange: f.isChange || false,
          isExternal: !f.toWallet
        }));

      nodes[nodeId] = {
        id: nodeId,
        date: tx.date || new Date().toISOString(),
        confirmed: true,
        inputs: inputs,
        outputs: outputs,
        children: [], // Will be populated with links to other wallets
        totalAmount: tx.totalAmount || 0,
        walletFlows: Array.from(walletFlows.entries()).map(([key, flows]) => ({
          description: key,
          flows: flows
        })),
        comments: [],
        // Add wallet-specific metadata
        transactionType: tx.type,
        relatedWallets: getRelatedWallets(tx.walletFlows, walletName)
      };
    });

    // Calculate total amounts for this wallet
    const totalReceived = sortedTransactions
      .filter(tx => tx.type === 'received')
      .reduce((sum: number, tx: any) => sum + tx.totalAmount, 0);
    
    const totalSent = sortedTransactions
      .filter(tx => tx.type === 'sent')
      .reduce((sum: number, tx: any) => sum + tx.totalAmount, 0);

    const totalAmount = totalReceived - totalSent;
    
    const tree = {
      rootId: `wallet_${walletName}`,
      nodes,
      totalAmount,
      dateRange: {
        start: new Date(Math.min(...timestamps)).toISOString(),
        end: new Date(Math.max(...timestamps)).toISOString()
      },
      chainLength: sortedTransactions.length,
      description: `${walletName} Wallet: ${sortedTransactions.length} transactions (${totalReceived.toFixed(8)} BTC received, ${totalSent.toFixed(8)} BTC sent)`,
      walletName: walletName,
      walletStats: {
        totalReceived,
        totalSent,
        balance: totalAmount,
        transactionCount: sortedTransactions.length
      }
    };

    trees.push(tree);
  }

  // Sort trees by transaction count (descending)
  trees.sort((a, b) => b.chainLength - a.chainLength);
  
  console.log(`Built ${trees.length} wallet trees`);
  trees.forEach((tree, index) => {
    console.log(`Tree ${index + 1}: ${tree.walletName} - ${tree.chainLength} transactions, ${tree.totalAmount.toFixed(8)} BTC balance`);
  });

  return trees;
}

/**
 * Determine the transaction type from the wallet's perspective
 */
function determineTransactionType(walletFlows: any[], walletName: string): string {
  const hasInputs = walletFlows.some(f => f.toWallet === walletName);
  const hasOutputs = walletFlows.some(f => f.fromWallet === walletName);
  
  if (hasInputs && hasOutputs) {
    return 'internal'; // Self-transfer or consolidation
  } else if (hasInputs) {
    return 'received'; // Received from external or other wallet
  } else if (hasOutputs) {
    return 'sent'; // Sent to external or other wallet
  }
  
  return 'unknown';
}

/**
 * Get list of wallets this transaction relates to
 */
function getRelatedWallets(walletFlows: any[], currentWallet: string): string[] {
  const relatedWallets = new Set<string>();
  
  walletFlows.forEach(flow => {
    if (flow.fromWallet && flow.fromWallet !== currentWallet) {
      relatedWallets.add(flow.fromWallet);
    }
    if (flow.toWallet && flow.toWallet !== currentWallet) {
      relatedWallets.add(flow.toWallet);
    }
  });
  
  return Array.from(relatedWallets);
}
