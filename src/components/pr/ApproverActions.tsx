import React, { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';
import { PRRequest, PRStatus } from '@/types/pr';
import { User } from '@/types/user';
import { prService } from '@/services/pr';

interface ApproverActionsProps {
  pr: PRRequest;
  currentUser: User;
  assignedApprover?: User;
  onStatusChange?: () => void;
}

export function ApproverActions({ pr, currentUser, assignedApprover, onStatusChange }: ApproverActionsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<PRStatus | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // Check if user has permission to take actions
  const canTakeAction = currentUser.permissionLevel === 1 || 
    (assignedApprover && currentUser.email === assignedApprover.email) ||
    currentUser.permissionLevel === 6; // Allow Junior Approvers

  // Only show for PENDING_APPROVAL status
  if (!canTakeAction || pr.status !== PRStatus.PENDING_APPROVAL) {
    console.log('ApproverActions: Not showing actions because:', {
      canTakeAction,
      prStatus: pr.status,
      currentUserLevel: currentUser.permissionLevel,
      isAssignedApprover: assignedApprover?.email === currentUser.email
    });
    return null;
  }

  const handleActionClick = (action: PRStatus) => {
    setSelectedAction(action);
    setDialogOpen(true);
    setNotes('');
    setError('');
  };

  const handleClose = () => {
    setDialogOpen(false);
    setSelectedAction(null);
    setNotes('');
    setError('');
  };

  const handleSubmit = async () => {
    if (selectedAction === PRStatus.APPROVED && !notes) {
      // Notes are optional for Approve action
      try {
        await prService.updatePRStatus(pr.id, selectedAction, notes, currentUser);
        handleClose();
        if (onStatusChange) onStatusChange();
      } catch (err) {
        setError('Failed to update status. Please try again.');
      }
      return;
    }

    if (!notes.trim()) {
      setError('Please enter notes explaining your decision');
      return;
    }

    try {
      await prService.updatePRStatus(pr.id, selectedAction!, notes, currentUser);
      handleClose();
      if (onStatusChange) onStatusChange();
    } catch (err) {
      setError('Failed to update status. Please try again.');
    }
  };

  const getDialogTitle = () => {
    switch (selectedAction) {
      case PRStatus.REVISION_REQUIRED:
        return 'Revise & Resubmit';
      case PRStatus.IN_QUEUE:
        return 'Return to Queue';
      case PRStatus.REJECTED:
        return 'Reject PR';
      case PRStatus.APPROVED:
        return 'Approve PR';
      default:
        return '';
    }
  };

  return (
    <>
      <div className="flex gap-2 mt-4">
        <Button
          variant="outlined"
          color="primary"
          onClick={() => handleActionClick(PRStatus.REVISION_REQUIRED)}
        >
          Revise & Resubmit
        </Button>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => handleActionClick(PRStatus.IN_QUEUE)}
        >
          Return to Queue
        </Button>
        <Button
          variant="outlined"
          color="error"
          onClick={() => handleActionClick(PRStatus.REJECTED)}
        >
          Reject
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={() => handleActionClick(PRStatus.APPROVED)}
        >
          Approve
        </Button>
      </div>

      <Dialog open={dialogOpen} onClose={handleClose}>
        <DialogTitle>{getDialogTitle()}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedAction === PRStatus.APPROVED
              ? 'Add optional notes for this approval:'
              : 'Please provide notes explaining your decision:'}
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Notes"
            fullWidth
            multiline
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            error={!!error}
            helperText={error}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} color="primary">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
