import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Company, Branch, Campaign, Sale, AuditEntry, Notification, AppSettings } from '../types';
import { useToasts } from '../components/Toast';

interface TrafficFlowContextType {
  companies: Company[];
  branches: Branch[];
  campaigns: Campaign[];
  sales: Sale[];
  notifications: Notification[];
  auditLogs: AuditEntry[];
  settings: AppSettings;
  loading: boolean;
  fetchData: () => Promise<void>;
  setCompanies: React.Dispatch<React.SetStateAction<Company[]>>;
  setBranches: React.Dispatch<React.SetStateAction<Branch[]>>;
  setCampaigns: React.Dispatch<React.SetStateAction<Campaign[]>>;
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  setAuditLogs: React.Dispatch<React.SetStateAction<AuditEntry[]>>;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

const TrafficFlowContext = createContext<TrafficFlowContextType | undefined>(undefined);

export const TrafficFlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    brandName: 'TrafficFlow Ultimate',
    primaryColor: '#00d4ff',
    roiThreshold: 0,
    budgetThreshold: 90
  });
  const [loading, setLoading] = useState(true);
  const { addToast } = useToasts();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [compRes, notifRes, auditRes, settingsRes] = await Promise.all([
        supabase.from('clients').select('*'),
        supabase.from('notifications').select('*').order('timestamp', { ascending: false }).limit(50),
        supabase.from('audit_log').select('*').order('timestamp', { ascending: false }).limit(100),
        supabase.from('settings').select('*')
      ]);
      
      if (compRes.error) throw compRes.error;
      if (notifRes.error) throw notifRes.error;
      if (auditRes.error) throw auditRes.error;
      if (settingsRes.error) throw settingsRes.error;

      setCompanies(compRes.data || []);
      setNotifications(notifRes.data || []);
      setAuditLogs(auditRes.data || []);
      
      const settingsData = settingsRes.data.reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});
      if (Object.keys(settingsData).length > 0) {
        setSettings(settingsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      addToast('error', 'Erro ao carregar dados', 'Não foi possível conectar ao banco de dados.');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <TrafficFlowContext.Provider value={{
      companies, branches, campaigns, sales, notifications, auditLogs, settings, loading, fetchData,
      setCompanies, setBranches, setCampaigns, setSales, setNotifications, setAuditLogs, setSettings
    }}>
      {children}
    </TrafficFlowContext.Provider>
  );
};

export const useTrafficFlow = () => {
  const context = useContext(TrafficFlowContext);
  if (!context) throw new Error('useTrafficFlow must be used within a TrafficFlowProvider');
  return context;
};
