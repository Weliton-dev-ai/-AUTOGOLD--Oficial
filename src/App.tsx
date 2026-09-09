import React, { useState, useEffect } from 'react';
import { 
  Header, 
  NavigationTab 
} from './components/Header';
import { LoginLicenseModal } from './components/LoginLicenseModal';
import { QuoteBuilder } from './components/QuoteBuilder';
import { QuoteList } from './components/QuoteList';
import { MaterialsManager } from './components/MaterialsManager';
import { WorkshopSettings } from './components/WorkshopSettings';
import { QuotePrintModal } from './components/QuotePrintModal';
import { 
  MaterialInsumo, 
  Quote, 
  QuoteStatus, 
  UserAccount, 
  WorkshopProfile 
} from './types';
import { 
  getCurrentUser, 
  getUserMaterials, 
  getUserQuotes, 
  getUserWorkshopProfile, 
  saveCurrentUser, 
  saveUserMaterials, 
  saveUserQuotes, 
  saveUserWorkshopProfile 
} from './utils/storage';
import { DEFAULT_WORKSHOP_PROFILE } from './data/defaultData';

export default function App() {
  // Authentication & Lifetime License state
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => getCurrentUser());
  
  // Navigation
  const [activeTab, setActiveTab] = useState<NavigationTab>('novo_orcamento');
  
  // Workshop profile (White-label)
  const [workshop, setWorkshop] = useState<WorkshopProfile>(DEFAULT_WORKSHOP_PROFILE);
  
  // Materials and Insumos
  const [materials, setMaterials] = useState<MaterialInsumo[]>([]);
  
  // Quotes list
  const [quotes, setQuotes] = useState<Quote[]>([]);
  
  // Active editing / printing states
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [printingQuote, setPrintingQuote] = useState<Quote | null>(null);

  // Sync state when user logs in or switches account
  useEffect(() => {
    if (currentUser) {
      const email = currentUser.email;
      const userProfile = getUserWorkshopProfile(email);
      const userMats = getUserMaterials(email);
      const userQts = getUserQuotes(email);

      setWorkshop(userProfile);
      setMaterials(userMats);
      setQuotes(userQts);
    }
  }, [currentUser]);

  // Handle Login & Activation success
  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
  };

  // Handle Logout
  const handleLogout = () => {
    if (window.confirm('Deseja sair da sua conta AutoGold?')) {
      saveCurrentUser(null);
      setCurrentUser(null);
    }
  };

  // Handle Save / Update Quote
  const handleSaveQuote = (quote: Quote) => {
    if (!currentUser) return;
    
    const existingIndex = quotes.findIndex((q) => q.id === quote.id);
    let updatedQuotes: Quote[];

    if (existingIndex >= 0) {
      updatedQuotes = [...quotes];
      updatedQuotes[existingIndex] = quote;
    } else {
      updatedQuotes = [quote, ...quotes];
    }

    setQuotes(updatedQuotes);
    saveUserQuotes(currentUser.email, updatedQuotes);
    setEditingQuote(null);
  };

  // Handle Edit Quote
  const handleEditQuote = (quote: Quote) => {
    setEditingQuote(quote);
    setActiveTab('novo_orcamento');
  };

  // Handle Delete Quote
  const handleDeleteQuote = (id: string) => {
    if (!currentUser) return;
    const updatedQuotes = quotes.filter((q) => q.id !== id);
    setQuotes(updatedQuotes);
    saveUserQuotes(currentUser.email, updatedQuotes);
  };

  // Handle Update Quote Status
  const handleUpdateStatus = (id: string, newStatus: QuoteStatus) => {
    if (!currentUser) return;
    const updatedQuotes = quotes.map((q) => {
      if (q.id === id) {
        return { ...q, status: newStatus };
      }
      return q;
    });
    setQuotes(updatedQuotes);
    saveUserQuotes(currentUser.email, updatedQuotes);
  };

  // Handle Save Workshop Profile
  const handleSaveWorkshopProfile = (newProfile: WorkshopProfile) => {
    if (!currentUser) return;
    setWorkshop(newProfile);
    saveUserWorkshopProfile(currentUser.email, newProfile);
  };

  // Handle Save Materials Table
  const handleSaveMaterials = (newMaterials: MaterialInsumo[]) => {
    if (!currentUser) return;
    setMaterials(newMaterials);
    saveUserMaterials(currentUser.email, newMaterials);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-slate-100 font-sans selection:bg-[#0066FF] selection:text-white flex flex-col">
      {/* Login & License Activation Modal if not logged in */}
      {!currentUser && (
        <LoginLicenseModal
          currentUser={currentUser}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* Main App Layout */}
      {currentUser && (
        <>
          {/* Header & Tabs */}
          <Header
            activeTab={activeTab}
            onSelectTab={(tab) => {
              setActiveTab(tab);
              if (tab !== 'novo_orcamento') {
                setEditingQuote(null);
              }
            }}
            currentUser={currentUser}
            workshop={workshop}
            savedQuotesCount={quotes.length}
            onLogout={handleLogout}
          />

          {/* Main Viewport Container */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            {activeTab === 'novo_orcamento' && (
              <QuoteBuilder
                workshop={workshop}
                materials={materials}
                onSaveQuote={handleSaveQuote}
                onOpenPrintModal={(quote) => setPrintingQuote(quote)}
                editingQuote={editingQuote}
                onCancelEdit={() => setEditingQuote(null)}
              />
            )}

            {activeTab === 'orcamentos_salvos' && (
              <QuoteList
                quotes={quotes}
                workshop={workshop}
                onEditQuote={handleEditQuote}
                onDeleteQuote={handleDeleteQuote}
                onUpdateStatus={handleUpdateStatus}
                onOpenPrintModal={(quote) => setPrintingQuote(quote)}
                onNewQuoteClick={() => {
                  setEditingQuote(null);
                  setActiveTab('novo_orcamento');
                }}
              />
            )}

            {activeTab === 'insumos' && (
              <MaterialsManager
                materials={materials}
                onSaveMaterials={handleSaveMaterials}
              />
            )}

            {activeTab === 'configuracoes' && (
              <WorkshopSettings
                workshop={workshop}
                currentUser={currentUser}
                onSaveProfile={handleSaveWorkshopProfile}
              />
            )}
          </main>

          {/* Printable Document Modal */}
          {printingQuote && (
            <QuotePrintModal
              quote={printingQuote}
              workshop={workshop}
              onClose={() => setPrintingQuote(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
