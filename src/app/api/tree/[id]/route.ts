import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const treeId = `tree-${id}`;

    const tree = await DatabaseService.getTransactionTree(treeId);
    
    if (!tree) {
      return NextResponse.json({ error: 'Tree not found' }, { status: 404 });
    }

    return NextResponse.json(tree);
  } catch (error) {
    console.error('Error reading tree:', error);
    return NextResponse.json(
      { error: 'Failed to read tree' },
      { status: 500 }
    );
  }
}
