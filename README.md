# Bitcoin Cost Basis Tracker

A comprehensive web application to track your Bitcoin transactions, calculate cost basis, monitor profit/loss, and analyze address types from your Bitcoin node data.

[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue?style=flat&logo=github)](https://github.com/Portal-Doctor/bitcoin-cost-tracker)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## Features

### 🔍 **Transaction Analysis**

- **Smart Categorization**: Automatically categorizes transactions as purchases, sells, or wallet moves
- **Address Tracking**: Shows all addresses involved in each transaction with input/output flow
- **Multi-sig Detection**: Identifies single-sig vs multi-sig addresses (P2PKH, P2SH, P2WPKH, P2WSH)
- **Script Type Analysis**: Displays script types and security models for each address

### **Financial Tracking**

- **Cost Basis Calculation**: Calculates average cost basis using FIFO method
- **Profit/Loss Tracking**: Shows realized gains/losses for each transaction
- **Historical Price Data**: Fetches Bitcoin price data from Yahoo Finance API
- **Transaction Summaries**: Overview of total purchases, sells, moves, and fees

### **Technical Features**

- **Real-time Node Integration**: Connects directly to your Bitcoin Core node
- **Transaction Comments**: Add, view, and delete comments for any transaction
- **SQLite Database**: Persistent storage using Prisma ORM
- **API Documentation**: Built-in Swagger UI for API exploration
- **Modern UI**: Material-UI components with responsive design

### **User Interface**

- **Material-UI Design**: Modern, responsive interface with consistent theming
- **Color-coded Addresses**: Visual indicators for input/output addresses
- **Transaction Lists**: Organized by type with detailed information
- **Real-time Updates**: Live data from your Bitcoin node

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
   yarn db:generate
   yarn db:reset
   ```

   > **Note**: The database file (`prisma/dev.db`) is not included in the repository. Each user needs to run the setup command to create their own local database.

5. **Start the development server**:

   ```bash
   yarn dev
   ```

6. **Open your browser** and navigate to `http://localhost:3000`

## Usage

### **Basic Workflow**

1. **Enter Wallet Address**: Input your xpub address or specific Bitcoin address
2. **Process Transactions**: Click "Track Transactions" to analyze your wallet
3. **View Results**: Explore transaction summaries, lists, and detailed information

### **Demo Mode**

- Use `demo` as the wallet address to see sample data with various address types
- Demonstrates single-sig, multi-sig, and different script types

### **Address Analysis**

- **Color-coded dots**:
  - 🔴 Red = Input addresses (funds coming from)
  - 🟢 Green = Output addresses (funds going to)
  - 🟡 Yellow = Both input and output (change addresses)
- **Address chips**: Show single-sig vs multi-sig with different colors
- **Script type labels**: Display specific script types (P2PKH, P2SH, P2WPKH, P2WSH)

## Transaction Types

- **Purchases**: Incoming transactions (receiving Bitcoin)
- **Sells**: Outgoing transactions (spending Bitcoin)
- **Moves**: Internal transfers between your own addresses

## Address Types Detected

### **Single-Signature Addresses**

- **P2PKH**: Legacy addresses starting with `1` (e.g., `1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa`)
- **P2WPKH**: Native SegWit addresses starting with `bc1q` (e.g., `bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4`)

### **Multi-Signature Addresses**

- **P2SH**: Multi-sig addresses starting with `3` (e.g., `3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy`)
- **P2WSH**: Native SegWit multi-sig addresses starting with `bc1q` (longer format)
- **Native MultiSig**: Direct multi-signature scripts

## Cost Basis Calculation

The application uses the FIFO (First In, First Out) method to calculate cost basis:

- Purchase transactions add to your cost basis
- Sell transactions calculate profit/loss based on average cost
- Running balance and cost basis are updated with each transaction

## API Documentation

Access the interactive API documentation at `/api-docs` or click the "API Docs" button in the top-right corner.

### **Available Endpoints**

- `POST /api/transactions` - Process wallet transactions

  - Body: `{ "walletAddress": "your_address" }`
  - Returns: Transaction data with cost basis calculations and address analysis

- `GET /api/comments?txid=xxx` - Get comments for a transaction

  - Returns: Array of comments for the specified transaction

- `POST /api/comments` - Create a new comment

  - Body: `{ "txid": "transaction_id", "content": "comment_text" }`
  - Returns: Created comment object

- `DELETE /api/comments/[id]` - Delete a comment

  - Returns: Success message

- `GET /api/swagger` - OpenAPI specification
  - Returns: Swagger documentation in JSON format

## Database Commands

```bash
yarn db:reset      # Reset database (clears all data)
yarn db:migrate    # Run database migrations
yarn db:format     # Format Prisma schema
yarn db:generate   # Generate Prisma client
```

## Environment Variables

| Variable           | Description               | Default         |
| ------------------ | ------------------------- | --------------- |
| `DATABASE_URL`     | SQLite database URL       | `file:./dev.db` |
| `BITCOIN_HOST`     | Bitcoin Core RPC host     | `localhost`     |
| `BITCOIN_PORT`     | Bitcoin Core RPC port     | `8332`          |
| `BITCOIN_USERNAME` | Bitcoin Core RPC username | `bitcoin`       |
| `BITCOIN_PASSWORD` | Bitcoin Core RPC password | `password`      |

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI Framework**: Material-UI (MUI) with Emotion styling
- **Backend**: Next.js API routes
- **Database**: SQLite with Prisma ORM
- **Bitcoin Integration**: bitcoin-core library
- **Price Data**: Yahoo Finance API
- **Documentation**: Swagger UI with OpenAPI 3.0

## Security Notes

- Never commit your `.env.local` file to version control
- Use strong passwords for your Bitcoin Core RPC
- Consider using testnet for development and testing
- The application only reads transaction data, it cannot spend your Bitcoin
- Database files are excluded from version control

## Troubleshooting

### **Connection Issues**

- Verify Bitcoin Core is running and RPC is enabled
- Check firewall settings
- Ensure RPC credentials are correct

### **No Transactions Found**

- Verify the wallet address is correct
- Check if the address has transaction history
- Ensure your Bitcoin node is fully synced

### **Price Data Missing**

- Check internet connection for Yahoo Finance API
- Some historical dates may not have price data available
- Application includes fallback price generation

### **Build Issues**

- Ensure all dependencies are installed: `yarn install`
- Clear Next.js cache: `rm -rf .next`
- Check TypeScript errors: `yarn lint`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
