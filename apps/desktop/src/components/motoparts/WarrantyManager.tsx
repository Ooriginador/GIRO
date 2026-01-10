/**
 * 🛡️ WarrantyManager - Gerenciador de Garantias
 *
 * Container principal para o módulo de garantias.
 * Gerencia a navegação entre Lista, Detalhes e Formulário de Criação.
 */

import { useState } from 'react';
import { WarrantyDetails } from './WarrantyDetails';
import { WarrantyForm } from './WarrantyForm';
import { WarrantyList } from './WarrantyList';

type WarrantyView = 'LIST' | 'DETAILS' | 'CREATE';

export function WarrantyManager() {
  const [view, setView] = useState<WarrantyView>('LIST');
  const [selectedWarrantyId, setSelectedWarrantyId] = useState<string | null>(null);

  const handleSelectWarranty = (id: string) => {
    setSelectedWarrantyId(id);
    setView('DETAILS');
  };

  const handleCreateNew = () => {
    setView('CREATE');
  };

  const handleBackToList = () => {
    setView('LIST');
    setSelectedWarrantyId(null);
  };

  const handleSuccess = () => {
    setView('LIST');
    // A lista será atualizada automaticamente via React Query invalidação
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {view === 'LIST' && (
        <WarrantyList onSelectWarranty={handleSelectWarranty} onCreateNew={handleCreateNew} />
      )}

      {view === 'DETAILS' && selectedWarrantyId && (
        <WarrantyDetails warrantyId={selectedWarrantyId} onBack={handleBackToList} />
      )}

      {view === 'CREATE' && (
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">
            <button
              onClick={handleBackToList}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              ← Voltar para lista
            </button>
          </div>
          <WarrantyForm onCancel={handleBackToList} onSuccess={handleSuccess} />
        </div>
      )}
    </div>
  );
}
