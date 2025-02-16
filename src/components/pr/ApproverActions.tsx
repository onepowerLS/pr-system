import React, { useState, useMemo } from 'react';
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
import { navigate } from '@/utils/navigation';

interface ApproverActionsProps {
  pr: PRRequest;
  currentUser: User;
  assignedApprover?: User;
  onStatusChange?: () => void;
}

export function ApproverActions({ pr, currentUser, assignedApprover, onStatusChange }: ApproverActionsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'approve' | 'reject' | 'revise' | 'queue' | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  // Check if user has permission to take actions
  const canTakeAction = useMemo(() => {
    const isProcurement = currentUser.permissionLevel === 2 || currentUser.permissionLevel === 3;
    const isApprover = currentUser.id === assignedApprover?.id || pr.approvers?.includes(currentUser.id);

    console.log('Permission check:', {
      userId: currentUser.id,
      assignedApproverId: assignedApprover?.id,
      approvers: pr.approvers,
      isProcurement,
      isApprover,
      status: pr.status,
      type: pr.type
    });

    // If PO is in PENDING_APPROVAL, only approvers can take action
    if (pr.status === PRStatus.PENDING_APPROVAL && pr.type === 'PO') {
      return isApprover;
    }

    return isProcurement || isApprover;
  }, [currentUser, assignedApprover, pr.approvers, pr.status, pr.type]);

  if (!canTakeAction) {
    return null;
  }

  const getAvailableActions = () => {
    const isProcurement = currentUser.permissionLevel === 2 || currentUser.permissionLevel === 3;
    const isApprover = currentUser.id === assignedApprover?.id || pr.approvers?.includes(currentUser.id);
    
    // If PO is in PENDING_APPROVAL
    if (pr.status === PRStatus.PENDING_APPROVAL && pr.type === 'PO') {
      // Only approvers can see actions, and they can't push to queue
      if (isApprover) {
        return ['approve', 'reject', 'revise'];
      }
      return [];
    }

    // For other statuses, show all actions if user has permission
    if (isProcurement || isApprover) {
      return ['approve', 'reject', 'revise', 'queue'];
    }

    return [];
  };

  const actions = getAvailableActions();

  const handleActionClick = (action: 'approve' | 'reject' | 'revise' | 'queue') => {
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

      // Get the PR data
      const prData = await prService.getPR(pr.id);
      if (!prData) {
        setError('PR not found');
        return;
      }

      let newStatus: PRStatus;
      switch (selectedAction) {
        case 'approve':
          // Get the rules for this organization
          const rules = await prService.getRuleForOrganization(prData.organization, prData.estimatedAmount);
          if (!rules || rules.length === 0) {
            setError('No approval rules found for this organization');
            return;
          }

          // Validate PR against rules
          const validation = await validatePRForApproval(
            prData,
            rules,
            currentUser,
            pr.status === PRStatus.PENDING_APPROVAL ? PRStatus.APPROVED : PRStatus.PENDING_APPROVAL
          );
          if (!validation.isValid) {
            setError(validation.errors.join('\n\n')); // Add double newline for better separation
            return;
          }

          // Change designation from PR to PO
          const poNumber = prData.prNumber.replace('PR', 'PO');
          newStatus = PRStatus.PENDING_APPROVAL;
          
          // Update PR with PO number and approver information
          await prService.updatePR(pr.id, {
            prNumber: poNumber,
            status: newStatus,
            lastModifiedBy: currentUser.email,
            lastModifiedAt: new Date().toISOString(),
            approvalWorkflow: {
              currentApprover: prData.approvers[0], // Start with first approver
              approvalChain: prData.approvers,
              approvalHistory: [],
              submittedForApprovalAt: new Date().toISOString()
            }
          });

          // Send notification to first approver
          await notificationService.handleStatusChange(
            pr.id,
            String(pr.status),
            String(newStatus),
            currentUser,
            `PR ${prData.prNumber} has been converted to PO ${poNumber} and is pending your approval.`
          );
          break;

        case 'reject':
          newStatus = PRStatus.REJECTED;
          break;

        case 'revise':
          newStatus = PRStatus.REVISION_REQUIRED;
          break;

        case 'queue':
          newStatus = PRStatus.IN_QUEUE;
          break;

        default:
          return;
      }

      // Update PR status
      await prService.updatePRStatus(pr.id, newStatus, notes, currentUser);

      enqueueSnackbar(`PR status successfully updated to ${newStatus}`, { variant: 'success' });
      handleClose();
      onStatusChange(); // Trigger parent refresh

      // Navigate to dashboard after any successful status change
      navigate('/dashboard');
    } catch (error) {
      console.error('Error updating PR status:', error);
      setError(error instanceof Error ? error.message : 'Failed to update PR status');
      enqueueSnackbar(error instanceof Error ? error.message : 'Failed to update PR status', { 
        variant: 'error',
        autoHideDuration: 5000
      });
    }
  };

  const getDialogTitle = () => {
    switch (selectedAction) {
      case 'revise':
        return 'Revise & Resubmit';
      case 'queue':
        return 'Return to Queue';
      case 'reject':
        return 'Reject PR';
      case 'approve':
        return 'Approve PR';
      default:
        return '';
    }
  };

  return (
    <Box>
      {/* Action buttons */}
      <Stack direction="row" spacing={2} mb={2}>
        {actions.includes('approve') && (
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleActionClick('approve')}
          >
            Approve
          </Button>
        )}
        {actions.includes('reject') && (
          <Button
            variant="contained"
            color="error"
            onClick={() => handleActionClick('reject')}
          >
            Reject
          </Button>
        )}
        {actions.includes('revise') && (
          <Button
            variant="contained"
            color="warning"
            onClick={() => handleActionClick('revise')}
          >
            Revise & Resubmit
          </Button>
        )}
        {actions.includes('queue') && (
          <Button
            variant="contained"
            color="info"
            onClick={() => handleActionClick('queue')}
          >
            Return to Queue
          </Button>
        )}
      </Stack>

      {/* Action dialog */}
      <Dialog open={isDialogOpen} onClose={handleClose}>
        <DialogTitle>{getDialogTitle()}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="Notes"
            fullWidth
            multiline
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            required={selectedAction === 'reject' || selectedAction === 'revise'}
            error={!notes.trim() && (selectedAction === 'reject' || selectedAction === 'revise')}
            helperText={
              !notes.trim() && (selectedAction === 'reject' || selectedAction === 'revise')
                ? 'Notes are required'
                : ''
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
