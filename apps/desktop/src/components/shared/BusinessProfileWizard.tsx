import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useBusinessProfile } from '@/stores/useBusinessProfile';
import { AVAILABLE_PROFILES, BusinessProfile, BusinessType } from '@/types/business-profile';
import { AnimatePresence, motion } from 'framer-motion';
import { Bike, Check, ChevronRight, Dog, Info, ShoppingCart, Sparkles, Store } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ═══════════════════════════════════════════════════════════════════════════
// BUSINESS PROFILE WIZARD
// ═══════════════════════════════════════════════════════════════════════════

const ICON_MAP: Record<string, React.ElementType> = {
  ShoppingCart,
  Bike,
  Dog,
  Store,
};

interface ProfileCardProps {
  profile: BusinessProfile;
  isSelected: boolean;
  isComingSoon?: boolean;
  onSelect: () => void;
}

function ProfileCard({ profile, isSelected, isComingSoon, onSelect }: ProfileCardProps) {
  const Icon = ICON_MAP[profile.icon] || Store;

  return (
    <Card
      className={cn(
        'relative cursor-pointer transition-all duration-200 hover:shadow-lg',
        isSelected && 'ring-2 ring-primary shadow-lg',
        isComingSoon && 'opacity-60 cursor-not-allowed'
      )}
      onClick={() => !isComingSoon && onSelect()}
    >
      <CardContent className="p-6 text-center">
        {/* Coming Soon Badge */}
        {isComingSoon && (
          <div className="absolute top-2 right-2 bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full">
            Em breve
          </div>
        )}

        {/* Selected Indicator */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1"
          >
            <Check className="h-4 w-4" />
          </motion.div>
        )}

        {/* Icon */}
        <div
          className={cn(
            'mx-auto mb-4 p-4 rounded-full w-20 h-20 flex items-center justify-center',
            isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
          )}
        >
          <Icon className="h-10 w-10" />
        </div>

        {/* Title */}
        <h3 className="font-semibold text-lg mb-2">{profile.name}</h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground">{profile.description}</p>

        {/* Features Preview */}
        <div className="mt-4 flex flex-wrap gap-1 justify-center">
          {profile.features.expirationControl && <FeatureBadge label="Validade" />}
          {profile.features.weightedProducts && <FeatureBadge label="Balança" />}
          {profile.features.vehicleCompatibility && <FeatureBadge label="Veículos" />}
          {profile.features.serviceOrders && <FeatureBadge label="OS" />}
          {profile.features.petRegistry && <FeatureBadge label="Pets" />}
        </div>
      </CardContent>
    </Card>
  );
}

function FeatureBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground">
      {label}
    </span>
  );
}

interface BusinessProfileWizardProps {
  /**
   * Callback quando o perfil é selecionado e confirmado
   */
  onComplete?: () => void;

  /**
   * Se deve redirecionar automaticamente após seleção
   * @default true
   */
  redirectAfterComplete?: boolean;

  /**
   * Rota para redirecionar após seleção
   * @default '/'
   */
  redirectTo?: string;
}

