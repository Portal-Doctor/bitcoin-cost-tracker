import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const treeId = searchParams.get('treeId');
    const nodeId = searchParams.get('nodeId');

    if (!treeId) {
      return NextResponse.json({ error: 'treeId is required' }, { status: 400 });
    }

    if (nodeId) {
      const comment = await prisma.treeComment.findUnique({
        where: { treeId_nodeId: { treeId, nodeId } }
      });
      return NextResponse.json({ comment: comment?.content || null });
    } else {
      const comments = await prisma.treeComment.findMany({
        where: { treeId },
        orderBy: { createdAt: 'desc' }
      });
      
      // Convert to a map of nodeId -> content
      const commentMap: Record<string, string> = {};
      comments.forEach((comment: { nodeId: string; content: string }) => {
        commentMap[comment.nodeId] = comment.content;
      });
      
      return NextResponse.json({ comments: commentMap });
    }
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { treeId, nodeId, content } = await request.json();
    
    if (!treeId || !nodeId || !content) {
      return NextResponse.json(
        { error: 'treeId, nodeId, and content are required' },
        { status: 400 }
      );
    }

    await prisma.treeComment.upsert({
      where: { treeId_nodeId: { treeId, nodeId } },
      update: { content, updatedAt: new Date() },
      create: { treeId, nodeId, content }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving comment:', error);
    return NextResponse.json(
      { error: 'Failed to save comment' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const treeId = searchParams.get('treeId');
    const nodeId = searchParams.get('nodeId');

    if (!treeId || !nodeId) {
      return NextResponse.json(
        { error: 'treeId and nodeId are required' },
        { status: 400 }
      );
    }

    await prisma.treeComment.delete({
      where: { treeId_nodeId: { treeId, nodeId } }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}
