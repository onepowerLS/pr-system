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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { FormState } from '../NewPRForm';

interface LineItemsStepProps {
  formState: FormState;
  setFormState: React.Dispatch<React.SetStateAction<FormState>>;
  loading: boolean;
}

const emptyLineItem = {
  description: '',
  quantity: 0,
  uom: '',
  notes: ''
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
