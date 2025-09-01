import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface UTXONode {
  txid: string;
  address: string;
  amount: number;
  type: 'input' | 'output';
  walletName?: string;
  isChange: boolean;
  isExternal: boolean;
  date: string;
  blockHeight?: number;
}

export interface UTXOFlow {
  fromWallet?: string;
  toWallet?: string;
  fromAddress: string;
  toAddress: string;
  amount: number;
  txid: string;
  date: string;
  fee?: number;
  blockHeight?: number;
}

export interface WalletUTXOSummary {
  walletName: string;
  totalReceived: number;
  totalSent: number;
  currentBalance: number;
  utxoCount: number;
  consolidationCount: number;
  externalTransferCount: number;
}

export class UTXOTracingService {
  private static readonly MEMPOOL_API_BASE = 'https://mempool.space/api';
  private static readonly BLOCKSTREAM_API_BASE = 'https://blockstream.info/api';

  /**
   * Fetch complete transaction data from external API with caching
   */
  static async fetchTransactionData(txid: string): Promise<any> {
    // First check if we have cached data
    const cachedData = await this.getCachedTransactionData(txid);
    if (cachedData) {
      console.log(`Using cached transaction data for ${txid}`);
      return cachedData;
    }

    try {
      console.log(`Fetching transaction data for ${txid} from external API...`);
      
      // Try mempool.space first
      const response = await fetch(`${this.MEMPOOL_API_BASE}/tx/${txid}`);
      if (response.ok) {
        const data = await response.json();
        await this.cacheTransactionData(txid, data, 'mempool.space');
        return data;
      }

      // Fallback to Blockstream
      const blockstreamResponse = await fetch(`${this.BLOCKSTREAM_API_BASE}/tx/${txid}`);
      if (blockstreamResponse.ok) {
        const data = await blockstreamResponse.json();
        await this.cacheTransactionData(txid, data, 'blockstream');
        return data;
      }

      throw new Error(`Failed to fetch transaction data for ${txid}`);
    } catch (error) {
      console.error(`Error fetching transaction ${txid}:`, error);
      return null;
    }
  }

  /**
   * Cache transaction data in the database
   */
  static async cacheTransactionData(txid: string, data: any, source: string): Promise<void> {
    try {
      const blockTime = data.status?.block_time ? new Date(data.status.block_time * 1000) : null;
      
      await prisma.networkTransaction.upsert({
        where: { txid },
        update: {
          blockHeight: data.status?.block_height || null,
          blockTime,
          fee: data.fee || null,
          size: data.size || null,
          weight: data.weight || null,
          version: data.version || null,
          locktime: data.locktime || null,
          rawData: JSON.stringify(data),
          source,
          updatedAt: new Date()
        },
        create: {
          txid,
          blockHeight: data.status?.block_height || null,
          blockTime,
          fee: data.fee || null,
          size: data.size || null,
          weight: data.weight || null,
          version: data.version || null,
          locktime: data.locktime || null,
          rawData: JSON.stringify(data),
          source
        }
      });
      
      console.log(`Cached transaction data for ${txid}`);
    } catch (error) {
      console.error(`Error caching transaction data for ${txid}:`, error);
    }
  }

  /**
   * Get cached transaction data from database
   */
  static async getCachedTransactionData(txid: string): Promise<any | null> {
    try {
      const cached = await prisma.networkTransaction.findUnique({
        where: { txid }
      });
      
      if (cached) {
        return JSON.parse(cached.rawData);
      }
      
      return null;
    } catch (error) {
      console.error(`Error retrieving cached transaction data for ${txid}:`, error);
      return null;
    }
  }

  /**
   * Get all transaction IDs from wallet data
   */
  static async getAllTransactionIds(): Promise<string[]> {
    const walletTransactions = await prisma.walletTransaction.findMany({
      select: { txid: true }
    });
    
    return [...new Set(walletTransactions.map(wt => wt.txid))];
  }

  /**
   * Get wallet addresses from database
   */
  static async getWalletAddresses(): Promise<Record<string, string[]>> {
    const walletAddresses = await prisma.walletAddress.findMany({
      select: { walletName: true, address: true }
    });
    
    const addressMap: Record<string, string[]> = {};
    
    walletAddresses.forEach(wa => {
      if (!addressMap[wa.walletName]) {
        addressMap[wa.walletName] = [];
      }
      addressMap[wa.walletName].push(wa.address);
    });
    
    return addressMap;
  }

  /**
   * Find which wallet an address belongs to
   */
  private static findWalletForAddress(address: string, walletAddresses: Record<string, string[]>): string | undefined {
    for (const [walletName, addresses] of Object.entries(walletAddresses)) {
      if (addresses.includes(address)) {
        return walletName;
      }
    }
    return undefined;
  }

