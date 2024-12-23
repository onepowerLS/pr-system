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
  organization?: string;
  [key: string]: any;
}

class ReferenceDataService {
  async getDepartments(organization: string): Promise<ReferenceData[]> {
    return departments.filter(dept => dept.organization === organization);
  }

  async getProjectCategories(organization: string): Promise<ReferenceData[]> {
    return projectCategories.filter(cat => cat.organization === organization);
  }

  async getSites(organization: string): Promise<ReferenceData[]> {
    return sites.filter(site => site.organization === organization);
  }

  async getExpenseTypes(organization: string): Promise<ReferenceData[]> {
    return expenseTypes.filter(type => type.organization === organization);
  }

  async getVehicles(organization: string): Promise<ReferenceData[]> {
    return vehicles.filter(vehicle => vehicle.organization === organization);
  }

  async getVendors(organization: string): Promise<ReferenceData[]> {
    return vendors.filter(vendor => vendor.organization === organization);
  }

  async getCurrencies(): Promise<ReferenceData[]> {
    return currencies;
  }
}

export const referenceDataService = new ReferenceDataService();
