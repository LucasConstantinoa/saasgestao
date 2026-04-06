import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | undefined | null, decimals: number = 2, currency: string = 'BRL') {
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value || 0);
  } catch (e) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value || 0);
  }
}

export function formatPercent(value: number | undefined | null) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format((value || 0) / 100);
}

export function formatDate(date: string | undefined | null) {
  if (!date) return '-';
  const d = new Date(date);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('pt-BR');
}

export function calculateDailySpend(campaigns: { spend: number | undefined | null, status?: string, payment_source?: string }[]): number {
  return campaigns.reduce((acc, c) => {
    if (c.status === 'paused') return acc;
    if (c.payment_source === 'consultant') return acc;
    return acc + (c.spend || 0);
  }, 0);
}

export function calculateRealTimeBalance(branch: any) {
  return branch.balance || 0;
}

export function getHealthStatus(balance: number, dailySpend: number, balanceDaysThreshold: number = 7) {
  if (balance <= 0) return { status: 'empty', color: 'bg-gray-400 dark:bg-slate-600', label: 'Esgotado', days: 0, rechargeDate: null };
  const days = dailySpend > 0 ? Math.floor(balance / dailySpend) : Infinity;
  
  const rechargeDate = new Date();
  if (days !== Infinity) {
    rechargeDate.setDate(rechargeDate.getDate() + days);
  }

  if (days < 3) return { status: 'critical', color: 'bg-rose-500', label: 'CRÍTICO', days, rechargeDate };
  if (days < balanceDaysThreshold) return { status: 'warning', color: 'bg-amber-500', label: 'Atenção', days, rechargeDate };
  return { status: 'healthy', color: 'bg-sky-500', label: 'Seguro', days, rechargeDate };
}

export const isCriticalBranchesDismissed = (companyId: number) => {
  try {
    const dismissals = JSON.parse(localStorage.getItem('dismissedCriticalBranches') || '{}');
    const dismissedAt = dismissals[companyId];
    if (dismissedAt) {
      const twentyFourHours = 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedAt < twentyFourHours) {
        return true;
      }
    }
  } catch (e) {
    console.error('Error reading dismissedCriticalBranches from localStorage', e);
  }
  return false;
};

export const dismissCriticalBranchesForCompany = (companyId: number) => {
  try {
    const dismissals = JSON.parse(localStorage.getItem('dismissedCriticalBranches') || '{}');
    dismissals[companyId] = Date.now();
    localStorage.setItem('dismissedCriticalBranches', JSON.stringify(dismissals));
  } catch (e) {
    console.error('Error saving dismissedCriticalBranches to localStorage', e);
  }
};
