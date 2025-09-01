import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const txid = searchParams.get('txid');

    if (!txid) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    // Search for the transaction across all wallets
    const walletTransactions = await prisma.walletTransaction.findMany({
      where: {
        txid: txid
      },
      include: {
        walletCSV: {
          select: {
            walletName: true
          }
        }
      },
      orderBy: [
        { walletName: 'asc' },
        { date: 'desc' }
      ]
    });

    if (walletTransactions.length === 0) {
      return NextResponse.json({
        found: false,
        message: 'Transaction not found in any wallet'
      });
    }

    // Group by wallet and format the results
    const walletGroups = new Map<string, any[]>();
    
    walletTransactions.forEach(tx => {
      const walletName = tx.walletCSV.walletName;
      if (!walletGroups.has(walletName)) {
        walletGroups.set(walletName, []);
      }
      walletGroups.get(walletName)!.push({
        walletName: walletName,
        date: tx.date.toISOString(),
        type: tx.type,
        value: tx.value,
        label: tx.label,
        balance: tx.balance,
        fee: tx.fee,
        confirmed: tx.confirmed
      });
    });

    // Convert to array format
    const wallets = Array.from(walletGroups.values()).map(group => group[0]); // Take first occurrence per wallet

    const result = {
      txid: txid,
      wallets: wallets
    };

    return NextResponse.json({
      found: true,
      result: result
    });

  } catch (error) {
    console.error('Error searching for transaction:', error);
    return NextResponse.json(
      { error: 'Failed to search for transaction' },
      { status: 500 }
    );
  }
}
