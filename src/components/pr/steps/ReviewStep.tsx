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
  IconButton,
  Tooltip,
  Link,
} from '@mui/material';
import { FormState } from '../NewPRForm';
import { ReferenceDataItem } from '../../../types/referenceData';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import AttachFileIcon from '@mui/icons-material/AttachFile';

interface ReviewStepProps {
  formState: FormState;
  setFormState: React.Dispatch<React.SetStateAction<FormState>>;
  vendors: ReferenceDataItem[];
  projectCategories: ReferenceDataItem[];
  sites: ReferenceDataItem[];
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
  vendors,
  projectCategories,
  sites,
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

  // Get vendor name for display
  const getVendorName = () => {
    if (!formState.preferredVendor) return null;
    const vendor = vendors.find(v => v.id === formState.preferredVendor);
    return vendor ? vendor.name : '';
  };

  // Get project category name for display
  const getProjectCategoryName = () => {
    if (!formState.projectCategory) return '';
    const category = projectCategories.find(c => c.id === formState.projectCategory);
    return category ? category.name : '';
  };

  // Get site name for display
  const getSiteName = () => {
    if (!formState.site) return '';
    const site = sites.find(s => s.id === formState.site);
    return site ? site.name : '';
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Helper functions to format display values
  const formatDisplayValue = (value: string): string => {
    if (!value) return 'Not specified';
    // Convert snake_case or lowercase to Title Case
    return value
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getDisplayName = (item: { id: string; name: string } | undefined): string => {
    if (!item) return 'Not specified';
    return item.name || formatDisplayValue(item.id);
  };

  const handleViewFile = (file: any) => {
    window.open(file.url, '_blank');
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
            <Typography variant="body1">
              <strong>Name:</strong> {formState.requestor}
            </Typography>
            <Typography variant="body1">
              <strong>Email:</strong> {formState.email}
            </Typography>
            <Typography variant="body1">
              <strong>Organization:</strong> {getDisplayName(formState.organization)}
            </Typography>
            <Typography variant="body1">
              <strong>Department:</strong> {formatDisplayValue(formState.department)}
            </Typography>
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
            <Typography variant="body1">
              <strong>Project Category:</strong> {formatDisplayValue(formState.projectCategory)}
            </Typography>
            <Typography variant="body1">
              <strong>Description:</strong> {formState.description}
            </Typography>
            <Typography variant="body1">
              <strong>Site:</strong> {formatDisplayValue(formState.site)}
            </Typography>
            <Typography variant="body1">
              <strong>Required Date:</strong> {formState.requiredDate}
            </Typography>
            <Typography variant="body1">
              <strong>Urgency Level:</strong> {formState.isUrgent ? 'Urgent' : 'Normal'}
            </Typography>
            {formState.isUrgent && (
              <Box sx={{ mt: 1 }}>
                <Chip 
                  label="URGENT" 
                  color="error" 
                  size="small" 
                  sx={{ fontWeight: 'bold' }}
                />
              </Box>
            )}
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
            <Typography variant="body1">
              <strong>Estimated Amount:</strong> {formState.estimatedAmount} {formState.currency}
            </Typography>
            <Typography variant="body1">
              <strong>Expense Type:</strong> {formatDisplayValue(formState.expenseType)}
            </Typography>
            {formState.expenseType === 'Vehicle' && (
              <Typography variant="body1">
                <strong>Vehicle:</strong> {getDisplayName(formState.vehicle)}
              </Typography>
            )}
            <Typography variant="body1">
              <strong>Preferred Vendor:</strong> {getVendorName() || 'Not specified'}
            </Typography>
            <Typography variant="body1">
              <strong>Currency:</strong> {formState.currency}
            </Typography>
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
            <Typography variant="body1">
              <strong>Approvers:</strong> {getApproverNames()}
            </Typography>
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
                  <TableCell>Quantity</TableCell>
                  <TableCell>Unit of Measure</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell>Attachments</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {formState.lineItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.uom}</TableCell>
                    <TableCell>{item.notes}</TableCell>
                    <TableCell>
                      {item.attachments?.map((file, fileIndex) => (
                        <Box key={fileIndex} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">{file.name}</Typography>
                          <IconButton size="small" onClick={() => handleViewFile(file)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ))}
                    </TableCell>
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
