# Bitcoin Transaction Tree Visualizer

A comprehensive Next.js application for visualizing Bitcoin transaction trees with UTXO flow tracking, price data integration, and persistent commenting system.

I built this for tax time so I could track UTXO's through my various wallets as I consolidated, added to, and sometimes (gasp) spent. I needed a way to organize the movements so I can have accurate tax records.

If you run a node, you can extract your transactions and load them into the application. It all stays on your machine, you its private for you. This works, even if you have a pruned node. In fact, this works even if you do not run a node at all (although it is better if you do).

I use Sparrow to manage my cold storage wallets, so I can extract the wallet data (as shown below) and import the transaction data.

Feel free to use this if you would like. Sharing with the world as FOSS.

## 🌟 Features

### Dashboard & Data Management

- **Dual Data Sources**: Support for both wallet-specific and full-node transaction data
- **Flexible Loading**: Load wallets, transaction trees, or all data together
- **Database Status**: Real-time status of loaded wallets and transaction trees
- **Price Management**: Automatic Bitcoin price fetching and caching

### Wallet Management

- **Individual Wallet Views**: Detailed transaction history for each wallet
- **Wallet Relationships**: Identify transactions that connect multiple wallets
- **Transaction Labels**: Add custom labels to transactions with full CRUD operations
- **UTXO Tree Visualization**: Track UTXO flow for individual transactions
- **Search Functionality**: Global and wallet-specific transaction search

### Transaction Tree Visualization

- **Transaction Tree Overview**: View all root transactions with total Bitcoin amounts and USD values
- **Tree Summaries**: See transaction counts, date ranges, and descriptions for each tree
- **Interactive Cards**: Click to explore individual transaction trees
- **Price Integration**: Historical Bitcoin prices and USD value calculations

### Tree Explore Page

- **Detailed Transaction View**:

  - Full transaction details with inputs and outputs
  - Address type identification (single-sig vs multisig)
  - Historical Bitcoin prices and USD values
  - Interactive expand/collapse functionality
  - Persistent commenting system for documentation

- **Flow Diagram View**:
  - Visual representation of UTXO flow between transactions
  - Interactive expand/collapse functionality
  - Color-coded address types and transaction status
  - Price data display in visual format

### Address Type Detection

- **Single-sig addresses**: Legacy (1...), Native SegWit (bc1q...)
- **Multisig addresses**: P2SH (3...), Taproot (bc1p...)
- **Visual indicators**: Color-coded chips showing address types

### UTXO Flow Tracking

- **Change Address Detection**: Automatically identifies change outputs
- **External Address Marking**: Distinguishes between internal and external addresses
- **Parent-Child Relationships**: Tracks transaction dependencies
- **Tree Building**: Constructs complete transaction trees from root transactions

### Database Integration

- **Persistent Comments**: Store and manage comments for each transaction
- **Price Caching**: Cache historical Bitcoin prices to prevent redundant API calls
- **SQLite Database**: Local storage with Prisma ORM
- **Tree-Specific Data**: Comments tied to specific trees and transaction nodes

### Price Data Integration

- **External API**: CoinGecko integration for historical price data
- **Smart Caching**: Prevents redundant API calls for confirmed transactions
- **USD Value Display**: Shows both BTC amounts and USD values throughout the app
- **Date-Based Pricing**: Historical prices for transaction dates

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Yarn package manager

### Installation

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd bitcoin-cost
   ```

2. **Install dependencies**:

   ```bash
   yarn install
   ```

3. **Set up the database**:

   ```bash
   yarn db:reset
   yarn db:generate
   ```

4. **Add your transaction data**:

   The application requires two types of CSV files:

   **Wallet Data** (`tmp/wallets/` directory):

   - Export individual wallet transactions from Sparrow Wallet
   - Go to File → Export Wallet → Transactions
   - Place CSV files in `tmp/wallets/` directory
   - Format: `Date (UTC),Label,Value,Balance,Fee,Txid`
   - Example filename: `mywallet-transactions.csv`

   **Transaction Trees** (`tmp/all-txn.csv`):

   - Export all transactions from your Bitcoin node (Core or Knots)
   - Place the CSV file in `tmp/` directory as `all-txn.csv`
   - Format: `Confirmed,Date,Type,Label,Address,Amount (BTC),ID`
   - Used for building transaction trees and UTXO flow visualization

5. **Run the development server**:

   ```bash
   yarn dev
   ```

6. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

7. **Load your data**:
   - Click "Load Wallets" to load individual wallet CSV files
   - Click "Load Transaction Trees" to load the all-txn.csv file
   - Click "Load All Data" to load both wallets and transaction trees
   - Use "Clear & Reload" options to refresh data after making changes

## 📁 Project Structure

```
bitcoin-cost/
├── src/                   # Source code
│   ├── app/              # Next.js App Router
│   │   ├── api/          # API routes
│   │   │   ├── comments/ # Comment management endpoints
│   │   │   ├── database/ # Database operations
│   │   │   ├── wallets/  # Wallet data endpoints
│   │   │   └── utxo-tree/ # UTXO tree endpoints
│   │   ├── page.tsx      # Dashboard page
│   │   ├── wallet/[name] # Wallet detail pages
│   │   ├── tree/[id]/    # Tree explore page
│   │   └── utxo-tree/[txid] # UTXO tree page
│   ├── components/       # React components
│   │   ├── TransactionFlowDiagram.tsx
│   │   ├── TransactionLabelEditor.tsx
│   │   └── TransactionSearch.tsx
│   ├── lib/              # Utility functions
│   │   ├── bitcoin-utils.ts    # Core Bitcoin logic
│   │   ├── price-service.ts    # Price data management
│   │   ├── database-service.ts # Database operations
│   │   ├── wallet-service.ts   # Wallet operations
│   │   └── utxo-tracing-service.ts # UTXO tracing
│   └── types/            # TypeScript definitions
│       └── bitcoin.ts
├── tmp/                  # Data files
│   ├── wallets/          # Individual wallet CSV files
│   │   ├── wallet1-transactions.csv
│   │   └── wallet2-transactions.csv
│   └── all-txn.csv       # All transactions from Bitcoin node
├── prisma/               # Database schema
│   └── schema.prisma
└── scripts/              # Database setup scripts
    └── setup-db.js
