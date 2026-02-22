import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Colors, BorderRadius } from '@/constants/theme';

interface DeleteConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  itemName?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function DeleteConfirmationModal({
  visible,
  title,
  message,
  itemName,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isDestructive = true,
  onConfirm,
  onCancel,
  isLoading = false,
}: DeleteConfirmationModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
        }}
      >
        <View
          style={{
            backgroundColor: Colors.navyCard,
            borderRadius: BorderRadius.lg,
            padding: 24,
            width: '100%',
            maxWidth: 320,
          }}
        >
          <Text
            style={{
              fontFamily: 'DMSans_700Bold',
              fontSize: 18,
              color: Colors.textPrimary,
              marginBottom: 12,
            }}
          >
            {title}
          </Text>

          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 14,
              color: Colors.textSecondary,
              marginBottom: itemName ? 4 : 20,
              lineHeight: 20,
            }}
          >
            {message}
          </Text>

          {!!itemName && (
            <Text
              style={{
                fontFamily: 'DMSans_700Bold',
                fontSize: 14,
                color: Colors.textPrimary,
                marginBottom: 20,
              }}
            >
              "{itemName}"
            </Text>
          )}

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              onPress={onCancel}
              disabled={isLoading}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: BorderRadius.md,
                borderWidth: 1,
                borderColor: Colors.border,
                alignItems: 'center',
              }}
              testID="delete-modal-cancel-btn"
            >
              <Text
                style={{
                  fontFamily: 'DMSans_600SemiBold',
                  fontSize: 14,
                  color: Colors.textSecondary,
                }}
              >
                {cancelText}
              </Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              disabled={isLoading}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: BorderRadius.md,
                backgroundColor: isDestructive ? Colors.error : Colors.green,
                alignItems: 'center',
                opacity: isLoading ? 0.6 : 1,
              }}
              testID="delete-modal-confirm-btn"
            >
              <Text
                style={{
                  fontFamily: 'DMSans_600SemiBold',
                  fontSize: 14,
                  color: '#fff',
                }}
              >
                {isLoading ? 'Deleting...' : confirmText}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