  /**
   * Check if a transaction is a consolidation (multiple inputs to fewer outputs)
   */
  private static isConsolidation(inputs: any[], outputs: any[]): boolean {
    return inputs.length > outputs.length;
  }

  /**
   * Determine flow type based on wallets involved
   */
  private static getFlowType(fromWallet: string | undefined, toWallet: string | undefined, inputs: any[], outputs: any[]): string {
    if (fromWallet && toWallet && fromWallet === toWallet) {
      return this.isConsolidation(inputs, outputs) ? 'consolidation' : 'internal';
    }
    return 'external';
  }

  /**
   * Build UTXO flow graph and store in database
   */
  static async buildUTXOFlowGraph(): Promise<UTXOFlow[]> {
    console.log('Building UTXO flow graph...');
    
    const txids = await this.getAllTransactionIds();
    console.log(`Found ${txids.length} unique transaction IDs`);
    
    const flows: UTXOFlow[] = [];
    const walletAddresses = await this.getWalletAddresses();
    
    for (let i = 0; i < txids.length; i++) {
      const txid = txids[i];
      console.log(`Processing transaction ${i + 1}/${txids.length}: ${txid}`);
      
      const txData = await this.fetchTransactionData(txid);
      if (!txData) continue;
      
      // Extract inputs and outputs
      const inputs = txData.vin || [];
      const outputs = txData.vout || [];
      
      // Map inputs to outputs to create flows
      for (const input of inputs) {
        if (input.prevout) {
          const fromAddress = input.prevout.scriptpubkey_address;
          const fromWallet = this.findWalletForAddress(fromAddress, walletAddresses);
          
          for (const output of outputs) {
            const toAddress = output.scriptpubkey_address;
            const toWallet = this.findWalletForAddress(toAddress, walletAddresses);
            
            // Only create flows for external transfers or consolidations
            if (fromWallet !== toWallet || this.isConsolidation(inputs, outputs)) {
              const flowType = this.getFlowType(fromWallet, toWallet, inputs, outputs);
              const amount = output.value / 100000000; // Convert sats to BTC
              const fee = txData.fee ? txData.fee / 100000000 : undefined;
              const blockTime = txData.status?.block_time ? new Date(txData.status.block_time * 1000) : null;
              
              const flow: UTXOFlow = {
                fromWallet,
                toWallet,
                fromAddress,
                toAddress,
                amount,
                txid,
                date: blockTime?.toISOString() || new Date().toISOString(),
                fee,
                blockHeight: txData.status?.block_height
              };
              
              flows.push(flow);
              
              // Store flow in database
              await this.storeUTXOFlow(flow, flowType);
            }
          }
        }
      }
    }
    
    console.log(`Built UTXO flow graph with ${flows.length} flows`);
    return flows;
  }

  /**
   * Store UTXO flow in database
   */
  static async storeUTXOFlow(flow: UTXOFlow, flowType: string): Promise<void> {
    try {
      // Find associated tree ID if this transaction is in a tree
      const treeNode = await prisma.transactionNode.findUnique({
        where: { txid: flow.txid },
        select: { treeId: true }
      });
      
              // Check if flow already exists
        const existingFlow = await prisma.uTXOFlow.findFirst({
          where: {
            txid: flow.txid,
            fromAddress: flow.fromAddress,
            toAddress: flow.toAddress
          }
        });

        if (existingFlow) {
          // Update existing flow
          await prisma.uTXOFlow.update({
            where: { id: existingFlow.id },
            data: {
              treeId: treeNode?.treeId || null,
              fromWallet: flow.fromWallet || null,
              toWallet: flow.toWallet || null,
              amount: flow.amount,
              fee: flow.fee || null,
              blockHeight: flow.blockHeight || null,
              blockTime: flow.blockHeight ? new Date(flow.date) : null,
              flowType,
              isChange: flowType === 'internal' && flow.amount < 0.001, // Small amounts are likely change
              updatedAt: new Date()
            }
          });
        } else {
          // Create new flow
          await prisma.uTXOFlow.create({
            data: {
              txid: flow.txid,
              treeId: treeNode?.treeId || null,
              fromWallet: flow.fromWallet || null,
              toWallet: flow.toWallet || null,
              fromAddress: flow.fromAddress,
              toAddress: flow.toAddress,
              amount: flow.amount,
              fee: flow.fee || null,
              blockHeight: flow.blockHeight || null,
              blockTime: flow.blockHeight ? new Date(flow.date) : null,
              flowType,
              isChange: flowType === 'internal' && flow.amount < 0.001
            }
          });
        }
    } catch (error) {
      console.error(`Error storing UTXO flow for ${flow.txid}:`, error);
    }
  }

