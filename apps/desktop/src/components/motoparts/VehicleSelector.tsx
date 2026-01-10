import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useVehicles } from '@/hooks/useVehicles';
import { cn } from '@/lib/utils';
import { VehicleComplete } from '@/types/motoparts';
import { Bike, Check, ChevronDown, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// VEHICLE SELECTOR - Seletor Cascata (Marca → Modelo → Ano)
// ═══════════════════════════════════════════════════════════════════════════

interface VehicleSelectorProps {
  /**
   * Callback quando um veículo completo é selecionado
   */
  onSelect: (vehicle: VehicleComplete | null) => void;

  /**
   * Veículo pré-selecionado (para edição)
   */
  value?: VehicleComplete | null;

  /**
   * Se deve mostrar os labels
   * @default true
   */
  showLabels?: boolean;

  /**
   * Tamanho dos selects
   * @default 'default'
   */
  size?: 'sm' | 'default' | 'lg';

  /**
   * Se está desabilitado
   */
  disabled?: boolean;

  /**
   * Classe CSS adicional
   */
  className?: string;
}

export function VehicleSelector({
  onSelect,
  value,
  showLabels = true,
  size = 'default',
  disabled = false,
  className,
}: VehicleSelectorProps) {
  // NOTE: `value` is reserved for a future controlled-mode implementation.
  // Keep it for API stability.
  void value;

  const {
    brands,
    models,
    years,
    selectedBrand,
    selectedModel,
    selectedYear,
    selectedVehicle,
    isLoadingBrands,
    isLoadingModels,
    isLoadingYears,
    error,
    loadBrands,
    selectBrand,
    selectModel,
    selectYear,
    reset,
  } = useVehicles();

  // Carregar marcas ao montar
  useEffect(() => {
    if (brands.length === 0) {
      loadBrands();
    }
  }, [loadBrands, brands.length]);

  // Notificar mudança de seleção
  useEffect(() => {
    onSelect(selectedVehicle);
  }, [selectedVehicle, onSelect]);

  const handleReset = () => {
    reset();
    onSelect(null);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Marca */}
      <div className="space-y-1.5">
        {showLabels && <Label className="text-sm font-medium">Marca</Label>}
        <Select
          value={selectedBrand?.id || ''}
          onValueChange={(value) => selectBrand(value || null)}
          disabled={disabled || isLoadingBrands}
        >
          <SelectTrigger
            className={cn(size === 'sm' && 'h-8 text-sm', size === 'lg' && 'h-12 text-lg')}
          >
            <SelectValue placeholder={isLoadingBrands ? 'Carregando...' : 'Selecione a marca'} />
          </SelectTrigger>
          <SelectContent>
            {brands.map((brand) => (
              <SelectItem key={brand.id} value={brand.id}>
                {brand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Modelo */}
      <div className="space-y-1.5">
        {showLabels && <Label className="text-sm font-medium">Modelo</Label>}
        <Select
          value={selectedModel?.id || ''}
          onValueChange={(value) => selectModel(value || null)}
          disabled={disabled || !selectedBrand || isLoadingModels}
        >
          <SelectTrigger
            className={cn(size === 'sm' && 'h-8 text-sm', size === 'lg' && 'h-12 text-lg')}
          >
            <SelectValue
              placeholder={
                isLoadingModels
                  ? 'Carregando...'
                  : !selectedBrand
                  ? 'Selecione a marca primeiro'
                  : 'Selecione o modelo'
              }
            />
          </SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.name}
                {model.engineSize && (
                  <span className="ml-2 text-muted-foreground">{model.engineSize}cc</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Ano */}
      <div className="space-y-1.5">
        {showLabels && <Label className="text-sm font-medium">Ano</Label>}
        <Select
          value={selectedYear?.id || ''}
          onValueChange={(value) => selectYear(value || null)}
          disabled={disabled || !selectedModel || isLoadingYears}
        >
          <SelectTrigger
            className={cn(size === 'sm' && 'h-8 text-sm', size === 'lg' && 'h-12 text-lg')}
          >
            <SelectValue
              placeholder={
                isLoadingYears
                  ? 'Carregando...'
                  : !selectedModel
                  ? 'Selecione o modelo primeiro'
                  : 'Selecione o ano'
              }
            />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year.id} value={year.id}>
                {year.yearLabel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Veículo Selecionado + Reset */}
      {selectedVehicle && (
        <div className="flex items-center justify-between p-2 bg-primary/5 rounded-md border border-primary/20">
          <div className="flex items-center gap-2">
            <Bike className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{selectedVehicle.displayName}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleReset} disabled={disabled}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Erro */}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// VEHICLE SEARCH - Busca por texto
// ═══════════════════════════════════════════════════════════════════════════

interface VehicleSearchProps {
  /**
   * Callback quando um veículo é selecionado
   */
  onSelect: (vehicle: VehicleComplete) => void;

  /**
   * Placeholder do input
   */
  placeholder?: string;

  /**
   * Se está desabilitado
   */
  disabled?: boolean;

  /**
   * Classe CSS adicional
   */
  className?: string;
}

export function VehicleSearch({
  onSelect,
  placeholder = 'Buscar veículo (ex: CG 160 2020)',
  disabled = false,
  className,
}: VehicleSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VehicleComplete[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { searchVehicles } = useVehicles();

  // Debounce da busca
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsSearching(true);
      const found = await searchVehicles(query);
      setResults(found);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, searchVehicles]);

  const handleSelect = (vehicle: VehicleComplete) => {
    onSelect(vehicle);
    setQuery('');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{placeholder}</span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Digite para buscar..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {isSearching && (
              <div className="p-4 space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-3/4" />
              </div>
            )}

            {!isSearching && query.length >= 2 && results.length === 0 && (
              <CommandEmpty>Nenhum veículo encontrado para "{query}"</CommandEmpty>
            )}

            {!isSearching && results.length > 0 && (
              <CommandGroup heading="Veículos encontrados">
                {results.map((vehicle) => (
                  <CommandItem
                    key={vehicle.yearId}
                    value={vehicle.yearId}
                    onSelect={() => handleSelect(vehicle)}
                    className="cursor-pointer"
                  >
                    <Bike className="mr-2 h-4 w-4" />
                    <div className="flex-1">
                      <span className="font-medium">{vehicle.displayName}</span>
                      {vehicle.engineSize && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {vehicle.engineSize}cc
                        </Badge>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {!isSearching && query.length < 2 && (
              <div className="p-4 text-sm text-muted-foreground text-center">
                Digite pelo menos 2 caracteres para buscar
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// VEHICLE BADGE - Badge compacto para exibição
// ═══════════════════════════════════════════════════════════════════════════

interface VehicleBadgeProps {
  vehicle: VehicleComplete;
  onRemove?: () => void;
  className?: string;
}

export function VehicleBadge({ vehicle, onRemove, className }: VehicleBadgeProps) {
  return (
    <Badge variant="secondary" className={cn('gap-1 pr-1', className)}>
      <Bike className="h-3 w-3" />
      {vehicle.displayName}
      {onRemove && (
        <Button
          variant="ghost"
          size="sm"
          className="h-4 w-4 p-0 ml-1 hover:bg-destructive/20"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </Badge>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// VEHICLE YEAR RANGE SELECTOR - Seleção de intervalo de anos
// ═══════════════════════════════════════════════════════════════════════════

interface VehicleYearRangeSelectorProps {
  /**
   * Anos disponíveis para seleção
   */
  years: Array<{ id: string; year: number; yearLabel: string }>;

  /**
   * Anos selecionados
   */
  selectedYearIds: string[];

  /**
   * Callback quando a seleção muda
   */
  onChange: (yearIds: string[]) => void;

  /**
   * Se está desabilitado
   */
  disabled?: boolean;
}

export function VehicleYearRangeSelector({
  years,
  selectedYearIds,
  onChange,
  disabled = false,
}: VehicleYearRangeSelectorProps) {
  const sortedYears = [...years].sort((a, b) => b.year - a.year);

  const handleToggle = (yearId: string) => {
    if (selectedYearIds.includes(yearId)) {
      onChange(selectedYearIds.filter((id) => id !== yearId));
    } else {
      onChange([...selectedYearIds, yearId]);
    }
  };

  const handleSelectAll = () => {
    onChange(years.map((y) => y.id));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          Anos ({selectedYearIds.length} selecionado{selectedYearIds.length !== 1 ? 's' : ''})
        </Label>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            disabled={disabled || selectedYearIds.length === years.length}
          >
            Todos
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            disabled={disabled || selectedYearIds.length === 0}
          >
            Limpar
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {sortedYears.map((year) => {
          const isSelected = selectedYearIds.includes(year.id);

          return (
            <Button
              key={year.id}
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-2"
              onClick={() => handleToggle(year.id)}
              disabled={disabled}
            >
              {isSelected && <Check className="h-3 w-3 mr-1" />}
              {year.year}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export default VehicleSelector;
