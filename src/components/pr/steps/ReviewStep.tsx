/**
 * @fileoverview Review Step Component
 * @version 1.0.0
 * 
 * Description:
 * Final step in the PR creation process. Shows a summary of the PR
 * and allows for quote management and final approver selection.
 */

import React from 'react';
import {
  Grid,
  Typography,
  Paper,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import { FormState } from '../NewPRForm';
import { ReferenceDataItem } from '../../../types/referenceData';

interface ReviewStepProps {
  formState: FormState;
  setFormState: React.Dispatch<React.SetStateAction<FormState>>;
  vendors: ReferenceDataItem[];
  approvers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    department?: string;
    approvalLimit?: number;
  }>;
  loading: boolean;
  onSubmit: () => void;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  formState,
  approvers,
  loading,
  onSubmit
}) => {
  // Get approver names for display
  const getApproverNames = () => {
    return formState.approvers
      .map(id => {
        const approver = approvers.find(a => a.id === id);
        return approver ? `${approver.name} (${approver.department})` : '';
      })
      .filter(Boolean)
      .join(', ');
  };

  return (
    <Grid container spacing={3}>
      {/* PR Header */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            Review Purchase Request
          </Typography>
          <Typography color="textSecondary" gutterBottom>
            Please review all information before submitting
          </Typography>
        </Paper>
      </Grid>

      {/* Requestor Information */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3, height: '100%' }}>
          <Typography variant="h6" gutterBottom>
            Requestor Information
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography><strong>Name:</strong> {formState.requestor}</Typography>
            <Typography><strong>Email:</strong> {formState.email}</Typography>
            <Typography><strong>Department:</strong> {formState.department}</Typography>
            <Typography><strong>Organization:</strong> {formState.organization}</Typography>
          </Box>
        </Paper>
      </Grid>

      {/* Project Details */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3, height: '100%' }}>
          <Typography variant="h6" gutterBottom>
            Project Details
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography><strong>Project Category:</strong> {formState.projectCategory}</Typography>
            <Typography><strong>Site:</strong> {formState.site}</Typography>
            <Typography><strong>Description:</strong> {formState.description}</Typography>
          </Box>
        </Paper>
      </Grid>

      {/* Financial Details */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3, height: '100%' }}>
          <Typography variant="h6" gutterBottom>
            Financial Details
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography>
              <strong>Estimated Amount:</strong> {formState.estimatedAmount} {formState.currency}
            </Typography>
            <Typography><strong>Expense Type:</strong> {formState.expenseType}</Typography>
            {formState.vehicle && (
              <Typography><strong>Vehicle:</strong> {formState.vehicle}</Typography>
            )}
          </Box>
        </Paper>
      </Grid>

      {/* Approval Details */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3, height: '100%' }}>
          <Typography variant="h6" gutterBottom>
            Approval Details
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography><strong>Required Date:</strong> {formState.requiredDate}</Typography>
            <Typography><strong>Approvers:</strong> {getApproverNames()}</Typography>
          </Box>
        </Paper>
      </Grid>

      {/* Line Items */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Line Items
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell>Unit of Measure</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {formState.lineItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell>{item.uom}</TableCell>
                    <TableCell>{item.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Grid>

      {/* Submit Button */}
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={onSubmit}
            disabled={loading}
            size="large"
          >
            Submit Purchase Request
          </Button>
        </Box>
      </Grid>
    </Grid>
  );
};

export default ReviewStep;
