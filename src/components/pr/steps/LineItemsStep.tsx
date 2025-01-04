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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { FormState } from '../NewPRForm';
import { uploadToTempStorage } from '../../../services/storage';
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
  // Add new line item
  const handleAddLineItem = () => {
    setFormState(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { ...emptyLineItem }]
    }));
  };

  // Remove line item
  const handleRemoveLineItem = (index: number) => {
    setFormState(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index)
    }));
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

    try {
      const file = files[0];
      const tempPath = await uploadToTempStorage(file);

      const newAttachment: Attachment = {
        id: tempPath,
        name: file.name,
        url: tempPath,
        type: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: formState.requestor
      };

      setFormState(prev => ({
        ...prev,
        lineItems: prev.lineItems.map((item, i) =>
          i === index ? {
            ...item,
            attachments: [...(item.attachments || []), newAttachment]
          } : item
        )
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
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Line Items
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
              {formState.lineItems.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <TextField
                      fullWidth
                      required
                      value={item.description}
                      onChange={handleLineItemChange(index, 'description')}
                      disabled={loading}
                      placeholder="Item description"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      type="number"
                      required
                      value={item.quantity}
                      onChange={handleLineItemChange(index, 'quantity')}
                      disabled={loading}
                      inputProps={{ min: 0 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      required
                      value={item.uom}
                      onChange={handleLineItemChange(index, 'uom')}
                      disabled={loading}
                      placeholder="e.g., pcs, kg, m"
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      fullWidth
                      value={item.notes}
                      onChange={handleLineItemChange(index, 'notes')}
                      disabled={loading}
                      placeholder="Additional notes"
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
                        size="small"
                        disabled={loading}
                      >
                        Attach File
                        <input
                          type="file"
                          hidden
                          onChange={(e) => handleFileUpload(index, e.target.files)}
                        />
                      </Button>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      onClick={() => handleRemoveLineItem(index)}
                      disabled={loading}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>

      <Grid item xs={12}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleAddLineItem}
          disabled={loading}
        >
          Add Line Item
        </Button>
      </Grid>
    </Grid>
  );
};