  /**
   * Get UTXO flows from database
   */
  static async getUTXOFlowsFromDatabase(): Promise<UTXOFlow[]> {
    const dbFlows = await prisma.uTXOFlow.findMany({
      orderBy: { blockTime: 'desc' }
    });
    
    return dbFlows.map(flow => ({
      fromWallet: flow.fromWallet || undefined,
      toWallet: flow.toWallet || undefined,
      fromAddress: flow.fromAddress,
      toAddress: flow.toAddress,
      amount: flow.amount,
      txid: flow.txid,
      date: flow.blockTime?.toISOString() || new Date().toISOString(),
      fee: flow.fee || undefined,
      blockHeight: flow.blockHeight || undefined
    }));
  }

  /**
   * Get UTXO flow summary for a specific wallet from database
   */
  static async getWalletUTXOSummary(walletName: string): Promise<WalletUTXOSummary> {
    const flows = await prisma.uTXOFlow.findMany({
      where: {
        OR: [
          { fromWallet: walletName },
          { toWallet: walletName }
        ]
      }
    });
    
    const totalReceived = flows
      .filter(flow => flow.toWallet === walletName)
      .reduce((sum, flow) => sum + flow.amount, 0);
      
    const totalSent = flows
      .filter(flow => flow.fromWallet === walletName)
      .reduce((sum, flow) => sum + flow.amount, 0);
      
    const consolidationCount = flows
      .filter(flow => flow.fromWallet === walletName && flow.toWallet === walletName && flow.flowType === 'consolidation')
      .length;
      
    const externalTransferCount = flows
      .filter(flow => 
        ((flow.fromWallet === walletName && flow.toWallet !== walletName) ||
         (flow.toWallet === walletName && flow.fromWallet !== walletName)) &&
        flow.flowType === 'external'
      ).length;
    
    return {
      walletName,
      totalReceived,
      totalSent,
      currentBalance: totalReceived - totalSent,
      utxoCount: flows.length,
      consolidationCount,
      externalTransferCount
    };
  }

  /**
   * Get UTXO flow between two specific wallets from database
   */
  static async getWalletToWalletFlow(fromWallet: string, toWallet: string): Promise<UTXOFlow[]> {
    const dbFlows = await prisma.uTXOFlow.findMany({
      where: {
        fromWallet,
        toWallet
      },
      orderBy: { blockTime: 'desc' }
    });
    
    return dbFlows.map(flow => ({
      fromWallet: flow.fromWallet || undefined,
      toWallet: flow.toWallet || undefined,
      fromAddress: flow.fromAddress,
      toAddress: flow.toAddress,
      amount: flow.amount,
      txid: flow.txid,
      date: flow.blockTime?.toISOString() || new Date().toISOString(),
      fee: flow.fee || undefined,
      blockHeight: flow.blockHeight || undefined
    }));
  }

  /**
   * Get consolidation transactions for a wallet from database
   */
  static async getWalletConsolidations(walletName: string): Promise<UTXOFlow[]> {
    const dbFlows = await prisma.uTXOFlow.findMany({
      where: {
        fromWallet: walletName,
        toWallet: walletName,
        flowType: 'consolidation'
      },
      orderBy: { blockTime: 'desc' }
    });
    
    return dbFlows.map(flow => ({
      fromWallet: flow.fromWallet || undefined,
      toWallet: flow.toWallet || undefined,
      fromAddress: flow.fromAddress,
      toAddress: flow.toAddress,
      amount: flow.amount,
      txid: flow.txid,
      date: flow.blockTime?.toISOString() || new Date().toISOString(),
      fee: flow.fee || undefined,
      blockHeight: flow.blockHeight || undefined
    }));
  }

  /**
   * Store transaction relationships in database
   */
  static async storeTransactionRelationship(
    parentTxid: string,
    childTxid: string,
    relationshipType: string,
    amount: number,
    address?: string,
    walletName?: string
  ): Promise<void> {
    try {
      await prisma.transactionRelationship.upsert({
        where: {
          parentTxid_childTxid: {
            parentTxid,
            childTxid
          }
        },
        update: {
          relationshipType,
          amount,
          address: address || null,
          walletName: walletName || null,
          updatedAt: new Date()
        },
        create: {
          parentTxid,
          childTxid,
          relationshipType,
          amount,
          address: address || null,
          walletName: walletName || null
        }
      });
    } catch (error) {
      console.error(`Error storing transaction relationship:`, error);
    }
  }

