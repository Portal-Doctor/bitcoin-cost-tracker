export interface TreeComment {
  id: string;
  treeId: string;
  nodeId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export class CommentService {
  /**
   * Get all comments for a specific tree
   */
  static async getCommentsForTree(treeId: string): Promise<Record<string, string>> {
    // This will be implemented in API routes
    return {};
  }

  /**
   * Get comment for a specific transaction node
   */
  static async getComment(treeId: string, nodeId: string): Promise<string | null> {
    // This will be implemented in API routes
    return null;
  }

  /**
   * Add or update a comment for a transaction node
   */
  static async saveComment(treeId: string, nodeId: string, content: string): Promise<void> {
    // This will be implemented in API routes
  }

  /**
   * Delete a comment for a transaction node
   */
  static async deleteComment(treeId: string, nodeId: string): Promise<void> {
    // This will be implemented in API routes
  }

  /**
   * Get all comments with their metadata
   */
  static async getAllCommentsForTree(treeId: string): Promise<TreeComment[]> {
    // This will be implemented in API routes
    return [];
  }
}
