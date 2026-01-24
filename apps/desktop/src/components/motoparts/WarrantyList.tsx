/**
 * 🛡️ WarrantyList - Lista de Garantias
 *
 * Componente para listar, filtrar e gerenciar garantias (Motopeças)
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWarranties, WarrantyUtils, type WarrantyStatus } from '@/hooks/useWarranties';
import { formatDate } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Filter,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
} from 'lucide-react';
import { clickableByKeyboard } from '@/lib/a11y';
import { useState } from 'react';

interface WarrantyListProps {
  onSelectWarranty?: (warrantyId: string) => void;
  onCreateNew?: () => void;
}

export function WarrantyList({ onSelectWarranty, onCreateNew }: WarrantyListProps) {
  const { activeWarranties, isLoadingActive } = useWarranties();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<WarrantyStatus | 'ALL'>('ALL');

  // Filtrar garantias
  const filteredWarranties = activeWarranties?.filter((warranty) => {
    const matchesSearch =
      searchTerm === '' ||
      warranty.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (warranty.product_name &&
        warranty.product_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (warranty.source_number && warranty.source_number.toString().includes(searchTerm));

    const matchesStatus = statusFilter === 'ALL' || warranty.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: WarrantyStatus) => {
    switch (status) {
      case 'OPEN':
        return <ShieldAlert className="h-4 w-4" />;
      case 'IN_PROGRESS':
        return <ShieldQuestion className="h-4 w-4" />;
      case 'APPROVED':
        return <ShieldCheck className="h-4 w-4" />;
      case 'DENIED':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <ShieldCheck className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header com filtros */}
      <Card className="border-none bg-card/50 backdrop-blur-sm shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Garantias
            </CardTitle>
            <Button onClick={onCreateNew} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nova Garantia
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, produto ou número de origem..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as WarrantyStatus | 'ALL')}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="OPEN">Aberta</SelectItem>
                <SelectItem value="IN_PROGRESS">Em Análise</SelectItem>
                <SelectItem value="APPROVED">Aprovada</SelectItem>
                <SelectItem value="DENIED">Negada</SelectItem>
                <SelectItem value="CLOSED">Resolvida</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de garantias */}
      {isLoadingActive ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filteredWarranties && filteredWarranties.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredWarranties.map((warranty, index) => (
            <motion.div
              key={warranty.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className="cursor-pointer hover:shadow-lg transition-all border-none bg-card/50 backdrop-blur-sm shadow-md"
                {...(onSelectWarranty
                  ? clickableByKeyboard(() => onSelectWarranty?.(warranty.id))
                  : {})}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <Badge
                      variant="outline"
                      className={`${WarrantyUtils.getStatusColor(warranty.status)} border-current`}
                    >
                      <span className="flex items-center gap-1">
                        {getStatusIcon(warranty.status)}
                        {WarrantyUtils.getStatusLabel(warranty.status)}
                      </span>
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(warranty.created_at)}
                    </span>
                  </div>
                  <CardTitle className="text-base mt-2 line-clamp-1">
                    {warranty.product_name || 'Produto Desconhecido'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cliente:</span>
                      <span className="font-medium">{warranty.customer_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Origem:</span>
                      <span>
                        {WarrantyUtils.getSourceTypeLabel(warranty.source_type)} #
                        {warranty.source_number}
                      </span>
                    </div>
                    {warranty.description && (
                      <p className="text-muted-foreground text-xs mt-2 line-clamp-2">
                        {warranty.description}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <ShieldAlert className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Nenhuma garantia encontrada com os filtros atuais.</p>
        </div>
      )}
    </div>
  );
}
