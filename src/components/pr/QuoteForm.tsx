import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Quote, ReferenceDataItem } from '@/types/pr';
import { FileUpload } from '@/components/common/FileUpload';
import { StorageService } from '@/services/storage';
import { Typography } from '@/components/ui/typography';

const formSchema = z.object({
  vendorId: z.string(),
  quoteDate: z.string(),
  amount: z.coerce.number().min(0),
  currency: z.string(),
  notes: z.string().optional(),
});

interface QuoteFormProps {
  onSubmit: (data: Quote) => void;
  onCancel: () => void;
  initialData?: Quote;
  vendors: ReferenceDataItem[];
  currencies: ReferenceDataItem[];
  isEditing: boolean;
}

export function QuoteForm({
  onSubmit,
  onCancel,
  initialData,
  vendors = [],
  currencies = [],
  isEditing,
}: QuoteFormProps) {
  const [attachments, setAttachments] = useState<Array<{
    id: string;
    name: string;
    url: string;
  }>>(initialData?.attachments || []);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vendorId: initialData?.vendorId || '',
      quoteDate: initialData?.quoteDate || new Date().toISOString().split('T')[0],
      amount: initialData?.amount || 0,
      currency: initialData?.currency || (currencies[0]?.id || 'LSL'),
      notes: initialData?.notes || '',
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    onSubmit({
      id: initialData?.id || crypto.randomUUID(),
      ...values,
      attachments,
    });
  };

  const handleFileSelect = async (files: File[]) => {
    const uploadedFiles = await Promise.all(
      files.map(async (file) => {
        const { id, url } = await StorageService.uploadToTemp(file);
        return {
          id,
          name: file.name,
          url,
        };
      })
    );

    setAttachments((prev) => [...prev, ...uploadedFiles]);
  };

  const handleRemoveFile = async (fileId: string) => {
    await StorageService.deleteFromTemp(fileId);
    setAttachments((prev) => prev.filter((file) => file.id !== fileId));
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Vendor</TableCell>
              <TableCell>
                <div className="space-y-2">
                  <Select
                    onValueChange={(value) => form.setValue('vendorId', value)}
                    defaultValue={form.watch('vendorId')}
                    disabled={!isEditing || vendors.length === 0}
                  >
                    <SelectTrigger className="w-full bg-white border-input data-[state=active]:bg-white">
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.length > 0 ? (
                        vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>
                          No vendors available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {vendors.length === 0 && (
                    <p className="text-sm text-destructive">
                      No vendors available. Please contact your administrator.
                    </p>
                  )}
                </div>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Quote Date</TableCell>
              <TableCell>
                <Input
                  type="date"
                  {...form.register('quoteDate')}
                  className="w-full bg-white border-input"
                  disabled={!isEditing}
                />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Amount</TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register('amount')}
                  className="w-full bg-white border-input"
                  disabled={!isEditing}
                />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Currency</TableCell>
              <TableCell>
                <div className="space-y-2">
                  <Select
                    onValueChange={(value) => form.setValue('currency', value)}
                    defaultValue={form.watch('currency')}
                    disabled={!isEditing || currencies.length === 0}
                  >
                    <SelectTrigger className="w-full bg-white border-input data-[state=active]:bg-white">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.length > 0 ? (
                        currencies.map((currency) => (
                          <SelectItem key={currency.id} value={currency.id}>
                            {currency.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>
                          No currencies available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {currencies.length === 0 && (
                    <p className="text-sm text-destructive">
                      No currencies available. Please contact your administrator.
                    </p>
                  )}
                </div>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Notes</TableCell>
              <TableCell>
                <Input
                  {...form.register('notes')}
                  placeholder="Add notes..."
                  className="w-full bg-white border-input"
                  disabled={!isEditing}
                />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div className="space-y-4">
        <FileUpload
          onFileSelect={handleFileSelect}
          onRemove={handleRemoveFile}
          files={attachments}
          accept=".pdf,.doc,.docx,.xls,.xlsx"
          multiple
        />
        {isEditing && (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        )}
      </div>
    </form>
  );
}
