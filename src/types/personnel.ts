export interface PersonnelRecord {
  firstName: string
  lastName: string
  department: string
  email: string
  password: string
  organization: string
  additionalOrg1?: string
  additionalOrg2?: string
  additionalOrg3?: string
  additionalOrg4?: string
  permissionLevel: PermissionLevel
}

export type PermissionLevel = 1 | 2 | 3 | 4

export const PERMISSION_LEVELS = {
  1: 'Admin',      // Full system access
  2: 'Manager',    // Department head access
  3: 'Procurement',// Procurement team access
  4: 'Staff'       // Basic access
} as const

export function convertPersonnelToUser(personnel: PersonnelRecord) {
  return {
    id: personnel.email || `${personnel.firstName}-${personnel.lastName}`.toLowerCase(),
    name: `${personnel.firstName} ${personnel.lastName}`,
    email: personnel.email,
    department: personnel.department,
    organization: personnel.organization,
    userType: PERMISSION_LEVELS[personnel.permissionLevel],
    additionalOrganizations: [
      personnel.additionalOrg1,
      personnel.additionalOrg2,
      personnel.additionalOrg3,
      personnel.additionalOrg4
    ].filter(Boolean) as string[]
  }
}

export function convertUserToPersonnel(user: any): PersonnelRecord {
  const [firstName, ...lastNameParts] = user.name.split(' ')
  const lastName = lastNameParts.join(' ')
  const permissionLevel = Object.entries(PERMISSION_LEVELS)
    .find(([_, title]) => title === user.userType)?.[0] as unknown as PermissionLevel || 4

  return {
    firstName,
    lastName,
    department: user.department,
    email: user.email,
    password: '', // This should be handled separately for security
    organization: user.organization,
    additionalOrg1: user.additionalOrganizations[0],
    additionalOrg2: user.additionalOrganizations[1],
    additionalOrg3: user.additionalOrganizations[2],
    additionalOrg4: user.additionalOrganizations[3],
    permissionLevel
  }
}
