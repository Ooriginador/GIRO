/**
 * 📱 Enterprise Responsive Layouts
 *
 * Layouts responsivos para módulo Enterprise com suporte a tablets.
 * Breakpoints: mobile (<640px), tablet (640-1024px), desktop (>1024px)
 */

import React from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// TIPOS
// =============================================================================

interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  /** Colunas em cada breakpoint */
  cols?: {
    mobile?: 1 | 2;
    tablet?: 2 | 3 | 4;
    desktop?: 3 | 4 | 5 | 6;
  };
  /** Gap entre itens */
  gap?: 'sm' | 'md' | 'lg';
}

interface ResponsiveSidebarLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  className?: string;
  /** Largura da sidebar em desktop */
  sidebarWidth?: 'sm' | 'md' | 'lg';
  /** Sidebar aparece primeiro em mobile */
  sidebarFirst?: boolean;
}

interface ResponsiveStackProps {
  children: React.ReactNode;
  className?: string;
  /** Direção em cada breakpoint */
  direction?: {
    mobile?: 'vertical' | 'horizontal';
    tablet?: 'vertical' | 'horizontal';
    desktop?: 'vertical' | 'horizontal';
  };
  gap?: 'sm' | 'md' | 'lg';
}

interface AdaptiveCardGridProps {
  children: React.ReactNode;
  className?: string;
  /** Tamanho mínimo do card */
  minCardWidth?: number;
  gap?: 'sm' | 'md' | 'lg';
}

interface TabletOptimizedTableProps<T> {
  data: T[];
  columns: {
    key: keyof T;
    label: string;
    /** Visível apenas em desktop */
    desktopOnly?: boolean;
    /** Render personalizado */
    render?: (value: T[keyof T], row: T) => React.ReactNode;
  }[];
  className?: string;
  onRowClick?: (row: T) => void;
}

// =============================================================================
// COMPONENTES
// =============================================================================

/**
 * Grid responsivo com colunas adaptáveis por breakpoint
 */
export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  className,
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'md',
}) => {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  const colClasses = {
    mobile: {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
    },
    tablet: {
      2: 'sm:grid-cols-2',
      3: 'sm:grid-cols-3',
      4: 'sm:grid-cols-4',
    },
    desktop: {
      3: 'lg:grid-cols-3',
      4: 'lg:grid-cols-4',
      5: 'lg:grid-cols-5',
      6: 'lg:grid-cols-6',
    },
  };

  return (
    <div
      className={cn(
        'grid',
        gapClasses[gap],
        colClasses.mobile[cols.mobile ?? 1],
        colClasses.tablet[cols.tablet ?? 2],
        colClasses.desktop[cols.desktop ?? 3],
        className
      )}
    >
      {children}
    </div>
  );
};

/**
 * Layout com sidebar que colapsa em mobile
 */
export const ResponsiveSidebarLayout: React.FC<ResponsiveSidebarLayoutProps> = ({
  children,
  sidebar,
  className,
  sidebarWidth = 'md',
  sidebarFirst = false,
}) => {
  const widthClasses = {
    sm: 'lg:w-64',
    md: 'lg:w-80',
    lg: 'lg:w-96',
  };

  return (
    <div
      className={cn(
        'flex flex-col lg:flex-row',
        sidebarFirst ? 'lg:flex-row' : 'lg:flex-row-reverse',
        'gap-4 lg:gap-6',
        className
      )}
    >
      {/* Sidebar - full width em mobile, fixed width em desktop */}
      <aside className={cn('w-full shrink-0', widthClasses[sidebarWidth])}>{sidebar}</aside>

      {/* Conteúdo principal */}
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
};

/**
 * Stack que muda direção por breakpoint
 */
export const ResponsiveStack: React.FC<ResponsiveStackProps> = ({
  children,
  className,
  direction = { mobile: 'vertical', tablet: 'horizontal', desktop: 'horizontal' },
  gap = 'md',
}) => {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  const directionClasses: string[] = [];

  // Mobile
  if (direction.mobile === 'vertical') {
    directionClasses.push('flex-col');
  } else {
    directionClasses.push('flex-row');
  }

  // Tablet
  if (direction.tablet === 'vertical') {
    directionClasses.push('sm:flex-col');
  } else {
    directionClasses.push('sm:flex-row');
  }

  // Desktop
  if (direction.desktop === 'vertical') {
    directionClasses.push('lg:flex-col');
  } else {
    directionClasses.push('lg:flex-row');
  }

  return (
    <div className={cn('flex', gapClasses[gap], ...directionClasses, className)}>{children}</div>
  );
};

/**
 * Grid de cards que se adapta automaticamente
 */
export const AdaptiveCardGrid: React.FC<AdaptiveCardGridProps> = ({
  children,
  className,
  minCardWidth = 280,
  gap = 'md',
}) => {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  return (
    <div
      className={cn('grid', gapClasses[gap], className)}
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))`,
      }}
    >
      {children}
    </div>
  );
};

/**
 * Tabela otimizada para tablets com colunas colapsáveis
 */
export function TabletOptimizedTable<T extends { id: string | number }>({
  data,
  columns,
  className,
  onRowClick,
}: TabletOptimizedTableProps<T>) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={cn(
                  'px-3 py-2 text-left font-medium text-muted-foreground',
                  col.desktopOnly && 'hidden lg:table-cell'
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((row) => (
            <tr
              key={row.id}
              className={cn('hover:bg-muted/50 transition-colors', onRowClick && 'cursor-pointer')}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  className={cn('px-3 py-2', col.desktopOnly && 'hidden lg:table-cell')}
                >
                  {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Container de ações responsivo
 */
export const ResponsiveActions: React.FC<{
  children: React.ReactNode;
  className?: string;
  /** Empilhar em mobile */
  stackOnMobile?: boolean;
}> = ({ children, className, stackOnMobile = true }) => {
  return (
    <div
      className={cn(
        'flex gap-2',
        stackOnMobile ? 'flex-col sm:flex-row' : 'flex-row',
        'sm:justify-end',
        className
      )}
    >
      {children}
    </div>
  );
};

/**
 * Container de filtros responsivo
 */
export const ResponsiveFilters: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3',
        'p-3 bg-muted/50 rounded-lg',
        className
      )}
    >
      {children}
    </div>
  );
};

/**
 * Hook para detectar tamanho de tela
 */
export function useResponsive() {
  const [screenSize, setScreenSize] = React.useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  React.useEffect(() => {
    const checkSize = () => {
      if (window.innerWidth < 640) {
        setScreenSize('mobile');
      } else if (window.innerWidth < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  return {
    screenSize,
    isMobile: screenSize === 'mobile',
    isTablet: screenSize === 'tablet',
    isDesktop: screenSize === 'desktop',
    isMobileOrTablet: screenSize !== 'desktop',
  };
}

export default {
  ResponsiveGrid,
  ResponsiveSidebarLayout,
  ResponsiveStack,
  AdaptiveCardGrid,
  TabletOptimizedTable,
  ResponsiveActions,
  ResponsiveFilters,
  useResponsive,
};
