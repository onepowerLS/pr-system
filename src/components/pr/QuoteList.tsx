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
import { FileIcon, PencilIcon, TrashIcon } from 'lucide-react';

interface QuoteListProps {
  quotes: Quote[];
  onEdit: (quote: Quote) => void;
  onDelete: (quoteId: string) => void;
  onViewAttachment: (attachment: { name: string; url: string }) => void;
}

export function QuoteList({
  quotes,
  onEdit,
  onDelete,
  onViewAttachment,
}: QuoteListProps) {
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vendor</TableHead>
            <TableHead>Quote Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Contact Name</TableHead>
            <TableHead>Contact Info</TableHead>
            <TableHead>Attachments</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotes.map((quote) => (
            <TableRow key={quote.id}>
              <TableCell>{quote.vendorName}</TableCell>
              <TableCell>{format(new Date(quote.quoteDate), 'PP')}</TableCell>
              <TableCell>
                {new Intl.NumberFormat(undefined, {
                  style: 'currency',
                  currency: quote.currency,
                }).format(quote.amount)}
              </TableCell>
              <TableCell>{quote.vendorContacts.name}</TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>{quote.vendorContacts.phone}</div>
                  <div>{quote.vendorContacts.email}</div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {quote.attachments.map((attachment) => (
                    <Button
                      key={attachment.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewAttachment(attachment)}
                      title={attachment.name}
                    >
                      <FileIcon className="h-4 w-4" />
                    </Button>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(quote)}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(quote.id)}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
