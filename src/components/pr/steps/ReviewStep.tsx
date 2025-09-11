/**
 * @fileoverview Review Step Component
 * @version 1.0.0
 * 
 * Description:
 * Final step in the PR creation process. Shows a summary of the PR
 * and allows for quote management and final approver selection.
 */
import React, { useState } from 'react';
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
  CircularProgress,
} from '@mui/material';
import { FormState } from '../NewPRForm';
import { ReferenceDataItem } from '../../../types/referenceData';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import axios, { AxiosResponse } from 'axios';
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../config/firebase";

// Define the Approver interface since it's not exported from NewPRForm
interface Approver {
  id: string;
  name: string;
  department?: string;
  email?: string;
}

interface ReviewStepProps {
  formState: FormState & { prNumber?: string };
  setFormState?: React.Dispatch<React.SetStateAction<FormState>>;
  vendors: ReferenceDataItem[];
  projectCategories: ReferenceDataItem[];
  sites: ReferenceDataItem[];
  approvers: Approver[];
  loading?: boolean;
  onSubmit?: () => Promise<void> | void;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  formState,
  setFormState,
  vendors,
  projectCategories,
  sites,
  approvers,
  loading: isSubmitting = false,
  onSubmit
}) => {
  // Get approver names for display
  const getApproverNames = () => {
    if (!formState.approvers || formState.approvers.length === 0) return "Not specified";
    
    // Map through the approver IDs and find the corresponding approver objects
    const approverNames = formState.approvers.map(approverId => {
      const approverObj = approvers.find(a => a.id === approverId);
      return approverObj ? `${approverObj.name}${approverObj.department ? ` (${approverObj.department})` : ''}` : approverId;
    });
    
    return approverNames.join(', ');
  };

  // Get vendor name for display
  const getVendorName = () => {
    if (!formState.preferredVendor) {
      return formState.customVendorName || "Not specified";
    }
    
    const vendorObj = vendors.find(v => v.id === formState.preferredVendor);
    return vendorObj ? vendorObj.name : "Not specified";
  };

  // Get project category name for display
  const getProjectCategoryName = () => {
    if (!formState.projectCategory) return 'Not specified';
    
    const categoryObj = projectCategories.find(pc => pc.id === formState.projectCategory);
    return categoryObj ? categoryObj.name : formState.projectCategory;
  };

  // Get site name for display
  const getSiteName = () => {
    if (!formState.site) return 'Not specified';
    
    const siteObj = sites.find(s => s.id === formState.site);
    return siteObj ? siteObj.name : formState.site;
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
  const formatDisplayValue = (value: any): string => {
    if (!value) return 'Not specified';
    
    if (typeof value === 'object' && value !== null && 'name' in value) {
      return value.name || 'Not specified';
    }
    
    if (typeof value !== 'string') return String(value);
    
    // Convert snake_case or lowercase to Title Case
    return value
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getDisplayName = (item: any): string => {
    if (!item) return 'Not specified';
    
    if (typeof item === 'object' && item !== null && 'name' in item) {
      return item.name;
    }
    
    if (typeof item === 'string') return item;
    
    return 'Not specified';
  };

  const handleViewFile = (file: any) => {
    if (file && file.url) {
      window.open(file.url, '_blank');
    }
  };

  // Get user name from the form state
  const getUserName = () => {
    return formState.requestor || 'Current User';
  };

  const [isEmailSending, setIsEmailSending] = useState<boolean>(false);

  //User interface for Firestore data
  interface User {
    id: string;
    email: string;
    permissionLevel?: number;
    [key: string]: any; // For other potential fields
  }

  // Function to fetch users with permissionLevel 3(Procurement)
  const fetchUsersWithPermissionLevel3 = async (): Promise<User[]> => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('permissionLevel', '==', 3));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        email: doc.data().email || '',
        permissionLevel: doc.data().permissionLevel,
        ...doc.data()
      } as User));
    } catch (error) {
      console.error('Error fetching users with permission level 3:', error);
      return [];
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (isSubmitting || isEmailSending) return; // prevent double submissions

    try {
      setIsEmailSending(true);

      // First, call the parent's onSubmit if it exists
      if (onSubmit) {
        await onSubmit();
      }
      
      // Get the site names      
      const siteName = sites.find(site => site.id === formState.site)?.name || 'Not specified';
      
      // Fetch users with permission level 3
      const usersWithPermission3 = await fetchUsersWithPermissionLevel3();
      const procEmail = usersWithPermission3
        .map(user => user.email)
        .filter(Boolean) // Remove any undefined/null emails
        .join(',');

      // Then send the email notification
      const res: AxiosResponse<{ success: boolean }> = await axios.post(
        "/api/send-email",
        {
          to: procEmail, // all users with permission level 3          
          subject: `New Purchase Request for Approval - ${formState.description || 'No Description'}`,
          prNumber: formState.prNumber || 'DRAFT', //to work on the pr number so that it does not return draft
          requestor: getUserName(),
          amount: formState.estimatedAmount || 0,
          currency: formState.currency || 'LSL',
          description: formState.description || 'No description provided',
          department: formState.department || 'not found',
          site: siteName,
          isUrgent: formState.isUrgent || false
        }
      );

      if (res.data.success) {
        // Show success message 
        console.log("Email notification sent successfully!");
      } else {
        console.warn("Failed to send email notification.");
      }
    } catch (error) {
      console.error("Error during submission:", error);     
    } finally {
      setIsEmailSending(false);
    }
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
              <strong>Name:</strong> {getUserName()}
            </Typography>
            <Typography variant="body1">
              <strong>Email:</strong> {formState.email || 'Not specified'}
            </Typography>
            <Typography variant="body1">
              <strong>Department:</strong> {formatDisplayValue(formState.department)}
            </Typography>
            <Typography variant="body1">
              <strong>Project Category:</strong> {getProjectCategoryName()}
            </Typography>
            <Typography variant="body1">
              <strong>Site:</strong> {getSiteName()}
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
              <strong>Estimated Amount:</strong> {formState.estimatedAmount} {formatDisplayValue(formState.currency)}
            </Typography>
            <Typography variant="body1">
              <strong>Expense Type:</strong> {formatDisplayValue(formState.expenseType)}
            </Typography>
            {formState.expenseType === '4' && (
              <Typography variant="body1">
                <strong>Vehicle:</strong> {getDisplayName(formState.vehicle)}
              </Typography>
            )}
            <Typography variant="body1">
              <strong>Preferred Vendor:</strong> {getVendorName()}
            </Typography>
            <Typography variant="body1">
              <strong>Currency:</strong> {formatDisplayValue(formState.currency)}
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
                      {item.attachments && item.attachments.length > 0 ? (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {item.attachments.map((file, fileIndex) => (
                            <Tooltip key={fileIndex} title={file.name}>
                              <IconButton size="small" onClick={() => handleViewFile(file)}>
                                <AttachFileIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          ))}
                        </Box>
                      ) : (
                        'None'
                      )}
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
            onClick={handleSubmit}
            disabled={isSubmitting || isEmailSending}
            size="large"
          >
            {isSubmitting || isEmailSending ? (
              <>
                <CircularProgress size={24} sx={{ mr: 1 }} />
                Submitting...
              </>
            ) : (
              'Submit Purchase Request'
            )}
          </Button>
        </Box>
      </Grid>
    </Grid>
  );
};