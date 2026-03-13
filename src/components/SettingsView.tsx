import React, { useState } from 'react';
import { Card } from './UI';
import { AppSettings } from '../types';
import { Save } from 'lucide-react';
import styled from 'styled-components';

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
  onSave: (settings: AppSettings) => void;
  isPopover?: boolean; // New prop
}

export const SettingsView = ({ settings, onSave, isPopover = false }: SettingsViewProps) => {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleChange = (key: keyof AppSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    
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
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-500 dark:text-primary/40 uppercase tracking-[0.2em]">Tema (DarkGlass)</label>
      <div className="flex gap-4">
        <button 
          className={cn("px-4 py-2 rounded-xl text-sm font-bold border transition-all", localSettings.theme === 'dark-glass' ? "bg-primary/20 border-primary text-primary" : "bg-slate-50 border-slate-200 text-slate-500")}
          onClick={() => handleChange('theme', 'dark-glass')}
        >
          DarkGlass
        </button>
      </div>
    </div>
  );

  if (isPopover) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 dark:text-primary/40 uppercase tracking-[0.2em]">Nome da Agência</label>
          <input 
            type="text" 
            value={localSettings.brandName || ''}
            onChange={(e) => handleChange('brandName', e.target.value)}
            className="w-full bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 dark:text-primary/40 uppercase tracking-[0.2em]">Cor Primária</label>
          {renderColorSelector()}
        </div>
        {renderThemeSelector()}
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
        <h3 className="text-lg font-black tracking-tight mb-8 text-slate-800 dark:text-white uppercase tracking-widest">Configurações de Marca</h3>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 dark:text-primary/40 uppercase tracking-[0.2em]">Nome da Agência/Marca</label>
            <input 
              type="text" 
              value={localSettings.brandName || ''}
              onChange={(e) => handleChange('brandName', e.target.value)}
              className="w-full bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 dark:text-primary/40 uppercase tracking-[0.2em]">URL da Logo</label>
            <input 
              type="text" 
              value={localSettings.logoUrl || ''}
              onChange={(e) => handleChange('logoUrl', e.target.value)}
              className="w-full bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 dark:text-primary/40 uppercase tracking-[0.2em]">Cor Primária</label>
            {renderColorSelector()}
          </div>
          {renderThemeSelector()}
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-black tracking-tight mb-8 text-slate-800 dark:text-white uppercase tracking-widest">Limites e Alertas</h3>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-primary/40 uppercase tracking-[0.2em]">Alerta de ROI abaixo de (%)</label>
              <input 
                type="number" 
                value={localSettings.roiThreshold || 0}
                onChange={(e) => handleChange('roiThreshold', parseInt(e.target.value))}
                className="w-full bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-primary/40 uppercase tracking-[0.2em]">Alerta de Budget acima de (%)</label>
              <input 
                type="number" 
                value={localSettings.budgetThreshold || 90}
                onChange={(e) => handleChange('budgetThreshold', parseInt(e.target.value))}
                className="w-full bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
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
