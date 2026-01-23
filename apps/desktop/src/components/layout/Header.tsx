/**
 * @file Header - Cabeçalho da aplicação
 * @description Mostra info do usuário, sessão de caixa e alertas
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/auth-store';
import { useSettingsStore } from '@/stores/settings-store';
import { AlertTriangle, Bell, LogOut, Monitor, Moon, Sun, User } from 'lucide-react';
import { useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';

export const Header: FC = () => {
  const { currentUser, currentSession, logout } = useAuthStore();
  const { theme, setTheme } = useSettingsStore();
  const navigate = useNavigate();
  const [showLogoutWarning, setShowLogoutWarning] = useState(false);

  const handleLogout = () => {
    if (currentSession && currentSession.status === 'OPEN') {
      // Mostrar modal de confirmação se caixa está aberto
      setShowLogoutWarning(true);
      return;
    }
    logout();
  };

  const handleConfirmLogout = () => {
    setShowLogoutWarning(false);
    // Redireciona para fechar caixa antes
    navigate('/cash');
  };

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b bg-card px-6">
        {/* Header Content */}
        <div className="flex items-center gap-4">
          {currentSession ? (
            <div className="flex items-center gap-2" data-tutorial="cash-indicator">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm font-medium text-foreground">Caixa Aberto</span>
              <Badge variant="outline" className="ml-2">
                Sessão #{currentSession.id.slice(-6)}
              </Badge>
            </div>
          ) : (
            <div className="flex items-center gap-2" data-tutorial="cash-indicator">
              <div className="h-2 w-2 rounded-full bg-muted-foreground" />
              <span className="text-sm text-muted-foreground">Caixa Fechado</span>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex items-center gap-2">
          {/* Tema */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                {theme === 'light' && <Sun className="h-5 w-5" />}
                {theme === 'dark' && <Moon className="h-5 w-5" />}
                {theme === 'system' && <Monitor className="h-5 w-5" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme('light')}>
                <Sun className="mr-2 h-4 w-4" />
                Claro
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}>
                <Moon className="mr-2 h-4 w-4" />
                Escuro
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')}>
                <Monitor className="mr-2 h-4 w-4" />
                Sistema
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Alertas */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            data-tutorial="alerts-badge"
            onClick={() => navigate('/alerts')}
          >
            <Bell className="h-5 w-5" />
            {/* Badge de notificações */}
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
              3
            </span>
          </Button>

          {/* Menu do Usuário */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2" data-tutorial="user-menu">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <User className="h-4 w-4" />
                </div>
                <div className="hidden flex-col items-start md:flex">
                  <span className="text-sm font-medium">{currentUser?.name || 'Usuário'}</span>
                  <span className="text-xs text-muted-foreground">
                    {currentUser?.role || 'CASHIER'}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Modal de aviso: caixa aberto */}
      <Dialog open={showLogoutWarning} onOpenChange={setShowLogoutWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Caixa Aberto
            </DialogTitle>
            <DialogDescription>
              Você possui uma sessão de caixa aberta. Para sair do sistema, é necessário fechar o
              caixa primeiro para garantir que todos os valores estejam corretos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogoutWarning(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmLogout}>Ir para Fechamento de Caixa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
