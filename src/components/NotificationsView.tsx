import React from 'react';
import { Card } from './UI';
import { Bell, CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { Notification } from '../types';
import { cn } from '../lib/utils';

interface NotificationsViewProps {
  notifications: Notification[];
  onMarkAllAsRead: () => void;
}

export const NotificationsView = ({ notifications, onMarkAllAsRead }: NotificationsViewProps) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle size={20} className="text-sky-400" />;
      case 'warning': return <AlertCircle size={20} className="text-amber-400" />;
      case 'critical': return <AlertCircle size={20} className="text-rose-400" />;
      default: return <Info size={20} className="text-primary" />;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">Notificações</h2>
        {notifications.filter(n => !n.read).length > 0 && (
          <button onClick={onMarkAllAsRead} className="btn-secondary text-sm px-3 py-1.5">
            Marcar todas como lidas
          </button>
        )}
      </div>
      
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="text-center py-20 text-slate-500 italic">Nenhuma notificação</div>
        ) : (
          notifications.map((notif) => (
            <Card key={notif.id} className={cn("p-4 flex gap-4", notif.read ? "opacity-60" : "")} hoverable={false}>
              <div className={cn(
                "p-2 rounded-lg h-fit",
                notif.type === 'success' && "bg-sky-500/10",
                notif.type === 'critical' && "bg-rose-500/10",
                notif.type === 'warning' && "bg-amber-500/10",
                notif.type === 'info' && "bg-primary/10"
              )}>
                {getIcon(notif.type)}
              </div>
              <div className="flex-1">
                <h5 className="font-bold text-sm text-slate-800 dark:text-white">{notif.title}</h5>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{notif.message}</p>
                <span className="text-[10px] text-slate-500 mt-2 block">{notif.timestamp ? new Date(notif.timestamp).toLocaleString('pt-BR') : '-'}</span>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
