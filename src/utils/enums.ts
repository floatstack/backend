// Enum-like value definitions for database schema fields
// Used for validating fields 

export const ENUMS = {
  users: {
    status: ['active', 'inactive', 'suspended', 'pending'] as const, 
  }
} as const;