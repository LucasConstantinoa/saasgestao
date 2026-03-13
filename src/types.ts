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
  notes? : string;
  item_sold?: string; // For direct sales
  installments?: number; // For direct sales
  installment_value?: number; // For direct sales
  created_at: string;
  notes?: string;
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

export interface AppSettings {
  brandName?: string;
  logoUrl?: string;
  primaryColor?: string;
  roiThreshold?: number;
  budgetThreshold?: number;
  balanceDays?: number;
}
