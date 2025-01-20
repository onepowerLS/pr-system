export interface ReferenceDataItem {
  id: string;
  name?: string;
  code?: string;
  organizationId?: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;

  // Vendor specific fields
  approvalDate?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  url?: string;
  notes?: string;

  // Organization specific fields
  /** Code used as unique identifier (e.g., '1PWR_LSO') */
  code?: string;
  /** Display name for the organization (e.g., '1PWR Lesotho') */
  name?: string;
  /** Country where the organization is located */
  country?: string;
  /** Timezone offset from GMT in hours (e.g., +2 for SAST) */
  timezoneOffset?: number;
  /** Currency code used by the organization (e.g., 'LSL') */
  currency?: string;

  // Permission specific fields
  level?: number;
  actions?: string[];
  scope?: string[];

  // Vehicle specific fields
  /** Registration number of the vehicle (required) */
  registrationNumber?: string;
  /** Manufacturing year of the vehicle (required) */
  year?: number;
  /** Manufacturer of the vehicle (required) */
  make?: string;
  /** Model of the vehicle (required) */
  model?: string;
  /** Vehicle Identification Number (optional) */
  vinNumber?: string;
  /** Engine number for identification (optional) */
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
  'organizations'
] as const;

// Types that use code as ID
export const CODE_BASED_ID_TYPES = [
  'currencies',
  'uom',
  'organizations'
] as const;
