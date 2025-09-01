-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
INSERT INTO "new_WalletTransaction" ("balance", "confirmed", "createdAt", "date", "fee", "id", "label", "txid", "type", "updatedAt", "value", "walletCSVId", "walletName") SELECT "balance", "confirmed", "createdAt", "date", "fee", "id", "label", "txid", "type", "updatedAt", "value", "walletCSVId", "walletName" FROM "WalletTransaction";
DROP TABLE "WalletTransaction";
ALTER TABLE "new_WalletTransaction" RENAME TO "WalletTransaction";
CREATE INDEX "WalletTransaction_walletCSVId_idx" ON "WalletTransaction"("walletCSVId");
CREATE INDEX "WalletTransaction_walletName_idx" ON "WalletTransaction"("walletName");
CREATE INDEX "WalletTransaction_txid_idx" ON "WalletTransaction"("txid");
CREATE INDEX "WalletTransaction_date_idx" ON "WalletTransaction"("date");
CREATE INDEX "WalletTransaction_type_idx" ON "WalletTransaction"("type");
CREATE UNIQUE INDEX "WalletTransaction_walletName_txid_key" ON "WalletTransaction"("walletName", "txid");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
