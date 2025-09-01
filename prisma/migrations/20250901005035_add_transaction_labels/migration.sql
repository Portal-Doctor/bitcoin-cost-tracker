/*
  Warnings:

  - A unique constraint covering the columns `[txid,fromAddress,toAddress]` on the table `UTXOFlow` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "TransactionLabel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "txid" TEXT NOT NULL,
    "walletName" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "TransactionLabel_txid_idx" ON "TransactionLabel"("txid");

-- CreateIndex
CREATE INDEX "TransactionLabel_walletName_idx" ON "TransactionLabel"("walletName");

-- CreateIndex
CREATE INDEX "TransactionLabel_label_idx" ON "TransactionLabel"("label");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionLabel_txid_walletName_key" ON "TransactionLabel"("txid", "walletName");

-- CreateIndex
CREATE UNIQUE INDEX "UTXOFlow_txid_fromAddress_toAddress_key" ON "UTXOFlow"("txid", "fromAddress", "toAddress");
