import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'fs';
import path from 'path';
import { parseCSVData, buildTransactionTrees } from './bitcoin-utils';
import { readWalletCSVFiles } from './server/wallet-utils';

const prisma = new PrismaClient();

export interface DataLoadStatus {
  transactionTrees: {
    loaded: boolean;
    count: number;
    lastUpdated?: Date;
  };
  walletData: {
    loaded: boolean;
    count: number;
    lastUpdated?: Date;
  };
}

export class DatabaseService {
  /**
   * Check if data needs to be loaded or updated
   */
  static async getDataLoadStatus(): Promise<DataLoadStatus> {
    const [treeCount, walletCount] = await Promise.all([
      prisma.transactionTree.count(),
      prisma.walletCSV.count()
    ]);

    const latestTree = await prisma.transactionTree.findFirst({
      orderBy: { updatedAt: 'desc' }
    });

    const latestWallet = await prisma.walletCSV.findFirst({
      orderBy: { updatedAt: 'desc' }
    });

    return {
      transactionTrees: {
        loaded: treeCount > 0,
        count: treeCount,
        lastUpdated: latestTree?.updatedAt
      },
      walletData: {
        loaded: walletCount > 0,
        count: walletCount,
        lastUpdated: latestWallet?.updatedAt
      }
    };
  }

  /**
   * Load transaction trees into database
   */
  static async loadTransactionTrees(): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      console.log('Loading transaction trees into database...');

      // Read CSV data
      const csvPath = path.join(process.cwd(), 'tmp', 'all-txn.csv');
      const csvData = await fs.readFile(csvPath, 'utf-8');
      const transactions = parseCSVData(csvData);

      // Build transaction trees
      const transactionTrees = await buildTransactionTrees(transactions);

      // Check existing trees and only load new ones
      const existingTrees = await prisma.transactionTree.findMany({
        select: { treeId: true }
      });
      const existingTreeIds = new Set(existingTrees.map(t => t.treeId));

      let loadedCount = 0;
      for (let i = 0; i < transactionTrees.length; i++) {
        const tree = transactionTrees[i];
        const treeId = `tree-${i}`;

        // Skip if tree already exists
        if (existingTreeIds.has(treeId)) {
          console.log(`Tree ${treeId} already exists, skipping`);
          continue;
        }

        // Create transaction tree
        const dbTree = await prisma.transactionTree.create({
          data: {
            treeId,
            rootId: tree.rootId,
            totalAmount: tree.totalAmount,
            totalValueUSD: tree.totalValueUSD,
            dateRange: JSON.stringify(tree.dateRange),
            nodeCount: Object.keys(tree.nodes).length
          }
        });

        // Create transaction nodes
        for (const [nodeId, node] of Object.entries(tree.nodes)) {
          await prisma.transactionNode.create({
            data: {
              txid: nodeId,
              treeId: dbTree.treeId,
              parentId: node.parent || null,
              date: new Date(node.date),
              totalAmount: node.totalAmount,
              confirmed: node.confirmed,
              price: node.price,
              priceUSD: node.priceUSD,
              inputs: JSON.stringify(node.inputs),
              outputs: JSON.stringify(node.outputs)
            }
          });
        }

        loadedCount++;
        console.log(`Loaded tree ${treeId} with ${Object.keys(tree.nodes).length} nodes`);
      }

