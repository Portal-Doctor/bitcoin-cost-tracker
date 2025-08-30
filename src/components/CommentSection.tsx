'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  List, 
  ListItem, 
  IconButton, 
  Typography,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import { Send, Delete, Comment } from '@mui/icons-material';

interface Comment {
  id: string;
  txid: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface CommentSectionProps {
  txid: string;
}

export default function CommentSection({ txid }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/comments?txid=${txid}`);
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      const data = await response.json();
      setComments(data.comments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [txid]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          txid,
          content: newComment.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      setNewComment('');
      await fetchComments(); // Refresh comments
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }

      await fetchComments(); // Refresh comments
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box sx={{ mt: 2, width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Comment sx={{ mr: 1, fontSize: 20 }} />
        <Typography variant="subtitle2" color="text.secondary">
          Comments ({comments.length})
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmitComment} sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={submitting}
            variant="outlined"
          />
          <Button
            type="submit"
            variant="contained"
            size="small"
            disabled={!newComment.trim() || submitting}
            startIcon={submitting ? <CircularProgress size={16} /> : <Send />}
          >
            {submitting ? 'Adding...' : 'Add'}
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : comments.length > 0 && (
        <List sx={{ p: 0, bgcolor: 'grey.50', borderRadius: 1 }}>
          {comments.map((comment, index) => (
            <Box key={comment.id}>
              <ListItem sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      {comment.content}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(comment.createdAt)}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteComment(comment.id)}
                    sx={{ ml: 1 }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              </ListItem>
              {index < comments.length - 1 && <Divider />}
            </Box>
          ))}
        </List>
      )}
    </Box>
  );
}
