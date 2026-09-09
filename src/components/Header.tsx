import React from 'react';
import { 
  FileText, 
  PlusCircle, 
  Settings, 
  Layers, 
  ShieldCheck, 
  LogOut, 
  Wrench,
  Sparkles,
  Building2
} from 'lucide-react';
import { UserAccount, WorkshopProfile } from '../types';

export type NavigationTab = 'novo_orcamento' | 'orcamentos_salvos' | 'insumos' | 'configuracoes';

interface HeaderProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  currentUser: UserAccount;
  workshop: WorkshopProfile;
  savedQuotesCount: number;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  workshop,
  savedQuotesCount,
  onLogout,
}) => {
  return (
    <header id="app-header" className="sticky top-0 z-40 bg-[#0A0A0C]/95 backdrop-blur-md border-b border-[#1E3349] text-slate-100">
      {/* Top Utility Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand & Workshop Info */}
          <div className="flex items-center gap-3.5 min-w-0">
            {/* AutoGold Brand Icon */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0066FF] to-[#003882] flex items-center justify-center text-white shadow-md shadow-blue-900/40 border border-blue-400/40 shrink-0">
              <Wrench className="w-5 h-5 text-white" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  <span className="font-black text-lg tracking-wider text-white">AUTO</span>
                  <span className="font-black text-lg tracking-wider bg-gradient-to-r from-[#FFD700] via-[#FFA500] to-[#FFB700] bg-clip-text text-transparent">
                    GOLD
                  </span>
                </div>
                {/* Status da Licença Vitalícia */}
                <div className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[11px] font-semibold text-emerald-300">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Licença Vitalícia Ativa</span>
                </div>
              </div>
              
              {/* Workshop White-Label Subtitle */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
                <Building2 className="w-3 h-3 text-blue-400 shrink-0" />
                <span className="truncate font-medium text-slate-300">{workshop.nomeOficina || 'Oficina Credenciada'}</span>
              </div>
            </div>
          </div>

          {/* Right Area: Account & Action */}
          <div className="flex items-center gap-2.5">
            {/* Quick Status on Mobile */}
            <div className="sm:hidden flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-semibold text-emerald-300">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Vitalício</span>
            </div>

            <button
              id="btn-header-novo-orcamento"
              onClick={() => onSelectTab('novo_orcamento')}
              className={`hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                activeTab === 'novo_orcamento'
                  ? 'bg-gradient-to-r from-[#0066FF] to-[#0052CC] text-white shadow-blue-600/30'
                  : 'bg-[#121E2B] hover:bg-[#1A2C3F] text-blue-300 border border-[#223952]'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Novo Orçamento</span>
            </button>

            {/* Logout button */}
            <button
              id="btn-header-logout"
              onClick={onLogout}
              title={`Conectado como ${currentUser.email}`}
              className="p-2 rounded-xl bg-[#121E2B] hover:bg-[#1F3348] text-slate-400 hover:text-red-400 border border-[#1E3349] transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <nav id="nav-tabs-bar" className="flex space-x-1 sm:space-x-2 border-t border-[#162536] py-2 overflow-x-auto scrollbar-none">
          <button
            id="tab-btn-novo-orcamento"
            onClick={() => onSelectTab('novo_orcamento')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'novo_orcamento'
                ? 'bg-[#0066FF] text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-100 hover:bg-[#121E2B]'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Criar Novo Orçamento</span>
          </button>

          <button
            id="tab-btn-orcamentos-salvos"
            onClick={() => onSelectTab('orcamentos_salvos')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'orcamentos_salvos'
                ? 'bg-[#0066FF] text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-100 hover:bg-[#121E2B]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Orçamentos Salvos</span>
            {savedQuotesCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'orcamentos_salvos' ? 'bg-white/20 text-white' : 'bg-[#1E3349] text-blue-300'
              }`}>
                {savedQuotesCount}
              </span>
            )}
          </button>

          <button
            id="tab-btn-tabela-insumos"
            onClick={() => onSelectTab('insumos')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'insumos'
                ? 'bg-[#0066FF] text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-100 hover:bg-[#121E2B]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Tabela de Insumos Fracionados</span>
          </button>

          <button
            id="tab-btn-config-oficina"
            onClick={() => onSelectTab('configuracoes')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'configuracoes'
                ? 'bg-[#0066FF] text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-100 hover:bg-[#121E2B]'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Configurações da Oficina (White-Label)</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
