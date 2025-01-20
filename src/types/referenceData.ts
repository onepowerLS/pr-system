export interface ReferenceDataItem {
  id: string;
  name?: string;
  code?: string;
  organization?: {
    id: string;
    name: string;
  } | string;
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
  // Organization specific fields
  shortName?: string;
  country?: string;
  timezone?: string;
  currency?: string;
  // Permission specific fields
  level?: number;
  actions?: string[];
  scope?: string[];
  // Vehicle specific fields
  registrationNumber?: string;
  year?: number;
  make?: string;
  model?: string;
  vinNumber?: string;
  engineNumber?: string;
}

export type ReferenceDataType = 
  | 'departments'
  | 'sites'
  | 'expenseTypes'
  | 'projectCategories'
  | 'vendors'
  | 'currencies'
  | 'uom'
  | 'organizations'
  | 'permissions'
  | 'vehicles';

// Types that don't depend on organization
export const ORG_INDEPENDENT_TYPES = [
  'currencies',
  'uom',
  'organizations',
  'permissions'
] as const;

// Types that use code as ID
export const CODE_BASED_ID_TYPES = [
  'currencies',
  'uom',
  'organizations'
] as const;
