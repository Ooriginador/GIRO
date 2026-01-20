import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CreateCustomerInput,
  Customer,
  useCustomerSearch,
  useCustomers,
} from '@/hooks/useCustomers';
import { cn } from '@/lib/utils';
import { ChevronRight, FileText, Loader2, Phone, Plus, Search, User, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { clickableByKeyboard } from '@/lib/a11y';

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOMER SEARCH - Busca e seleção de cliente
// ═══════════════════════════════════════════════════════════════════════════

interface CustomerSearchProps {
  /**
   * Callback quando um cliente é selecionado
   */
  onSelect: (customer: Customer | null) => void;

  /**
   * Cliente atualmente selecionado
   */
  selectedCustomer?: Customer | null;

  /**
   * Placeholder do input
   */
  placeholder?: string;

  /**
   * Se deve mostrar botão de criar novo
   */
  showCreateButton?: boolean;

  /**
   * Se está desabilitado
   */
  disabled?: boolean;

  /**
   * Classe CSS adicional
   */
  className?: string;
}

export function CustomerSearch({
  onSelect,
  selectedCustomer,
  placeholder = 'Buscar cliente (nome, CPF ou telefone)...',
  showCreateButton = true,
  disabled = false,
  className,
}: CustomerSearchProps) {
  const [open, setOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { query, setQuery, results, isSearching, reset } = useCustomerSearch();

  const { createCustomer } = useCustomers();

  const handleSelect = (customer: Customer) => {
    onSelect(customer);
    setOpen(false);
    reset();
  };

  const handleCreate = async (input: CreateCustomerInput) => {
    const customer = await createCustomer(input);
    if (customer) {
      onSelect(customer);
      setShowCreateDialog(false);
    }
  };

  const handleClear = () => {
    onSelect(null);
    reset();
  };

  // Se tiver cliente selecionado, mostrar card compacto
  if (selectedCustomer) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20',
          className
        )}
      >
        <User className="h-5 w-5 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{selectedCustomer.name}</p>
          <p className="text-sm text-muted-foreground truncate">
            {selectedCustomer.phone || selectedCustomer.cpf || 'Sem telefone'}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleClear} disabled={disabled}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-start"
            disabled={disabled}
          >
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <span className="text-muted-foreground">{placeholder}</span>
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
              {/* Botão persistente para criar novo cliente */}
              <div className="p-2 border-b">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-primary hover:text-primary hover:bg-primary/10"
                  onClick={() => {
                    setOpen(false);
                    setShowCreateDialog(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Cliente
                </Button>
              </div>

              {isSearching && (
                <div className="p-4 space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-3/4" />
                </div>
              )}

              {!isSearching && query.length >= 2 && results.length === 0 && (
                <CommandEmpty className="py-6 text-center text-muted-foreground">
                  Nenhum cliente encontrado para "{query}"
                </CommandEmpty>
              )}

              {!isSearching && results.length > 0 && (
                <CommandGroup heading="Clientes encontrados">
                  {results.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      value={customer.id}
                      onSelect={() => handleSelect(customer)}
                      className="cursor-pointer"
                    >
                      <User className="mr-2 h-4 w-4" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{customer.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {customer.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {customer.phone}
                            </span>
                          )}
                          {customer.cpf && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {formatCpf(customer.cpf)}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="ml-2 h-4 w-4 opacity-50" />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {!isSearching && query.length > 0 && query.length < 2 && (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  Digite pelo menos 2 caracteres para buscar
                </div>
              )}

              {!isSearching && query.length === 0 && results.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  <Search className="mx-auto h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm">Busque por nome, CPF ou telefone</p>
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {showCreateButton && (
        <CustomerCreateDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSubmit={handleCreate}
          initialName={query}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOMER CARD - Card de visualização do cliente
// ═══════════════════════════════════════════════════════════════════════════

interface CustomerCardProps {
  customer: Customer;
  onClick?: () => void;
  compact?: boolean;
  className?: string;
}

export function CustomerCard({ customer, onClick, compact = false, className }: CustomerCardProps) {
  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer',
          className
        )}
        {...(onClick ? clickableByKeyboard(onClick) : {})}
      >
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{customer.name}</p>
          <p className="text-sm text-muted-foreground truncate">
            {customer.phone || customer.cpf || 'Sem contato'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Card
      className={cn('cursor-pointer hover:shadow-md transition-shadow', className)}
      {...(onClick ? clickableByKeyboard(onClick) : {})}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{customer.name}</h3>
            <div className="flex flex-wrap gap-2 mt-1 text-sm text-muted-foreground">
              {customer.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {customer.phone}
                </span>
              )}
              {customer.cpf && (
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {formatCpf(customer.cpf)}
                </span>
              )}
            </div>
            {customer.city && (
              <p className="text-sm text-muted-foreground mt-1">
                {customer.city}
                {customer.state ? `, ${customer.state}` : ''}
              </p>
            )}
          </div>
          {!customer.isActive && <Badge variant="secondary">Inativo</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOMER CREATE DIALOG - Modal de criação rápida
// ═══════════════════════════════════════════════════════════════════════════

interface CustomerCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateCustomerInput) => Promise<void>;
  initialName?: string;
  initialData?: Partial<Customer>;
}

export function CustomerCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  initialName = '',
  initialData,
}: CustomerCreateDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateCustomerInput>({
    name: initialName,
    ...initialData,
  });

  // Atualiza os dados quando o dialog abre ou os dados iniciais mudam
  useEffect(() => {
    if (open) {
      setFormData({
        name: initialData?.name || initialName || '',
        cpf: initialData?.cpf || '',
        phone: initialData?.phone || '',
        email: initialData?.email || '',
      });
    }
  }, [open, initialData, initialName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) return;

    setIsLoading(true);
    await onSubmit(formData);
    setIsLoading(false);
    setFormData({ name: '' });
  };

  const updateField = (field: keyof CreateCustomerInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value || undefined }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
          <DialogDescription>
            Cadastre um novo cliente rapidamente. Você pode completar os dados depois.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Nome */}
            <div className="col-span-2 space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Nome completo"
                required
              />
            </div>

            {/* CPF */}
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={formData.cpf || ''}
                onChange={(e) => updateField('cpf', e.target.value.replace(/\D/g, ''))}
                placeholder="000.000.000-00"
                maxLength={11}
              />
            </div>

            {/* Telefone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone || ''}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>

            {/* Email */}
            <div className="col-span-2 space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name.trim()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cadastrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════════

function formatCpf(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
}

export default CustomerSearch;
