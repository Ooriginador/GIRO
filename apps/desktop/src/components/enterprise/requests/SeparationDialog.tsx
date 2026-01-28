import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import type { MaterialRequest, MaterialRequestItem } from '@/types/enterprise';

interface SeparationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MaterialRequest;
  items: MaterialRequestItem[];
  onConfirm: (separatedItems: Array<{ itemId: string; separatedQty: number }>) => Promise<void>;
}

export function SeparationDialog({
  open,
  onOpenChange,
  request,
  items,
  onConfirm,
}: SeparationDialogProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize quantities with separatedQuantity or approvedQuantity or requestedQuantity
  useMemo(() => {
    if (open) {
      const initial: Record<string, number> = {};
      items.forEach((item) => {
        initial[item.id] =
          item.separatedQuantity ?? item.approvedQuantity ?? item.requestedQuantity ?? 0;
      });
      setQuantities(initial);
    }
  }, [open, items]);

  const handleQuantityChange = (itemId: string, val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      setQuantities((prev) => ({ ...prev, [itemId]: num }));
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = Object.entries(quantities).map(([itemId, qty]) => ({
        itemId,
        separatedQty: qty,
      }));
      await onConfirm(payload);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to submit separation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Conferência de Separação</DialogTitle>
          <DialogDescription>
            Confirme as quantidades reais separadas para a requisição {request.code}.
            <br />
            Itens não separados (quantidade 0) permanecerão pendentes se for parcial, mas o sistema
            atual assume finalização.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right w-24">Solicitado</TableHead>
                <TableHead className="text-right w-24">Aprovado</TableHead>
                <TableHead className="text-right w-32">Separação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const approved = item.approvedQuantity ?? item.requestedQuantity;
                const current = quantities[item.id] ?? approved;
                const isFullySeparated = current >= approved;
                const isZero = current === 0;

                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{item.product?.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.product?.code || item.productId}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {item.requestedQuantity}
                    </TableCell>
                    <TableCell className="text-right font-medium">{approved}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className={`text-right ${
                          isZero ? 'text-red-500' : isFullySeparated ? 'text-green-600' : ''
                        }`}
                        value={current}
                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Confirmando...' : 'Confirmar Separação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
