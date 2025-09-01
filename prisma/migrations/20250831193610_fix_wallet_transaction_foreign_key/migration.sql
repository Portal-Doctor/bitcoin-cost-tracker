-- First, add the new column with a temporary default value
ALTER TABLE "WalletTransaction" ADD COLUMN "walletCSVId" TEXT;

-- Update existing records to link them to their corresponding WalletCSV records
UPDATE "WalletTransaction" 
SET "walletCSVId" = (
    SELECT "id" 
    FROM "WalletCSV" 
    WHERE "WalletCSV"."walletName" = "WalletTransaction"."walletName"
    LIMIT 1
);

-- Make the column NOT NULL
CREATE TABLE "new_WalletTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletCSVId" TEXT NOT NULL,
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
    CONSTRAINT "WalletTransaction_walletCSVId_fkey" FOREIGN KEY ("walletCSVId") REFERENCES "WalletCSV" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WalletTransaction_txid_fkey" FOREIGN KEY ("txid") REFERENCES "TransactionNode" ("txid") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Copy data with the populated walletCSVId
INSERT INTO "new_WalletTransaction" ("id", "walletCSVId", "walletName", "txid", "date", "label", "value", "balance", "fee", "type", "confirmed", "createdAt", "updatedAt") 
SELECT "id", "walletCSVId", "walletName", "txid", "date", "label", "value", "balance", "fee", "type", "confirmed", "createdAt", "updatedAt" 
FROM "WalletTransaction";

-- Drop old table and rename new one
DROP TABLE "WalletTransaction";
ALTER TABLE "new_WalletTransaction" RENAME TO "WalletTransaction";

-- Create indexes
CREATE INDEX "WalletTransaction_walletCSVId_idx" ON "WalletTransaction"("walletCSVId");
CREATE INDEX "WalletTransaction_walletName_idx" ON "WalletTransaction"("walletName");
CREATE INDEX "WalletTransaction_txid_idx" ON "WalletTransaction"("txid");
CREATE INDEX "WalletTransaction_date_idx" ON "WalletTransaction"("date");
CREATE INDEX "WalletTransaction_type_idx" ON "WalletTransaction"("type");
CREATE UNIQUE INDEX "WalletTransaction_walletName_txid_key" ON "WalletTransaction"("walletName", "txid");
