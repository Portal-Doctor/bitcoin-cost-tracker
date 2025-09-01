export interface PriceData {
  date: string;
  price: number;
  volume?: number;
  high?: number;
  low?: number;
  open?: number;
  close?: number;
}

export interface YahooFinanceResponse {
  chart: {
    result: Array<{
      timestamp: number[];
      indicators: {
        quote: Array<{
          close: number[];
          high: number[];
          low: number[];
          open: number[];
          volume: number[];
        }>;
      };
    }>;
    error: any;
  };
}

export class PriceService {
  private static readonly YAHOO_FINANCE_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD';
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private static priceCache = new Map<string, { price: number; timestamp: number }>();

  /**
   * Fetch Bitcoin price for a specific date from Yahoo Finance
   */
  static async getBitcoinPrice(date: Date): Promise<number | null> {
    try {
      const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Check cache first
      const cached = this.priceCache.get(dateString);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.price;
      }

      // Convert date to Unix timestamp (start of day)
      const startTimestamp = Math.floor(date.getTime() / 1000);
      const endTimestamp = startTimestamp + 86400; // Add 24 hours

      const url = `${this.YAHOO_FINANCE_BASE_URL}?period1=${startTimestamp}&period2=${endTimestamp}&interval=1d`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: YahooFinanceResponse = await response.json();

      if (data.chart.error) {
        throw new Error(`Yahoo Finance error: ${JSON.stringify(data.chart.error)}`);
      }

      if (!data.chart.result || data.chart.result.length === 0) {
        throw new Error('No data returned from Yahoo Finance');
      }

      const result = data.chart.result[0];
      const quotes = result.indicators.quote[0];

      if (!quotes.close || quotes.close.length === 0) {
        throw new Error('No price data available for this date');
      }

      // Get the closing price for the day
      const price = quotes.close[0];
      
      if (!price || price === 0) {
        throw new Error('Invalid price data received');
      }

      // Cache the result
      this.priceCache.set(dateString, { price, timestamp: Date.now() });

      return price;
    } catch (error) {
      console.error(`Error fetching Bitcoin price for ${date.toISOString()}:`, error);
      return null;
    }
  }

  /**
   * Fetch Bitcoin prices for multiple dates
   */
  static async getBitcoinPrices(dates: Date[]): Promise<Map<string, number>> {
    const priceMap = new Map<string, number>();
    const uniqueDates = [...new Set(dates.map(d => d.toISOString().split('T')[0]))];
    
    console.log(`Fetching Bitcoin prices for ${uniqueDates.length} unique dates...`);

    // Process dates in batches to avoid overwhelming the API
    const batchSize = 10;
    for (let i = 0; i < uniqueDates.length; i += batchSize) {
      const batch = uniqueDates.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (dateString) => {
          const date = new Date(dateString);
          const price = await this.getBitcoinPrice(date);
          if (price !== null) {
            priceMap.set(dateString, price);
          }
        })
      );

      // Add a small delay between batches to be respectful to the API
      if (i + batchSize < uniqueDates.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return priceMap;
  }

  /**
   * Clear the price cache
   */
  static clearCache(): void {
    this.priceCache.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; entries: Array<{ date: string; price: number; age: number }> } {
    const now = Date.now();
    const entries = Array.from(this.priceCache.entries()).map(([date, data]) => ({
      date,
      price: data.price,
      age: now - data.timestamp
    }));

    return {
      size: this.priceCache.size,
      entries
    };
  }
}
