import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database-service';

export async function POST() {
  try {
    const result = await DatabaseService.clearWalletData();
    
    if (result.success) {
      return NextResponse.json({ success: true, message: result.message });
    } else {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error clearing wallet data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear wallet data' },
      { status: 500 }
    );
  }
}
