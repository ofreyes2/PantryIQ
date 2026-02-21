import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ShoppingCart, Calendar } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useShoppingStore, ShoppingTrip } from '@/lib/stores/shoppingStore';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';

function TripCard({ trip, onPress }: { trip: ShoppingTrip; onPress: () => void }) {
  const date = new Date(trip.date);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: Colors.navyCard,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: Colors.border,
      }}
      testID={`trip-card-${trip.id}`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: BorderRadius.md,
              backgroundColor: Colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShoppingCart size={18} color={Colors.green} />
          </View>
          <View>
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.textPrimary }}>
              {trip.store}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Calendar size={11} color={Colors.textTertiary} />
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textTertiary }}>
                {formattedDate}
              </Text>
            </View>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.green }}>
            ${trip.totalSpent.toFixed(2)}
          </Text>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textTertiary }}>
            {trip.items.length} item{trip.items.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Item list preview */}
      <View style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.borderLight }}>
        {trip.items.slice(0, 4).map((item, i) => (
          <View
            key={i}
            style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}
          >
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary }}>
              {item.name} × {item.quantity} {item.unit}
            </Text>
            {item.price > 0 ? (
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.textSecondary }}>
                ${item.price.toFixed(2)}
              </Text>
            ) : null}
          </View>
        ))}
        {trip.items.length > 4 ? (
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textTertiary, marginTop: 4 }}>
            +{trip.items.length - 4} more items
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function ShoppingHistoryScreen() {
  const router = useRouter();
  const trips = useShoppingStore((s) => s.trips);
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null);

  const totalSpent = trips.reduce((sum, t) => sum + t.totalSpent, 0);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.navy }} testID="shopping-history-screen">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: Spacing.md,
            paddingVertical: 14,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: BorderRadius.full,
              backgroundColor: Colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 14,
              borderWidth: 1,
              borderColor: Colors.border,
            }}
            testID="back-button"
          >
            <ArrowLeft size={20} color={Colors.textPrimary} />
          </Pressable>
          <Text style={{ fontFamily: 'PlayfairDisplay_700Bold', fontSize: 24, color: Colors.textPrimary }}>
            Shopping History
          </Text>
        </View>

        {trips.length > 0 ? (
          <>
            {/* Summary card */}
            <View
              style={{
                marginHorizontal: Spacing.md,
                backgroundColor: Colors.navyCard,
                borderRadius: BorderRadius.lg,
                padding: Spacing.md,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: Colors.border,
                flexDirection: 'row',
                justifyContent: 'space-around',
              }}
            >
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 22, color: Colors.green }}>
                  {trips.length}
                </Text>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary }}>
                  Total Trips
                </Text>
              </View>
              <View style={{ width: 1, backgroundColor: Colors.border }} />
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 22, color: Colors.green }}>
                  ${totalSpent.toFixed(2)}
                </Text>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary }}>
                  Total Spent
                </Text>
              </View>
              <View style={{ width: 1, backgroundColor: Colors.border }} />
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 22, color: Colors.green }}>
                  ${trips.length > 0 ? (totalSpent / trips.length).toFixed(2) : '0.00'}
                </Text>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary }}>
                  Avg Trip
                </Text>
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 40 }}
            >
              {trips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onPress={() => setExpandedTrip(expandedTrip === trip.id ? null : trip.id)}
                />
              ))}
            </ScrollView>
          </>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: BorderRadius.xl,
                backgroundColor: Colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <ShoppingCart size={32} color={Colors.textTertiary} />
            </View>
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.textPrimary, marginBottom: 8, textAlign: 'center' }}>
              No trips yet
            </Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
              Complete a shopping trip to see your history and spending patterns here.
            </Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
