import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { X, RefreshCw } from 'lucide-react-native';
import { LocationSelector } from './LocationSelector';
import { krogerService, type PriceCheckResult } from '@/lib/services/krogerService';
import { instacartService } from '@/lib/services/instacartService';
import { useToast } from './Toast';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import type { UserLocation } from '@/lib/services/apiKeyManager';

interface SmartShoppingScreenProps {
  visible: boolean;
  shoppingItems: Array<{ name: string; quantity: number; unit: string }>;
  onClose: () => void;
}

export function SmartShoppingScreen({
  visible,
  shoppingItems,
  onClose,
}: SmartShoppingScreenProps) {
  const [locationData, setLocationData] = useState<(UserLocation & { storeId?: string; storeName?: string }) | null>(null);
  const [priceResults, setPriceResults] = useState<PriceCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const { showToast } = useToast();

  const runPriceCheck = async () => {
    if (!locationData?.storeId) {
      showToast('Please select a store first');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setLoading(true);
    setLoadingMessage(`Checking prices at ${locationData.storeName || 'your store'}...`);

    const results = await krogerService.priceShoppingList(
      shoppingItems,
      locationData.storeId
    );

    setPriceResults(results);
    setLoading(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const openInstacart = async () => {
    setLoadingMessage('Creating your Instacart order...');
    setLoading(true);

    const result = await instacartService.createShoppingListLink(
      shoppingItems,
      locationData
    );

    setLoading(false);

    if (result.success && result.url) {
      await Linking.openURL(result.url);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      showToast('Could not connect to Instacart — please try again');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleClose = () => {
    setPriceResults(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.navy }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: Spacing.md,
            paddingVertical: Spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: Colors.border,
          }}
        >
          <View>
            <Text style={{ color: Colors.textPrimary, fontSize: 20, fontWeight: '800' }}>
              Smart Shopping
            </Text>
            <Text style={{ color: Colors.textTertiary, fontSize: 13, marginTop: 2 }}>
              {shoppingItems.length} items on your list
            </Text>
          </View>
          <Pressable onPress={handleClose} style={{ padding: 8 }}>
            <X size={24} color={Colors.textTertiary} />
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: Spacing.md }}
          showsVerticalScrollIndicator={false}
        >
          {/* Location Selector */}
          <LocationSelector onLocationChange={(loc) => setLocationData(loc)} />

          {/* Check Prices Button */}
          {!priceResults ? (
            <Pressable
              onPress={runPriceCheck}
              disabled={loading || !locationData?.storeId}
              style={{
                backgroundColor: locationData?.storeId ? Colors.green : Colors.border,
                borderRadius: BorderRadius.lg,
                padding: Spacing.md,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 10,
                marginBottom: Spacing.md,
              }}
            >
              {loading ? (
                <ActivityIndicator color={Colors.navy} />
              ) : (
                <Text style={{ fontSize: 20 }}>🏷️</Text>
              )}
              <Text
                style={{
                  color: locationData?.storeId ? Colors.navy : Colors.textTertiary,
                  fontSize: 16,
                  fontWeight: '800',
                }}
              >
                {loading ? loadingMessage : 'Check Kroger Prices'}
              </Text>
            </Pressable>
          ) : null}

          {/* Price Results */}
          {priceResults ? (
            <View>
              {/* Summary Card */}
              <View
                style={{
                  backgroundColor: Colors.navyCard,
                  borderRadius: BorderRadius.xl,
                  padding: Spacing.md,
                  marginBottom: Spacing.md,
                  borderWidth: 1,
                  borderColor: Colors.green,
                }}
              >
                <Text
                  style={{
                    color: Colors.textTertiary,
                    fontSize: 11,
                    fontWeight: '600',
                    letterSpacing: 1,
                    marginBottom: 12,
                  }}
                >
                  PRICE SUMMARY — {locationData?.storeName?.toUpperCase() || 'YOUR STORE'}
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ color: Colors.textTertiary, fontSize: 14 }}>
                    Regular Total
                  </Text>
                  <Text
                    style={{
                      color: Colors.textPrimary,
                      fontSize: 14,
                      fontWeight: '600',
                      textDecorationLine:
                        parseFloat(priceResults.summary.totalSavings) > 0
                          ? 'line-through'
                          : 'none',
                    }}
                  >
                    ${priceResults.summary.totalRegularPrice}
                  </Text>
                </View>

                {parseFloat(priceResults.summary.totalSavings) > 0 ? (
                  <>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginBottom: 8,
                      }}
                    >
                      <Text style={{ color: Colors.green, fontSize: 14, fontWeight: '600' }}>
                        Sale Savings 🎉
                      </Text>
                      <Text style={{ color: Colors.green, fontSize: 14, fontWeight: '600' }}>
                        -${priceResults.summary.totalSavings}
                      </Text>
                    </View>

                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        paddingTop: Spacing.sm,
                        borderTopWidth: 1,
                        borderTopColor: Colors.border,
                      }}
                    >
                      <Text
                        style={{
                          color: Colors.textPrimary,
                          fontSize: 18,
                          fontWeight: '800',
                        }}
                      >
                        Your Total
                      </Text>
                      <Text style={{ color: Colors.green, fontSize: 22, fontWeight: '800' }}>
                        ${priceResults.summary.totalSalePrice}
                      </Text>
                    </View>
                  </>
                ) : (
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      paddingTop: Spacing.sm,
                      borderTopWidth: 1,
                      borderTopColor: Colors.border,
                    }}
                  >
                    <Text style={{ color: Colors.textPrimary, fontSize: 18, fontWeight: '800' }}>
                      Estimated Total
                    </Text>
                    <Text style={{ color: Colors.green, fontSize: 22, fontWeight: '800' }}>
                      ${priceResults.summary.totalRegularPrice}
                    </Text>
                  </View>
                )}

                {/* Stats row */}
                <View
                  style={{
                    flexDirection: 'row',
                    gap: Spacing.sm,
                    marginTop: Spacing.md,
                    flexWrap: 'wrap',
                  }}
                >
                  <View
                    style={{
                      backgroundColor: Colors.navy,
                      borderRadius: BorderRadius.md,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                    }}
                  >
                    <Text style={{ color: Colors.textTertiary, fontSize: 12 }}>
                      ✓ {priceResults.summary.itemsFound} items found
                    </Text>
                  </View>
                  {priceResults.summary.itemsOnSale > 0 ? (
                    <View
                      style={{
                        backgroundColor: 'rgba(46,204,113,0.1)',
                        borderRadius: BorderRadius.md,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                      }}
                    >
                      <Text style={{ color: Colors.green, fontSize: 12, fontWeight: '600' }}>
                        🏷️ {priceResults.summary.itemsOnSale} on sale
                      </Text>
                    </View>
                  ) : null}
                  {priceResults.summary.itemsNotFound > 0 ? (
                    <View
                      style={{
                        backgroundColor: 'rgba(243,156,18,0.1)',
                        borderRadius: BorderRadius.md,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                      }}
                    >
                      <Text style={{ color: Colors.amber, fontSize: 12 }}>
                        ⚠️ {priceResults.summary.itemsNotFound} not found
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Individual Items */}
              <Text
                style={{
                  color: Colors.textTertiary,
                  fontSize: 11,
                  fontWeight: '600',
                  letterSpacing: 1,
                  marginBottom: 10,
                }}
              >
                ITEM BREAKDOWN
              </Text>

              {priceResults.items.map((item, index) => (
                <View
                  key={index}
                  style={{
                    backgroundColor: Colors.navyCard,
                    borderRadius: BorderRadius.lg,
                    padding: Spacing.md,
                    marginBottom: Spacing.sm,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: item.product?.onSale
                      ? 'rgba(46,204,113,0.3)'
                      : Colors.border,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: Colors.textPrimary,
                        fontSize: 14,
                        fontWeight: '600',
                      }}
                    >
                      {item.shoppingItem.name}
                    </Text>
                    {item.product ? (
                      <Text style={{ color: Colors.textTertiary, fontSize: 12, marginTop: 2 }}>
                        {item.product.brand} — {item.product.size}
                      </Text>
                    ) : null}
                    {item.product?.onSale ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          marginTop: 4,
                        }}
                      >
                        <Text
                          style={{
                            backgroundColor: Colors.green,
                            color: Colors.navy,
                            fontSize: 10,
                            fontWeight: '800',
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: BorderRadius.sm,
                          }}
                        >
                          SALE
                        </Text>
                        <Text style={{ color: Colors.green, fontSize: 11 }}>
                          Save {item.product.savingsPercent}% today
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    {item.product ? (
                      <>
                        {item.product.onSale ? (
                          <Text
                            style={{
                              color: Colors.textTertiary,
                              fontSize: 12,
                              textDecorationLine: 'line-through',
                            }}
                          >
                            ${item.product.price?.toFixed(2)}
                          </Text>
                        ) : null}
                        <Text
                          style={{
                            color: item.product.onSale ? Colors.green : Colors.textPrimary,
                            fontSize: 16,
                            fontWeight: '800',
                          }}
                        >
                          ${item.effectivePrice?.toFixed(2)}
                        </Text>
                        <Text
                          style={{
                            color: item.product.inStock ? Colors.green : Colors.error,
                            fontSize: 10,
                            marginTop: 2,
                          }}
                        >
                          {item.product.inStock ? 'In Stock' : 'Low Stock'}
                        </Text>
                      </>
                    ) : (
                      <Text style={{ color: Colors.amber, fontSize: 12 }}>Not found</Text>
                    )}
                  </View>
                </View>
              ))}

              {/* Recheck button */}
              <Pressable
                onPress={() => {
                  setPriceResults(null);
                  runPriceCheck();
                }}
                style={{
                  backgroundColor: Colors.navyCard,
                  borderRadius: BorderRadius.lg,
                  padding: Spacing.md,
                  alignItems: 'center',
                  marginTop: Spacing.sm,
                  marginBottom: Spacing.md,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <RefreshCw size={16} color={Colors.textTertiary} />
                <Text style={{ color: Colors.textTertiary, fontSize: 14, fontWeight: '600' }}>
                  🔄 Refresh Prices
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* Instacart Order Button */}
          <View
            style={{
              backgroundColor: Colors.navyCard,
              borderRadius: BorderRadius.xl,
              padding: Spacing.md,
              marginBottom: Spacing.md,
              borderWidth: 1,
              borderColor: '#43B02A',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                marginBottom: Spacing.md,
              }}
            >
              <Text style={{ fontSize: 24 }}>🛒</Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: Colors.textPrimary,
                    fontSize: 15,
                    fontWeight: '700',
                  }}
                >
                  Order on Instacart
                </Text>
                <Text style={{ color: Colors.textTertiary, fontSize: 12, marginTop: 2 }}>
                  Delivery or pickup from local stores
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: '#43B02A',
                  borderRadius: BorderRadius.sm,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ color: Colors.textPrimary, fontSize: 10, fontWeight: '800' }}>
                  FAST
                </Text>
              </View>
            </View>

            <Pressable
              onPress={openInstacart}
              disabled={loading}
              style={{
                backgroundColor: '#43B02A',
                borderRadius: BorderRadius.lg,
                padding: Spacing.md,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {loading ? (
                <ActivityIndicator color={Colors.textPrimary} />
              ) : (
                <Text style={{ fontSize: 18 }}>🛒</Text>
              )}
              <Text
                style={{
                  color: Colors.textPrimary,
                  fontSize: 15,
                  fontWeight: '800',
                }}
              >
                {loading ? 'Opening Instacart...' : 'Order All Items on Instacart'}
              </Text>
            </Pressable>

            <Text
              style={{
                color: Colors.textTertiary,
                fontSize: 11,
                textAlign: 'center',
                marginTop: Spacing.sm,
              }}
            >
              Opens Instacart app with your full shopping list ready to order
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
