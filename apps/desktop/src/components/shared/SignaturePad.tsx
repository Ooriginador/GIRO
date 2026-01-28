import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Eraser, Check } from 'lucide-react';

interface SignaturePadProps {
  onConfirm: (signature: string) => void;
  onCancel?: () => void;
  className?: string;
}

export function SignaturePad({ onConfirm, onCancel, className }: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const clear = () => {
    sigCanvas.current?.clear();
    setIsEmpty(true);
  };

  const confirm = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const signatureData = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
      // Remove o prefixo data:image/png;base64, para enviar apenas a string base64 se necessário,
      // mas geralmente para exibir em <img> mantemos o prefixo.
      // O backend Rust espera receber a string completa ou tratada?
      // O Tauri command recebe Option<String>. Vamos enviar completo para facilitar exibição depois.
      onConfirm(signatureData);
    }
  };

  const handleEnd = () => {
    if (sigCanvas.current) {
      setIsEmpty(sigCanvas.current.isEmpty());
    }
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <Card className="border-2 border-dashed border-gray-300 bg-gray-50 overflow-hidden">
        <SignatureCanvas
          ref={sigCanvas}
          penColor="black"
          canvasProps={{
            className: 'signature-canvas w-full h-[200px] cursor-crosshair',
          }}
          backgroundColor="rgba(0,0,0,0)"
          onEnd={handleEnd}
        />
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={clear} disabled={isEmpty} type="button">
          <Eraser className="w-4 h-4 mr-2" />
          Limpar
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} type="button">
            Cancelar
          </Button>
        )}
        <Button onClick={confirm} disabled={isEmpty} type="button">
          <Check className="w-4 h-4 mr-2" />
          Confirmar Assinatura
        </Button>
      </div>
    </div>
  );
}
