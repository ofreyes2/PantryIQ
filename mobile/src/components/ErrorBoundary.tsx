import React, { useState, ReactNode } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RefreshCw, AlertTriangle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors, BorderRadius } from '@/constants/theme';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorCount: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);

    // Log error details to AsyncStorage for debugging
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      };
      console.log('Error logged:', JSON.stringify(errorLog));
    } catch (e) {
      console.error('Failed to log error:', e);
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }

  handleRetry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    this.setState({ hasError: false, error: null, errorCount: 0 });
  };

  handleRestart = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Restart App',
      'Please close and reopen the app to restart.',
      [{ text: 'OK' }]
    );
  };

  handleSendReport = async () => {
    const { error } = this.state;
    if (error) {
      const subject = 'PantryIQ Error Report';
      const body = `Error: ${error.message}\n\nStack: ${error.stack}\n\nTime: ${new Date().toISOString()}`;
      const mailto = `mailto:support@pantryiq.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      try {
        await Linking.openURL(mailto);
      } catch (e) {
        console.error('Failed to open email:', e);
      }
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <LinearGradient colors={['#0A1628', '#0B1C35']} style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 24,
                paddingVertical: 40,
              }}
            >
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: 'rgba(231, 76, 60, 0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 24,
                }}
              >
                <AlertTriangle size={44} color={Colors.error} />
              </View>

              <Text
                style={{
                  fontFamily: 'PlayfairDisplay_700Bold',
                  fontSize: 26,
                  color: Colors.textPrimary,
                  textAlign: 'center',
                  marginBottom: 12,
                }}
              >
                Something Went Wrong
              </Text>

              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 15,
                  color: Colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: 22,
                  marginBottom: 24,
                }}
              >
                We're sorry about that. The app encountered an unexpected error. You can try again or restart the app.
              </Text>

              <View
                style={{
                  backgroundColor: Colors.surface,
                  borderRadius: BorderRadius.md,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  padding: 12,
                  marginBottom: 24,
                  width: '100%',
                }}
              >
                <Text
                  style={{
                    fontFamily: 'DMSans_700Bold',
                    fontSize: 12,
                    color: Colors.textTertiary,
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Error Details
                </Text>
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 12,
                    color: Colors.textSecondary,
                    lineHeight: 18,
                    fontVariant: ['tabular-nums'],
                  }}
                  selectable
                >
                  {this.state.error.message}
                </Text>
              </View>

              <Pressable
                onPress={this.handleRetry}
                style={{
                  backgroundColor: Colors.green,
                  borderRadius: BorderRadius.full,
                  paddingVertical: 14,
                  paddingHorizontal: 32,
                  alignItems: 'center',
                  marginBottom: 12,
                  width: '100%',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <RefreshCw size={18} color="#fff" />
                <Text
                  style={{
                    fontFamily: 'DMSans_700Bold',
                    fontSize: 15,
                    color: '#fff',
                  }}
                >
                  Try Again
                </Text>
              </Pressable>

              <Pressable
                onPress={this.handleRestart}
                style={{
                  backgroundColor: Colors.surface,
                  borderRadius: BorderRadius.full,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  paddingVertical: 14,
                  paddingHorizontal: 32,
                  alignItems: 'center',
                  marginBottom: 12,
                  width: '100%',
                }}
              >
                <Text
                  style={{
                    fontFamily: 'DMSans_700Bold',
                    fontSize: 15,
                    color: Colors.textPrimary,
                  }}
                >
                  Restart App
                </Text>
              </Pressable>

              <Pressable
                onPress={this.handleSendReport}
                style={{
                  paddingVertical: 12,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 13,
                    color: Colors.green,
                  }}
                >
                  Send Error Report
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </LinearGradient>
      );
    }

    return this.props.children;
  }
}
