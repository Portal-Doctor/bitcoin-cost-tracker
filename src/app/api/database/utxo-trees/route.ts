import { NextRequest, NextResponse } from 'next/server';
import { UTXOTracingService } from '@/lib/utxo-tracing-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    console.log('Building UTXO trees with real blockchain tracing...');

    // First, build the UTXO flow graph to get all the data
    console.log('Step 1: Building UTXO flow graph...');
    const flows = await UTXOTracingService.buildUTXOFlowGraph();
    
    if (flows.length === 0) {
      return NextResponse.json({
        error: 'No UTXO flows found. Please ensure wallets are loaded and transactions exist.'
      }, { status: 400 });
    }

    console.log(`Step 2: Building UTXO trees from ${flows.length} flows...`);
    
    // Build UTXO trees from the flows
    const utxoTrees = await buildUTXOTreesFromFlows(flows);

    return NextResponse.json({
      success: true,
      message: `Built ${utxoTrees.length} UTXO trees showing wallet-to-wallet coin movements`,
      trees: utxoTrees,
      treeCount: utxoTrees.length,
      totalFlows: flows.length
    });
  } catch (error) {
    console.error('Error building UTXO trees:', error);
    return NextResponse.json(
      { error: 'Failed to build UTXO trees: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * Build UTXO trees from flows, showing actual coin movements between wallets
 */
async function buildUTXOTreesFromFlows(flows: any[]): Promise<any[]> {
  console.log('Building UTXO trees from flows...');
  
  // Group flows by transaction ID
  const flowsByTx = new Map<string, any[]>();
  flows.forEach(flow => {
    if (!flowsByTx.has(flow.txid)) {
      flowsByTx.set(flow.txid, []);
    }
    flowsByTx.get(flow.txid)!.push(flow);
  });

  console.log(`Found ${flowsByTx.size} unique transactions with flows`);

  // Create a map of address to transaction flows (for finding UTXO chains)
  const addressToFlows = new Map<string, any[]>();
  flows.forEach(flow => {
    // Map input addresses
    if (!addressToFlows.has(flow.fromAddress)) {
      addressToFlows.set(flow.fromAddress, []);
    }
    addressToFlows.get(flow.fromAddress)!.push({ ...flow, type: 'input' });
    
    // Map output addresses
    if (!addressToFlows.has(flow.toAddress)) {
      addressToFlows.set(flow.toAddress, []);
    }
    addressToFlows.get(flow.toAddress)!.push({ ...flow, type: 'output' });
  });

  // Find UTXO chains by connecting outputs to inputs
  const utxoChains = new Map<string, any[]>();
  const processedTxs = new Set<string>();

  for (const [txid, txFlows] of flowsByTx) {
    if (processedTxs.has(txid)) continue;

    const chain: any[] = [];
    const chainTxs = new Set<string>();
    
    // Start with this transaction
    chain.push({
      txid,
      flows: txFlows,
      date: txFlows[0]?.date || new Date().toISOString(),
      totalAmount: txFlows.reduce((sum: number, f: any) => sum + f.amount, 0)
    });
    chainTxs.add(txid);
    processedTxs.add(txid);

    // Follow the chain backwards (find what this transaction spent)
    let currentTxid = txid;
    let maxDepth = 10; // Prevent infinite loops
    
    while (maxDepth > 0) {
      const currentFlows = flowsByTx.get(currentTxid) || [];
      let foundParent = false;
      
      for (const flow of currentFlows) {
        // Look for transactions that output to this input address
        const inputFlows = addressToFlows.get(flow.fromAddress) || [];
        
        for (const inputFlow of inputFlows) {
          if (inputFlow.type === 'output' && 
              inputFlow.txid !== currentTxid && 
              !chainTxs.has(inputFlow.txid) &&
              !processedTxs.has(inputFlow.txid)) {
            
            const parentFlows = flowsByTx.get(inputFlow.txid) || [];
            chain.unshift({
              txid: inputFlow.txid,
              flows: parentFlows,
              date: parentFlows[0]?.date || new Date().toISOString(),
              totalAmount: parentFlows.reduce((sum: number, f: any) => sum + f.amount, 0)
            });
            
            chainTxs.add(inputFlow.txid);
            processedTxs.add(inputFlow.txid);
            currentTxid = inputFlow.txid;
            foundParent = true;
            break;
          }
        }
        if (foundParent) break;
      }
      
      if (!foundParent) break;
      maxDepth--;
    }

    // Follow the chain forwards (find what this transaction created)
    currentTxid = txid;
    maxDepth = 10;
    
    while (maxDepth > 0) {
      const currentFlows = flowsByTx.get(currentTxid) || [];
      let foundChild = false;
      
      for (const flow of currentFlows) {
        // Look for transactions that input from this output address
        const outputFlows = addressToFlows.get(flow.toAddress) || [];
        
        for (const outputFlow of outputFlows) {
          if (outputFlow.type === 'input' && 
              outputFlow.txid !== currentTxid && 
              !chainTxs.has(outputFlow.txid) &&
              !processedTxs.has(outputFlow.txid)) {
            
            const childFlows = flowsByTx.get(outputFlow.txid) || [];
            chain.push({
              txid: outputFlow.txid,
              flows: childFlows,
              date: childFlows[0]?.date || new Date().toISOString(),
              totalAmount: childFlows.reduce((sum: number, f: any) => sum + f.amount, 0)
            });
            
            chainTxs.add(outputFlow.txid);
            processedTxs.add(outputFlow.txid);
            currentTxid = outputFlow.txid;
            foundChild = true;
            break;
          }
        }
        if (foundChild) break;
      }
      
      if (!foundChild) break;
      maxDepth--;
    }

    if (chain.length > 1) {
      const chainId = `chain_${chain[0].txid}`;
      utxoChains.set(chainId, chain);
    }
  }

  console.log(`Found ${utxoChains.size} UTXO chains with multiple transactions`);

  // Convert chains to tree format
  const trees = Array.from(utxoChains.entries()).map(([chainId, chain]) => {
    const nodes: Record<string, any> = {};
    const dates = chain.map((c: any) => new Date(c.date));
    const timestamps = dates.map(date => date.getTime());
    
    chain.forEach((chainNode: any, index: number) => {
      const nodeId = chainNode.txid;
      
      // Group flows by wallet
      const walletFlows = new Map<string, any[]>();
      chainNode.flows.forEach((flow: any) => {
        const key = `${flow.fromWallet || 'external'} -> ${flow.toWallet || 'external'}`;
        if (!walletFlows.has(key)) {
          walletFlows.set(key, []);
        }
        walletFlows.get(key)!.push(flow);
      });

      nodes[nodeId] = {
        id: nodeId,
        date: chainNode.date,
        confirmed: true,
        inputs: chainNode.flows
          .filter((f: any) => f.fromWallet)
          .map((f: any) => ({
            address: f.fromAddress,
            amount: f.amount,
            wallet: f.fromWallet
          })),
        outputs: chainNode.flows
          .filter((f: any) => f.toWallet)
          .map((f: any) => ({
            address: f.toAddress,
            amount: f.amount,
            wallet: f.toWallet,
            isChange: f.flowType === 'internal' && f.amount < 0.001,
            isExternal: !f.toWallet
          })),
        children: index < chain.length - 1 ? [chain[index + 1].txid] : [],
        totalAmount: chainNode.totalAmount,
        walletFlows: Array.from(walletFlows.entries()).map(([key, flows]) => ({
          description: key,
          flows: flows
        })),
        comments: []
      };
    });

    const totalAmount = chain.reduce((sum: number, c: any) => sum + c.totalAmount, 0);
    
    return {
      rootId: chainId,
      nodes,
      totalAmount,
      dateRange: {
        start: new Date(Math.min(...timestamps)).toISOString(),
        end: new Date(Math.max(...timestamps)).toISOString()
      },
      chainLength: chain.length,
      description: `UTXO Chain: ${chain.length} transactions showing coin movement between wallets`
    };
  });

  // Sort trees by chain length (descending)
  trees.sort((a, b) => b.chainLength - a.chainLength);
  
  console.log(`Built ${trees.length} UTXO trees`);
  trees.forEach((tree, index) => {
    console.log(`Tree ${index + 1}: ${tree.chainLength} transactions, ${tree.totalAmount.toFixed(8)} BTC`);
  });

  return trees;
}

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      message: 'UTXO Tree building endpoint',
      description: 'Use POST to build UTXO trees showing actual coin movements between wallets',
      features: [
        'Traces actual UTXO chains using blockchain data',
        'Shows wallet-to-wallet coin movements',
        'Identifies consolidation transactions',
        'Builds multi-transaction trees based on real UTXO relationships'
      ]
    });
  } catch (error) {
    console.error('Error in UTXO trees endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to get UTXO trees information' },
      { status: 500 }
    );
  }
}