  /**
   * Get transaction relationships from database
   */
  static async getTransactionRelationships(txid: string): Promise<any[]> {
    return await prisma.transactionRelationship.findMany({
      where: {
        OR: [
          { parentTxid: txid },
          { childTxid: txid }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Extract and store wallet addresses from transaction data
   */
  static async extractAndStoreWalletAddresses(): Promise<void> {
    console.log('Extracting wallet addresses from transaction data...');
    
    const walletTransactions = await prisma.walletTransaction.findMany({
      include: { walletCSV: true }
    });
    
    // Group by wallet
    const walletGroups = new Map<string, any[]>();
    walletTransactions.forEach(wt => {
      if (!walletGroups.has(wt.walletName)) {
        walletGroups.set(wt.walletName, []);
      }
      walletGroups.get(wt.walletName)!.push(wt);
    });
    
    for (const [walletName, transactions] of walletGroups) {
      console.log(`Processing addresses for wallet: ${walletName}`);
      
      const walletCSV = transactions[0]?.walletCSV;
      if (!walletCSV) continue;
      
      // Get unique addresses from transaction data
      const addresses = new Set<string>();
      
      for (const tx of transactions) {
        // This would need to be enhanced to extract addresses from the actual transaction data
        // For now, we'll use a placeholder approach
        // In a real implementation, you'd parse the transaction data to extract addresses
      }
      
      // Store addresses in database
      for (const address of addresses) {
        try {
          await prisma.walletAddress.upsert({
            where: {
              walletName_address: {
                walletName,
                address
              }
            },
            update: {
              updatedAt: new Date()
            },
            create: {
              walletCSVId: walletCSV.id,
              walletName,
              address,
              addressType: this.detectAddressType(address)
            }
          });
        } catch (error) {
          console.error(`Error storing address ${address} for wallet ${walletName}:`, error);
        }
      }
    }
    
    console.log('Finished extracting wallet addresses');
  }

  /**
   * Detect Bitcoin address type
   */
  private static detectAddressType(address: string): string {
    if (address.startsWith('1')) return 'legacy';
    if (address.startsWith('3')) return 'segwit';
    if (address.startsWith('bc1q')) return 'native-segwit';
    if (address.startsWith('bc1p')) return 'taproot';
    return 'unknown';
  }

  /**
   * Trace UTXO relationships for transaction tree building
   */
  static async traceUTXORelationships(transactions: any[]): Promise<Map<string, string[]>> {
    console.log('Tracing UTXO relationships using external APIs...');
    
    const relationships = new Map<string, string[]>();
    const txidToIndex = new Map<string, number>();
    
    // Create index mapping
    transactions.forEach((tx, index) => {
      txidToIndex.set(tx.id, index);
      relationships.set(tx.id, []);
    });

    // Process transactions in chronological order
    const sortedTransactions = transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    for (let i = 0; i < sortedTransactions.length; i++) {
      const tx = sortedTransactions[i];
      console.log(`Processing transaction ${i + 1}/${sortedTransactions.length}: ${tx.id}`);
      
      try {
        // Fetch detailed transaction data from external API
        const txData = await this.fetchTransactionData(tx.id);
        if (!txData) {
          console.log(`Skipping ${tx.id} - no data available`);
          continue;
        }

        // Extract input transaction IDs (previous outputs being spent)
        const inputs = txData.vin || [];
        for (const input of inputs) {
          if (input.txid && input.vout !== undefined) {
            const inputTxid = input.txid;
            const inputVout = input.vout;
            
            // Check if this input transaction is in our dataset
            if (txidToIndex.has(inputTxid)) {
              const inputIndex = txidToIndex.get(inputTxid)!;
              const inputTx = sortedTransactions[inputIndex];
              
              // Verify this is a valid relationship (input transaction is earlier)
              if (new Date(inputTx.date) < new Date(tx.date)) {
                // Add relationship: inputTx -> currentTx
                const currentRelationships = relationships.get(inputTxid) || [];
                if (!currentRelationships.includes(tx.id)) {
                  currentRelationships.push(tx.id);
                  relationships.set(inputTxid, currentRelationships);
                  console.log(`Found UTXO relationship: ${inputTxid} -> ${tx.id} (vout ${inputVout})`);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error processing transaction ${tx.id}:`, error);
      }
    }

    console.log(`Found ${Array.from(relationships.values()).flat().length} UTXO relationships`);
    return relationships;
  }

  /**
   * Build enhanced transaction trees using UTXO tracing
   */
  static async buildEnhancedTransactionTrees(transactions: any[]): Promise<any[]> {
    console.log('Building enhanced transaction trees with UTXO tracing...');
    
    // First, trace UTXO relationships
    const utxoRelationships = await this.traceUTXORelationships(transactions);
    
    // Group transactions by ID
    const txGroups = new Map<string, any[]>();
    transactions.forEach(tx => {
      if (!txGroups.has(tx.id)) {
        txGroups.set(tx.id, []);
      }
      txGroups.get(tx.id)!.push(tx);
    });

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
        children: utxoRelationships.get(txId) || [],
        totalAmount,
        comments: []
      });
    });

    // Find root transactions (those without children in our dataset)
    const rootIds = Array.from(nodes.keys()).filter(txId => {
      const children = utxoRelationships.get(txId) || [];
      return children.length === 0;
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
}
