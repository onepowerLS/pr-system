export interface ReferenceDataItem {
  id: string;
  name: string;
  code?: string;
  organization: string;
  description?: string;
  active: boolean;
  // Vendor specific fields
  approvalDate?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  url?: string;
  notes?: string;
}

export type ReferenceDataType = 
  | 'departments'
  | 'sites'
  | 'expenseTypes'
  | 'projectCategories'
  | 'vendors'
  | 'currencies'
  | 'uom';
