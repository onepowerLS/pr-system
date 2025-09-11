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
import { PRStatus, PRRequest, ApprovalWorkflow } from '@/types/pr';
import { prService } from '@/services/pr';
import { User } from '@/types/user';
import { validatePRForApproval } from '@/utils/prValidation';
import axios from 'axios';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';


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
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<PRStatus | null>(null);

  // Function to fetch users with permissionLevel 3 (Procurement)
  const fetchProcurementUsers = async (): Promise<{email: string}[]> => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('permissionLevel', '==', 3));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        email: doc.data().email || '',
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching procurement users:', error);
      return [];
    }
  };

  const [loading, setLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  // Check if user has permission to take actions
  const canTakeAction = useMemo(() => {
    const isProcurement = currentUser.permissionLevel === 2 || currentUser.permissionLevel === 3;
    const isApprover = currentUser.id === assignedApprover?.id || currentUser.id === pr.approver;

    console.log('Permission check:', {
      userId: currentUser.id,
      assignedApproverId: assignedApprover?.id,
      prApprover: pr.approver,
      isProcurement,
      isApprover,
      status: pr.status
    });

    // If in PENDING_APPROVAL, only approvers can take action
    if (pr.status === PRStatus.PENDING_APPROVAL) {
      return isApprover;
    }

    return isProcurement || isApprover;
  }, [currentUser, assignedApprover, pr.approver, pr.status]);

  if (!canTakeAction) {
    return null;
  }

  const getAvailableActions = () => {
    const isProcurement = currentUser.permissionLevel === 2 || currentUser.permissionLevel === 3;
    const isApprover = currentUser.id === assignedApprover?.id || currentUser.id === pr.approver;
    
    // If in PENDING_APPROVAL
    if (pr.status === PRStatus.PENDING_APPROVAL) {
      // Only approvers can see actions, and they can't push to queue
      if (isApprover) {
        return ['approve', 'reject', 'revise'];
      }
      return [];
    }

    // For PR in SUBMITTED status, show approve button for approvers
    if (pr.status === PRStatus.SUBMITTED && isApprover) {
      return ['approve', 'reject', 'revise'];
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

  const handleStatusUpdate = async (newStatus: PRStatus, notes?: string) => {
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        setLoading(true);
        await prService.updatePRStatus(pr.id, newStatus, notes, {
          id: currentUser.id,
          email: currentUser.email,
          name: currentUser.name || ''
        });
        enqueueSnackbar(`PR status successfully updated to ${newStatus}`, { variant: 'success' });
        onStatusChange?.(); // Trigger parent refresh
        return;
      } catch (error) {
        retryCount++;
        if (retryCount === maxRetries) {
          console.error('Failed to update PR status:', error);
          enqueueSnackbar('Failed to update PR status. Please check your network connection and try again.', { 
            variant: 'error',
            autoHideDuration: 5000
          });
        } else {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        }
      } finally {
        setLoading(false);
      }
    }
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

      let newStatus: PRStatus = PRStatus.SUBMITTED;
      switch (selectedAction) {
        // case 'approve':
        //   // Get the rules for this organization
        //   const rule = await prService.getRuleForOrganization(prData.organization, prData.estimatedAmount);
        //   if (!rule) {
        //     setError('No approval rules found for this organization');
        //     return;
        //   }

        //   // Validate PR against rules
        //   const validation = await validatePRForApproval(
        //     prData,
        //     [rule], // Convert single rule to array
        //     currentUser,
        //     pr.status === PRStatus.PENDING_APPROVAL ? PRStatus.APPROVED : PRStatus.PENDING_APPROVAL
        //   );
        //   if (!validation.isValid) {
        //     setError(validation.errors.join('\n\n')); // Add double newline for better separation
        //     return;
        //   }

        //   // Change designation from PR to PO
        //   const poNumber = prData.prNumber.replace('PR', 'PO');
        //   newStatus = PRStatus.PENDING_APPROVAL;
          
        //   // Update PR with PO number and approver information
        //   const approvalWorkflow: ApprovalWorkflow = {
        //     currentApprover: prData.approver || (prData.approvers && prData.approvers[0]) || null,
        //     approvalHistory: [],
        //     lastUpdated: new Date().toISOString()
        //   };
          
        //   // Create update object with only the fields that exist in PRRequest
        //   const updateData: Partial<PRRequest> = {
        //     prNumber: poNumber,
        //     status: newStatus,
        //     updatedAt: new Date().toISOString(),
        //     approvalWorkflow
        //   };
          
        //   // Only add modifiedBy if it exists in PRRequest
        //   if ('modifiedBy' in prData) {
        //     (updateData as any).modifiedBy = currentUser.email;
        //   }
          
        //   await prService.updatePR(pr.id, updateData);

        //   // Send notification to first approver
        //   await notificationService.handleStatusChange(
        //     pr.id,
        //     String(pr.status),
        //     String(newStatus),
        //     currentUser,
        //     `PR ${prData.prNumber} has been converted to PO ${poNumber} and is pending your approval.`
        //   );
        //   break;

        // case 'approve':
        //   const isProcurement = currentUser.permissionLevel === 2 || currentUser.permissionLevel === 3;
        //   const isApprover = currentUser.id === assignedApprover?.id || currentUser.id === pr.approver;
        //   if (isProcurement){
        //   newStatus = PRStatus.PENDING_APPROVAL;
        //   else if (isApprover){
        //     newStatus = PRStatus.APPROVED; 
        //    }
        //   }          
        //   break;

         case "approve":
          const isProcurement =
            currentUser.permissionLevel === 2 || currentUser.permissionLevel === 3;
          const isApprover =
            currentUser.id === assignedApprover?.id || currentUser.id === pr.approver;

          if (isProcurement) {
            newStatus = PRStatus.PENDING_APPROVAL;
          } else if (isApprover) {
            newStatus = PRStatus.APPROVED;
          }
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
      await handleStatusUpdate(newStatus, notes);

        // --- Send email if status is now PENDING_APPROVAL ---
        if (newStatus === PRStatus.PENDING_APPROVAL) {
          try {
            // Get the first approver - either from approvers array or single approver field
            const firstApprover = Array.isArray(pr.approvers) && pr.approvers.length > 0 
              ? pr.approvers[0] 
              : pr.approver || assignedApprover;

            if (!firstApprover) {
              console.error("No approver found for PR:", pr.id);
              enqueueSnackbar("No approver assigned to this PR", { variant: "warning" });
              return;
            }

            // Get the approver's email, handling both string and object formats
            const approverEmail = typeof firstApprover === 'string' 
              ? firstApprover 
              : firstApprover.email;

            if (!approverEmail) {
              console.error("No email found for approver:", firstApprover);
              enqueueSnackbar("Approver does not have an email address", { variant: "error" });
              return;
            }

            // Get procurement users' emails and requestor emails
            const procurementUsers = await fetchProcurementUsers();
            const procurementEmails = procurementUsers
              .map(user => user.email)
              .filter(Boolean);
            
            // Add requestor email to CC if it exists
            const ccRecipients = [
              ...procurementEmails,
              pr.requestor?.email
            ].filter(Boolean).join(',');

            await axios.post("/api/send-email", {
              to: approverEmail,
              cc: ccRecipients,
              templateType: "pendingApproval",
              pr: {
                ...pr,                
                requestor: {
                  id: pr.requestor?.id,
                  name: pr.requestor?.name || pr.requestor?.displayName || 'Unknown',
                  email: pr.requestor?.email
                },
                approver: {
                  id: typeof firstApprover === 'string' ? firstApprover : firstApprover.id,
                  name: typeof firstApprover === 'string' ? firstApprover : firstApprover.name || firstApprover.email,
                  email: approverEmail
                }
              },
              prNumber: pr.prNumber,
              user: firstApprover,
              notes,
                isUrgent: pr.isUrgent,
            });
            
            enqueueSnackbar(`Pending approval email sent to ${approverEmail}`, { variant: "success" });
          } catch (error) {
            console.error("Failed to send pending approval email:", error);
            enqueueSnackbar("Failed to send pending approval email", { variant: "error" });
          }
        }

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
          <Button onClick={handleSubmit} variant="contained" color="primary" disabled={loading}>
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
