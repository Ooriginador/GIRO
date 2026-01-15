import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useProductCompatibility } from '@/hooks/useVehicles';
import { cn } from '@/lib/utils';
import type { VehicleComplete } from '@/types/motoparts';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Bike, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { VehicleBadge, VehicleSearch, VehicleSelector } from './VehicleSelector';

type Compatibility = {
  vehicleYearId: string;
  vehicle: VehicleComplete;
  notes?: string;
  position?: string;
};

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCT COMPATIBILITY EDITOR
// ═══════════════════════════════════════════════════════════════════════════

interface ProductCompatibilityEditorProps {
  /**
   * ID do produto sendo editado
   */
  productId: string;

  /**
   * Nome do produto (para exibição)
   */
  productName: string;

  /**
   * Callback quando as compatibilidades são salvas
   */
  onSave?: (compatibilities: Compatibility[]) => void;

  /**
   * Se deve mostrar em modo compacto
   */
  compact?: boolean;

  /**
   * Classe CSS adicional
   */
  className?: string;
}

export function ProductCompatibilityEditor({
  productId,
  productName,
  onSave,
  compact = false,
  className,
}: ProductCompatibilityEditorProps) {
  const { toast } = useToast();
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [pendingVehicle, setPendingVehicle] = useState<VehicleComplete | null>(null);

  const {
    compatibilities,
    pendingChanges,
    isLoading,
    isSaving,
    error,
    addCompatibility,
    removeCompatibility,
    saveChanges,
    hasChanges,
  } = useProductCompatibility(productId);

  // Handler para adicionar novo veículo
  const handleAddVehicle = useCallback((vehicle: VehicleComplete | null) => {
    setPendingVehicle(vehicle);
  }, []);

  // Confirmar adição
  const confirmAddVehicle = useCallback(() => {
    if (pendingVehicle) {
      addCompatibility(pendingVehicle);
      setPendingVehicle(null);
      setIsAddingVehicle(false);

      toast({
        title: 'Veículo adicionado',
        description: `${pendingVehicle.displayName} será vinculado ao salvar.`,
      });
    }
  }, [pendingVehicle, addCompatibility, toast]);

  // Handler para salvar
  const handleSave = useCallback(async () => {
    const saved = await saveChanges();

    if (saved) {
      toast({
        title: 'Compatibilidades salvas',
        description: `${saved.length} veículo(s) vinculado(s) à peça.`,
      });
      onSave?.(saved);
    }
  }, [saveChanges, onSave, toast]);

  // Handler para busca rápida
  const handleQuickAdd = useCallback(
    (vehicle: VehicleComplete) => {
      addCompatibility(vehicle);

      toast({
        title: 'Veículo adicionado',
        description: `${vehicle.displayName} será vinculado ao salvar.`,
      });
    },
    [addCompatibility, toast]
  );

  // Renderização compacta (para dentro de formulários)
  if (compact) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bike className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              Veículos Compatíveis ({compatibilities.length})
            </span>
          </div>

          <VehicleSearch onSelect={handleQuickAdd} placeholder="Adicionar veículo..." />
        </div>

        {compatibilities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum veículo vinculado. Use a busca para adicionar.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {compatibilities.map((compat) => (
              <VehicleBadge
                key={compat.vehicleYearId}
                vehicle={compat.vehicle!}
                onRemove={() => removeCompatibility(compat.vehicleYearId)}
              />
            ))}
          </div>
        )}

        {hasChanges && (
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar ({pendingChanges} alteração{pendingChanges !== 1 ? 'es' : ''})
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Renderização completa (página dedicada ou modal)
  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bike className="h-5 w-5" />
              Compatibilidade de Veículos
            </CardTitle>
            <CardDescription>
              Vincule esta peça ({productName}) aos veículos compatíveis
            </CardDescription>
          </div>

          <div className="flex gap-2">
            {hasChanges && (
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Alterações
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Adicionar Veículo */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Adicionar Veículo</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingVehicle(!isAddingVehicle)}
            >
              {isAddingVehicle ? (
                'Cancelar'
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar via Seletor
                </>
              )}
            </Button>
          </div>

          {/* Busca rápida */}
          <VehicleSearch
            onSelect={handleQuickAdd}
            placeholder="Busca rápida: digite marca, modelo ou ano..."
          />

          {/* Seletor cascata */}
          <AnimatePresence>
            {isAddingVehicle && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Card className="bg-muted/30">
                  <CardContent className="pt-4 space-y-4">
                    <VehicleSelector onSelect={handleAddVehicle} value={pendingVehicle} />

                    {pendingVehicle && (
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setPendingVehicle(null)}>
                          Limpar
                        </Button>
                        <Button onClick={confirmAddVehicle}>
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar {pendingVehicle.displayName}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Separator />

        {/* Lista de Veículos Vinculados */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">
              Veículos Vinculados ({compatibilities.length})
            </h4>

            {pendingChanges > 0 && (
              <Badge variant="outline" className="text-amber-600 border-amber-600">
                {pendingChanges} alteração{pendingChanges !== 1 ? 'es' : ''} pendente
                {pendingChanges !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center gap-2 py-8 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          ) : compatibilities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bike className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-center">
                Nenhum veículo vinculado a esta peça.
                <br />
                <span className="text-sm">
                  Use a busca ou o seletor acima para adicionar compatibilidades.
                </span>
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {compatibilities.map((compat) => (
                    <CompatibilityItem
                      key={compat.vehicleYearId}
                      compatibility={compat}
                      onRemove={() => removeCompatibility(compat.vehicleYearId)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPATIBILITY ITEM - Item individual na lista
// ═══════════════════════════════════════════════════════════════════════════

interface CompatibilityItemProps {
  compatibility: Compatibility;
  onRemove: () => void;
}

function CompatibilityItem({ compatibility, onRemove }: CompatibilityItemProps) {
  const vehicle = compatibility.vehicle;

  if (!vehicle) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex items-center justify-between p-3 bg-background rounded-lg border"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Bike className="h-4 w-4 text-primary" />
        </div>

        <div>
          <p className="font-medium">{vehicle.displayName}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {vehicle.category && (
              <Badge variant="outline" className="text-xs">
                {vehicle.category}
              </Badge>
            )}
            {vehicle.engineSize && <span>{vehicle.engineSize}cc</span>}
            {vehicle.fuelType && <span>{vehicle.fuelType}</span>}
          </div>
        </div>
      </div>

      <AlertDialog>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Remover compatibilidade</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <AlertDialogContent aria-describedby="remove-compatibility-description">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Compatibilidade</AlertDialogTitle>
            <AlertDialogDescription id="remove-compatibility-description">
              Deseja remover a compatibilidade com <strong>{vehicle.displayName}</strong>?
              <br />A alteração só será efetivada após salvar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={onRemove}
              className="bg-destructive hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPATIBILITY QUICK VIEW - Visualização rápida (para listagens)
// ═══════════════════════════════════════════════════════════════════════════

interface CompatibilityQuickViewProps {
  compatibilities: Compatibility[];
  maxVisible?: number;
  className?: string;
}

export function CompatibilityQuickView({
  compatibilities,
  maxVisible = 3,
  className,
}: CompatibilityQuickViewProps) {
  const visibleItems = compatibilities.slice(0, maxVisible);
  const hiddenCount = compatibilities.length - maxVisible;

  if (compatibilities.length === 0) {
    return <span className="text-sm text-muted-foreground">Compatibilidade universal</span>;
  }

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {visibleItems.map((compat) => (
        <Badge key={compat.vehicleYearId} variant="secondary" className="text-xs">
          <Bike className="h-3 w-3 mr-1" />
          {compat.vehicle?.displayName || 'Veículo'}
        </Badge>
      ))}

      {hiddenCount > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs cursor-help">
                +{hiddenCount} mais
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                {compatibilities.slice(maxVisible).map((compat) => (
                  <p key={compat.vehicleYearId} className="text-sm">
                    {compat.vehicle?.displayName}
                  </p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

export default ProductCompatibilityEditor;
