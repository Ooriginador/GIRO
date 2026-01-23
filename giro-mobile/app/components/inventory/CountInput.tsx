/**
 * CountInput Component
 * Numeric input for inventory counting
 */

import { Check, Minus, Plus, RotateCcw, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { useHaptics } from '@/hooks/useHaptics';
import { formatQuantity } from '@/lib/utils';

interface CountInputProps {
  productName: string;
  expectedQuantity: number;
  unit: string;
  initialValue?: number;
  onConfirm: (quantity: number) => void;
  onSkip?: () => void;
  onCancel?: () => void;
}

export function CountInput({
  productName,
  expectedQuantity,
  unit,
  initialValue,
  onConfirm,
  onSkip,
  onCancel,
}: CountInputProps) {
  const [value, setValue] = useState(initialValue?.toString() || '');
  const inputRef = useRef<TextInput>(null);
  const { hapticSelection } = useHaptics();

  useEffect(() => {
    // Focus input on mount
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  const numericValue = parseFloat(value) || 0;
  const difference = numericValue - expectedQuantity;
  const hasDifference = value !== '' && difference !== 0;

  const handleIncrement = () => {
    hapticSelection();
    setValue((prev) => {
      const current = parseFloat(prev) || 0;
      return (current + 1).toString();
    });
  };

  const handleDecrement = () => {
    hapticSelection();
    setValue((prev) => {
      const current = parseFloat(prev) || 0;
      if (current <= 0) return '0';
      return (current - 1).toString();
    });
  };

  const handleSetExpected = () => {
    hapticSelection();
    setValue(expectedQuantity.toString());
  };

  const handleConfirm = () => {
    if (value === '') return;
    onConfirm(numericValue);
  };

  return (
    <View className="bg-card rounded-2xl p-6">
      {/* Product Info */}
      <View className="items-center mb-6">
        <Text className="text-lg font-bold text-foreground text-center" numberOfLines={2}>
          {productName}
        </Text>
        <Text className="text-muted-foreground mt-1">
          Esperado: {formatQuantity(expectedQuantity, unit)}
        </Text>
      </View>

      {/* Input Area */}
      <View className="items-center mb-6">
        <View className="flex-row items-center">
          {/* Decrement Button */}
          <Pressable
            onPress={handleDecrement}
            className="w-14 h-14 bg-muted rounded-full items-center justify-center active:bg-muted/80"
          >
            <Minus size={24} className="text-foreground" />
          </Pressable>

          {/* Value Input */}
          <View className="mx-4 items-center">
            <TextInput
              ref={inputRef}
              value={value}
              onChangeText={setValue}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#94a3b8"
              className="text-5xl font-bold text-center text-foreground min-w-[120px]"
              selectTextOnFocus
            />
            <Text className="text-muted-foreground uppercase tracking-wide mt-1">{unit}</Text>
          </View>

          {/* Increment Button */}
          <Pressable
            onPress={handleIncrement}
            className="w-14 h-14 bg-muted rounded-full items-center justify-center active:bg-muted/80"
          >
            <Plus size={24} className="text-foreground" />
          </Pressable>
        </View>

        {/* Difference Indicator */}
        {hasDifference && (
          <View
            className={`mt-4 px-4 py-2 rounded-full ${
              difference > 0 ? 'bg-primary/20' : 'bg-destructive/20'
            }`}
          >
            <Text className={`font-medium ${difference > 0 ? 'text-primary' : 'text-destructive'}`}>
              {difference > 0 ? '+' : ''}
              {formatQuantity(difference, unit)} {difference > 0 ? 'a mais' : 'a menos'}
            </Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View className="flex-row justify-center mb-6">
        <Pressable
          onPress={handleSetExpected}
          className="flex-row items-center px-4 py-2 bg-muted rounded-lg"
        >
          <RotateCcw size={16} className="text-muted-foreground mr-2" />
          <Text className="text-muted-foreground">
            Usar esperado ({formatQuantity(expectedQuantity, unit)})
          </Text>
        </Pressable>
      </View>

      {/* Action Buttons */}
      <View className="flex-row gap-3">
        {onSkip && (
          <Button variant="ghost" className="flex-1" onPress={onSkip}>
            <Text className="text-muted-foreground">Pular</Text>
          </Button>
        )}

        {onCancel && (
          <Button variant="outline" className="flex-1" onPress={onCancel}>
            <X size={18} className="mr-2" />
            <Text>Cancelar</Text>
          </Button>
        )}

        <Button className="flex-1" onPress={handleConfirm} disabled={value === ''}>
          <Check size={18} className="mr-2 text-primary-foreground" />
          <Text className="text-primary-foreground">Confirmar</Text>
        </Button>
      </View>
    </View>
  );
}

/**
 * QuickCountButtons Component
 * Preset quantity buttons for fast counting
 */
interface QuickCountButtonsProps {
  presets: number[];
  unit: string;
  onSelect: (value: number) => void;
}

export function QuickCountButtons({ presets, unit, onSelect }: QuickCountButtonsProps) {
  const { hapticSelection } = useHaptics();

  return (
    <View className="flex-row flex-wrap gap-2 justify-center">
      {presets.map((value) => (
        <Pressable
          key={value}
          onPress={() => {
            hapticSelection();
            onSelect(value);
          }}
          className="bg-muted px-4 py-2 rounded-lg active:bg-primary/20"
        >
          <Text className="font-medium text-foreground">{formatQuantity(value, unit)}</Text>
        </Pressable>
      ))}
    </View>
  );
}
