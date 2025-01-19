import { db } from "@/config/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { ReferenceData } from "@/types/referenceData";

const COLLECTION_PREFIX = "referenceData";
const ORG_INDEPENDENT_TYPES = ['vendors', 'currencies', 'organizations'];

class ReferenceDataService {
  private db = db;

  private getCollectionName(type: string): string {
    return `${COLLECTION_PREFIX}_${type}`;
  }

  async getItemsByType(type: string, organization?: string): Promise<ReferenceData[]> {
    console.log('Getting reference data items:', { type, organization });
    
    try {
      const collectionName = this.getCollectionName(type);
      console.log('Collection name:', collectionName);
      
      const collectionRef = collection(this.db, collectionName);
      let q = collectionRef;

      // Only filter by organization for org-dependent types
      if (!ORG_INDEPENDENT_TYPES.includes(type as any) && organization) {
        console.log('Applying organization filter:', { type, organization });
        q = query(collectionRef, where('organization', '==', organization));
      }

      const querySnapshot = await getDocs(q);
      console.log('Query snapshot:', {
        empty: querySnapshot.empty,
        size: querySnapshot.size,
        docs: querySnapshot.docs.map(doc => doc.id)
      });
      
      const items = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ReferenceData[];

      console.log('Retrieved reference data items:', { 
        type,
        count: items.length,
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          type: item.type,
          active: item.active,
          organization: item.organization
        }))
      });

      // Filter inactive items
      const activeItems = items.filter(item => item.active);
      console.log('Filtered to active items:', {
        type,
        totalCount: items.length,
        activeCount: activeItems.length,
        items: activeItems.map(item => ({
          id: item.id,
          name: item.name,
          organization: item.organization
        }))
      });

      return activeItems;
    } catch (error) {
      console.error('Error getting reference data items:', error);
      throw error;
    }
  }

  async getDepartments(organization: string): Promise<ReferenceData[]> {
    return this.getItemsByType('departments', organization);
  }

  async getProjectCategories(organization: string): Promise<ReferenceData[]> {
    return this.getItemsByType('projectCategories', organization);
  }

  async getSites(organization: string): Promise<ReferenceData[]> {
    return this.getItemsByType('sites', organization);
  }

  async getExpenseTypes(organization: string): Promise<ReferenceData[]> {
    return this.getItemsByType('expenseTypes', organization);
  }

  async getVehicles(organization: string): Promise<ReferenceData[]> {
    return this.getItemsByType('vehicles', organization);
  }

  async getVendors(): Promise<ReferenceData[]> {
    return this.getItemsByType('vendors'); // Don't pass organization for vendors
  }

  public async getOrganizations(): Promise<ReferenceData[]> {
    console.log('Getting organizations');
    const items = await this.getItemsByType('organizations');
    console.log('Retrieved organizations:', items.map(item => ({
      id: item.id,
      name: item.name,
      active: item.active
    })));
    return items;
  }

  async getCurrencies(): Promise<ReferenceData[]> {
    return this.getItemsByType('currencies');
  }
}

export const referenceDataService = new ReferenceDataService();
