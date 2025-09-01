import { NextRequest, NextResponse } from 'next/server';
import { UTXOTracingService } from '@/lib/utxo-tracing-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromWallet = searchParams.get('fromWallet');
    const toWallet = searchParams.get('toWallet');
    const walletName = searchParams.get('walletName');

    if (fromWallet && toWallet) {
      // Get flow between two specific wallets
      const flows = await UTXOTracingService.getWalletToWalletFlow(fromWallet, toWallet);
      return NextResponse.json({ flows });
    } else if (walletName) {
      // Get summary for a specific wallet
      const summary = await UTXOTracingService.getWalletUTXOSummary(walletName);
      return NextResponse.json({ summary });
    } else {
      // Get all flows from database
      const flows = await UTXOTracingService.getUTXOFlowsFromDatabase();
      return NextResponse.json({ flows });
    }
  } catch (error) {
    console.error('Error fetching UTXO flow:', error);
    return NextResponse.json(
      { error: 'Failed to fetch UTXO flow data' },
      { status: 500 }
    );
  }
}