      console.log(`Successfully loaded ${loadedCount} new transaction trees`);
      return { success: true, count: loadedCount };
    } catch (error) {
      console.error('Error loading transaction trees:', error);
      return { success: false, count: 0, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Clear all wallet data from database
   */
  static async clearWalletData(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('Clearing all wallet data from database...');
      
      await prisma.walletTransaction.deleteMany();
      await prisma.walletCSV.deleteMany();
      
      console.log('✅ All wallet data cleared from database');
      return { success: true, message: 'All wallet data cleared' };
    } catch (error) {
      console.error('Error clearing wallet data:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Load wallet data into database
   */
  static async loadWalletData(): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      console.log('Loading wallet data into database...');

      // Read wallet CSV files
      const walletData = await readWalletCSVFiles();
      console.log(`Found ${walletData.length} wallet CSV files to process`);
      
      let loadedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const wallet of walletData) {
        try {
          console.log(`Processing wallet: ${wallet.walletName} with ${wallet.transactions.length} transactions`);
          
          // Check if wallet already exists
          const existingWallet = await prisma.walletCSV.findUnique({
            where: { walletName: wallet.walletName }
          });

          // Get file stats for lastModified
          const filePath = path.join(process.cwd(), 'tmp', 'wallets', `${wallet.walletName}-transactions.csv`);
          const stats = await fs.stat(filePath);

          // Check if file has been modified since last load
          if (existingWallet && existingWallet.lastModified >= stats.mtime) {
            console.log(`Wallet ${wallet.walletName} is up to date, skipping`);
            skippedCount++;
            continue;
          }

          console.log(`Starting transaction for wallet: ${wallet.walletName}`);
          
          // Use a transaction to ensure atomicity
          await prisma.$transaction(async (tx) => {
            // If wallet exists but file is newer, delete old data
            if (existingWallet) {
              console.log(`Deleting old data for wallet: ${wallet.walletName}`);
              await tx.walletTransaction.deleteMany({
                where: { walletName: wallet.walletName }
              });
              await tx.walletCSV.delete({
                where: { walletName: wallet.walletName }
              });
              console.log(`Updated wallet ${wallet.walletName}`);
            }

            // Create wallet CSV record
            console.log(`Creating wallet CSV record for: ${wallet.walletName}`);
            const dbWallet = await tx.walletCSV.create({
              data: {
                walletName: wallet.walletName,
                fileName: `${wallet.walletName}-transactions.csv`,
                lastModified: stats.mtime,
                transactionCount: wallet.transactions.length
              }
            });
            console.log(`Created wallet CSV record with ID: ${dbWallet.id}`);

                         // Create wallet transactions
             console.log(`Creating ${wallet.transactions.length} transactions for wallet: ${wallet.walletName}`);
             for (let i = 0; i < wallet.transactions.length; i++) {
               const txData = wallet.transactions[i];
               await tx.walletTransaction.create({
                 data: {
                   walletCSVId: dbWallet.id,
                   walletName: wallet.walletName,
                   txid: txData.txid,
                   date: new Date(txData.date),
                   label: txData.label,
                   value: txData.value,
                   balance: txData.balance,
                   fee: txData.fee,
                   type: txData.type,
                   confirmed: txData.confirmed
                 }
               });
               if ((i + 1) % 10 === 0 || i === wallet.transactions.length - 1) {
                 console.log(`Created ${i + 1}/${wallet.transactions.length} transactions for ${wallet.walletName}`);
               }
             }
          });

          loadedCount++;
          console.log(`✅ Successfully loaded wallet ${wallet.walletName} with ${wallet.transactions.length} transactions`);
        } catch (walletError) {
          errorCount++;
          console.error(`❌ Error loading wallet ${wallet.walletName}:`, walletError);
          // Continue with other wallets even if one fails
        }
      }

      console.log(`📊 Wallet loading summary:`);
      console.log(`   - Total wallets processed: ${walletData.length}`);
      console.log(`   - Successfully loaded: ${loadedCount}`);
      console.log(`   - Skipped (up to date): ${skippedCount}`);
      console.log(`   - Errors: ${errorCount}`);
      
      return { success: true, count: loadedCount };
    } catch (error) {
      console.error('Error loading wallet data:', error);
      return { success: false, count: 0, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }



  /**
   * Get transaction trees from database
   */
  static async getTransactionTrees() {
    const trees = await prisma.transactionTree.findMany({
      include: {
        nodes: {
          orderBy: { date: 'asc' }
        },
        comments: true
      }
    });

    // Get all wallet transactions for manual linking
    const allWalletTransactions = await prisma.walletTransaction.findMany({
      include: {
        walletCSV: true
      }
    });

    // Create a map of txid to wallet transactions
    const walletTxMap = allWalletTransactions.reduce((acc, wt) => {
      if (!acc[wt.txid]) {
        acc[wt.txid] = [];
      }
      acc[wt.txid].push(wt);
      return acc;
    }, {} as Record<string, any[]>);

    return trees.map(tree => {
      // First, create the nodes map
      const nodesMap = tree.nodes.reduce((acc, node) => {
        acc[node.txid] = {
          id: node.txid,
          parentId: node.parentId,
          date: node.date.toISOString(),
          totalAmount: node.totalAmount,
          confirmed: node.confirmed,
          price: node.price,
          priceUSD: node.priceUSD,
          inputs: node.inputs ? JSON.parse(node.inputs) : [],
          outputs: node.outputs ? JSON.parse(node.outputs) : [],
          children: [], // Will be populated below
          wallets: (walletTxMap[node.txid] || []).map(wt => ({
            walletName: wt.walletName,
            label: wt.label,
            value: wt.value,
            valueBTC: wt.value / 100000000,
            type: wt.type
          }))
        };
        return acc;
      }, {} as Record<string, any>);

      // Now populate the children arrays
      Object.values(nodesMap).forEach((node: any) => {
        if (node.parentId) {
          const parentNode = nodesMap[node.parentId];
          if (parentNode) {
            parentNode.children.push(node.id);
          }
        }
      });

      return {
        treeId: tree.treeId,
        rootId: tree.rootId,
        totalAmount: tree.totalAmount,
        totalValueUSD: tree.totalValueUSD,
        dateRange: JSON.parse(tree.dateRange),
        nodeCount: tree.nodeCount,
        nodes: nodesMap,
        comments: tree.comments.reduce((acc, comment) => {
          acc[comment.nodeId] = comment.content;
          return acc;
        }, {} as any)
      };
    });
  }

  /**
   * Get wallet data from database
   */
  static async getWalletData() {
    console.log('Fetching wallet data from database...');
    
    // First, let's check if there are any wallet transactions at all
    const totalWalletTransactions = await prisma.walletTransaction.count();
    console.log(`Total wallet transactions in database: ${totalWalletTransactions}`);
    
    const wallets = await prisma.walletCSV.findMany({
      include: {
        transactions: {
          orderBy: { date: 'desc' }
        }
      }
    });

    console.log(`Found ${wallets.length} wallets in database:`);
    wallets.forEach(wallet => {
      console.log(`  - ${wallet.walletName}: ${wallet.transactions.length} transactions`);
      if (wallet.transactions.length > 0) {
        console.log(`    Sample transaction: ${wallet.transactions[0].txid}`);
      }
    });

    const result = wallets.map(wallet => ({
      walletName: wallet.walletName,
      fileName: wallet.fileName,
      lastModified: wallet.lastModified,
      transactionCount: wallet.transactionCount,
      transactions: wallet.transactions.map(tx => ({
        id: tx.txid,
        date: tx.date.toISOString(),
        label: tx.label,
        value: tx.value,
        balance: tx.balance,
        fee: tx.fee,
        type: tx.type,
        confirmed: tx.confirmed,
        priceUSD: tx.priceUSD,
        txid: tx.txid
      }))
    }));

    console.log(`Returning ${result.length} wallets from getWalletData`);
    return result;
  }

  /**
   * Link wallet transactions to transaction nodes
   */
  static async linkWalletTransactionsToNodes(): Promise<{ success: boolean; linked: number; error?: string }> {
    try {
      console.log('=== LINKING WALLET TRANSACTIONS TO TRANSACTION NODES ===');
      
      // First, let's check the current state
      const totalWalletTxs = await prisma.walletTransaction.count();
      const totalNodes = await prisma.transactionNode.count();
      console.log(`Total wallet transactions: ${totalWalletTxs}`);
      console.log(`Total transaction nodes: ${totalNodes}`);

             // Get all wallet transactions (since we removed the foreign key relationship)
       const walletTransactions = await prisma.walletTransaction.findMany();

      console.log(`Found ${walletTransactions.length} wallet transactions with no linked transaction node`);

             // Also get some sample wallet transactions to see their current state
       const sampleWalletTxs = await prisma.walletTransaction.findMany({
         take: 5
       });

       console.log('\n=== SAMPLE WALLET TRANSACTIONS CURRENT STATE ===');
       sampleWalletTxs.forEach((wt, i) => {
         console.log(`${i + 1}. ${wt.txid} (${wt.walletName}) - No foreign key relationship`);
       });

      // Check if any of these sample transactions have matching nodes
      console.log('\n=== CHECKING SAMPLE TRANSACTIONS FOR MATCHES ===');
      for (const wt of sampleWalletTxs) {
        const matchingNode = await prisma.transactionNode.findUnique({
          where: { txid: wt.txid }
        });
        if (matchingNode) {
          console.log(`✅ ${wt.txid} (${wt.walletName}) - MATCHES node in tree ${matchingNode.treeId}`);
        } else {
          console.log(`❌ ${wt.txid} (${wt.walletName}) - NO MATCHING NODE`);
        }
      }

      // Now try to link the unlinked transactions
      console.log('\n=== ATTEMPTING TO LINK UNLINKED TRANSACTIONS ===');
      let linkedCount = 0;
      for (const wt of walletTransactions) {
        // Check if there's a matching transaction node
        const transactionNode = await prisma.transactionNode.findUnique({
          where: { txid: wt.txid }
        });

        if (transactionNode) {
          console.log(`Found matching node for ${wt.txid} (${wt.walletName}) in tree ${transactionNode.treeId}`);
          
          // Try to establish the relationship
          try {
            await prisma.walletTransaction.update({
              where: { id: wt.id },
              data: {
                txid: wt.txid // This should establish the foreign key relationship
              }
            });
            linkedCount++;
            console.log(`✅ Successfully linked ${wt.txid} (${wt.walletName}) to tree ${transactionNode.treeId}`);
          } catch (updateError) {
            console.error(`❌ Failed to update ${wt.txid} (${wt.walletName}):`, updateError);
          }
        } else {
          console.log(`❌ No matching transaction node found for ${wt.txid} (${wt.walletName})`);
        }
      }

             // Verify the final state
       console.log('\n=== FINAL VERIFICATION ===');
       // Since we removed the foreign key relationship, we can't count linked transactions
       console.log(`Total wallet transactions: ${totalWalletTxs}`);
       console.log(`Total transaction nodes: ${totalNodes}`);

             console.log(`\n=== LINKING SUMMARY ===`);
       console.log(`Successfully linked: ${linkedCount} wallet transactions`);
       console.log(`Total wallet transactions processed: ${totalWalletTxs}`);
      
      return { success: true, linked: linkedCount };
    } catch (error) {
      console.error('Error linking wallet transactions:', error);
      return { success: false, linked: 0, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get wallet information for specific transaction IDs
   */
  static async getWalletInfoForTransactions(transactionIds: string[]) {
    const walletTransactions = await prisma.walletTransaction.findMany({
      where: {
        txid: { in: transactionIds }
      },
             include: {
         walletCSV: true
       }
    });

    const walletInfo: Record<string, any> = {};
    walletTransactions.forEach(wt => {
             walletInfo[wt.txid] = {
         walletName: wt.walletName,
         transactionId: wt.txid,
         label: wt.label,
         value: wt.value,
         valueBTC: wt.value / 100000000, // Convert sats to BTC
         type: wt.type,
         linked: false // No foreign key relationship, so always false
       };
    });

    return walletInfo;
  }

  /**
   * Get transaction tree by ID
   */
  static async getTransactionTree(treeId: string) {
    const tree = await prisma.transactionTree.findUnique({
      where: { treeId },
      include: {
        nodes: {
          orderBy: { date: 'asc' }
        },
        comments: true
      }
    });

    if (!tree) return null;

    // Build the tree structure
    const nodes = tree.nodes.reduce((acc, node) => {
      acc[node.txid] = {
        id: node.txid,
        parentId: node.parentId,
        date: node.date.toISOString(),
        totalAmount: node.totalAmount,
        confirmed: node.confirmed,
        price: node.price,
        priceUSD: node.priceUSD,
        inputs: JSON.parse(node.inputs),
        outputs: JSON.parse(node.outputs),
        children: []
      };
      return acc;
    }, {} as any);

    // Build parent-child relationships
    Object.values(nodes).forEach((node: any) => {
      if (node.parentId && nodes[node.parentId]) {
        nodes[node.parentId].children.push(node.id);
      }
    });

    return {
      treeId: tree.treeId,
      rootId: tree.rootId,
      totalAmount: tree.totalAmount,
      totalValueUSD: tree.totalValueUSD,
      dateRange: JSON.parse(tree.dateRange),
      nodeCount: tree.nodeCount,
      nodes,
      comments: tree.comments.reduce((acc, comment) => {
        acc[comment.nodeId] = comment.content;
        return acc;
      }, {} as any)
    };
  }

  /**
   * Initialize database with data if needed
   */
  static async initializeDatabase(): Promise<{ success: boolean; message: string }> {
    try {
      const status = await this.getDataLoadStatus();
      
      if (!status.transactionTrees.loaded) {
        const treeResult = await this.loadTransactionTrees();
        if (!treeResult.success) {
          return { success: false, message: `Failed to load transaction trees: ${treeResult.error}` };
        }
      }

      if (!status.walletData.loaded) {
        const walletResult = await this.loadWalletData();
        if (!walletResult.success) {
          return { success: false, message: `Failed to load wallet data: ${walletResult.error}` };
        }
      }

      return { success: true, message: 'Database initialized successfully' };
    } catch (error) {
      console.error('Error initializing database:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}
