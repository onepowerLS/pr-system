/**
 * @fileoverview Line Items Step Component
 * @version 1.0.0
 * 
 * Description:
 * Second step in the PR creation process. Manages line items
 * including descriptions, quantities, and unit of measure.
 */

import React from 'react';
import {
  Grid,
  TextField,
  IconButton,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { FormState } from '../NewPRForm';
import { StorageService } from '../../../services/storage';
import { Attachment } from '../../../types/pr';

interface LineItemsStepProps {
  formState: FormState;
  setFormState: React.Dispatch<React.SetStateAction<FormState>>;
  loading: boolean;
}

const emptyLineItem = {
  description: '',
  quantity: 0,
  uom: '',
  notes: '',
  attachments: []
};

export const LineItemsStep: React.FC<LineItemsStepProps> = ({
  formState,
  setFormState,
  loading
}) => {
  const [deleteIndex, setDeleteIndex] = React.useState<number | null>(null);

  // Add new line item
  const handleAddLineItem = () => {
    setFormState(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { ...emptyLineItem }]
    }));
  };

  // Remove line item
  const handleRemoveLineItem = (index: number) => {
    setDeleteIndex(index);
  };

  const handleConfirmDelete = () => {
    if (deleteIndex !== null) {
      setFormState(prev => ({
        ...prev,
        lineItems: prev.lineItems.filter((_, i) => i !== deleteIndex)
      }));
      setDeleteIndex(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteIndex(null);
  };

  // Update line item
  const handleLineItemChange = (index: number, field: keyof typeof emptyLineItem) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'quantity' ? Number(event.target.value) : event.target.value;
    setFormState(prev => ({
      ...prev,
      lineItems: prev.lineItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  // Handle file upload
  const handleFileUpload = async (index: number, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    try {
      const result = await StorageService.uploadToTempStorage(file);
      
      setFormState(prev => ({
        ...prev,
        lineItems: prev.lineItems.map((item, i) => {
          if (i === index) {
            return {
              ...item,
              attachments: [
                ...item.attachments,
                {
                  name: file.name,
                  url: result.url,
                  path: result.path
                }
              ]
            };
          }
          return item;
        })
      }));
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  // Remove attachment
  const handleRemoveAttachment = (lineItemIndex: number, attachmentIndex: number) => {
    setFormState(prev => ({
      ...prev,
      lineItems: prev.lineItems.map((item, i) =>
        i === lineItemIndex ? {
          ...item,
          attachments: (item.attachments || []).filter((_, j) => j !== attachmentIndex)
        } : item
      )
    }));
  };

  return (
    <Grid container spacing={3}>
      {loading && (
        <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress />
          <Typography>Loading...</Typography>
        </Grid>
      )}
      
      <Grid item xs={12}>
        <Typography variant="h6">
          Line Items
          {formState.lineItems.length > 0 && (
            <Typography component="span" sx={{ ml: 1 }}>
              (Total items: {formState.lineItems.length})
            </Typography>
          )}
        </Typography>
      </Grid>

      <Grid item xs={12}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Description</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell>UOM</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell>Attachments</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {formState.lineItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="textSecondary">
                      No items added
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                formState.lineItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <TextField
                        fullWidth
                        required
                        value={item.description}
                        onChange={handleLineItemChange(index, 'description')}
                        disabled={loading}
                        placeholder="Item description"
                        label="Description"
                        error={!item.description}
                        helperText={!item.description ? "Description is required" : ""}
                        inputProps={{
                          'aria-label': 'description'
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        type="number"
                        required
                        value={item.quantity}
                        onChange={handleLineItemChange(index, 'quantity')}
                        disabled={loading}
                        error={item.quantity <= 0}
                        helperText={item.quantity <= 0 ? "Quantity must be greater than 0" : ""}
                        inputProps={{ 
                          min: 0,
                          'aria-label': 'quantity'
                        }}
                        label="Quantity"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        required
                        value={item.uom}
                        onChange={handleLineItemChange(index, 'uom')}
                        disabled={loading}
                        placeholder="Unit of measure"
                        label="UOM"
                        error={!item.uom}
                        helperText={!item.uom ? "UOM is required" : ""}
                        inputProps={{
                          'aria-label': 'uom'
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        fullWidth
                        value={item.notes}
                        onChange={handleLineItemChange(index, 'notes')}
                        disabled={loading}
                        placeholder="Additional notes"
                        label="Notes"
                        inputProps={{
                          'aria-label': 'notes'
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {item.attachments?.map((file, fileIndex) => (
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
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                onClick={() => handleRemoveAttachment(index, fileIndex)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        ))}
                        <Button
                          component="label"
                          startIcon={<AttachFileIcon />}
                          disabled={loading}
                          aria-label="attach file"
                        >
                          Attach File
                          <input
                            type="file"
                            hidden
                            data-testid="attach-file-input"
                            onChange={(e) => handleFileUpload(index, e.target.files)}
                          />
                        </Button>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        onClick={() => handleRemoveLineItem(index)}
                        disabled={loading}
                        aria-label="delete line item"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>

      <Grid item xs={12}>
        <Button
          variant="outlined"
          color="primary"
          onClick={handleAddLineItem}
          startIcon={<AddIcon />}
          disabled={loading}
          aria-label="add line item"
        >
          Add Line Item
        </Button>
      </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteIndex !== null}
        onClose={handleCancelDelete}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this line item?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete}>Cancel</Button>
          <Button onClick={handleConfirmDelete} aria-label="confirm delete">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};
