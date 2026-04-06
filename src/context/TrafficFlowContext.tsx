import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, Branch, Campaign, Sale, AuditEntry, Notification, AppSettings } from '@/types';
import { useToasts } from '@/components/Toast';

interface TrafficFlowContextType {
  companies: Company[];
  branches: Branch[];
  myBranches: Branch[];
  userPermissions: any[];
  campaigns: Campaign[];
  sales: Sale[];
  notifications: Notification[];
  auditLogs: AuditEntry[];
  settings: AppSettings;
  loading: boolean;
  isAdmin: boolean;
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
  const [myBranches, setMyBranches] = useState<Branch[]>([]);
  const [userPermissions, setUserPermissions] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    brandName: 'TrafficFlow Ultimate',
    primaryColor: '#00d4ff',
    roiThreshold: 0,
    budgetThreshold: 90,
    branchesPerPage: 6,
    salesPerPage: 10,
    cardLayout: 'grid'
  });
  const [loading, setLoading] = useState(true);
  const { addToast } = useToasts();
  const isFetching = useRef(false);

  // Cache keys
  const CACHE_KEY = 'trafficflow_cache';
  const CACHE_EXPIRY = 1000 * 60 * 30; // 30 minutes

  const saveToCache = useCallback((data: any) => {
    try {
      const cacheData = {
        timestamp: Date.now(),
        data
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (e) {
      console.warn('Failed to save to cache:', e);
    }
  }, []);

  const loadFromCache = useCallback(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp > CACHE_EXPIRY) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      return data;
    } catch (e) {
      console.warn('Failed to load from cache:', e);
      return null;
    }
  }, []);

  const fetchData = useCallback(async (useCache = true) => {
    if (isFetching.current) return;
    isFetching.current = true;
    
    if (useCache) {
      const cachedData = loadFromCache();
      if (cachedData) {
        console.log('Serving from cache...');
        setCompanies(cachedData.companies || []);
        setBranches(cachedData.branches || []);
        setCampaigns(cachedData.campaigns || []);
        setSales(cachedData.sales || []);
        setNotifications(cachedData.notifications || []);
        setAuditLogs(cachedData.auditLogs || []);
        setSettings(prev => ({ ...prev, ...(cachedData.settings || {}) }));
        setLoading(false);
        // We still fetch in background to ensure freshness
      }
    }

    console.log('Fetching data from Supabase...');
    if (!loadFromCache()) setLoading(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error getting session:', sessionError);
        if (sessionError.message.includes('Refresh Token Not Found') || sessionError.message.includes('Invalid Refresh Token')) {
          await supabase.auth.signOut();
          addToast('error', 'Sessão expirada', 'Por favor, faça login novamente.');
        }
        setLoading(false);
        isFetching.current = false;
        return;
      }

      if (!sessionData.session) {
        console.log('No active session found, skipping data fetch.');
        setLoading(false);
        isFetching.current = false;
        return;
      }

      // Buscar dados do usuário na tabela public.users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', sessionData.session.user.id)
        .single();

      if (userError) {
        console.error('Error fetching user role:', userError);
        setIsAdmin(sessionData.session.user.email === 'brtreino@gmail.com');
      } else {
        setIsAdmin(userData?.role === 'admin' || sessionData.session.user.email === 'brtreino@gmail.com');
      }
      
      const fetchTable = async (tableName: string, options: any = {}) => {
        try {
          let query = supabase.from(tableName).select('*');
          if (options.order) {
            query = query.order(options.order.column, { ascending: options.order.ascending });
          }
          if (options.limit) {
            query = query.limit(options.limit);
          }
          const { data, error } = await query;
          if (error) {
            console.warn(`Error fetching ${tableName}:`, error.message, error.details, error.hint);
            return [];
          }
          console.log(`Fetched ${tableName}:`, data?.length);
          return data || [];
        } catch (err) {
          console.error(`Exception fetching ${tableName}:`, err);
          return [];
        }
      };

      const [compData, notifData, auditData, settingsDataRaw, branchesData, campaignsData, salesData, permsData] = await Promise.all([
        fetchTable('clients'),
        fetchTable('notifications', { order: { column: 'id', ascending: false }, limit: 50 }),
        fetchTable('audit_log', { order: { column: 'id', ascending: false }, limit: 100 }),
        fetchTable('settings'),
        fetchTable('branches'),
        fetchTable('campaigns'),
        fetchTable('sales'),
        supabase.from('user_branch_permissions').select('*').eq('user_id', sessionData.session.user.id).then(res => res.data || [])
      ]);

      console.log('Data fetch results:', {
        clients: compData.length,
        notifications: notifData.length,
        auditLogs: auditData.length,
        settings: settingsDataRaw.length,
        branches: branchesData.length,
        campaigns: campaignsData.length,
        sales: salesData.length
      });

      setCompanies(compData);
      setNotifications(notifData.map((n: any) => ({ ...n, timestamp: n.timestamp || n.created_at })));
      setAuditLogs(auditData.map((a: any) => ({ ...a, timestamp: a.timestamp || a.created_at })));
      setBranches(branchesData);
      setCampaigns(campaignsData);
      setSales(salesData);
      setUserPermissions(permsData);
      
      if (userData?.role === 'admin') {
        setMyBranches(branchesData);
      } else {
        const allowedBranchIds = permsData.map((p: any) => p.branch_id);
        setMyBranches(branchesData.filter((b: Branch) => allowedBranchIds.includes(b.id)));
      }
      
      const settingsData = settingsDataRaw.reduce((acc: any, curr: any) => {
        const numericKeys = ['roiThreshold', 'budgetThreshold', 'balanceDays', 'backgroundIntensity', 'branchesPerPage', 'salesPerPage'];
        const jsonKeys = ['facebook_profiles', 'facebook_bms'];
        
        if (numericKeys.includes(curr.key)) {
          acc[curr.key] = parseInt(curr.value);
        } else if (jsonKeys.includes(curr.key)) {
          try {
            const val = curr.value;
            if (!val || typeof val !== 'string' || val.trim() === '' || val === 'undefined' || val === 'null') {
              acc[curr.key] = [];
            } else {
              acc[curr.key] = JSON.parse(val);
            }
          } catch (e) {
            console.warn(`Failed to parse JSON for setting ${curr.key}:`, e);
            acc[curr.key] = [];
          }
        } else {
          acc[curr.key] = curr.value;
        }
        return acc;
      }, {});
      
      // Merge user-specific settings
      const userMeta = sessionData.session.user.user_metadata || {};
      const userSpecificKeys = ['brandName', 'logoUrl', 'theme', 'primaryColor', 'backgroundIntensity'];
      userSpecificKeys.forEach(key => {
        if (userMeta[key]) {
          settingsData[key] = userMeta[key];
        }
      });

      if (Object.keys(settingsData).length > 0) {
        setSettings(prev => ({ ...prev, ...settingsData }));
      }

      // Save to cache
      saveToCache({
        companies: compData,
        branches: branchesData,
        campaigns: campaignsData,
        sales: salesData,
        notifications: notifData.map((n: any) => ({ ...n, timestamp: n.timestamp || n.created_at })),
        auditLogs: auditData.map((a: any) => ({ ...a, timestamp: a.timestamp || a.created_at })),
        settings: settingsData
      });
    } catch (error) {
      console.error('Error fetching data:', error);

      addToast('error', 'Erro ao carregar dados', 'Não foi possível conectar ao banco de dados.');
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [addToast]);

  useEffect(() => {
    // Initial fetch
    fetchData();

    // Set up Realtime listeners for cache invalidation
    const channels = [
      supabase.channel('public:clients').on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => fetchData(false)),
      supabase.channel('public:branches').on('postgres_changes', { event: '*', schema: 'public', table: 'branches' }, () => fetchData(false)),
      supabase.channel('public:campaigns').on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, () => fetchData(false)),
      supabase.channel('public:sales').on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => fetchData(false)),
      supabase.channel('public:settings').on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => fetchData(false)),
      supabase.channel('public:user_branch_permissions').on('postgres_changes', { event: '*', schema: 'public', table: 'user_branch_permissions' }, () => fetchData(false))
    ];

    channels.forEach(channel => channel.subscribe());

    // Listen for auth changes to refetch data
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event in TrafficFlowContext:', event);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const userMeta = session?.user?.user_metadata || {};
        const isAdminUser = userMeta.role === 'admin' || session?.user?.email === 'brtreino@gmail.com';
        setIsAdmin(isAdminUser);
        fetchData(false); // Refetch fresh on auth change
      } else if (event === 'SIGNED_OUT') {
        setIsAdmin(false);
        setCompanies([]);
        setBranches([]);
        setCampaigns([]);
        setSales([]);
        setNotifications([]);
        setAuditLogs([]);
        localStorage.removeItem('trafficflow_cache');
      }
    });

    return () => {
      subscription.unsubscribe();
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [fetchData]);

  return (
    <TrafficFlowContext.Provider value={{
      companies, branches, myBranches, userPermissions, campaigns, sales, notifications, auditLogs, settings, loading, isAdmin, fetchData,
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
