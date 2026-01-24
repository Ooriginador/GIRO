/**
 * InventorySummary Component
 * Shows inventory progress and statistics
 */

import {
  AlertTriangle,
  Check,
  ClipboardList,
  Clock,
  TrendingDown,
  TrendingUp,
} from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import type { InventorySummary as InventorySummaryType } from '@/types/inventory';

interface InventorySummaryProps {
  summary: InventorySummaryType;
  showDetails?: boolean;
}

export function InventorySummary({ summary, showDetails = true }: InventorySummaryProps) {
  return (
    <View className="gap-4">
      {/* Progress Card */}
      <Card>
        <CardContent className="py-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="font-semibold text-foreground">Progresso</Text>
            <Badge variant={(summary.progress || 0) === 100 ? 'success' : 'secondary'}>
              <Text
                className={`text-xs ${
                  (summary.progress || 0) === 100 ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {summary.counted ?? summary.countedProducts}/
                {summary.total ?? summary.totalProducts}
              </Text>
            </Badge>
          </View>

          {/* Progress Bar */}
          <View className="h-3 bg-muted rounded-full overflow-hidden">
            <View
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${summary.progress || 0}%` as any }}
            />
          </View>

          <Text className="text-sm text-muted-foreground text-center mt-2">
            {(summary.progress || 0).toFixed(0)}% concluído
          </Text>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      {showDetails && (
        <View className="flex-row gap-4">
          <StatCard
            icon={<Check size={20} className="text-primary" />}
            label="Contados"
            value={summary.counted ?? summary.countedProducts}
            color="primary"
          />
          <StatCard
            icon={<Clock size={20} className="text-muted-foreground" />}
            label="Pendentes"
            value={summary.pending ?? summary.pendingProducts}
            color="muted"
          />
          <StatCard
            icon={<AlertTriangle size={20} className="text-warning" />}
            label="Divergentes"
            value={summary.divergent ?? summary.productsWithDifference}
            color="warning"
          />
        </View>
      )}

      {/* Divergence Details */}
      {showDetails && (summary.divergent ?? summary.productsWithDifference) > 0 && (
        <Card className="border-warning/50">
          <CardHeader>
            <View className="flex-row items-center">
              <AlertTriangle size={18} className="text-warning mr-2" />
              <Text className="font-semibold text-foreground">Divergências</Text>
            </View>
          </CardHeader>
          <CardContent>
            <View className="flex-row justify-around">
              <View className="items-center">
                <View className="flex-row items-center">
                  <TrendingUp size={16} className="text-primary mr-1" />
                  <Text className="text-2xl font-bold text-primary">
                    {summary.positiveAdjustments || 0}
                  </Text>
                </View>
                <Text className="text-xs text-muted-foreground">A mais</Text>
              </View>
              <View className="w-px bg-border" />
              <View className="items-center">
                <View className="flex-row items-center">
                  <TrendingDown size={16} className="text-destructive mr-1" />
                  <Text className="text-2xl font-bold text-destructive">
                    {summary.negativeAdjustments || 0}
                  </Text>
                </View>
                <Text className="text-xs text-muted-foreground">A menos</Text>
              </View>
            </View>
          </CardContent>
        </Card>
      )}
    </View>
  );
}

// Stat Card Component
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'primary' | 'muted' | 'warning' | 'destructive';
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  const bgColors = {
    primary: 'bg-primary/10',
    muted: 'bg-muted',
    warning: 'bg-warning/10',
    destructive: 'bg-destructive/10',
  };

  return (
    <Card className="flex-1">
      <CardContent className="items-center py-4">
        <View
          className={`w-10 h-10 rounded-full items-center justify-center mb-2 ${bgColors[color]}`}
        >
          {icon}
        </View>
        <Text className="text-2xl font-bold text-foreground">{value}</Text>
        <Text className="text-xs text-muted-foreground uppercase tracking-wide">{label}</Text>
      </CardContent>
    </Card>
  );
}

/**
 * InventoryHeader Component
 * Compact header for inventory screens
 */
interface InventoryHeaderProps {
  summary: InventorySummaryType;
}

export function InventoryHeader({ summary }: InventoryHeaderProps) {
  return (
    <View className="bg-card border-b border-border px-4 py-3">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <ClipboardList size={18} className="text-primary mr-2" />
          <Text className="font-semibold text-foreground">Inventário em Andamento</Text>
        </View>
        <Badge variant="secondary">
          <Text className="text-secondary-foreground text-xs">
            {summary.counted ?? summary.countedProducts}/{summary.total ?? summary.totalProducts}
          </Text>
        </Badge>
      </View>

      {/* Progress Bar */}
      <View className="h-2 bg-muted rounded-full overflow-hidden">
        <View
          className="h-full bg-primary rounded-full"
          style={{ width: `${summary.progress || 0}%` as any }}
        />
      </View>

      {/* Quick Stats */}
      <View className="flex-row justify-around mt-3">
        <View className="items-center">
          <Text className="text-lg font-bold text-foreground">
            {summary.counted ?? summary.countedProducts}
          </Text>
          <Text className="text-xs text-muted-foreground">Contados</Text>
        </View>
        <View className="items-center">
          <Text className="text-lg font-bold text-foreground">
            {summary.pending ?? summary.pendingProducts}
          </Text>
          <Text className="text-xs text-muted-foreground">Pendentes</Text>
        </View>
        <View className="items-center">
          <Text className="text-lg font-bold text-warning">
            {summary.divergent ?? summary.productsWithDifference}
          </Text>
          <Text className="text-xs text-muted-foreground">Divergentes</Text>
        </View>
      </View>
    </View>
  );
}
