import React from 'react';
import { format } from 'date-fns';
import {
  Box,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  AttachFile as AttachFileIcon,
} from '@mui/icons-material';
import { Quote } from '@/types/pr';

interface QuoteListProps {
  quotes: Quote[];
  onEdit: (quote: Quote) => void;
  onDelete: (quoteId: string) => void;
  handleFilePreview: (attachment: { name: string; url: string }) => void;
  handleDownloadQuoteAttachment: (attachment: { name: string; url: string }) => void;
  handleDeleteAttachment?: (quoteId: string, attachmentId: string) => void;
  isEditing?: boolean;
}

export function QuoteList({
  quotes,
  onEdit,
  onDelete,
  handleFilePreview,
  handleDownloadQuoteAttachment,
  handleDeleteAttachment,
  isEditing = false,
}: QuoteListProps) {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Vendor</TableCell>
            <TableCell>Quote Date</TableCell>
            <TableCell>Amount</TableCell>
            <TableCell>Contact Name</TableCell>
            <TableCell>Contact Info</TableCell>
            <TableCell>Attachments</TableCell>
            {isEditing && <TableCell>Actions</TableCell>}
          </TableRow>
        </TableHead>
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
              <TableCell>{quote.vendorContacts?.name}</TableCell>
              <TableCell>
                <Box>
                  <Typography variant="body2">{quote.vendorContacts?.phone}</Typography>
                  <Typography variant="body2">{quote.vendorContacts?.email}</Typography>
                </Box>
              </TableCell>
              <TableCell>
                {quote.attachments?.map((attachment, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <AttachFileIcon fontSize="small" />
                    <Typography variant="body2" sx={{ mr: 1 }}>
                      {attachment.name}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleFilePreview(attachment)}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDownloadQuoteAttachment(attachment)}
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                    {isEditing && handleDeleteAttachment && (
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteAttachment(quote.id, attachment.id)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                ))}
              </TableCell>
              {isEditing && (
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                      size="small"
                      onClick={() => onEdit(quote)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => onDelete(quote.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
