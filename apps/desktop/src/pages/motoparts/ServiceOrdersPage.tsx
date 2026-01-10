/**
 * @file ServiceOrdersPage - Motopeças
 * @description Tela de Ordens de Serviço (lista/criação/detalhes)
 */

import { ServiceOrderManager } from '@/components/motoparts';

export function ServiceOrdersPage() {
  return (
    <div className="container mx-auto py-6">
      <ServiceOrderManager />
    </div>
  );
}
