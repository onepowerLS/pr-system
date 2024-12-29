import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  Divider,
  Chip,
} from '@mui/material';
import { Edit as EditIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { RootState } from '../../store';
import { prService } from '../../services/pr';
import { PRRequest, PRItem, WorkflowStep } from '../../types/pr';
import { formatCurrency } from '../../utils/formatters';

interface PRViewProps {}

export function PRView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pr, setPr] = useState<PRRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentUser = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    const fetchPR = async () => {
      if (!id) return;
      try {
        console.log('Fetching PR with ID:', id);
        const prData = await prService.getPR(id);
        if (!prData) {
          console.error('PR not found');
          setError('PR not found');
          return;
        }
        console.log('PR data received:', prData);
        setPr(prData);
      } catch (err) {
        console.error('Error fetching PR:', err);
        setError('Failed to load PR');
      } finally {
        setLoading(false);
      }
    };

    fetchPR();
  }, [id]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !pr) {
    return (
      <Paper sx={{ p: 3, m: 2 }}>
        <Typography color="error" variant="h6" gutterBottom>
          {error || 'PR not found'}
        </Typography>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/dashboard')}
          variant="outlined"
          sx={{ mt: 2 }}
        >
          Back to Dashboard
        </Button>
      </Paper>
    );
  }

  const canEdit = currentUser?.role === 'ADMIN' || currentUser?.id === pr.requestorId;
  const statusColor = 
    pr.workflow?.currentStep === WorkflowStep.COMPLETED ? 'success' :
    pr.workflow?.currentStep === WorkflowStep.REJECTED ? 'error' :
    pr.workflow?.currentStep === WorkflowStep.DRAFT ? 'default' :
    'primary';

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          PR #{pr.prNumber}
        </Typography>
        <Box>
          {canEdit && (
            <Button
              startIcon={<EditIcon />}
              variant="contained"
              color="primary"
              onClick={() => navigate(`/pr/${id}/edit`)}
              sx={{ mr: 2 }}
            >
              Edit
            </Button>
          )}
          <Button
            startIcon={<ArrowBackIcon />}
            variant="outlined"
            onClick={() => navigate('/dashboard')}
          >
            Back
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography color="textSecondary">Status</Typography>
                <Chip
                  label={pr.workflow?.currentStep || 'UNKNOWN'}
                  color={statusColor}
                  sx={{ mt: 1 }}
                />
              </Grid>
              <Grid item xs={6}>
                <Typography color="textSecondary">Total Amount</Typography>
                <Typography variant="h6">
                  {formatCurrency(pr.totalAmount, pr.currency)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography color="textSecondary">Requestor</Typography>
                <Typography>{pr.requestor.name}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography color="textSecondary">Department</Typography>
                <Typography>{pr.department}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography color="textSecondary">Description</Typography>
                <Typography>{pr.description}</Typography>
              </Grid>
              {pr.procComments && (
                <Grid item xs={12}>
                  <Typography color="textSecondary">Procurement Comments</Typography>
                  <Typography>{pr.procComments}</Typography>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Additional Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography color="textSecondary">Project Category</Typography>
                <Typography>{pr.projectCategory}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography color="textSecondary">Site</Typography>
                <Typography>{pr.site}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography color="textSecondary">Organization</Typography>
                <Typography>{pr.organization}</Typography>
              </Grid>
              {pr.expectedLandingDate && (
                <Grid item xs={6}>
                  <Typography color="textSecondary">Expected Landing Date</Typography>
                  <Typography>
                    {new Date(pr.expectedLandingDate).toLocaleDateString()}
                  </Typography>
                </Grid>
              )}
              {pr.metrics && (
                <>
                  <Grid item xs={6}>
                    <Typography color="textSecondary">Days Open</Typography>
                    <Typography>{pr.metrics.daysOpen}</Typography>
                  </Grid>
                  {pr.metrics.queuePosition && (
                    <Grid item xs={6}>
                      <Typography color="textSecondary">Queue Position</Typography>
                      <Typography>{pr.metrics.queuePosition}</Typography>
                    </Grid>
                  )}
                </>
              )}
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Items
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Description</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Unit Price</TableCell>
                  <TableCell>Total Price</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Vendor</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pr.items.map((item: PRItem, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatCurrency(item.unitPrice, item.currency)}</TableCell>
                    <TableCell>{formatCurrency(item.totalPrice, item.currency)}</TableCell>
                    <TableCell>{item.category || 'N/A'}</TableCell>
                    <TableCell>{item.vendor || 'N/A'}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} align="right">
                    <Typography variant="subtitle1" fontWeight="bold">
                      Total
                    </Typography>
                  </TableCell>
                  <TableCell colSpan={3}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {formatCurrency(pr.totalAmount, pr.currency)}
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Paper>
        </Grid>

        {pr.quotes && pr.quotes.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Quotes
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Vendor</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Submitted By</TableCell>
                    <TableCell>Submitted At</TableCell>
                    <TableCell>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pr.quotes.map((quote, index) => (
                    <TableRow key={index}>
                      <TableCell>{quote.vendorName}</TableCell>
                      <TableCell>{formatCurrency(quote.amount, quote.currency)}</TableCell>
                      <TableCell>{quote.submittedBy.name}</TableCell>
                      <TableCell>{new Date(quote.submittedAt).toLocaleDateString()}</TableCell>
                      <TableCell>{quote.notes || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Grid>
        )}

        {pr.workflow && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Workflow History
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Step</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pr.workflow.history.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell>{entry.step}</TableCell>
                      <TableCell>{entry.user.name}</TableCell>
                      <TableCell>{new Date(entry.timestamp).toLocaleDateString()}</TableCell>
                      <TableCell>{entry.notes || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
