-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "txid" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TransactionPrice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "txid" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "price" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "source" TEXT NOT NULL DEFAULT 'mempool.space',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TransactionTree" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "treeId" TEXT NOT NULL,
    "rootId" TEXT NOT NULL,
    "totalAmount" REAL NOT NULL,
    "totalValueUSD" REAL,
    "dateRange" TEXT NOT NULL,
    "nodeCount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TransactionNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "txid" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "parentId" TEXT,
    "date" DATETIME NOT NULL,
    "totalAmount" REAL NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT true,
    "price" REAL,
    "priceUSD" REAL,
    "inputs" TEXT NOT NULL,
    "outputs" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TransactionNode_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "TransactionTree" ("treeId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TreeComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "treeId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TreeComment_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "TransactionTree" ("treeId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WalletCSV" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletName" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "lastModified" DATETIME NOT NULL,
    "transactionCount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletName" TEXT NOT NULL,
    "txid" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "label" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "fee" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WalletTransaction_walletName_fkey" FOREIGN KEY ("walletName") REFERENCES "WalletCSV" ("walletName") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WalletTransaction_txid_fkey" FOREIGN KEY ("txid") REFERENCES "TransactionNode" ("txid") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "xpub" TEXT NOT NULL,
    "addresses" TEXT NOT NULL,
    "addressType" TEXT NOT NULL,
    "derivationPath" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Comment_txid_idx" ON "Comment"("txid");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionPrice_txid_key" ON "TransactionPrice"("txid");

-- CreateIndex
CREATE INDEX "TransactionPrice_date_idx" ON "TransactionPrice"("date");

-- CreateIndex
CREATE INDEX "TransactionPrice_txid_idx" ON "TransactionPrice"("txid");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionTree_treeId_key" ON "TransactionTree"("treeId");

-- CreateIndex
CREATE INDEX "TransactionTree_treeId_idx" ON "TransactionTree"("treeId");

-- CreateIndex
CREATE INDEX "TransactionTree_rootId_idx" ON "TransactionTree"("rootId");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionNode_txid_key" ON "TransactionNode"("txid");

-- CreateIndex
CREATE INDEX "TransactionNode_txid_idx" ON "TransactionNode"("txid");

-- CreateIndex
CREATE INDEX "TransactionNode_treeId_idx" ON "TransactionNode"("treeId");

-- CreateIndex
CREATE INDEX "TransactionNode_parentId_idx" ON "TransactionNode"("parentId");

-- CreateIndex
CREATE INDEX "TransactionNode_date_idx" ON "TransactionNode"("date");

-- CreateIndex
CREATE INDEX "TreeComment_treeId_idx" ON "TreeComment"("treeId");

-- CreateIndex
CREATE INDEX "TreeComment_nodeId_idx" ON "TreeComment"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "TreeComment_treeId_nodeId_key" ON "TreeComment"("treeId", "nodeId");

-- CreateIndex
CREATE INDEX "WalletCSV_walletName_idx" ON "WalletCSV"("walletName");

-- CreateIndex
CREATE INDEX "WalletCSV_fileName_idx" ON "WalletCSV"("fileName");

-- CreateIndex
CREATE UNIQUE INDEX "WalletCSV_walletName_key" ON "WalletCSV"("walletName");

-- CreateIndex
CREATE INDEX "WalletTransaction_walletName_idx" ON "WalletTransaction"("walletName");

-- CreateIndex
CREATE INDEX "WalletTransaction_txid_idx" ON "WalletTransaction"("txid");

-- CreateIndex
CREATE INDEX "WalletTransaction_date_idx" ON "WalletTransaction"("date");

-- CreateIndex
CREATE INDEX "WalletTransaction_type_idx" ON "WalletTransaction"("type");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTransaction_walletName_txid_key" ON "WalletTransaction"("walletName", "txid");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_xpub_key" ON "Wallet"("xpub");

-- CreateIndex
CREATE INDEX "Wallet_name_idx" ON "Wallet"("name");

-- CreateIndex
CREATE INDEX "Wallet_addressType_idx" ON "Wallet"("addressType");
