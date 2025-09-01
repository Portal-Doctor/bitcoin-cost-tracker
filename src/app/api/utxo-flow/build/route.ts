import { NextRequest, NextResponse } from 'next/server';
import { UTXOTracingService } from '@/lib/utxo-tracing-service';

export async function POST(request: NextRequest) {
  try {
    console.log('Building UTXO flow graph and caching network data...');
    
    // Build UTXO flow graph (this will fetch and cache network data)
    const flows = await UTXOTracingService.buildUTXOFlowGraph();
    
    console.log(`Successfully built UTXO flow graph with ${flows.length} flows`);
    
    return NextResponse.json({ 
      success: true, 
      message: `Built UTXO flow graph with ${flows.length} flows`,
      flowCount: flows.length 
    });
  } catch (error) {
    console.error('Error building UTXO flow graph:', error);
    return NextResponse.json(
      { error: 'Failed to build UTXO flow graph' },
      { status: 500 }
    );
  }
}
