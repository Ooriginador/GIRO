/**
 * TutorialTooltip - Tooltip de passo do tutorial
 * Exibe informações do passo atual com navegação
 */

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Check, ChevronLeft, ChevronRight, SkipForward, X } from 'lucide-react';
import { type FC, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { TutorialStep } from './types';

interface TutorialTooltipProps {
  /** Passo atual do tutorial */
  step: TutorialStep;
  /** Índice do passo atual (0-based) */
  stepIndex: number;
  /** Total de passos */
  totalSteps: number;
  /** Se está visível */
  isVisible: boolean;
  /** Tamanho da fonte */
  fontSize?: 'small' | 'medium' | 'large';
  /** Usar alto contraste */
  highContrast?: boolean;
  /** Callback para próximo */
  onNext: () => void;
  /** Callback para anterior */
  onPrevious: () => void;
  /** Callback para pular tutorial */
  onSkip: () => void;
  /** Callback para fechar */
  onClose: () => void;
}

interface Position {
  top: number;
  left: number;
}

const fontSizeClasses = {
  small: 'text-sm',
  medium: 'text-base',
  large: 'text-lg',
};

export const TutorialTooltip: FC<TutorialTooltipProps> = ({
  step,
  stepIndex,
  totalSteps,
  isVisible,
  fontSize = 'medium',
  highContrast = false,
  onNext,
  onPrevious,
  onSkip,
  onClose,
}) => {
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const calculatePosition = useCallback(() => {
    if (!step.target) {
      // Centralizar na tela
      setPosition({
        top: window.innerHeight / 2,
        left: window.innerWidth / 2,
      });
      return;
    }

    const targetElement = step.target ? document.querySelector(step.target) : null;
    const tooltipElement = tooltipRef.current;

    if (!tooltipElement) return;

    // Se o alvo não for encontrado ou não existir, centralizar na tela
    if (!targetElement) {
      setPosition({
        top: window.innerHeight / 2,
        left: window.innerWidth / 2,
      });
      return;
    }

    const targetRect = targetElement.getBoundingClientRect();
    const tooltipRect = tooltipElement.getBoundingClientRect();

    const padding = 16;
    let top = 0;
    let left = 0;

    switch (step.placement) {
      case 'top':
        top = targetRect.top - tooltipRect.height - padding;
        left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        break;
      case 'bottom':
        top = targetRect.bottom + padding;
        left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        break;
      case 'left':
        top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
        left = targetRect.left - tooltipRect.width - padding;
        break;
      case 'right':
        top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
        left = targetRect.right + padding;
        break;
      case 'center':
      default:
        top = window.innerHeight / 2 - tooltipRect.height / 2;
        left = window.innerWidth / 2 - tooltipRect.width / 2;
        break;
    }

    // Manter dentro da tela
    top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));
    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));

    setPosition({ top, left });
  }, [step.target, step.placement]);

  useEffect(() => {
    if (isVisible) {
      // Delay para permitir render inicial
      requestAnimationFrame(() => {
        calculatePosition();
      });

      window.addEventListener('resize', calculatePosition);
      window.addEventListener('scroll', calculatePosition, true);

      return () => {
        window.removeEventListener('resize', calculatePosition);
        window.removeEventListener('scroll', calculatePosition, true);
      };
    }
  }, [isVisible, calculatePosition, step]);

  // Navegação por teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return;

      switch (e.key) {
        case 'ArrowRight':
        case 'Enter':
          e.preventDefault();
          onNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (stepIndex > 0) onPrevious();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 's':
          if (e.ctrlKey) {
            e.preventDefault();
            onSkip();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, stepIndex, onNext, onPrevious, onClose, onSkip]);

  if (!isVisible) return null;

  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === totalSteps - 1;
  const progress = ((stepIndex + 1) / totalSteps) * 100;

  const tooltipContent = (
    <div
      ref={tooltipRef}
      className={cn(
        'fixed z-[10001] w-[380px] max-w-[calc(100vw-32px)]',
        'bg-white dark:bg-gray-900 rounded-xl shadow-2xl',
        'border border-gray-200 dark:border-gray-700',
        'transition-all duration-300 ease-out',
        'animate-in fade-in-0 zoom-in-95',
        highContrast && 'border-2 border-yellow-400 bg-black text-white',
        fontSizeClasses[fontSize]
      )}
      style={{
        top: position.top,
        left: position.left,
        transform: step.placement === 'center' ? 'translate(-50%, -50%)' : 'none',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
      aria-describedby="tutorial-description"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-xs font-medium',
              highContrast
                ? 'bg-yellow-400 text-black'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
            )}
          >
            {stepIndex + 1} / {totalSteps}
          </span>
        </div>
        <button
          onClick={onClose}
          className={cn(
            'p-1 rounded-md transition-colors',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            highContrast && 'hover:bg-yellow-400 hover:text-black'
          )}
          aria-label="Fechar tutorial"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3
          id="tutorial-title"
          className={cn(
            'font-semibold mb-2',
            fontSize === 'small' ? 'text-base' : fontSize === 'large' ? 'text-xl' : 'text-lg'
          )}
        >
          {step.title}
        </h3>
        <p
          id="tutorial-description"
          className={cn(
            'text-gray-600 dark:text-gray-400 leading-relaxed',
            highContrast && 'text-gray-100'
          )}
        >
          {step.description}
        </p>

        {/* Hotkey hint */}
        {step.hotkey && (
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span>Atalho:</span>
            <kbd
              className={cn(
                'px-2 py-0.5 rounded border',
                'bg-gray-100 border-gray-300 font-mono text-xs',
                'dark:bg-gray-800 dark:border-gray-600',
                highContrast && 'bg-yellow-400 text-black border-yellow-600'
              )}
            >
              {step.hotkey}
            </kbd>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-2">
        <Progress
          value={progress}
          className={cn('h-1', highContrast && '[&>div]:bg-yellow-400')}
          aria-label={`Progresso do tutorial: ${Math.round(progress)}%`}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between p-4 pt-2 border-t border-gray-100 dark:border-gray-800">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip}
          className={cn(
            'text-gray-500 hover:text-gray-700',
            highContrast && 'text-yellow-400 hover:text-yellow-300'
          )}
        >
          <SkipForward className="h-4 w-4 mr-1" />
          Pular
        </Button>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevious}
            disabled={isFirstStep}
            aria-label="Passo anterior"
            className={highContrast ? 'border-yellow-400 text-yellow-400' : ''}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            onClick={onNext}
            className={cn(highContrast && 'bg-yellow-400 text-black hover:bg-yellow-300')}
            aria-label={isLastStep ? 'Concluir tutorial' : 'Próximo passo'}
          >
            {isLastStep ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Concluir
              </>
            ) : (
              <>
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Keyboard hint */}
      <div
        className={cn(
          'px-4 pb-3 text-xs text-center text-gray-400',
          highContrast && 'text-gray-300'
        )}
      >
        Use ← → para navegar, ESC para fechar
      </div>
    </div>
  );

  return createPortal(tooltipContent, document.body);
};

export default TutorialTooltip;
