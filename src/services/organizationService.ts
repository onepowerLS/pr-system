import { db } from "@/config/firebase"
import { collection, getDocs, query, where } from "firebase/firestore"
import { Organization } from "@/types/organization"

const COLLECTION_NAME = "referenceData_organizations"

export class OrganizationService {
  async getOrganizations(): Promise<Organization[]> {
    const collectionRef = collection(db, COLLECTION_NAME)
    const snapshot = await getDocs(collectionRef)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Organization[]
  }

  async getActiveOrganizations(): Promise<Organization[]> {
    const collectionRef = collection(db, COLLECTION_NAME)
    const q = query(collectionRef, where("active", "==", true))
    const snapshot = await getDocs(q)
    const organizations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Organization[]
    console.log('Retrieved organizations (full data):', organizations);
    return organizations;
  }
}

export const organizationService = new OrganizationService()
