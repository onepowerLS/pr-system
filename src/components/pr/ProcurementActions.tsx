import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Alert,
  Stack,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { PRStatus } from '@/types/pr';
import { prService } from '@/services/pr';
import { notificationService } from '@/services/notification';
import { User } from '@/types/user';

interface ProcurementActionsProps {
  prId: string;
  currentStatus: PRStatus;
  requestorEmail: string;
  currentUser: User;
  onStatusChange: () => void;
}

export function ProcurementActions({ prId, currentStatus, requestorEmail, currentUser, onStatusChange }: ProcurementActionsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'queue' | 'reject' | 'revise' | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const handleActionClick = (action: 'queue' | 'reject' | 'revise') => {
    setSelectedAction(action);
    setIsDialogOpen(true);
    setNotes('');
    setError(null);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setSelectedAction(null);
    setNotes('');
    setError(null);
  };

  const handleSubmit = async () => {
    try {
      // Validate notes for reject and revise actions
      if ((selectedAction === 'reject' || selectedAction === 'revise') && !notes.trim()) {
        setError('Notes are required when rejecting or requesting revision');
        return;
      }

      let newStatus: PRStatus;
      switch (selectedAction) {
        case 'queue':
          newStatus = PRStatus.IN_QUEUE;
          break;
        case 'reject':
          newStatus = PRStatus.REJECTED;
          break;
        case 'revise':
          newStatus = PRStatus.REVISION_REQUIRED;
          break;
        default:
          return;
      }

      // Update PR status with notes
      await prService.updatePRStatus(prId, newStatus, notes, currentUser);

      // Send notification
      await notificationService.handleStatusChange(
        prId,
        currentStatus,
        newStatus,
        currentUser,
        notes
      );

      enqueueSnackbar('PR status updated successfully', { variant: 'success' });
      handleClose();
      onStatusChange(); // Trigger parent refresh

      // Navigate to dashboard after any successful status change
      navigate('/dashboard');
    } catch (error) {
      console.error('Error updating PR status:', error);
      enqueueSnackbar('Failed to update PR status', { variant: 'error' });
    }
  };

  // Only show actions if PR is in SUBMITTED or RESUBMITTED status
  if (currentStatus !== PRStatus.SUBMITTED && currentStatus !== PRStatus.RESUBMITTED) {
    return null;
  }

  return (
    <>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => handleActionClick('queue')}
        >
          Move to Queue
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={() => handleActionClick('reject')}
        >
          Reject
        </Button>
        <Button
          variant="contained"
          color="warning"
          onClick={() => handleActionClick('revise')}
        >
          Revise & Resubmit
        </Button>
      </Box>

      <Dialog 
        open={isDialogOpen} 
        onClose={handleClose} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          {selectedAction === 'queue' && 'Move to Queue'}
          {selectedAction === 'reject' && 'Reject PR'}
          {selectedAction === 'revise' && 'Request Revision'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              {selectedAction === 'queue' && 'Add optional notes about moving this PR to the procurement queue.'}
              {selectedAction === 'reject' && 'Please provide a reason for rejecting this PR.'}
              {selectedAction === 'revise' && 'Please specify what changes are needed for this PR.'}
            </Typography>
            <TextField
              autoFocus
              multiline
              rows={4}
              label="Notes"
              fullWidth
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              error={!!error}
              required={selectedAction === 'reject' || selectedAction === 'revise'}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
