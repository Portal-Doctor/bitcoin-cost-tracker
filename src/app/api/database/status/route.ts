import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const dbStatus = await DatabaseService.getDataLoadStatus();
    
    // Get additional counts for new models
    const networkTransactionCount = await prisma.networkTransaction.count();
    const utxoFlowCount = await prisma.uTXOFlow.count();
    const walletAddressCount = await prisma.walletAddress.count();
    const transactionRelationshipCount = await prisma.transactionRelationship.count();
    
    return NextResponse.json({
      ...dbStatus,
      networkData: {
        networkTransactions: {
          count: networkTransactionCount,
          loaded: networkTransactionCount > 0
        },
        utxoFlows: {
          count: utxoFlowCount,
          loaded: utxoFlowCount > 0
        },
        walletAddresses: {
          count: walletAddressCount,
          loaded: walletAddressCount > 0
        },
        transactionRelationships: {
          count: transactionRelationshipCount,
          loaded: transactionRelationshipCount > 0
        }
      }
    });
  } catch (error) {
    console.error('Error getting database status:', error);
    return NextResponse.json(
      { error: 'Failed to get database status' },
      { status: 500 }
    );
  }
}
