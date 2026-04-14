import React, { useState } from 'react';
import { Card } from '@/components/UI';
import { AppSettings, Branch } from '@/types';
import { Save } from 'lucide-react';
import styled from 'styled-components';
import { cn } from '@/lib/utils';

const ColorSelectorWrapper = styled.div`
  .container-items {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 5px;
    overflow-x: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }
  }

  .item-color {
    position: relative;
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border: none;
    outline: none;
    transition: 300ms cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;

    &::after {
      content: "";
      width: 32px;
      height: 32px;
      background-color: var(--color);
      border-radius: 8px;
      transition: 300ms cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      border: 2px solid rgba(255, 255, 255, 0.1);
    }

    &:hover {
      transform: translateY(-4px) scale(1.1);
      
      &::after {
        box-shadow: 0 10px 15px -3px var(--color), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      }
    }
  }

  .item-color.selected::after {
    transform: scale(1.2);
    border: 3px solid white;
    box-shadow: 0 0 0 2px var(--color);
  }
`;

const COLORS = [
  '#e11d48', '#f472b6', '#fb923c', '#facc15', '#84cc16', 
  '#10b981', '#0ea5e9', '#3b82f6', '#8b5cf6', '#a78bfa'
];

interface SettingsViewProps {
  settings: AppSettings;
  onSave: (settings: AppSettings, silent?: boolean) => void;
  isPopover?: boolean;
  branches?: Branch[];
}

