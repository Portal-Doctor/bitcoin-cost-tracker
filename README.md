# Bitcoin Cost Basis Tracker

A comprehensive web application to track your Bitcoin transactions, calculate cost basis, and monitor profit/loss from your Bitcoin node data.

[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue?style=flat&logo=github)](https://github.com/Portal-Doctor/bitcoin-cost-tracker)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## Features

- **Transaction Tracking**: Automatically categorizes transactions as purchases, sells, or wallet moves
- **Cost Basis Calculation**: Calculates average cost basis using FIFO method
- **Profit/Loss Tracking**: Shows realized gains/losses for each transaction
- **Historical Price Data**: Fetches Bitcoin price data for transaction dates
- **Real-time Node Integration**: Connects directly to your Bitcoin Core node
- **Transaction Comments**: Add, view, and delete comments for any transaction
- **SQLite Database**: Persistent storage for comments using Prisma ORM
- **Beautiful UI**: Modern, responsive interface with transaction summaries

## Prerequisites

- Bitcoin Core node running with RPC enabled (optional for demo mode)
- Node.js 18+ and yarn

## Setup

1. **Clone and install dependencies**:

   ```bash
   git clone https://github.com/Portal-Doctor/bitcoin-cost-tracker.git
   cd bitcoin-cost-tracker
   yarn install
   ```

2. **Configure Bitcoin node connection**:

   Create a `.env.local` file in the root directory:

   ```env
   BITCOIN_HOST=localhost
   BITCOIN_PORT=8332
   BITCOIN_USERNAME=bitcoin
   BITCOIN_PASSWORD=your_bitcoin_rpc_password
   ```

3. **Configure Bitcoin Core RPC**:

   Add these lines to your `bitcoin.conf` file:

   ```conf
   server=1
   rpcuser=bitcoin
   rpcpassword=your_secure_password
   rpcallowip=127.0.0.1
   rpcbind=127.0.0.1
   ```

4. **Set up the database** (required for comment functionality):

   ```bash
   yarn setup-db
   ```
   
   > **Note**: The database file (`prisma/dev.db`) is not included in the repository. Each user needs to run the setup command to create their own local database.

5. **Start the development server**:

   ```bash
   yarn dev
   ```

6. **Open your browser** and navigate to `http://localhost:3000`

## Usage

1. **Enter Wallet Address**: Input your xpub address or specific Bitcoin address
2. **Process Transactions**: Click "Track Transactions" to analyze your wallet
3. **View Results**:
   - Transaction summary with totals and averages
   - Separate lists for purchases, sells, and wallet moves
   - Cost basis and profit/loss calculations
   - Historical price data for each transaction

## Transaction Types

- **Purchases**: Incoming transactions (receiving Bitcoin)
- **Sells**: Outgoing transactions (spending Bitcoin)
- **Moves**: Internal transfers between your own addresses

## Cost Basis Calculation

The application uses the FIFO (First In, First Out) method to calculate cost basis:

- Purchase transactions add to your cost basis
- Sell transactions calculate profit/loss based on average cost
- Running balance and cost basis are updated with each transaction

## API Endpoints

- `POST /api/transactions` - Process wallet transactions

  - Body: `{ "walletAddress": "your_address" }`
  - Returns: Transaction data with cost basis calculations

- `GET /api/comments?txid=xxx` - Get comments for a transaction

  - Returns: Array of comments for the specified transaction

- `POST /api/comments` - Create a new comment

  - Body: `{ "txid": "transaction_id", "content": "comment_text" }`
  - Returns: Created comment object

- `DELETE /api/comments/[id]` - Delete a comment
  - Returns: Success message

## Environment Variables

| Variable           | Description               | Default         |
| ------------------ | ------------------------- | --------------- |
| `DATABASE_URL`     | SQLite database URL       | `file:./dev.db` |
| `BITCOIN_HOST`     | Bitcoin Core RPC host     | `localhost`     |
| `BITCOIN_PORT`     | Bitcoin Core RPC port     | `8332`          |
| `BITCOIN_USERNAME` | Bitcoin Core RPC username | `bitcoin`       |
| `BITCOIN_PASSWORD` | Bitcoin Core RPC password | `password`      |

## Security Notes

- Never commit your `.env.local` file to version control
- Use strong passwords for your Bitcoin Core RPC
- Consider using testnet for development and testing
- The application only reads transaction data, it cannot spend your Bitcoin

## Troubleshooting

**Connection Issues**:

- Verify Bitcoin Core is running and RPC is enabled
- Check firewall settings
- Ensure RPC credentials are correct

**No Transactions Found**:

- Verify the wallet address is correct
- Check if the address has transaction history
- Ensure your Bitcoin node is fully synced

**Price Data Missing**:

- Check internet connection for CoinGecko API
- Some historical dates may not have price data available

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
