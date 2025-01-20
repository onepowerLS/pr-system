import { db } from "@/config/firebase";
import { collection, getDocs, query, where, addDoc, writeBatch, doc } from "firebase/firestore";

export interface OrganizationData {
  id: string;
  name: string;
}

export interface ReferenceData {
  id: string;
  name: string;
  code?: string;
  type?: string;
  active: boolean;
  organization?: OrganizationData;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

const COLLECTION_PREFIX = "referenceData_";
const ORG_INDEPENDENT_TYPES = ['vendors', 'currencies', 'organizations', 'uom', 'permissions'];

class ReferenceDataService {
  private db = db;

  private getCollectionName(type: string): string {
    return `${COLLECTION_PREFIX}${type}`;
  }

  private generateId(type: string, code: string): string {
    if (['currencies', 'uom', 'organizations'].includes(type)) {
      return code.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }
    return null; // Let Firestore auto-generate
  }

  private handleError(error: any, context: string): never {
    console.error(`Error ${context}:`, error);
    throw error;
  }

  private normalizeOrganizationId(orgId: string | OrganizationData): string {
    if (!orgId) return '';
    const id = typeof orgId === 'string' ? orgId : orgId.id;
    return id.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  async getItemsByType(type: string, organization?: string | OrganizationData): Promise<ReferenceData[]> {
    console.log('Getting reference data items:', { type, organization });
    
    try {
      const collectionName = this.getCollectionName(type);
      console.log('Collection name:', collectionName);
      
      const collectionRef = collection(this.db, collectionName);
      let q = collectionRef;

      // Only filter by organization for org-dependent types
      if (!ORG_INDEPENDENT_TYPES.includes(type) && organization) {
        const normalizedOrgId = this.normalizeOrganizationId(organization);
        console.log('Applying organization filter:', { type, organization, normalizedOrgId });
        q = query(collectionRef, where('organization.id', '==', normalizedOrgId));
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
      return this.handleError(error, 'getting reference data items');
    }
  }

  async getDepartments(organization: string): Promise<ReferenceData[]> {
    console.log('Getting departments for organization:', organization);
    
    try {
      const collectionRef = collection(this.db, this.getCollectionName('departments'));
      const q = query(collectionRef, where('organization.id', '==', organization));
      const querySnapshot = await getDocs(q);

      const items = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ReferenceData[];

      // Log the results for debugging
      console.log('Found departments:', {
        total: items.length,
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          organization: item.organization
        }))
      });

      return items.filter(item => item.active);
    } catch (error) {
      return this.handleError(error, 'getting departments');
    }
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
    return this.getItemsByType('vendors');
  }

  async getOrganizations(): Promise<ReferenceData[]> {
    return this.getItemsByType('organizations');
  }

  async getCurrencies(): Promise<ReferenceData[]> {
    return this.getItemsByType('currencies');
  }

  async createItem(type: string, data: Omit<ReferenceData, 'id'>): Promise<ReferenceData> {
    try {
      const collectionName = this.getCollectionName(type);
      const id = this.generateId(type, data.code);
      const timestamp = new Date().toISOString();
      
      const itemData = {
        ...data,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      if (id) {
        // Use custom ID for specified types
        const docRef = doc(this.db, collectionName, id);
        await writeBatch(this.db).set(docRef, itemData).commit();
        return { id, ...itemData };
      } else {
        // Use auto-generated ID for other types
        const docRef = await addDoc(collection(this.db, collectionName), itemData);
        return { id: docRef.id, ...itemData };
      }
    } catch (error) {
      return this.handleError(error, 'creating reference data item');
    }
  }
}

export const referenceDataService = new ReferenceDataService();