export function BusinessProfileWizard({
  onComplete,
  redirectAfterComplete = true,
  redirectTo = '/',
}: BusinessProfileWizardProps) {
  const navigate = useNavigate();
  const { businessType, setBusinessType, markAsConfigured } = useBusinessProfile();
  const [selectedType, setSelectedType] = useState<BusinessType>(businessType);

  const selectedProfile = AVAILABLE_PROFILES.find((p) => p.type === selectedType);

  const handleConfirm = () => {
    setBusinessType(selectedType);
    markAsConfigured();

    onComplete?.();

    if (redirectAfterComplete) {
      navigate(redirectTo);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4"
          >
            <Sparkles className="h-8 w-8" />
          </motion.div>

          <h1 className="text-3xl font-bold mb-2">Bem-vindo ao GIRO!</h1>
          <p className="text-muted-foreground text-lg">Qual é o tipo do seu negócio?</p>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="mt-2">
                  <Info className="h-4 w-4 mr-1" />
                  Por que isso é importante?
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  O perfil do negócio personaliza a interface, habilita funcionalidades específicas
                  e configura categorias padrão para agilizar seu setup.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Profile Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {AVAILABLE_PROFILES.map((profile) => (
            <ProfileCard
              key={profile.type}
              profile={profile}
              isSelected={selectedType === profile.type}
              onSelect={() => setSelectedType(profile.type)}
            />
          ))}

          {/* Pet Shop (Coming Soon) */}
          <ProfileCard
            profile={{
              type: 'PETSHOP',
              name: 'Pet Shop',
              description: 'Pet shops, clínicas veterinárias e banho/tosa',
              icon: 'Dog',
              features: {
                pdv: true,
                inventory: true,
                employees: true,
                cashControl: true,
                reports: true,
                backup: true,

                expirationControl: false,
                weightedProducts: false,
                lotTracking: false,

                vehicleCompatibility: false,
                serviceOrders: false,
                warranties: false,
                customerVehicles: false,
                vehicleHistory: false,

                petRegistry: true,
                grooming: false,
                petScheduling: false,
              },
              labels: {
                product: 'Produto',
                products: 'Produtos',
                customer: 'Cliente',
                customers: 'Clientes',
                sale: 'Venda',
                sales: 'Vendas',
                addProduct: 'Adicionar Produto',
                newSale: 'Nova Venda',
                barcode: 'Código de Barras',
                category: 'Categoria',
              },
              defaultCategories: [],
            }}
            isSelected={false}
            isComingSoon
            onSelect={() => {}}
          />
        </div>

        {/* Selected Profile Details */}
        <AnimatePresence mode="wait">
          {selectedProfile && (
            <motion.div
              key={selectedProfile.type}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8"
            >
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-3">
                    Funcionalidades do perfil {selectedProfile.name}:
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {/* Core Features */}
                    <FeatureItem label="PDV Completo" enabled />
                    <FeatureItem label="Controle de Estoque" enabled />
                    <FeatureItem label="Gestão de Funcionários" enabled />
                    <FeatureItem label="Controle de Caixa" enabled />
                    <FeatureItem label="Relatórios" enabled />
                    <FeatureItem label="Backup Automático" enabled />

                    {/* Profile-specific */}
                    <FeatureItem
                      label="Controle de Validade"
                      enabled={selectedProfile.features.expirationControl}
                    />
                    <FeatureItem
                      label="Produtos Pesáveis"
                      enabled={selectedProfile.features.weightedProducts}
                    />
                    <FeatureItem
                      label="Compatibilidade Veicular"
                      enabled={selectedProfile.features.vehicleCompatibility}
                    />
                    <FeatureItem
                      label="Ordens de Serviço"
                      enabled={selectedProfile.features.serviceOrders}
                    />
                    <FeatureItem
                      label="Controle de Garantias"
                      enabled={selectedProfile.features.warranties}
                    />
                    <FeatureItem
                      label="Veículos do Cliente"
                      enabled={selectedProfile.features.customerVehicles}
                    />
                  </div>

                  {/* Default Categories */}
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">
                      Categorias padrão que serão criadas:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedProfile.defaultCategories.slice(0, 6).map((cat) => (
                        <span
                          key={cat.name}
                          className="inline-flex items-center px-2 py-1 rounded text-xs"
                          style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                        >
                          {cat.name}
                        </span>
                      ))}
                      {selectedProfile.defaultCategories.length > 6 && (
                        <span className="text-xs text-muted-foreground">
                          +{selectedProfile.defaultCategories.length - 6} mais
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="lg"
            onClick={handleConfirm}
            disabled={!selectedType}
            className="min-w-[200px]"
          >
            Continuar com {selectedProfile?.name}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Footer Note */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Você poderá alterar o perfil nas configurações a qualquer momento.
        </p>
      </motion.div>
    </div>
  );
}

function FeatureItem({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div
        className={cn(
          'w-4 h-4 rounded-full flex items-center justify-center',
          enabled ? 'bg-green-500/20 text-green-600' : 'bg-muted text-muted-foreground'
        )}
      >
        {enabled ? <Check className="h-3 w-3" /> : <span className="text-[8px]">—</span>}
      </div>
      <span className={cn(!enabled && 'text-muted-foreground')}>{label}</span>
    </div>
  );
}

export default BusinessProfileWizard;