export const SettingsView = ({ settings, onSave, isPopover = false, branches = [] }: SettingsViewProps) => {
  const [localSettings, setLocalSettings] = useState(settings);

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = (key: keyof AppSettings, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    
    // Live preview for primary color
    if (key === 'primaryColor') {
      document.documentElement.style.setProperty('--primary', value);
      const hex = value.replace('#', '');
      if (hex.length === 6) {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        document.documentElement.style.setProperty('--primary-rgb', `${r}, ${g}, ${b}`);
      }
    }

    // Live preview for theme
    if (key === 'theme') {
      onSave(newSettings, true);
    }

    // Live preview for branch card variant
    if (key === 'branchCardVariant') {
      onSave(newSettings, true);
    }
  };

  const renderColorSelector = () => (
    <ColorSelectorWrapper>
      <div className="container-items">
        {COLORS.map(color => (
          <button 
            key={color}
            className={`item-color ${localSettings.primaryColor === color ? 'selected' : ''}`} 
            style={{ '--color': color } as React.CSSProperties} 
            data-color={color}
            onClick={() => handleChange('primaryColor', color)}
            type="button"
          />
        ))}
      </div>
    </ColorSelectorWrapper>
  );

  const renderThemeSelector = () => (
    <div className="space-y-3">
      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Tema</label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { id: 'light', name: 'Claro' },
          { id: 'light-gray', name: 'Cinza Claro' },
          { id: 'dark', name: 'Escuro' },
          { id: 'slate-theme', name: 'Slate' },
          { id: 'zinc-theme', name: 'Zinc' },
          { id: 'transparent-glass', name: 'Super Glass' }
        ].map((theme) => (
          <button
            key={theme.id}
            onClick={() => handleChange('theme', theme.id)}
            className={cn(
              "p-2 rounded-xl border-2 transition-all text-center group",
              localSettings.theme === theme.id 
                ? "border-primary bg-primary/5" 
                : "border-border hover:border-primary/50"
            )}
          >
            <div className={cn(
              "w-full h-12 rounded-lg mb-2 flex items-center justify-center border transition-all",
              theme.id === 'light' ? "bg-white border-border" : 
              theme.id === 'light-gray' ? "bg-muted border-border" :
              theme.id === 'dark' ? "bg-slate-950 border-border" : 
              theme.id === 'slate-theme' ? "bg-slate-900 border-border" :
              theme.id === 'zinc-theme' ? "bg-zinc-950 border-border" :
              "bg-white/10 backdrop-blur-xl border-white/20"
            )}>
              {localSettings.theme === theme.id && (
                <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
              )}
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">{theme.name}</span>
          </button>
        ))}
      </div>
    </div>
  );

  if (isPopover) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Nome da Agência</label>
          <input 
            type="text" 
            value={localSettings.brandName || ''}
            onChange={(e) => handleChange('brandName', e.target.value)}
            className={cn(
              "w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/50 transition-all",
              "bg-surface border border-border text-foreground"
            )}
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Cor Primária</label>
          {renderColorSelector()}
        </div>
        {renderThemeSelector()}

        <div className="space-y-3">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Layout dos Cards</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'grid', name: 'Grade (Padrão)' },
              { id: 'expand', name: 'Expansível (Hover)' }
            ].map((layout) => (
              <button
                key={layout.id}
                onClick={() => handleChange('cardLayout', layout.id)}
                className={cn(
                  "p-3 rounded-xl border-2 transition-all text-center group flex flex-col items-center gap-2",
                  localSettings.cardLayout === layout.id 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className="w-full h-10 flex items-center justify-center gap-1">
                  {layout.id === 'grid' ? (
                    <div className="grid grid-cols-3 gap-1 w-12 h-8">
                      <div className="bg-muted-foreground/30 rounded-sm"></div>
                      <div className="bg-muted-foreground/30 rounded-sm"></div>
                      <div className="bg-muted-foreground/30 rounded-sm"></div>
                    </div>
                  ) : (
                    <div className="flex gap-1 w-12 h-8 items-center">
                      <div className="bg-muted-foreground/20 rounded-sm w-2 h-6"></div>
                      <div className="bg-primary/50 rounded-sm w-6 h-8"></div>
                      <div className="bg-muted-foreground/20 rounded-sm w-2 h-6"></div>
                    </div>
                  )}
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">{layout.name}</span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="space-y-2 pt-4 border-t border-border">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Integrações</label>
          <p className="text-xs text-muted-foreground">A integração com o Facebook Ads agora possui uma aba exclusiva no menu principal para administradores.</p>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Filiais por Página (Relatórios)</label>
          <select 
            value={localSettings.branchesPerPage || 6}
            onChange={(e) => handleChange('branchesPerPage', parseInt(e.target.value))}
            className={cn(
              "w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/50 transition-all",
              "bg-surface border border-border text-foreground"
            )}
          >
            {[3, 6, 9, 12, 15, 20].map(n => (
              <option key={n} value={n} className="bg-surface text-foreground">{n} Filiais</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Vendas por Página</label>
          <select 
            value={localSettings.salesPerPage || 10}
            onChange={(e) => handleChange('salesPerPage', parseInt(e.target.value))}
            className={cn(
              "w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/50 transition-all",
              "bg-surface border border-border text-foreground"
            )}
          >
            {[5, 10, 20, 50, 100].map(n => (
              <option key={n} value={n} className="bg-surface text-foreground">{n} Vendas</option>
            ))}
          </select>
        </div>
        <button 
          onClick={() => onSave(localSettings)}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm"
        >
          <Save size={16} />
          <span>Salvar</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <Card>
        <h3 className="text-lg font-black tracking-tight mb-8 text-foreground uppercase tracking-widest">Configurações de Marca</h3>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Nome da Agência/Marca</label>
            <input 
              type="text" 
              value={localSettings.brandName || ''}
              onChange={(e) => handleChange('brandName', e.target.value)}
              className={cn(
                "w-full rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all",
                "bg-surface border border-border text-foreground"
              )}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">URL da Logo</label>
            <input 
              type="text" 
              value={localSettings.logoUrl || ''}
              onChange={(e) => handleChange('logoUrl', e.target.value)}
              className={cn(
                "w-full rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all",
                "bg-surface border border-border text-foreground"
              )}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Intensidade do Fundo (Dark Mode)</label>
            <input 
              type="range" 
              min="0" 
              max="20" 
              step="1"
              value={localSettings.backgroundIntensity ?? 4}
              onChange={(e) => handleChange('backgroundIntensity', parseInt(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[9px] text-muted-foreground/60 uppercase tracking-widest">
              <span>Mais Suave</span>
              <span>Mais Intenso</span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Cor Primária</label>
            {renderColorSelector()}
          </div>
          {renderThemeSelector()}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Layout dos Cards (Empresas e Filiais)</label>
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'grid', name: 'Grade Tradicional', desc: 'Visualização em colunas padrão' },
                { id: 'expand', name: 'Expansão Suave', desc: 'Cards expandem ao passar o mouse' }
              ].map((layout) => (
                <button
                  key={layout.id}
                  onClick={() => handleChange('cardLayout', layout.id)}
                  className={cn(
                    "p-4 rounded-2xl border-2 transition-all text-left group relative overflow-hidden",
                    localSettings.cardLayout === layout.id 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="relative z-10">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest block mb-1",
                      localSettings.cardLayout === layout.id ? "text-primary" : "text-muted-foreground"
                    )}>
                      {layout.name}
                    </span>
                    <p className="text-[9px] text-muted-foreground/70 font-bold leading-tight">{layout.desc}</p>
                  </div>
                  {localSettings.cardLayout === layout.id && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-black tracking-tight mb-8 text-foreground uppercase tracking-widest">Integrações Externas</h3>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Facebook App ID (Opcional)</label>
            <p className="text-xs text-muted-foreground mb-2">Configure o App ID para habilitar o botão de Login com o Facebook na aba de Integração.</p>
            <input 
              type="text" 
              placeholder="Ex: 123456789012345"
              value={localSettings.facebook_app_id || ''}
              onChange={(e) => handleChange('facebook_app_id', e.target.value)}
              className={cn(
                "w-full rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all",
                "bg-surface border border-border text-foreground"
              )}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Facebook App Secret (Opcional)</label>
            <p className="text-xs text-muted-foreground mb-2">Configure o App Secret para permitir a geração de tokens de longa duração.</p>
            <input 
              type="password" 
              placeholder="Sua App Secret do Facebook"
              value={localSettings.facebook_app_secret || ''}
              onChange={(e) => handleChange('facebook_app_secret', e.target.value)}
              className={cn(
                "w-full rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all",
                "bg-surface border border-border text-foreground"
              )}
            />
          </div>
          <p className="text-sm text-muted-foreground pt-4 border-t border-border">A integração completa com o Facebook Ads possui uma aba exclusiva no menu principal para administradores.</p>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-black tracking-tight mb-8 text-foreground uppercase tracking-widest">Limites e Alertas</h3>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Alerta de ROI abaixo de (%)</label>
              <input 
                type="number" 
                value={localSettings.roiThreshold || 0}
                onChange={(e) => handleChange('roiThreshold', parseInt(e.target.value))}
                className={cn(
                  "w-full rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all",
                  "bg-surface border border-border text-foreground"
                )}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Alerta de Budget acima de (%)</label>
              <input 
                type="number" 
                value={localSettings.budgetThreshold || 90}
                onChange={(e) => handleChange('budgetThreshold', parseInt(e.target.value))}
                className={cn(
                  "w-full rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all",
                  "bg-surface border border-border text-foreground"
                )}
              />
            </div>
          </div>
        </div>
      </Card>

      <button 
        onClick={() => onSave(localSettings)}
        className="btn-primary w-full flex items-center justify-center gap-2 py-4"
      >
        <Save size={20} />
        <span>Salvar Configurações</span>
      </button>
    </div>
  );
};
