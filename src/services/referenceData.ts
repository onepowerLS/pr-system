import {
  departments,
  projectCategories,
  sites,
  expenseTypes,
  vehicles,
  vendors,
  currencies
} from './localReferenceData';

interface ReferenceData {
  id: string;
  name: string;
  code?: string;
  isActive: boolean;
  [key: string]: any;
}

class ReferenceDataService {
  async getDepartments(_organization: string): Promise<ReferenceData[]> {
    return departments;
  }

  async getProjectCategories(_organization: string): Promise<ReferenceData[]> {
    return projectCategories;
  }

  async getSites(_organization: string): Promise<ReferenceData[]> {
    return sites;
  }

  async getExpenseTypes(_organization: string): Promise<ReferenceData[]> {
    return expenseTypes;
  }

  async getVehicles(_organization: string): Promise<ReferenceData[]> {
    return vehicles;
  }

  async getVendors(_organization: string): Promise<ReferenceData[]> {
    return vendors;
  }

  async getCurrencies(): Promise<ReferenceData[]> {
    return currencies;
  }
}

export const referenceDataService = new ReferenceDataService();
