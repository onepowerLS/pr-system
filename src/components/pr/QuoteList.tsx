import React from 'react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Quote } from '@/types/pr';
import { FileIcon, PencilIcon, TrashIcon, DownloadIcon } from 'lucide-react';

interface QuoteListProps {
  quotes: Quote[];
  onEdit: (quote: Quote) => void;
  onDelete: (quoteId: string) => void;
  handleFilePreview: (attachment: { name: string; url: string }) => void;
  handleDownloadQuoteAttachment: (attachment: { name: string; url: string }) => void;
  isEditing?: boolean;
}

export function QuoteList({
  quotes,
  onEdit,
  onDelete,
  handleFilePreview,
  handleDownloadQuoteAttachment,
  isEditing = false,
}: QuoteListProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-medium">Vendor</TableHead>
            <TableHead className="font-medium">Quote Date</TableHead>
            <TableHead className="font-medium">Amount</TableHead>
            <TableHead className="font-medium">Contact Name</TableHead>
            <TableHead className="font-medium">Contact Info</TableHead>
            <TableHead className="font-medium">Attachments</TableHead>
            {isEditing && <TableHead className="font-medium">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotes.map((quote) => (
            <TableRow key={quote.id}>
              <TableCell className="bg-white">{quote.vendorName}</TableCell>
              <TableCell className="bg-white">{format(new Date(quote.quoteDate), 'PP')}</TableCell>
              <TableCell className="bg-white">
                {new Intl.NumberFormat(undefined, {
                  style: 'currency',
                  currency: quote.currency,
                }).format(quote.amount)}
              </TableCell>
              <TableCell className="bg-white">{quote.vendorContacts?.name}</TableCell>
              <TableCell className="bg-white">
                <div className="text-sm">
                  <div>{quote.vendorContacts?.phone}</div>
                  <div>{quote.vendorContacts?.email}</div>
                </div>
              </TableCell>
              <TableCell className="bg-white">
                <div className="flex flex-col gap-2">
                  {quote.attachments?.map((attachment) => (
                    <div key={attachment.id} className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFilePreview(attachment)}
                        className="h-8 px-2"
                      >
                        <FileIcon className="h-4 w-4 mr-1" />
                        <span className="text-xs truncate max-w-[100px]">
                          {attachment.name}
                        </span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadQuoteAttachment(attachment)}
                        className="h-8 w-8 p-0"
                      >
                        <DownloadIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </TableCell>
              {isEditing && (
                <TableCell className="bg-white">
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(quote)}
                      className="h-8 w-8 p-0"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(quote.id)}
                      className="h-8 w-8 p-0"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
