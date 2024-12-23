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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
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
  }>;
  loading: boolean;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  formState,
  setFormState,
  vendors,
  approvers,
  loading
}) => {
  // Add new quote
  const handleAddQuote = () => {
    setFormState(prev => ({
      ...prev,
      quotes: [...prev.quotes, { vendor: '', amount: 0, notes: '' }]
    }));
  };

  // Remove quote
  const handleRemoveQuote = (index: number) => {
    setFormState(prev => ({
      ...prev,
      quotes: prev.quotes.filter((_, i) => i !== index)
    }));
  };

  // Update quote
  const handleQuoteChange = (index: number, field: 'vendor' | 'amount' | 'notes') => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'amount' ? Number(event.target.value) : event.target.value;
    setFormState(prev => ({
      ...prev,
      quotes: prev.quotes.map((quote, i) =>
        i === index ? { ...quote, [field]: value } : quote
      )
    }));
  };

  // Handle approver changes
  const handleApproverChange = (_event: any, value: any) => {
    setFormState(prev => ({
      ...prev,
      approvers: value.map((approver: any) => approver.id)
    }));
  };

  return (
    <Grid container spacing={3}>
      {/* Basic Information Summary */}
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Basic Information
        </Typography>
        <Paper sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2">Organization</Typography>
              <Typography>{formState.organization}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2">Department</Typography>
              <Typography>{formState.department}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2">Description</Typography>
              <Typography>{formState.description}</Typography>
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      {/* Line Items Summary */}
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Line Items
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Description</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell>UOM</TableCell>
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
      </Grid>

      {/* Quotes */}
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Quotes
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Vendor</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {formState.quotes.map((quote, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <FormControl fullWidth>
                      <Select
                        value={quote.vendor}
                        onChange={(e) => handleQuoteChange(index, 'vendor')(e as any)}
                        disabled={loading}
                      >
                        {vendors.map(vendor => (
                          <MenuItem key={vendor.id} value={vendor.id}>
                            {vendor.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      type="number"
                      value={quote.amount}
                      onChange={handleQuoteChange(index, 'amount')}
                      disabled={loading}
                      inputProps={{ min: 0 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      fullWidth
                      value={quote.notes}
                      onChange={handleQuoteChange(index, 'notes')}
                      disabled={loading}
                      placeholder="Additional notes"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      variant="contained"
                      color="error"
                      onClick={() => handleRemoveQuote(index)}
                      disabled={loading}
                      startIcon={<DeleteIcon />}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddQuote}
            disabled={loading}
          >
            Add Quote
          </Button>
        </Box>
      </Grid>

      {/* Approvers */}
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Approval Chain
        </Typography>
        <Autocomplete
          multiple
          options={approvers}
          getOptionLabel={(option) => `${option.name} (${option.role})`}
          value={approvers.filter(a => formState.approvers.includes(a.id))}
          onChange={handleApproverChange}
          disabled={loading}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                label={`${option.name} (${option.role})`}
                {...getTagProps({ index })}
              />
            ))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label="Approvers"
              placeholder="Select approvers"
              required
            />
          )}
        />
      </Grid>
    </Grid>
  );
};
