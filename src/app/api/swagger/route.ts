import { NextResponse } from 'next/server';

export async function GET() {
  const swaggerDocument = {
    openapi: '3.0.0',
    info: {
      title: 'Bitcoin Cost Basis Tracker API',
      description: 'API for tracking Bitcoin transactions, calculating cost basis, and managing transaction comments',
      version: '1.0.0',
      contact: {
        name: 'Bitcoin Cost Basis Tracker',
        url: 'https://github.com/Portal-Doctor/bitcoin-cost-tracker'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://your-domain.com/api' 
          : 'http://localhost:3000/api',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      }
    ],
    paths: {
      '/transactions': {
        post: {
          summary: 'Process wallet transactions',
          description: 'Analyze transactions for a given wallet address and calculate cost basis',
          tags: ['Transactions'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['walletAddress'],
                  properties: {
                    walletAddress: {
                      type: 'string',
                      description: 'Bitcoin wallet address or xpub to analyze',
                      example: 'demo'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Transactions processed successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      transactions: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            txid: { type: 'string' },
                            type: { type: 'string', enum: ['purchase', 'sell', 'move'] },
                            amount: { type: 'number' },
                            fee: { type: 'number' },
                            date: { type: 'string', format: 'date-time' },
                            blockHeight: { type: 'number' },
                            confirmations: { type: 'number' },
                            price: {
                              type: 'object',
                              properties: {
                                date: { type: 'string' },
                                price: { type: 'number' },
                                currency: { type: 'string' }
                              }
                            },
                            costBasis: { type: 'number', nullable: true },
                            profitLoss: { type: 'number', nullable: true },
                            addresses: { type: 'array', items: { type: 'string' } }
                          }
                        }
                      },
                      count: { type: 'number' }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Bad request - wallet address is required'
            },
            '500': {
              description: 'Internal server error'
            }
          }
        }
      },
      '/comments': {
        get: {
          summary: 'Get comments for a transaction',
          description: 'Retrieve all comments for a specific transaction ID',
          tags: ['Comments'],
          parameters: [
            {
              name: 'txid',
              in: 'query',
              required: true,
              description: 'Transaction ID to get comments for',
              schema: { type: 'string' }
            }
          ],
          responses: {
            '200': {
              description: 'Comments retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      comments: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            txid: { type: 'string' },
                            content: { type: 'string' },
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Bad request - transaction ID is required'
            },
            '500': {
              description: 'Internal server error'
            }
          }
        },
        post: {
          summary: 'Create a new comment',
          description: 'Add a comment to a specific transaction',
          tags: ['Comments'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['txid', 'content'],
                  properties: {
                    txid: {
                      type: 'string',
                      description: 'Transaction ID to comment on'
                    },
                    content: {
                      type: 'string',
                      description: 'Comment content',
                      minLength: 1
                    }
                  }
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Comment created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      comment: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          txid: { type: 'string' },
                          content: { type: 'string' },
                          createdAt: { type: 'string', format: 'date-time' },
                          updatedAt: { type: 'string', format: 'date-time' }
                        }
                      }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Bad request - transaction ID and content are required'
            },
            '500': {
              description: 'Internal server error'
            }
          }
        }
      },
      '/comments/{id}': {
        delete: {
          summary: 'Delete a comment',
          description: 'Delete a specific comment by ID',
          tags: ['Comments'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Comment ID to delete',
              schema: { type: 'string' }
            }
          ],
          responses: {
            '200': {
              description: 'Comment deleted successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Bad request - comment ID is required'
            },
            '500': {
              description: 'Internal server error'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Transactions',
        description: 'Bitcoin transaction analysis and cost basis calculation'
      },
      {
        name: 'Comments',
        description: 'Transaction comment management'
      }
    ]
  };

  return NextResponse.json(swaggerDocument);
}
