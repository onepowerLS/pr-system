import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useSnackbar } from 'notistack';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Edit as EditIcon, ArrowBack as ArrowBackIcon, AttachFile as AttachFileIcon, Download as DownloadIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import { RootState } from '../../store';
import { prService } from '../../services/pr';
import { PRRequest } from '../../types/pr';
import { formatCurrency } from '../../utils/formatters';
import mammoth from 'mammoth';

const FilePreviewDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  file: { name: string; url: string; type: string };
}> = ({ open, onClose, file }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getFileType = (fileName: string): 'image' | 'pdf' | 'docx' | 'rtf' | 'text' | 'unsupported' => {
    const lowerFileName = fileName.toLowerCase();
    if (lowerFileName.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) return 'image';
    if (lowerFileName.endsWith('.pdf')) return 'pdf';
    if (lowerFileName.endsWith('.docx')) return 'docx';
    if (lowerFileName.endsWith('.rtf')) return 'rtf';
    if (lowerFileName.match(/\.(txt|md|log)$/)) return 'text';
    return 'unsupported';
  };

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);

    const fileType = getFileType(file.name);
    
    const fetchAndProcess = async () => {
      try {
        const response = await fetch(file.url);
        const blob = await response.blob();

        switch (fileType) {
          case 'text':
          case 'rtf':  
            const text = await blob.text();
            // For RTF, do thorough cleanup of RTF markup
            const cleanedText = fileType === 'rtf' 
              ? text
                  // Remove RTF header
                  .replace(/^[{]\\rtf[^}]+[}]/g, '')
                  // Remove font tables
                  .replace(/[{]\\fonttbl[^}]+[}]/g, '')
                  // Remove color tables
                  .replace(/[{]\\colortbl[^}]+[}]/g, '')
                  // Remove style sheets
                  .replace(/[{]\\stylesheet[^}]+[}]/g, '')
                  // Remove info groups
                  .replace(/[{]\\info[^}]+[}]/g, '')
                  // Remove Unicode character escapes
                  .replace(/\\u[0-9]+\s?/g, '')
                  // Remove special characters and control words
                  .replace(/\\[a-z]+[0-9]*/g, '')
                  // Remove numeric control sequences
                  .replace(/\\[0-9]+/g, '')
                  // Remove remaining braces
                  .replace(/[{}]/g, '')
                  // Fix line endings
                  .replace(/\\par\s*/g, '\n')
                  // Remove any remaining backslashes
                  .replace(/\\/g, '')
                  // Remove multiple spaces
                  .replace(/\s+/g, ' ')
                  // Remove multiple newlines
                  .replace(/\n+/g, '\n')
                  // Trim whitespace
                  .trim()
              : text;
            setContent(cleanedText);
            break;
          case 'docx':
            const arrayBuffer = await blob.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            setContent(result.value);
            break;
        }
      } catch (err) {
        console.error('Error processing file:', err);
        setError('Failed to process file. You can try downloading it instead.');
        enqueueSnackbar('Error previewing file. You can try downloading it instead.', { 
          variant: 'error',
        });
      } finally {
        setLoading(false);
      }
    };

    if (['text', 'docx', 'rtf'].includes(fileType)) {
      fetchAndProcess();
    } else {
      setLoading(false);
    }
  }, [open, file.url]);

  const renderContent = () => {
    const fileType = getFileType(file.name);

    if (error) {
      return (
        <Box p={3} textAlign="center">
          <Typography color="error" gutterBottom>
            {error}
          </Typography>
          <Button
            variant="contained"
            onClick={() => {
              const link = document.createElement('a');
              link.href = file.url;
              link.setAttribute('download', file.name);
              document.body.appendChild(link);
              link.click();
              link.parentNode?.removeChild(link);
            }}
          >
            Download Instead
          </Button>
        </Box>
      );
    }

    switch (fileType) {
      case 'image':
        return (
          <Box display="flex" justifyContent="center" alignItems="center" p={2}>
            <img 
              src={file.url} 
              alt={file.name} 
              style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
            />
          </Box>
        );
      case 'pdf':
        return (
          <Box height="70vh" width="100%">
            <iframe
              src={`${file.url}#view=FitH`}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="PDF Preview"
            />
          </Box>
        );
      case 'docx':
        return (
          <Box 
            sx={{ 
              p: 2,
              maxHeight: '70vh',
              overflow: 'auto',
              '& img': { maxWidth: '100%' }
            }}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        );
      case 'rtf':
      case 'text':
        return (
          <Box 
            component="pre"
            sx={{ 
              p: 2,
              maxHeight: '70vh',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              fontFamily: 'monospace'
            }}
          >
            {content}
          </Box>
        );
      default:
        return (
          <Box p={3} textAlign="center">
            <Typography gutterBottom>
              This file type cannot be previewed directly.
            </Typography>
            <Button
              variant="contained"
              onClick={() => {
                const link = document.createElement('a');
                link.href = file.url;
                link.setAttribute('download', file.name);
                document.body.appendChild(link);
                link.click();
                link.parentNode?.removeChild(link);
              }}
            >
              Download File
            </Button>
          </Box>
        );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle>
        {file.name}
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          renderContent()
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          onClick={() => {
            const link = document.createElement('a');
            link.href = file.url;
            link.setAttribute('download', file.name);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
          }}
        >
          Download
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export function PRView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pr, setPr] = useState<PRRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string; type: string } | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  // Function to check if file is previewable
  const isPreviewableFile = (fileName: string): boolean => {
    const lowerFileName = fileName.toLowerCase();
    return lowerFileName.match(/\.(jpg|jpeg|png|gif|bmp|webp|pdf|docx|rtf|txt|md|log)$/i) !== null;
  };

  // Function to handle file preview
  const handleFilePreview = (file: { name: string; url: string; type: string }) => {
    if (!isPreviewableFile(file.name)) {
      const extension = file.name.split('.').pop()?.toUpperCase() || 'This type of';
      enqueueSnackbar(`${extension} files cannot be previewed. Click the download button to save the file.`, {
        variant: 'info',
        anchorOrigin: {
          vertical: 'top',
          horizontal: 'right',
        },
      });
    } else {
      setPreviewFile(file);
    }
  };

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
                                    onClick={() => handleFilePreview(file)}
                                  >
                                    <VisibilityIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Download">
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      const link = document.createElement('a');
                                      link.href = file.url;
                                      link.setAttribute('download', file.name);
                                      document.body.appendChild(link);
                                      link.click();
                                      link.parentNode?.removeChild(link);
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
      {previewFile && (
        <FilePreviewDialog
          open={Boolean(previewFile)}
          onClose={() => setPreviewFile(null)}
          file={previewFile}
        />
      )}
    </Box>
  );
}
