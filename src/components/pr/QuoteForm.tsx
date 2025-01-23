import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Button,
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

import { Quote } from '@/types/pr';
import { ReferenceDataItem } from '@/types/referenceData';

const quoteFormSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  quoteDate: z.string().min(1, 'Quote date is required'),
  amount: z.number().min(0, 'Amount is required'),
  currency: z.string().min(1, 'Currency is required'),
  notes: z.string().optional(),
});

type QuoteFormValues = z.infer<typeof quoteFormSchema>;

interface QuoteFormProps {
  onSubmit: (data: Partial<Quote>) => void;
  onCancel: () => void;
  initialData?: Partial<Quote>;
  vendors: ReferenceDataItem[];
  currencies: ReferenceDataItem[];
}

export function QuoteForm({
  onSubmit,
  onCancel,
  initialData,
  vendors,
  currencies,
}: QuoteFormProps) {
  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: initialData || {
      vendorId: '',
      quoteDate: new Date().toISOString().split('T')[0],
      amount: 0,
      currency: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    }
  }, [initialData, form]);

  const handleSubmit = async (data: QuoteFormValues) => {
    try {
      const selectedVendor = vendors.find(v => v.id === data.vendorId);
      const quoteData: Partial<Quote> = {
        ...data,
        quoteDate: format(new Date(data.quoteDate), 'yyyy-MM-dd'),
        vendorName: selectedVendor?.name || '',
        vendorContacts: {
          name: selectedVendor?.contactName || '',
          email: selectedVendor?.contactEmail || '',
          phone: selectedVendor?.contactPhone || '',
        },
      };
      await onSubmit(quoteData);
      form.reset();
    } catch (error) {
      console.error('Error submitting quote:', error);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Vendor</TableCell>
              <TableCell>Quote Date</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Currency</TableCell>
              <TableCell>Notes</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>
                <FormControl fullWidth>
                  <InputLabel>Vendor</InputLabel>
                  <Select
                    value={form.watch('vendorId') || ''}
                    onChange={(e) => form.setValue('vendorId', e.target.value)}
                    label="Vendor"
                  >
                    {vendors.map((vendor) => (
                      <MenuItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>{form.formState.errors.vendorId?.message}</FormHelperText>
                </FormControl>
              </TableCell>
              <TableCell>
                <FormControl fullWidth>
                  <input
                    type="date"
                    value={form.watch('quoteDate') || ''}
                    onChange={(e) => form.setValue('quoteDate', e.target.value)}
                  />
                  <FormHelperText>{form.formState.errors.quoteDate?.message}</FormHelperText>
                </FormControl>
              </TableCell>
              <TableCell>
                <FormControl fullWidth>
                  <input
                    type="number"
                    step="0.01"
                    value={form.watch('amount') || 0}
                    onChange={(e) => form.setValue('amount', parseFloat(e.target.value))}
                  />
                  <FormHelperText>{form.formState.errors.amount?.message}</FormHelperText>
                </FormControl>
              </TableCell>
              <TableCell>
                <FormControl fullWidth>
                  <InputLabel>Currency</InputLabel>
                  <Select
                    value={form.watch('currency') || ''}
                    onChange={(e) => form.setValue('currency', e.target.value)}
                    label="Currency"
                  >
                    {currencies.map((currency) => (
                      <MenuItem key={currency.id} value={currency.id}>
                        {currency.name}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>{form.formState.errors.currency?.message}</FormHelperText>
                </FormControl>
              </TableCell>
              <TableCell>
                <FormControl fullWidth>
                  <input
                    type="text"
                    value={form.watch('notes') || ''}
                    onChange={(e) => form.setValue('notes', e.target.value)}
                  />
                  <FormHelperText>{form.formState.errors.notes?.message}</FormHelperText>
                </FormControl>
              </TableCell>
              <TableCell align="right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="contained"
                    size="small"
                    type="submit"
                    sx={{ height: '36px' }}
                  >
                    Add Quote
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={onCancel}
                    sx={{ height: '36px' }}
                  >
                    Cancel
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </form>
  );
}
