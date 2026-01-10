/**
 * @file WarrantiesPage - Motopeças
 * @description Tela de Garantias (lista/criação/detalhes)
 */

import { WarrantyManager } from '@/components/motoparts';

export function WarrantiesPage() {
  return (
    <div className="container mx-auto py-6">
      <WarrantyManager />
    </div>
  );
}
