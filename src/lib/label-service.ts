export interface TransactionLabel {
  id: string;
  txid: string;
  walletName: string;
  label: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class LabelService {
  // Get label for a specific transaction in a wallet
  static async getLabel(txid: string, walletName: string): Promise<TransactionLabel | null> {
    try {
      const response = await fetch(`/api/transaction-labels?txid=${txid}&walletName=${walletName}`);
      if (response.ok) {
        const data = await response.json();
        return data.label;
      }
      return null;
    } catch (error) {
      console.error('Error fetching label:', error);
      return null;
    }
  }

  // Get all labels for a wallet
  static async getWalletLabels(walletName: string): Promise<TransactionLabel[]> {
    try {
      const response = await fetch(`/api/transaction-labels?walletName=${walletName}`);
      if (response.ok) {
        const data = await response.json();
        return data.labels || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching wallet labels:', error);
      return [];
    }
  }

  // Create a new label
  static async createLabel(txid: string, walletName: string, label: string, color?: string): Promise<TransactionLabel | null> {
    try {
      const response = await fetch('/api/transaction-labels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          txid,
          walletName,
          label,
          color
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.label;
      }
      return null;
    } catch (error) {
      console.error('Error creating label:', error);
      return null;
    }
  }

  // Update an existing label
  static async updateLabel(txid: string, walletName: string, label: string, color?: string): Promise<TransactionLabel | null> {
    try {
      const response = await fetch('/api/transaction-labels', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          txid,
          walletName,
          label,
          color
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.label;
      }
      return null;
    } catch (error) {
      console.error('Error updating label:', error);
      return null;
    }
  }

  // Delete a label
  static async deleteLabel(txid: string, walletName: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/transaction-labels?txid=${txid}&walletName=${walletName}`, {
        method: 'DELETE',
      });

      return response.ok;
    } catch (error) {
      console.error('Error deleting label:', error);
      return false;
    }
  }

  // Create or update a label (upsert functionality)
  static async upsertLabel(txid: string, walletName: string, label: string, color?: string): Promise<TransactionLabel | null> {
    try {
      // First try to update
      const updatedLabel = await this.updateLabel(txid, walletName, label, color);
      if (updatedLabel) {
        return updatedLabel;
      }

      // If update fails, try to create
      return await this.createLabel(txid, walletName, label, color);
    } catch (error) {
      console.error('Error upserting label:', error);
      return null;
    }
  }
}
