import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Retrieve labels for a specific transaction or wallet
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const txid = searchParams.get('txid');
    const walletName = searchParams.get('walletName');

    if (txid && walletName) {
      // Get specific label for transaction in wallet
      const label = await prisma.transactionLabel.findUnique({
        where: {
          txid_walletName: {
            txid,
            walletName
          }
        }
      });
      return NextResponse.json({ label });
    } else if (txid) {
      // Get all labels for a transaction across all wallets
      const labels = await prisma.transactionLabel.findMany({
        where: { txid }
      });
      return NextResponse.json({ labels });
    } else if (walletName) {
      // Get all labels for a wallet
      const labels = await prisma.transactionLabel.findMany({
        where: { walletName }
      });
      return NextResponse.json({ labels });
    } else {
      // Get all labels
      const labels = await prisma.transactionLabel.findMany();
      return NextResponse.json({ labels });
    }
  } catch (error) {
    console.error('Error fetching transaction labels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction labels' },
      { status: 500 }
    );
  }
}

// POST - Create a new label
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { txid, walletName, label, color } = body;

    if (!txid || !walletName || !label) {
      return NextResponse.json(
        { error: 'txid, walletName, and label are required' },
        { status: 400 }
      );
    }

    const newLabel = await prisma.transactionLabel.create({
      data: {
        txid,
        walletName,
        label,
        color: color || null
      }
    });

    return NextResponse.json({ label: newLabel }, { status: 201 });
  } catch (error) {
    console.error('Error creating transaction label:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Label already exists for this transaction in this wallet' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create transaction label' },
      { status: 500 }
    );
  }
}

// PUT - Update an existing label
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { txid, walletName, label, color } = body;

    if (!txid || !walletName || !label) {
      return NextResponse.json(
        { error: 'txid, walletName, and label are required' },
        { status: 400 }
      );
    }

    const updatedLabel = await prisma.transactionLabel.update({
      where: {
        txid_walletName: {
          txid,
          walletName
        }
      },
      data: {
        label,
        color: color || null
      }
    });

    return NextResponse.json({ label: updatedLabel });
  } catch (error) {
    console.error('Error updating transaction label:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Label not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update transaction label' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a label
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const txid = searchParams.get('txid');
    const walletName = searchParams.get('walletName');

    if (!txid || !walletName) {
      return NextResponse.json(
        { error: 'txid and walletName are required' },
        { status: 400 }
      );
    }

    await prisma.transactionLabel.delete({
      where: {
        txid_walletName: {
          txid,
          walletName
        }
      }
    });

    return NextResponse.json({ message: 'Label deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction label:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Label not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete transaction label' },
      { status: 500 }
    );
  }
}
