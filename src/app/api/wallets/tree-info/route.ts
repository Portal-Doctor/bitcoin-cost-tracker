import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionIds = searchParams.get('transactionIds');
    
    if (!transactionIds) {
      return NextResponse.json({ error: 'transactionIds parameter is required' }, { status: 400 });
    }

    const txIds = transactionIds.split(',');
    const walletInfo = await DatabaseService.getWalletInfoForTransactions(txIds);

    return NextResponse.json({ walletInfo });
  } catch (error) {
    console.error('Error getting wallet tree info:', error);
    return NextResponse.json(
      { error: 'Failed to get wallet tree information' },
      { status: 500 }
    );
  }
}
