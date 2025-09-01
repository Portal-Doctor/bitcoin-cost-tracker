import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    console.log('=== WALLET TRANSACTION LINKING DIAGNOSTIC ===');
    
    // Get total counts
    const totalWalletTxs = await prisma.walletTransaction.count();
    const totalNodes = await prisma.transactionNode.count();
    
    console.log(`Total wallet transactions: ${totalWalletTxs}`);
    console.log(`Total transaction nodes: ${totalNodes}`);
    
    // Get all wallet transactions with their details
    const walletTransactions = await prisma.walletTransaction.findMany({
      include: {
        walletCSV: true
      },
      orderBy: {
        walletName: 'asc'
      }
    });
    
    // Check which wallet transactions have matching transaction nodes
    const linkingResults = [];
    let linkedCount = 0;
    let unlinkedCount = 0;
    
    for (const wt of walletTransactions) {
      const matchingNode = await prisma.transactionNode.findUnique({
        where: { txid: wt.txid }
      });
      
      const isLinked = !!matchingNode;
      if (isLinked) {
        linkedCount++;
      } else {
        unlinkedCount++;
      }
      
      linkingResults.push({
        walletName: wt.walletName,
        txid: wt.txid,
        label: wt.label,
        value: wt.value,
        valueBTC: wt.value / 100000000,
        type: wt.type,
        isLinked,
        matchingTreeId: matchingNode?.treeId || null,
        matchingNodeDate: matchingNode?.date?.toISOString() || null
      });
    }
    
    // Group by wallet for summary
    const walletSummary = walletTransactions.reduce((acc, wt) => {
      if (!acc[wt.walletName]) {
        acc[wt.walletName] = {
          walletName: wt.walletName,
          totalTransactions: 0,
          linkedTransactions: 0,
          unlinkedTransactions: 0
        };
      }
      acc[wt.walletName].totalTransactions++;
      return acc;
    }, {} as Record<string, any>);
    
    // Count linked/unlinked per wallet
    linkingResults.forEach(result => {
      if (result.isLinked) {
        walletSummary[result.walletName].linkedTransactions++;
      } else {
        walletSummary[result.walletName].unlinkedTransactions++;
      }
    });
    
    const summary = {
      overall: {
        totalWalletTransactions: totalWalletTxs,
        totalTransactionNodes: totalNodes,
        linkedTransactions: linkedCount,
        unlinkedTransactions: unlinkedCount,
        linkRate: totalWalletTxs > 0 ? (linkedCount / totalWalletTxs * 100).toFixed(2) + '%' : '0%'
      },
      byWallet: Object.values(walletSummary),
      detailedResults: linkingResults
    };
    
    console.log(`=== LINKING SUMMARY ===`);
    console.log(`Linked: ${linkedCount}/${totalWalletTxs} (${summary.overall.linkRate})`);
    console.log(`Unlinked: ${unlinkedCount}/${totalWalletTxs}`);
    
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error in link status diagnostic:', error);
    return NextResponse.json(
      { error: 'Failed to get linking status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
