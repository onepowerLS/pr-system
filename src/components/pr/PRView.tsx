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
  IconButton,
  Tooltip,
} from '@mui/material';
import { Edit as EditIcon, ArrowBack as ArrowBackIcon, AttachFile as AttachFileIcon, Download as DownloadIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import { RootState } from '../../store';
import { prService } from '../../services/pr';
import { PRRequest } from '../../types/pr';
import { formatCurrency } from '../../utils/formatters';

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

  const canEdit = currentUser?.role === 'ADMIN' || currentUser?.uid === pr.requestorId;

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
                  label={pr.status || 'UNKNOWN'}
                  color={pr.status === 'SUBMITTED' ? 'primary' : 'default'}
                  sx={{ mt: 1 }}
                />
              </Grid>
              <Grid item xs={6}>
                <Typography color="textSecondary">Total Amount</Typography>
                <Typography variant="h6">
                  {formatCurrency(pr.estimatedAmount || 0, pr.currency)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography color="textSecondary">Requestor</Typography>
                <Typography>{pr.requestor?.name || 'Unknown'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography color="textSecondary">Department</Typography>
                <Typography>{pr.department}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography color="textSecondary">Submitted Date</Typography>
                <Typography>
                  {new Date(pr.createdAt).toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography color="textSecondary">Last Updated</Typography>
                <Typography>
                  {new Date(pr.updatedAt).toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography color="textSecondary">Description</Typography>
                <Typography>{pr.description}</Typography>
              </Grid>
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
              <Grid item xs={6}>
                <Typography color="textSecondary">Required Date</Typography>
                <Typography>
                  {pr.requiredDate ? new Date(pr.requiredDate).toLocaleDateString() : 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography color="textSecondary">Urgency</Typography>
                <Chip
                  label={pr.isUrgent || pr.metrics?.isUrgent ? 'Urgent' : 'Normal'}
                  color={pr.isUrgent || pr.metrics?.isUrgent ? 'error' : 'default'}
                  sx={{ mt: 1 }}
                />
              </Grid>
              <Grid item xs={6}>
                <Typography color="textSecondary">Expense Type</Typography>
                <Typography>{pr.expenseType}</Typography>
              </Grid>
              {pr.vehicle && (
                <Grid item xs={6}>
                  <Typography color="textSecondary">Vehicle</Typography>
                  <Typography>{pr.vehicle}</Typography>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Grid>

        {pr.lineItems && pr.lineItems.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Line Items
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Description</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>UOM</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell>Attachments</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pr.lineItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.uom}</TableCell>
                      <TableCell>{item.notes || 'N/A'}</TableCell>
                      <TableCell>
                        {item.attachments && item.attachments.length > 0 ? (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {item.attachments.map((file, fileIndex) => (
                              <Box 
                                key={fileIndex} 
                                sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center',
                                  gap: 1,
                                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                  padding: '4px 8px',
                                  borderRadius: '4px'
                                }}
                              >
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    flex: 1,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {file.name}
                                </Typography>
                                <Tooltip title="Preview">
                                  <IconButton
                                    size="small"
                                    onClick={() => window.open(file.url, '_blank')}
                                  >
                                    <VisibilityIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Download">
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      fetch(file.url)
                                        .then(response => response.blob())
                                        .then(blob => {
                                          const url = window.URL.createObjectURL(blob);
                                          const link = document.createElement('a');
                                          link.href = url;
                                          link.setAttribute('download', file.name);
                                          document.body.appendChild(link);
                                          link.click();
                                          link.parentNode?.removeChild(link);
                                          window.URL.revokeObjectURL(url);
                                        })
                                        .catch(error => {
                                          console.error('Error downloading file:', error);
                                          // TODO: Show error notification to user
                                        });
                                    }}
                                  >
                                    <DownloadIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            No attachments
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} align="right">
                      <Typography variant="subtitle1" fontWeight="bold">
                        Total Amount
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {formatCurrency(pr.estimatedAmount || 0, pr.currency)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Paper>
          </Grid>
        )}

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
                    <TableCell>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pr.quotes.map((quote, index) => (
                    <TableRow key={index}>
                      <TableCell>{quote.vendor}</TableCell>
                      <TableCell>{formatCurrency(quote.amount, pr.currency)}</TableCell>
                      <TableCell>{quote.notes || 'N/A'}</TableCell>
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
