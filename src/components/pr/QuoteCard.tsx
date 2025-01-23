import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { PencilIcon, TrashIcon } from 'lucide-react';
import { Quote } from '@/types/pr';
import { ReferenceDataItem } from '@/types/referenceData';

interface QuoteCardProps {
  quote: Quote;
  onEdit?: () => void;
  onDelete?: () => void;
  vendors: ReferenceDataItem[];
  currencies: ReferenceDataItem[];
}

export function QuoteCard({ quote, onEdit, onDelete, vendors, currencies }: QuoteCardProps) {
  const vendor = vendors.find(v => v.id === quote.vendorId);
  const currency = currencies.find(c => c.id === quote.currencyId);

  return (
    <Card className="bg-muted/5">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h4 className="font-medium">{vendor?.name || 'Unknown Vendor'}</h4>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{new Date(quote.quoteDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <p className="text-lg font-semibold">
                {formatCurrency(quote.amount, currency?.code || 'USD')}
              </p>
              {quote.notes && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <p className="text-sm text-muted-foreground">{quote.notes}</p>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
              >
                <PencilIcon className="h-4 w-4" />
                <span className="sr-only">Edit Quote</span>
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
              >
                <TrashIcon className="h-4 w-4" />
                <span className="sr-only">Delete Quote</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
