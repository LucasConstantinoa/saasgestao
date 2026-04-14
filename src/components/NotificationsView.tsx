import React from 'react';
import { Card } from '@/components/UI';
import { Bell, CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { Notification } from '@/types';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface NotificationsViewProps {
  notifications: Notification[];
  onMarkAllAsRead: () => void;
  onClearAll?: () => void;
  onMarkAsRead?: (id: number) => void;
  onDelete?: (id: number) => void;
  isPopover?: boolean;
}

export const NotificationsView = ({ 
  notifications, 
  onMarkAllAsRead, 
  onClearAll,
  onMarkAsRead,
  onDelete,
  isPopover = false 
}: NotificationsViewProps) => {
  const navigate = useNavigate();
  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle size={20} className="text-emerald-500" />;
      case 'warning': return <AlertCircle size={20} className="text-amber-500" />;
      case 'critical': return <AlertCircle size={20} className="text-rose-500" />;
      default: return <Info size={20} className="text-primary" />;
    }
  };

  return (
    <div className={cn("space-y-6", isPopover ? "space-y-4" : "space-y-8")}>
      {!isPopover && (
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Notificações</h2>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button 
                onClick={onClearAll} 
                className="btn-secondary text-rose-500 hover:bg-rose-500/10 text-sm px-3 py-1.5 flex items-center gap-2"
              >
                <X size={14} />
                Limpar Tudo
              </button>
            )}
            {notifications.filter(n => !n.read).length > 0 && (
              <button onClick={onMarkAllAsRead} className="btn-secondary text-sm px-3 py-1.5">
                Marcar todas como lidas
              </button>
            )}
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className={cn("text-center text-muted-foreground italic", isPopover ? "py-10 text-sm" : "py-20")}>
            Nenhuma notificação
          </div>
        ) : (
          notifications.map((notif) => (
            <Card 
              key={notif.id} 
              className={cn(
                "p-4 flex gap-4 relative group transition-all duration-300 cursor-pointer hover:border-primary/40", 
                notif.read ? "opacity-60 grayscale-[0.5]" : "border-primary/20 bg-primary/5 shadow-[0_0_15px_rgba(var(--primary-rgb),0.05)]"
              )} 
              hoverable={false}
              onClick={() => {
                if ((notif as any).branch_id) {
                  navigate(`/companies/${(notif as any).company_id || '0'}/branches/${(notif as any).branch_id}`);
                }
                if (onMarkAsRead) onMarkAsRead(notif.id);
              }}
            >
              <div className={cn(
                "p-2 rounded-lg h-fit",
                notif.type === 'success' && "bg-emerald-500/10",
                notif.type === 'critical' && "bg-rose-500/10",
                notif.type === 'warning' && "bg-amber-500/10",
                notif.type === 'info' && "bg-primary/10"
              )}>
                {getIcon(notif.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <h5 className="font-bold text-sm text-foreground">{notif.title}</h5>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notif.read && onMarkAsRead && (
                      <button 
                        onClick={() => onMarkAsRead(notif.id)}
                        className="p-1 hover:bg-primary/20 rounded-md text-primary transition-colors"
                        title="Marcar como lida"
                      >
                        <CheckCircle size={14} />
                      </button>
                    )}
                    {onDelete && (
                      <button 
                        onClick={() => onDelete(notif.id)}
                        className="p-1 hover:bg-rose-500/20 rounded-md text-rose-500 transition-colors"
                        title="Excluir"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{notif.message}</p>
                <span className="text-[10px] text-muted-foreground mt-2 block">{notif.timestamp ? new Date(notif.timestamp).toLocaleString('pt-BR') : '-'}</span>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
