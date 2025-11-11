// Enum-like value definitions for database schema fields
// Used for validating fields 

import { on } from "events";

export const ENUMS = {
  users: {
    status: ['active', 'inactive', 'suspended', 'pending'] as const, 
  },

  bank:{
    status: ['active', 'inactive', 'suspended', 'pending'] as const,
  },

  agent:{
    status: ['active', 'inactive', 'suspended', 'fraud'] as const,
    onboarding_status: ['api', 'manual'] as const,
  },

  transaction_log:{
    tx_type: ['withdrawal', 'deposit'] as const,
    source: ['webhook', 'api_pull'] as const,
  },

  refill_event:{
    source: ['atm'] as const,
  },

  otp_reservation:{
    status:['issued', 'used', 'expired'] as const,
  },

  atm_feedback:{
    event: ['withdrawal_success', 'withdrawal_failed','code_invalid'] as const,
  }



} as const;