import { useState } from 'react';
import { ServiceOrderDetails } from './ServiceOrderDetails';
import { ServiceOrderForm } from './ServiceOrderForm';
import { ServiceOrderList } from './ServiceOrderList';

type ViewState = { type: 'list' } | { type: 'create' } | { type: 'details'; id: string };

export function ServiceOrderManager() {
  const [view, setView] = useState<ViewState>({ type: 'list' });

  const handleCreate = () => {
    setView({ type: 'create' });
  };

  const handleSelect = (id: string) => {
    setView({ type: 'details', id });
  };

  const handleBack = () => {
    setView({ type: 'list' });
  };

  const handleCreateSuccess = (id: string) => {
    setView({ type: 'details', id });
  };

  if (view.type === 'create') {
    return <ServiceOrderForm onCancel={handleBack} onSuccess={handleCreateSuccess} />;
  }

  if (view.type === 'details') {
    return <ServiceOrderDetails orderId={view.id} onClose={handleBack} />;
  }

  return <ServiceOrderList onSelectOrder={handleSelect} onCreateNew={handleCreate} />;
}
