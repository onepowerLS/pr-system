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
import { RootState } from '../../store/store';
import { prService } from '../../services/pr';
import { PRRequest, PRStatus, LineItem } from '../../types/pr';
import { formatCurrency } from '../../utils/formatters';

const PRView: React.FC = () => {
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
        const prData = await prService.getPR(id);
        if (!prData) {
          setError('PR not found');
          return;
        }
        setPr(prData);
      } catch (err) {
        setError('Failed to load PR');
        console.error('Error fetching PR:', err);
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
      <Box p={3}>
        <Typography color="error">{error || 'PR not found'}</Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  const canEdit = currentUser?.id === pr.requestorId && pr.status === PRStatus.SUBMITTED;

  const getStatusColor = (status: PRStatus) => {
    switch (status) {
      case PRStatus.SUBMITTED:
        return 'primary';
      case PRStatus.IN_QUEUE:
        return 'info';
      case PRStatus.ORDERED:
        return 'warning';
      case PRStatus.COMPLETED:
        return 'success';
      case PRStatus.REVISION_REQUIRED:
        return 'error';
      case PRStatus.REJECTED:
        return 'error';
      case PRStatus.CANCELED:
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard')}>
            Back
          </Button>
          <Typography variant="h4">
            Purchase Request {pr.prNumber}
          </Typography>
          <Chip
            label={pr.status}
            color={getStatusColor(pr.status)}
            sx={{ ml: 2 }}
          />
        </Box>
        {canEdit && (
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/pr/edit/${id}`)}
          >
            Edit PR
          </Button>
        )}
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Organization</Typography>
                <Typography>{pr.organization}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Submitted By</Typography>
                <Typography>{pr.requestor}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Department</Typography>
                <Typography>{pr.department}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Project Category</Typography>
                <Typography>{pr.projectCategory}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Description</Typography>
                <Typography>{pr.description}</Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Line Items
            </Typography>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell>UOM</TableCell>
                  <TableCell align="right">Unit Price</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pr.lineItems?.map((item: LineItem, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell>{item.uom}</TableCell>
                    <TableCell align="right">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell align="right">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </TableCell>
                    <TableCell>{item.notes}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={4} align="right">
                    <Typography variant="subtitle1">Total Amount:</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle1">
                      {formatCurrency(
                        pr.lineItems?.reduce(
                          (sum, item) => sum + item.quantity * item.unitPrice,
                          0
                        ) || 0
                      )}
                    </Typography>
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </Paper>
        </Grid>

        {pr.status !== PRStatus.SUBMITTED && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Processing Information
              </Typography>
              <Grid container spacing={2}>
                {pr.procComments && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">PROC Comments</Typography>
                    <Typography>{pr.procComments}</Typography>
                  </Grid>
                )}
                {pr.metrics && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2">Days Open</Typography>
                      <Typography>{pr.metrics.daysOpen}</Typography>
                    </Grid>
                    {pr.metrics.completionPercentage !== undefined && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2">Completion Percentage</Typography>
                        <Typography>{pr.metrics.completionPercentage}%</Typography>
                      </Grid>
                    )}
                  </>
                )}
              </Grid>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default PRView;
