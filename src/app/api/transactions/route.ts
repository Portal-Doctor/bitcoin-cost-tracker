import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database-service';

export async function GET() {
  try {
    const transactionTrees = await DatabaseService.getTransactionTrees();
    return NextResponse.json(transactionTrees);
  } catch (error) {
    console.error('Error reading transactions:', error);
    return NextResponse.json(
      { error: 'Failed to read transactions' },
      { status: 500 }
    );
  }
}
