import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PriceService } from '@/lib/price-service';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting price update process...');

    // Find all wallet transactions that don't have a priceUSD value (only null values)
    const transactionsWithoutPrice = await prisma.walletTransaction.findMany({
      where: {
        priceUSD: null
      },
      select: {
        id: true,
        txid: true,
        date: true,
        value: true,
        priceUSD: true
      },
      orderBy: {
        date: 'asc'
      }
    });

    console.log(`Found ${transactionsWithoutPrice.length} transactions with null price data`);

    if (transactionsWithoutPrice.length === 0) {
      return NextResponse.json({
        message: 'All transactions already have price data (no null values found)',
        updatedCount: 0,
        totalTransactions: 0
      });
    }

    // Extract unique dates from transactions that need price data
    const uniqueDates = [...new Set(transactionsWithoutPrice.map(tx => tx.date.toISOString().split('T')[0]))];
    console.log(`Unique dates requiring price data: ${uniqueDates.length}`);

    // Fetch prices for all unique dates
    const dateObjects = uniqueDates.map(dateString => new Date(dateString));
    const priceMap = await PriceService.getBitcoinPrices(dateObjects);

    console.log(`Successfully fetched prices for ${priceMap.size} dates`);

    // Update transactions with fetched prices (only those with null priceUSD)
    let updatedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const transaction of transactionsWithoutPrice) {
      try {
        // Double-check that priceUSD is still null before updating
        const currentTransaction = await prisma.walletTransaction.findUnique({
          where: { id: transaction.id },
          select: { priceUSD: true }
        });

        if (currentTransaction && currentTransaction.priceUSD !== null) {
          console.log(`Transaction ${transaction.txid} already has price data, skipping`);
          skippedCount++;
          continue;
        }

        const dateString = transaction.date.toISOString().split('T')[0];
        const price = priceMap.get(dateString);

        if (price) {
          // Calculate USD value based on the transaction value in sats
          const usdValue = (Math.abs(transaction.value) / 100000000) * price; // Convert sats to BTC, then to USD

          await prisma.walletTransaction.update({
            where: { id: transaction.id },
            data: {
              priceUSD: usdValue
            }
          });

          updatedCount++;
          console.log(`Updated transaction ${transaction.txid} with price: $${usdValue.toFixed(2)}`);
        } else {
          console.warn(`No price data available for date: ${dateString}`);
          errorCount++;
        }
      } catch (error) {
        console.error(`Error updating transaction ${transaction.txid}:`, error);
        errorCount++;
      }
    }

    // Get cache statistics
    const cacheStats = PriceService.getCacheStats();

    return NextResponse.json({
      message: 'Price update completed',
      updatedCount,
      errorCount,
      skippedCount,
      totalTransactions: transactionsWithoutPrice.length,
      cacheStats,
      summary: {
        transactionsProcessed: transactionsWithoutPrice.length,
        pricesFetched: priceMap.size,
        uniqueDates: uniqueDates.length,
        skipped: skippedCount
      }
    });

  } catch (error) {
    console.error('Error updating prices:', error);
    return NextResponse.json(
      { error: 'Failed to update prices', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check price status
export async function GET(request: NextRequest) {
  try {
    // Count transactions with null price data
    const transactionsWithoutPrice = await prisma.walletTransaction.count({
      where: {
        priceUSD: null
      }
    });

    // Count total transactions
    const totalTransactions = await prisma.walletTransaction.count();

    // Count transactions with price data
    const transactionsWithPrice = totalTransactions - transactionsWithoutPrice;

    // Get cache statistics
    const cacheStats = PriceService.getCacheStats();

    return NextResponse.json({
      transactionsWithoutPrice,
      transactionsWithPrice,
      totalTransactions,
      cacheStats,
      needsUpdate: transactionsWithoutPrice > 0,
      percentageComplete: totalTransactions > 0 ? ((transactionsWithPrice / totalTransactions) * 100).toFixed(1) : '0'
    });

  } catch (error) {
    console.error('Error checking price status:', error);
    return NextResponse.json(
      { error: 'Failed to check price status' },
      { status: 500 }
    );
  }
}
