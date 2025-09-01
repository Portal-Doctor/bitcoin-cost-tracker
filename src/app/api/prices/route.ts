import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const txid = searchParams.get('txid');
    const date = searchParams.get('date');

    if (txid) {
      // Get price for specific transaction
      const price = await prisma.transactionPrice.findUnique({
        where: { txid }
      });
      
      if (price) {
        return NextResponse.json({ price: price.price });
      }
    }

    if (date) {
      // Get price for specific date
      const dateObj = new Date(date);
      const dateString = dateObj.toISOString().split('T')[0];
      
      const price = await prisma.transactionPrice.findFirst({
        where: {
          date: {
            gte: new Date(dateString + 'T00:00:00Z'),
            lt: new Date(dateString + 'T23:59:59Z')
          }
        },
        orderBy: {
          date: 'desc'
        }
      });

      if (price) {
        return NextResponse.json({ price: price.price });
      }
    }

    // Return fallback price if not found
    return NextResponse.json({ price: 45000 });
  } catch (error) {
    console.error('Error fetching price:', error);
    return NextResponse.json({ price: 45000 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { txid, date, price, currency = 'USD', source = 'mempool.space' } = await request.json();

    if (!txid || !date || !price) {
      return NextResponse.json(
        { error: 'txid, date, and price are required' },
        { status: 400 }
      );
    }

    const savedPrice = await prisma.transactionPrice.upsert({
      where: { txid },
      update: {
        date: new Date(date),
        price,
        currency,
        source,
        updatedAt: new Date()
      },
      create: {
        txid,
        date: new Date(date),
        price,
        currency,
        source
      }
    });

    return NextResponse.json({ success: true, price: savedPrice });
  } catch (error) {
    console.error('Error saving price:', error);
    return NextResponse.json(
      { error: 'Failed to save price' },
      { status: 500 }
    );
  }
}
