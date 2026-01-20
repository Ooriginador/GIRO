import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, ArrowLeft, Loader2, User } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useCustomerVehicles } from '@/hooks/useCustomers';
import { useServiceOrders } from '@/hooks/useServiceOrders';
import { useAuthStore } from '@/stores/auth-store';
import { CustomerSearch } from './CustomerSearch';

// Schema
const formSchema = z.object({
  customer_id: z.string().min(1, 'Cliente obrigatório'),
  customer_vehicle_id: z.string().min(1, 'Veículo obrigatório'),
  vehicle_km: z.coerce.number().min(0, 'KM inválida'),
  symptoms: z.string().min(1, 'Sintomas/Relato obrigatório'),
  scheduled_date: z.string().optional(),
});

interface ServiceOrderFormProps {
  onCancel: () => void;
  onSuccess: (orderId: string) => void;
}

export function ServiceOrderForm({ onCancel, onSuccess }: ServiceOrderFormProps) {
  const { createOrder } = useServiceOrders();
  const { toast } = useToast();
  const employee = useAuthStore((s) => s.employee);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const { vehicles = [], isLoading: isLoadingVehicles } = useCustomerVehicles(selectedCustomerId);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicle_km: 0,
      symptoms: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (!employee?.id) {
        toast({
          title: 'Operador não identificado',
          description: 'Faça login novamente para abrir uma OS.',
          variant: 'destructive',
        });
        return;
      }

      const selectedVehicle = vehicles.find((v: any) => v.id === values.customer_vehicle_id);
      if (!selectedVehicle) {
        toast({
          title: 'Veículo inválido',
          description: 'Selecione um veículo válido para o cliente.',
          variant: 'destructive',
        });
        return;
      }

      const result = await createOrder.mutateAsync({
        customer_id: values.customer_id,
        customer_vehicle_id: values.customer_vehicle_id,
        vehicle_year_id: selectedVehicle.vehicleYearId,
        employee_id: employee.id,
        vehicle_km: Number.isFinite(values.vehicle_km) ? Math.trunc(values.vehicle_km) : undefined,
        symptoms: values.symptoms,
        scheduled_date: values.scheduled_date || undefined,
      });

      toast({
        title: 'OS Criada',
        description: `Ordem de Serviço #${result.order_number} iniciada com sucesso.`,
      });
      onSuccess(result.id);
    } catch (error) {
      console.error('Erro ao criar ordem de serviço:', error);
      toast({
        title: 'Erro ao criar OS',
        description: 'Não foi possível iniciar a ordem de serviço.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onCancel} className="-ml-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          Nova Ordem de Serviço
        </CardTitle>
      </CardHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {/* Seleção de Cliente */}
            <div className="space-y-2">
              <FormLabel>Cliente</FormLabel>
              <CustomerSearch
                onSelect={(c) => {
                  if (!c) return;
                  setSelectedCustomerId(c.id);
                  form.setValue('customer_id', c.id);
                  form.setValue('customer_vehicle_id', ''); // Reset vehicle
                }}
              />
              {selectedCustomerId && (
                <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <User className="h-3 w-3" />
                  Cliente selecionado
                </div>
              )}
              <input type="hidden" {...form.register('customer_id')} />
              {form.formState.errors.customer_id && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.customer_id.message}
                </p>
              )}
            </div>

            {/* Seleção de Veículo */}
            <FormField
              control={form.control}
              name="customer_vehicle_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Veículo</FormLabel>
                  <Select
                    disabled={!selectedCustomerId || isLoadingVehicles}
                    onValueChange={(value) => {
                      field.onChange(value);
                      const v = vehicles.find((vv: any) => vv.id === value);
                      if (v?.currentKm != null) {
                        form.setValue('vehicle_km', v.currentKm);
                      }
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !selectedCustomerId
                              ? 'Selecione um cliente primeiro'
                              : isLoadingVehicles
                              ? 'Carregando veículos...'
                              : 'Selecione o veículo'
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vehicles?.map((v: any) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.plate ? `${v.plate} - ` : ''}
                          {v.displayName || `${v.make} ${v.model}`}
                          {v.color ? ` (${v.color})` : ''}
                        </SelectItem>
                      ))}
                      {vehicles?.length === 0 && (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          Cliente sem veículos cadastrados.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vehicle_km"
                render={({ field }) => {
                  const selectedVehicleId = form.watch('customer_vehicle_id');
                  const selectedVehicle = vehicles.find((v: any) => v.id === selectedVehicleId);
                  const currentKm = selectedVehicle?.currentKm || 0;
                  const isKmLower = field.value < currentKm;

                  return (
                    <FormItem>
                      <FormLabel>KM Atual</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      {isKmLower && (
                        <p className="text-sm font-medium text-warning flex items-center gap-1 mt-1">
                          <AlertTriangle className="h-3 w-3" />
                          Menor que último registro ({currentKm} km)
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>

            <FormField
              control={form.control}
              name="symptoms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relato / Sintomas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o problema relatado pelo cliente..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button variant="ghost" type="button" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createOrder.isPending}>
              {createOrder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Abrir OS
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
