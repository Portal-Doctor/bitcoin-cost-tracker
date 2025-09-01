import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database-service';

export async function GET() {
  try {
    console.log('API: /api/wallets - Fetching wallet data...');
    
    const walletData = await DatabaseService.getWalletData();
    console.log(`API: Received ${walletData.length} wallets from DatabaseService`);
    
    // Convert to a simpler format for the frontend
    const wallets = walletData.map((wallet: any) => ({
      id: wallet.walletName, // Use wallet name as ID
      name: wallet.walletName,
      addressCount: 0, // We don't store addresses in the database currently
      transactionCount: wallet.transactionCount,
      addresses: [], // We don't store addresses in the database currently
      totalAddresses: 0
    }));

    console.log(`API: Returning ${wallets.length} wallets to frontend`);
    console.log('API: Wallet names:', wallets.map((w: any) => w.name).join(', '));
    
    return NextResponse.json({ wallets });
  } catch (error) {
    console.error('Error fetching wallets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallets' },
      { status: 500 }
    );
  }
}

// Remove POST method since we're not creating wallets via API anymore
