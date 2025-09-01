import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database-service';

export async function POST(request: NextRequest) {
  try {
    const { type } = await request.json();
    
    let result;
    if (type === 'trees') {
      result = await DatabaseService.loadTransactionTrees();
    } else if (type === 'wallets') {
      result = await DatabaseService.loadWalletData();
      
      // Automatically update prices for newly loaded wallets
      if (result.success) {
        try {
          console.log('Automatically updating prices for newly loaded wallets...');
          const priceUpdateResponse = await fetch(`${request.nextUrl.origin}/api/database/update-prices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (priceUpdateResponse.ok) {
            const priceResult = await priceUpdateResponse.json();
            console.log(`Price update completed: ${priceResult.updatedCount} transactions updated`);
            (result as any).priceUpdate = priceResult;
          } else {
            console.warn('Failed to automatically update prices');
          }
        } catch (error) {
          console.warn('Error during automatic price update:', error);
        }
      }
    } else if (type === 'all') {
      const treeResult = await DatabaseService.loadTransactionTrees();
      const walletResult = await DatabaseService.loadWalletData();
      
      result = {
        success: treeResult.success && walletResult.success,
        trees: treeResult,
        wallets: walletResult
      };
    } else {
      return NextResponse.json(
        { error: 'Invalid type. Must be "trees", "wallets", or "all"' },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error loading data:', error);
    return NextResponse.json(
      { error: 'Failed to load data' },
      { status: 500 }
    );
  }
}
