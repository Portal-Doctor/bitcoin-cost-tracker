-- CreateTable
CREATE TABLE "NetworkTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "txid" TEXT NOT NULL,
    "blockHeight" INTEGER,
    "blockTime" DATETIME,
    "fee" INTEGER,
    "size" INTEGER,
    "weight" INTEGER,
    "version" INTEGER,
    "locktime" INTEGER,
    "rawData" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UTXOFlow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "txid" TEXT NOT NULL,
    "treeId" TEXT,
    "fromWallet" TEXT,
    "toWallet" TEXT,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "fee" REAL,
    "blockHeight" INTEGER,
    "blockTime" DATETIME,
    "flowType" TEXT NOT NULL,
    "isChange" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UTXOFlow_txid_fkey" FOREIGN KEY ("txid") REFERENCES "NetworkTransaction" ("txid") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UTXOFlow_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "TransactionTree" ("treeId") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WalletAddress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletCSVId" TEXT NOT NULL,
    "walletName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "addressType" TEXT NOT NULL,
    "derivationPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WalletAddress_walletCSVId_fkey" FOREIGN KEY ("walletCSVId") REFERENCES "WalletCSV" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransactionRelationship" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentTxid" TEXT NOT NULL,
    "childTxid" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "address" TEXT,
    "walletName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "NetworkTransaction_txid_key" ON "NetworkTransaction"("txid");

-- CreateIndex
CREATE INDEX "NetworkTransaction_txid_idx" ON "NetworkTransaction"("txid");

-- CreateIndex
CREATE INDEX "NetworkTransaction_blockHeight_idx" ON "NetworkTransaction"("blockHeight");

-- CreateIndex
CREATE INDEX "NetworkTransaction_blockTime_idx" ON "NetworkTransaction"("blockTime");

-- CreateIndex
CREATE INDEX "NetworkTransaction_source_idx" ON "NetworkTransaction"("source");

-- CreateIndex
CREATE INDEX "UTXOFlow_txid_idx" ON "UTXOFlow"("txid");

-- CreateIndex
CREATE INDEX "UTXOFlow_treeId_idx" ON "UTXOFlow"("treeId");

-- CreateIndex
CREATE INDEX "UTXOFlow_fromWallet_idx" ON "UTXOFlow"("fromWallet");

-- CreateIndex
CREATE INDEX "UTXOFlow_toWallet_idx" ON "UTXOFlow"("toWallet");

-- CreateIndex
CREATE INDEX "UTXOFlow_fromAddress_idx" ON "UTXOFlow"("fromAddress");

-- CreateIndex
CREATE INDEX "UTXOFlow_toAddress_idx" ON "UTXOFlow"("toAddress");

-- CreateIndex
CREATE INDEX "UTXOFlow_flowType_idx" ON "UTXOFlow"("flowType");

-- CreateIndex
CREATE INDEX "UTXOFlow_blockHeight_idx" ON "UTXOFlow"("blockHeight");

-- CreateIndex
CREATE INDEX "UTXOFlow_blockTime_idx" ON "UTXOFlow"("blockTime");

-- CreateIndex
CREATE INDEX "WalletAddress_walletCSVId_idx" ON "WalletAddress"("walletCSVId");

-- CreateIndex
CREATE INDEX "WalletAddress_walletName_idx" ON "WalletAddress"("walletName");

-- CreateIndex
CREATE INDEX "WalletAddress_address_idx" ON "WalletAddress"("address");

-- CreateIndex
CREATE INDEX "WalletAddress_addressType_idx" ON "WalletAddress"("addressType");

-- CreateIndex
CREATE UNIQUE INDEX "WalletAddress_walletName_address_key" ON "WalletAddress"("walletName", "address");

-- CreateIndex
CREATE INDEX "TransactionRelationship_parentTxid_idx" ON "TransactionRelationship"("parentTxid");

-- CreateIndex
CREATE INDEX "TransactionRelationship_childTxid_idx" ON "TransactionRelationship"("childTxid");

-- CreateIndex
CREATE INDEX "TransactionRelationship_relationshipType_idx" ON "TransactionRelationship"("relationshipType");

-- CreateIndex
CREATE INDEX "TransactionRelationship_walletName_idx" ON "TransactionRelationship"("walletName");

-- CreateIndex
CREATE INDEX "TransactionRelationship_address_idx" ON "TransactionRelationship"("address");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionRelationship_parentTxid_childTxid_key" ON "TransactionRelationship"("parentTxid", "childTxid");
