import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database-service';

export async function POST() {
  try {
    const result = await DatabaseService.linkWalletTransactionsToNodes();
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        linked: result.linked,
        message: `Successfully linked ${result.linked} wallet transactions to transaction nodes`
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error linking wallet transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to link wallet transactions' },
      { status: 500 }
    );
  }
}
