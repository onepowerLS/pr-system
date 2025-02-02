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
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  Link,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { StorageService } from '../../../services/storage';
import { Quote, ReferenceDataItem } from '../../../types/pr';

interface QuotesStepProps {
  formState: any;
  setFormState: React.Dispatch<React.SetStateAction<any>>;
  vendors: ReferenceDataItem[];
  currencies: ReferenceDataItem[];
  loading: boolean;
  readOnly?: boolean;
}

const emptyQuote: Quote = {
  id: crypto.randomUUID(),
  vendorId: '',
  vendorName: '',
  quoteDate: new Date().toISOString().split('T')[0],
  amount: 0,
  currency: '',
  notes: '',
  attachments: [],
  deliveryDate: '',
  deliveryAddress: '',
  paymentTerms: '',
};

export function QuotesStep({
  formState,
  setFormState,
  vendors,
  currencies,
  loading,
  readOnly = false,
}: QuotesStepProps) {
  const [deleteIndex, setDeleteIndex] = React.useState<number | null>(null);
  const quotes = formState.quotes || [];

  const handleAddQuote = () => {
    if (!readOnly) {
      console.log('Add Quote clicked');
      const existingQuotes = formState.quotes || [];
      console.log('Existing quotes:', existingQuotes);
      const newQuote = { ...emptyQuote, id: crypto.randomUUID() };
      console.log('New quote:', newQuote);
      const updatedQuotes = [...existingQuotes, newQuote];
      console.log('Updated quotes:', updatedQuotes);
      setFormState({
        ...formState,
        quotes: updatedQuotes
      });
    }
  };

  const handleRemoveQuote = (index: number) => {
    if (!readOnly) {
      setDeleteIndex(index);
    }
  };

  const handleConfirmDelete = () => {
    if (!readOnly && deleteIndex !== null) {
      setFormState(prev => ({
        ...prev,
        quotes: quotes.filter((_, i) => i !== deleteIndex)
      }));
      setDeleteIndex(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteIndex(null);
  };

  const handleQuoteChange = (index: number, field: keyof Quote) => (
    event: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>
  ) => {
    if (!readOnly) {
      console.log('Quote change:', { index, field, value: event.target.value });
      
      setFormState(prev => {
        const prevQuotes = prev.quotes || [];
        console.log('Previous quotes:', prevQuotes);
        
        const value = field === 'amount' ? Number(event.target.value) : event.target.value;
        const updatedQuotes = prevQuotes.map((quote, i) => {
          if (i === index) {
            if (field === 'vendorId' && typeof value === 'string') {
              const vendor = vendors.find(v => v.id === value);
              console.log('Selected vendor:', vendor);
              return {
                ...quote,
                [field]: value,
                vendorName: vendor?.name || ''
              };
            }
            return {
              ...quote,
              [field]: value
            };
          }
          return quote;
        });
        
        console.log('Updated quotes:', updatedQuotes);
        return {
          ...prev,
          quotes: updatedQuotes
        };
      });
    }
  };

  const handleFileUpload = async (index: number, files: FileList) => {
    if (!readOnly) {
      try {
        console.log('Uploading files:', files);
        const uploadedFiles = await Promise.all(
          Array.from(files).map(async (file) => {
            const result = await StorageService.uploadToTempStorage(file);
            console.log('File uploaded:', result);
            return {
              name: result.name,
              url: result.url,
              id: crypto.randomUUID()
            };
          })
        );

        console.log('All files uploaded:', uploadedFiles);
        
        setFormState(prev => {
          const prevQuotes = prev.quotes || [];
          const updatedQuotes = prevQuotes.map((quote, i) => {
            if (i === index) {
              const updatedQuote = {
                ...quote,
                attachments: [...(quote.attachments || []), ...uploadedFiles]
              };
              console.log('Updated quote:', updatedQuote);
              return updatedQuote;
            }
            return quote;
          });
          
          console.log('Updated quotes:', updatedQuotes);
          return {
            ...prev,
            quotes: updatedQuotes
          };
        });
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }
  };

  return (
    <Box>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width="20%">Vendor</TableCell>
              <TableCell width="10%">Date</TableCell>
              <TableCell width="15%">Amount</TableCell>
              <TableCell width="10%">Currency</TableCell>
              <TableCell width="30%">Notes</TableCell>
              <TableCell width="15%">Attachments</TableCell>
              <TableCell width="5%">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {quotes.map((quote, index) => (
              <TableRow key={quote.id}>
                <TableCell>
                  <FormControl fullWidth>
                    <Select
                      value={quote.vendorId}
                      onChange={handleQuoteChange(index, 'vendorId')}
                      disabled={readOnly}
                      sx={{ 
                        '& .MuiSelect-select.Mui-disabled': {
                          WebkitTextFillColor: 'rgba(0, 0, 0, 0.6)',
                        }
                      }}
                    >
                      <MenuItem value="">Select Vendor</MenuItem>
                      {vendors.map((vendor) => (
                        <MenuItem key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>
                  <TextField
                    type="date"
                    value={quote.quoteDate}
                    onChange={handleQuoteChange(index, 'quoteDate')}
                    disabled={readOnly}
                    sx={{ 
                      '& .MuiInputBase-input.Mui-disabled': {
                        WebkitTextFillColor: 'rgba(0, 0, 0, 0.6)',
                      }
                    }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={quote.amount}
                    onChange={handleQuoteChange(index, 'amount')}
                    disabled={readOnly}
                    fullWidth
                    sx={{ 
                      minWidth: '200px',
                      '& .MuiInputBase-input.Mui-disabled': {
                        WebkitTextFillColor: 'rgba(0, 0, 0, 0.6)',
                      }
                    }}
                    inputProps={{
                      step: '0.01'
                    }}
                  />
                </TableCell>
                <TableCell>
                  <FormControl fullWidth>
                    <Select
                      value={quote.currency}
                      onChange={handleQuoteChange(index, 'currency')}
                      disabled={readOnly}
                      sx={{ 
                        '& .MuiSelect-select.Mui-disabled': {
                          WebkitTextFillColor: 'rgba(0, 0, 0, 0.6)',
                        }
                      }}
                    >
                      <MenuItem value="">Select Currency</MenuItem>
                      {currencies.map((currency) => (
                        <MenuItem key={currency.id} value={currency.id}>
                          {currency.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>
                  <TextField
                    multiline
                    rows={3}
                    value={quote.notes}
                    onChange={handleQuoteChange(index, 'notes')}
                    disabled={readOnly}
                    fullWidth
                    sx={{ 
                      minWidth: '300px',
                      '& .MuiInputBase-input.Mui-disabled': {
                        WebkitTextFillColor: 'rgba(0, 0, 0, 0.6)',
                      },
                      '& .MuiInputBase-root': {
                        height: 'auto',
                      },
                      '& .MuiInputBase-input': {
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word'
                      }
                    }}
                  />
                </TableCell>
                <TableCell>
                  <input
                    type="file"
                    onChange={(e) => e.target.files && handleFileUpload(index, e.target.files)}
                    multiple
                    style={{ display: 'none' }}
                    id={`file-upload-${index}`}
                    disabled={readOnly}
                  />
                  <label htmlFor={`file-upload-${index}`}>
                    <Button
                      component="span"
                      variant="outlined"
                      startIcon={<AttachFileIcon />}
                      disabled={readOnly}
                    >
                      Upload
                    </Button>
                  </label>
                  {quote.attachments && quote.attachments.length > 0 && (
                    <List dense>
                      {quote.attachments.map((file) => (
                        <ListItem key={file.id}>
                          <ListItemText
                            primary={
                              <Link href={file.url} target="_blank" rel="noopener noreferrer">
                                {file.name}
                              </Link>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {!readOnly && (
                      <IconButton onClick={() => handleRemoveQuote(index)} color="error">
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box mt={2}>
        {!readOnly && (
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddQuote}
            sx={{ mt: 2 }}
          >
            Add Quote
          </Button>
        )}
      </Box>

      <Dialog open={deleteIndex !== null} onClose={handleCancelDelete}>
        <DialogTitle>Delete Quote</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this quote?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
