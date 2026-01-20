/**
 * Spotlight - Componente de destaque visual
 * Cria um overlay escuro com um "buraco" iluminando o elemento alvo
 */

import { cn } from '@/lib/utils';
import { type FC, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { SpotlightConfig } from './types';

interface SpotlightProps {
  /** Seletor CSS do elemento alvo */
  target?: string;
  /** Se o spotlight está ativo */
  isActive: boolean;
  /** Configurações do spotlight */
  config?: Partial<SpotlightConfig>;
  /** Se deve usar alto contraste */
  highContrast?: boolean;
  /** Callback quando clica fora do elemento */
  onClickOutside?: () => void;
  /** Callback quando clica no elemento */
  onClickTarget?: () => void;
  /** Children a renderizar dentro do spotlight */
  children?: React.ReactNode;
}

interface ElementRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const defaultConfig: SpotlightConfig = {
  padding: 8,
  overlayColor: '#000000',
  overlayOpacity: 0.75,
  borderRadius: 8,
  pulse: true,
  transitionDuration: 300,
};

export const Spotlight: FC<SpotlightProps> = ({
  target,
  isActive,
  config: userConfig,
  highContrast = false,
  onClickOutside,
  onClickTarget,
  children,
}) => {
  const [rect, setRect] = useState<ElementRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const outsideRef = useRef<HTMLDivElement | null>(null);
  const previousActiveElementRef = useRef<Element | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const mutationObserverRef = useRef<MutationObserver | null>(null);

  const config = { ...defaultConfig, ...userConfig };

  // Atualizar posição do elemento
  const updatePosition = useCallback(() => {
    if (!target) {
      setRect(null);
      return;
    }

    const element = document.querySelector(target);
    if (!element) {
      setRect(null);
      return;
    }

    const boundingRect = element.getBoundingClientRect();
    setRect({
      top: boundingRect.top - config.padding,
      left: boundingRect.left - config.padding,
      width: boundingRect.width + config.padding * 2,
      height: boundingRect.height + config.padding * 2,
    });
  }, [target, config.padding]);

  // Observar mudanças no elemento e no scroll
  useEffect(() => {
    if (!isActive || !target) return;

    updatePosition();

    // Atualizar em scroll
    const handleScroll = () => updatePosition();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    // Observar mudanças de tamanho
    const element = document.querySelector(target);
    if (element) {
      resizeObserverRef.current = new ResizeObserver(updatePosition);
      resizeObserverRef.current.observe(element);

      // Observar mudanças no DOM (elemento pode mudar)
      mutationObserverRef.current = new MutationObserver(updatePosition);
      mutationObserverRef.current.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
      resizeObserverRef.current?.disconnect();
      mutationObserverRef.current?.disconnect();
    };
  }, [isActive, target, updatePosition]);

  // Controlar visibilidade com transição
  useEffect(() => {
    if (isActive) {
      setIsVisible(true);
    } else {
      const timeout = setTimeout(() => setIsVisible(false), config.transitionDuration);
      return () => clearTimeout(timeout);
    }
  }, [isActive, config.transitionDuration]);

  // Scroll do elemento para a view
  useEffect(() => {
    if (!isActive || !target) return;

    const element = document.querySelector(target);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });

      // Atualizar posição após scroll
      setTimeout(updatePosition, 500);
    }
  }, [isActive, target, updatePosition]);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClickOutside) {
        onClickOutside();
      }
    };

    if (isActive) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isActive, onClickOutside]);

  // Manage focus: when spotlight opens, save previous focus and focus the overlay
  useEffect(() => {
    if (isActive) {
      previousActiveElementRef.current = document.activeElement;
      // focus overlay if available
      setTimeout(() => {
        outsideRef.current?.focus();
      }, 0);
    } else {
      // restore focus
      const prev = previousActiveElementRef.current as HTMLElement | null;
      prev?.focus?.();
      previousActiveElementRef.current = null;
    }
  }, [isActive]);

  if (!isVisible) return null;

  // Cores para alto contraste
  const overlayColor = highContrast ? '#000000' : config.overlayColor;
  const overlayOpacity = highContrast ? 0.9 : config.overlayOpacity;
  const borderColor = highContrast ? '#FFFF00' : 'rgba(255, 255, 255, 0.8)';

  // Se não tem target, mostrar apenas overlay central
  if (!rect) {
    return createPortal(
      <div
        className={cn(
          'fixed inset-0 z-[9998] flex items-center justify-center',
          'transition-opacity',
          isActive ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          backgroundColor: `${overlayColor}${Math.round(overlayOpacity * 255)
            .toString(16)
            .padStart(2, '0')}`,
          transitionDuration: `${config.transitionDuration}ms`,
        }}
        onClick={onClickOutside}
        role="presentation"
        aria-hidden="true"
      >
        {children}
      </div>,
      document.body
    );
  }

  return createPortal(
    <>
      {/* Overlay com clip-path para criar o buraco */}
      <div
        className={cn(
          'fixed inset-0 z-[9998] pointer-events-none',
          'transition-opacity',
          isActive ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          backgroundColor: overlayColor,
          opacity: overlayOpacity,
          transitionDuration: `${config.transitionDuration}ms`,
          clipPath: `polygon(
            0% 0%, 
            0% 100%, 
            ${rect.left}px 100%, 
            ${rect.left}px ${rect.top}px, 
            ${rect.left + rect.width}px ${rect.top}px, 
            ${rect.left + rect.width}px ${rect.top + rect.height}px, 
            ${rect.left}px ${rect.top + rect.height}px, 
            ${rect.left}px 100%, 
            100% 100%, 
            100% 0%
          )`,
        }}
        aria-hidden="true"
      />

      {/* Borda do spotlight */}
      <div
        className={cn(
          'fixed z-[9999] pointer-events-none',
          'border-2 rounded-lg',
          'transition-all',
          config.pulse && 'animate-pulse'
        )}
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          borderColor,
          borderRadius: config.borderRadius,
          boxShadow: highContrast
            ? `0 0 0 4px ${borderColor}, 0 0 20px ${borderColor}`
            : `0 0 0 2px ${borderColor}, 0 0 20px rgba(255, 255, 255, 0.3)`,
          transitionDuration: `${config.transitionDuration}ms`,
        }}
        aria-hidden="true"
      />

      {/* Área clicável fora do spotlight */}
      <div
        ref={outsideRef}
        className="fixed inset-0 z-[9998] cursor-pointer"
        onClick={onClickOutside}
        onKeyDown={(e) => {
          if (e.key === 'Escape') return onClickOutside?.();
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            return onClickOutside?.();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Clique para fechar o tutorial"
        style={{
          clipPath: `polygon(
            0% 0%, 
            0% 100%, 
            ${rect.left}px 100%, 
            ${rect.left}px ${rect.top}px, 
            ${rect.left + rect.width}px ${rect.top}px, 
            ${rect.left + rect.width}px ${rect.top + rect.height}px, 
            ${rect.left}px ${rect.top + rect.height}px, 
            ${rect.left}px 100%, 
            100% 100%, 
            100% 0%
          )`,
        }}
      />

      {/* Área clicável sobre o elemento destacado */}
      {onClickTarget && (
        <div
          className="fixed z-[10000] cursor-pointer"
          onClick={onClickTarget}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClickTarget?.();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Clique para interagir com o elemento destacado"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
        />
      )}

      {/* Children (tooltip) renderizado fora do spotlight */}
      {children}
    </>,
    document.body
  );
};

export default Spotlight;
