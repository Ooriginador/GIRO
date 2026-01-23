/**
 * Componente Modal - Modais e diálogos
 */

import React from 'react';
import {
  Modal as RNModal,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  type ModalProps as RNModalProps,
} from 'react-native';
import { Button } from './Button';

interface ModalProps extends Omit<RNModalProps, 'children'> {
  children: React.ReactNode;
  title?: string;
  onClose?: () => void;
  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
}

export function Modal({
  children,
  visible,
  title,
  onClose,
  closeOnBackdrop = true,
  showCloseButton = true,
  animationType = 'fade',
  transparent = true,
  ...props
}: ModalProps) {
  const handleBackdropPress = () => {
    if (closeOnBackdrop && onClose) {
      onClose();
    }
  };

  return (
    <RNModal
      visible={visible}
      animationType={animationType}
      transparent={transparent}
      onRequestClose={onClose}
      {...props}
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View className="flex-1 justify-center items-center bg-black/50 px-4">
          <TouchableWithoutFeedback>
            <View className="bg-background rounded-2xl w-full max-w-sm shadow-xl">
              {/* Header */}
              {(title || showCloseButton) && (
                <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
                  {title && <Text className="text-lg font-semibold text-foreground">{title}</Text>}
                  {showCloseButton && onClose && (
                    <TouchableOpacity
                      onPress={onClose}
                      className="p-1"
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text className="text-xl text-foreground-muted">✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Content */}
              <View className="p-4">{children}</View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
}

// Modal de confirmação
interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'default' | 'destructive';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmVariant = 'default',
  onConfirm,
  onCancel,
  isLoading,
}: ConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      title={title}
      onClose={onCancel}
      closeOnBackdrop={!isLoading}
      showCloseButton={false}
    >
      <Text className="text-foreground-secondary mb-6">{message}</Text>

      <View className="flex-row gap-3">
        <Button variant="secondary" className="flex-1" onPress={onCancel} disabled={isLoading}>
          {cancelText}
        </Button>
        <Button
          variant={confirmVariant}
          className="flex-1"
          onPress={onConfirm}
          isLoading={isLoading}
        >
          {confirmText}
        </Button>
      </View>
    </Modal>
  );
}

// Modal de alerta
interface AlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  buttonText?: string;
  onClose: () => void;
  variant?: 'info' | 'success' | 'warning' | 'error';
}

export function AlertModal({
  visible,
  title,
  message,
  buttonText = 'OK',
  onClose,
  variant = 'info',
}: AlertModalProps) {
  const icons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  };

  return (
    <Modal visible={visible} onClose={onClose} showCloseButton={false}>
      <View className="items-center">
        <Text className="text-4xl mb-4">{icons[variant]}</Text>
        <Text className="text-lg font-semibold text-foreground text-center mb-2">{title}</Text>
        <Text className="text-foreground-secondary text-center mb-6">{message}</Text>
        <Button className="w-full" onPress={onClose}>
          {buttonText}
        </Button>
      </View>
    </Modal>
  );
}
