import React, { useState } from 'react';
import { Card, Badge } from '@/components/UI';
import { AuditEntry } from '@/types';
import { Clock, Info, CheckCircle, AlertTriangle, Trash2, Eye, Calendar, Tag, Activity } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Modal } from '@/components/Modal';

interface AuditLogProps {
  logs: AuditEntry[];
}

export const AuditLog = ({ logs }: AuditLogProps) => {
  const [selectedLog, setSelectedLog] = useState<AuditEntry | null>(null);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle size={16} className="text-emerald-500" />;
      case 'warning': return <AlertTriangle size={16} className="text-amber-500" />;
      case 'error': return <AlertTriangle size={16} className="text-destructive" />;
      case 'delete': return <Trash2 size={16} className="text-destructive" />;
      default: return <Info size={16} className="text-primary" />;
    }
  };

  return (
    <div className="space-y-4">
      {logs.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground italic">Nenhum registro no histórico</div>
      ) : (
        logs.map((log) => (
          <Card key={log.id} className="p-4 bg-muted/30 border-border group" hoverable={false}>
            <div className="flex gap-4">
              <div className="p-2 rounded-lg bg-muted h-fit border border-border">
                {getIcon(log.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h5 className="font-bold text-sm text-foreground">{log.action}</h5>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      <Clock size={12} />
                      {log.timestamp ? new Date(log.timestamp).toLocaleString('pt-BR') : '-'}
                    </div>
                    <button 
                      onClick={() => setSelectedLog(log)}
                      className="p-1.5 rounded-lg hover:bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-all"
                      title="Ver Detalhes"
                    >
                      <Eye size={14} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-1">{log.detail}</p>
              </div>
            </div>
          </Card>
        ))
      )}

      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Detalhes do Evento"
        footer={<button onClick={() => setSelectedLog(null)} className="btn-primary">Fechar</button>}
      >
        {selectedLog && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-6 rounded-[2rem] bg-muted border border-border">
              <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center border border-border">
                {getIcon(selectedLog.type)}
              </div>
              <div>
                <h4 className="text-xl font-black text-foreground tracking-tight">{selectedLog.action}</h4>
                <Badge variant={selectedLog.type as any}>{selectedLog.type.toUpperCase()}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="p-5 rounded-2xl bg-surface border border-border shadow-md">
                <div className="flex items-center gap-2 mb-3">
                  <Activity size={16} className="text-primary" />
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Descrição Completa</span>
                </div>
                <p className="text-sm font-medium text-foreground leading-relaxed">{selectedLog.detail}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-muted border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={14} className="text-primary" />
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Data</span>
                  </div>
                  <p className="text-sm font-bold text-foreground">
                    {selectedLog.timestamp ? new Date(selectedLog.timestamp).toLocaleDateString('pt-BR') : '-'}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-muted border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={14} className="text-primary" />
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Hora</span>
                  </div>
                  <p className="text-sm font-bold text-foreground">
                    {selectedLog.timestamp ? new Date(selectedLog.timestamp).toLocaleTimeString('pt-BR') : '-'}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-muted border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Tag size={14} className="text-primary" />
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">ID do Evento</span>
                </div>
                <p className="text-[10px] font-mono text-muted-foreground">#{selectedLog.id}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
