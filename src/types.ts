export interface Company {
  id: number;
  name: string;
  logo?: string;
  monthly_budget: number;
  type: 'association' | 'direct_sales'; // 'association' or 'direct_sales'
  created_at: string;
}

export interface Branch {
  id: number;
  company_id: number;
  name: string;
  balance: number;
  budget: number;
  daily_expense?: number;
  report_sent: boolean;
  created_at: string;
  updated_at?: string;
  whatsapp?: string;
  facebook_ad_account_id?: string;
  facebook_access_token?: string;
}

export interface BusinessManager {
  id: string;
  name: string;
  vertical?: string;
  profile_picture_uri?: string;
  adAccounts?: any[];
  profileId?: string;
}

export interface CampaignGroup {
  id: number;
  branch_id: number;
  name: string;
  objective?: string;
  created_at: string;
}

export interface Campaign {
  id: number;
  branch_id: number;
  group_id?: number;
  name: string;
  purpose: 'vendas' | 'leads' | 'marca';
  spend: number;
  created_at: string;
  status?: 'active' | 'paused';
  payment_source?: 'company' | 'consultant';
  meta_campaign_id?: string;
}

export interface Sale {
  id: number;
  branch_id: number;
  client_name: string;
  sale_value: number;
  membership_fee: number; // New field for association type
  monthly_fee: number;    // New field for association type
  total_ltv: number;
  roi: number;
  date: string;
  product?: string;
  channel?: string;
  notes?: string;
  item_sold?: string; // For direct sales
  installments?: number; // For direct sales
  installment_value?: number; // For direct sales
  created_at: string;
}

export interface AuditEntry {
  id: number;
  action: string;
  detail?: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'delete';
  timestamp: string;
}

export interface Notification {
  id: number;
  type: 'info' | 'success' | 'warning' | 'critical';
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
}

export interface FacebookProfile {
  id: string;
  name: string;
  token: string;
  picture_url?: string;
  email?: string;
}

export interface AppSettings {
  brandName?: string;
  logoUrl?: string;
  primaryColor?: string;
  roiThreshold?: number;
  budgetThreshold?: number;
  balanceDays?: number;
  theme?: string;
  backgroundIntensity?: number;
  branchesPerPage?: number;
  salesPerPage?: number;
  cardLayout?: 'grid' | 'expand';
  branchCardVariant?: 'list' | 'hover' | 'square' | 'innovative' | 'grid';
  facebook_access_token?: string;
  facebook_profiles?: FacebookProfile[];
  facebook_bms?: BusinessManager[];
  facebook_app_id?: string;
  facebook_app_secret?: string;
}

export interface SecurityLog {
  id: string;
  user_id: string;
  action: string;
  resource: string;
  ip_address: string;
  metadata: any;
  created_at: string;
}

export type PermissionLevel = 'none' | 'view' | 'reports_only' | 'add_sale' | 'edit';

export interface UserBranchPermission {
  id: number;
  user_id: string;
  branch_id: number;
  permission_level: PermissionLevel;
  granular_permissions: Record<string, boolean>;
  created_at: string;
}

export interface FacebookConnection {
  id: string;
  branch_id: number;
  facebook_user_id: string;
  facebook_user_name: string;
  facebook_user_picture?: string;
  facebook_email?: string;
  access_token: string;
  token_expires_at?: string;
  connected_by?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface FacebookAdAccount {
  id: string;
  connection_id: string;
  branch_id: number;
  account_id: string;
  account_name?: string;
  currency: string;
  status: string;
  created_at: string;
}

export interface FacebookInviteLink {
  id: string;
  branch_id: number;
  token: string;
  created_by?: string;
  used_at?: string;
  expires_at: string;
  created_at: string;
}

// NEW: Facebook API Response Types for Balance Fixes
export interface FundingSourceDetails {
  id: string;
  name?: string;
  display_string: string;
  balance: string;
  type: string;
  balance_source?: string;
  last_balance_fetch?: string;
}

export interface FacebookAccountResponse {
  id: string;
  balance: string;
  is_prepaid_account: boolean;
  funding_source_details?: FundingSourceDetails;
  spend_cap?: string;
  amount_spent?: string;
  account_status: string;
  total_prepaid_balance?: string;
  currency?: string;
}