```

## 🛠️ Available Scripts

- `yarn dev` - Start development server with Turbopack
- `yarn build` - Build for production
- `yarn start` - Start production server
- `yarn db:reset` - Reset and sync database
- `yarn db:generate` - Generate Prisma client
- `yarn db:migrate` - Run database migrations
- `yarn lint` - Run ESLint
- `yarn format` - Format code with ESLint

## 🗄️ Database Schema

### TreeComment

- Stores comments for each transaction node within a tree
- Unique constraint on treeId + nodeId combination
- Timestamps for creation and updates

### TransactionPrice

- Caches Bitcoin price data to prevent redundant API calls
- Stores price by transaction ID and date
- Supports multiple price sources

## 🔧 Architecture

- **Frontend**: Next.js 15 with React 19
- **UI Framework**: Material-UI (MUI) v7
- **Database**: SQLite with Prisma ORM
- **Package Manager**: Yarn
- **Build Tool**: Turbopack
- **Language**: TypeScript

## 🔑 Key Components

- **Bitcoin Utils**: Core logic for parsing CSV and building transaction trees
- **Price Service**: External API integration with smart caching
- **Comment Service**: Database operations for comment management
- **Transaction Flow Diagram**: Visual component for UTXO flow representation
- **Tree Explorer**: Detailed transaction view with commenting system

## 🌳 Tree Building Algorithm

1. **Parse CSV**: Convert CSV data to structured transaction objects
2. **Group by ID**: Handle multiple inputs/outputs per transaction
3. **Build Relationships**: Establish parent-child relationships between transactions
4. **Identify Change**: Detect change addresses and external outputs
5. **Fetch Prices**: Get historical Bitcoin prices for all transactions
6. **Construct Trees**: Build complete transaction trees from root transactions
7. **Generate Summaries**: Create concise summaries for the tree list page

## 💾 Data Persistence

- **Comments**: Stored per transaction node per tree
- **Price Data**: Cached by transaction ID and date
- **No Redundant Calls**: Confirmed transactions won't trigger new price API calls
- **SQLite Database**: Local storage with Prisma ORM

## 🔌 API Endpoints

- `GET /api/transactions` - Serve CSV transaction data
- `GET /api/comments?treeId=xxx&nodeId=xxx` - Get specific comment
- `GET /api/comments?treeId=xxx` - Get all comments for a tree
- `POST /api/comments` - Save a comment
- `DELETE /api/comments?treeId=xxx&nodeId=xxx` - Delete a comment

## 🎨 UI Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Material Design**: Modern UI with Material-UI components
- **Interactive Elements**: Hover effects, expand/collapse, tooltips
- **Color Coding**: Visual indicators for address types and transaction status
- **Loading States**: Proper loading indicators for async operations

## 🔒 Security

- **Local Database**: All data stored locally
- **No External Dependencies**: Price data cached to minimize external calls
- **Input Validation**: Proper validation for all user inputs
- **Error Handling**: Graceful error handling throughout the application

## 📈 Performance

- **Smart Caching**: Price data cached to prevent redundant API calls
- **Efficient Tree Building**: Optimized algorithms for large transaction sets
- **Lazy Loading**: Components load data on demand
- **Optimized Build**: Turbopack for faster development and builds

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

### Prisma Generation Issues

If you encounter permission errors during `yarn prisma generate`:

1. Stop any running Node.js processes
2. Run `yarn prisma generate` again
3. If issues persist, try `yarn db:reset` to reset the database

### Build Issues

- Ensure all dependencies are installed with `yarn install`
- Clear Next.js cache with `rm -rf .next`
- Regenerate Prisma client with `yarn db:generate`

### Database Issues

- Reset database with `yarn db:reset`
- Check `.env` file for correct DATABASE_URL
- Ensure SQLite is properly configured
