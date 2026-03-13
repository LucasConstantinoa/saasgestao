import React from 'react';
import { Card, Badge } from './UI';
import { AuditEntry } from '../types';
import { Clock, Info, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { formatDate } from '../lib/utils';

interface AuditLogProps {
  logs: AuditEntry[];
}

export const AuditLog = ({ logs }: AuditLogProps) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle size={16} className="text-sky-400" />;
      case 'warning': return <AlertTriangle size={16} className="text-amber-400" />;
      case 'error': return <AlertTriangle size={16} className="text-rose-400" />;
      case 'delete': return <Trash2 size={16} className="text-rose-400" />;
      default: return <Info size={16} className="text-primary" />;
    }
  };

  return (
    <div className="space-y-4">
      {logs.length === 0 ? (
        <div className="text-center py-20 text-slate-500 italic">Nenhum registro no histórico</div>
      ) : (
        logs.map((log) => (
          <Card key={log.id} className="p-4 bg-sky-500/5 dark:bg-sky-950/20 border-sky-500/10" hoverable={false}>
            <div className="flex gap-4">
              <div className="p-2 rounded-lg bg-sky-500/5 dark:bg-sky-950/30 h-fit border border-sky-500/10">
                {getIcon(log.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h5 className="font-bold text-sm text-slate-800 dark:text-white">{log.action}</h5>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <Clock size={12} />
                    {log.timestamp ? new Date(log.timestamp).toLocaleString('pt-BR') : '-'}
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{log.detail}</p>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
};
