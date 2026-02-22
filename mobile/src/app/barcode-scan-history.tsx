import { View, Text, ScrollView, TouchableOpacity, Image, FlatList, Animated as RNAnimated, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Zap, Search, Filter, Plus, Trash2 } from 'lucide-react-native';
import { useState, useRef } from 'react';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';

interface ScanHistoryItem {
  id: string;
  barcode: string;
  name: string;
  brand: string;
  image?: string;
  lastScanned: Date;
  scanCount: number;
  inPantry: boolean;
  isInstant: boolean;
}

// Mock data
const MOCK_HISTORY: ScanHistoryItem[] = [
  {
    id: '1',
    barcode: '012000014638',
    name: 'Grass-Fed Ground Beef',
    brand: 'Butcher Box',
    image: '🥩',
    lastScanned: new Date(Date.now() - 2 * 60 * 60 * 1000),
    scanCount: 12,
    inPantry: true,
    isInstant: true,
  },
  {
    id: '2',
    barcode: '025000120062',
    name: 'Organic Spinach',
    brand: 'Organic Valley',
    image: '🥬',
    lastScanned: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    scanCount: 8,
    inPantry: true,
    isInstant: true,
  },
  {
    id: '3',
    barcode: '041331111131',
    name: 'Cage-Free Eggs',
    brand: 'Vital Farms',
    image: '🥚',
    lastScanned: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    scanCount: 24,
    inPantry: false,
    isInstant: true,
  },
  {
    id: '4',
    barcode: '072847001231',
    name: 'Almond Flour',
    brand: 'Bob\'s Red Mill',
    image: '🌾',
    lastScanned: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    scanCount: 5,
    inPantry: true,
    isInstant: true,
  },
  {
    id: '5',
    barcode: '855877004567',
    name: 'Smoked Salmon',
    brand: 'Wild Planet',
    image: '🐟',
    lastScanned: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    scanCount: 3,
    inPantry: false,
    isInstant: true,
  },
];

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function HistoryItemCard({ item, index }: { item: ScanHistoryItem; index: number }) {
  const [showQuickAddOptions, setShowQuickAddOptions] = useState(false);

  return (
    <Animated.View
      entering={SlideInRight.delay(index * 50)}
      className="flex-row items-center px-6 py-4 border-b border-gray-800/50"
    >
      {/* Item Image */}
      <View className="w-14 h-14 rounded-xl bg-gray-800 justify-center items-center mr-4 overflow-hidden border border-gray-700">
        {item.image ? (
          <Text className="text-3xl">{item.image}</Text>
        ) : (
          <View className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800" />
        )}
      </View>

      {/* Item Info */}
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text className="text-white font-semibold text-base flex-1">
            {item.name}
          </Text>
          {item.isInstant ? (
            <View className="flex-row items-center bg-blue-500/20 rounded-full px-2 py-1 ml-2">
              <Zap size={10} color="#60a5fa" />
              <Text className="text-blue-400 text-xs font-semibold ml-1">
                Instant
              </Text>
            </View>
          ) : null}
        </View>
        <Text className="text-gray-400 text-xs mt-1">{item.brand}</Text>
        <View className="flex-row items-center mt-2 gap-3">
          <Text className="text-gray-500 text-xs">
            {formatTimeAgo(item.lastScanned)}
          </Text>
          <Text className="text-gray-500 text-xs">•</Text>
          <Text className="text-gray-500 text-xs">
            Scanned {item.scanCount}x
          </Text>
        </View>
      </View>

      {/* Action Button */}
      <TouchableOpacity
        className="ml-4 p-2 rounded-lg bg-gray-800 active:bg-gray-700"
        onPress={() => setShowQuickAddOptions(!showQuickAddOptions)}
      >
        <Plus size={18} color="#60a5fa" />
      </TouchableOpacity>

      {/* Quick Add Menu */}
      {showQuickAddOptions ? (
        <BlurView intensity={90} className="absolute right-2 top-16 rounded-lg overflow-hidden">
          <View className="bg-gray-900/95 border border-gray-700 rounded-lg py-2 w-36">
            <TouchableOpacity className="px-4 py-3 flex-row items-center border-b border-gray-800">
              <Text className="text-white text-sm flex-1">Add to Pantry</Text>
            </TouchableOpacity>
            <TouchableOpacity className="px-4 py-3">
              <Text className="text-gray-400 text-sm">View Details</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      ) : null}
    </Animated.View>
  );
}

export default function BarcodeScanHistory() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'in-pantry' | 'not-in-pantry'>('all');
  const scrollOffset = useRef(new RNAnimated.Value(0)).current;

  const filteredItems = MOCK_HISTORY.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterMode === 'all' ||
      (filterMode === 'in-pantry' && item.inPantry) ||
      (filterMode === 'not-in-pantry' && !item.inPantry);

    return matchesSearch && matchesFilter;
  });

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-4 pb-4 border-b border-gray-800">
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-white flex-1 text-center">
          Scan History
        </Text>
        <View className="w-6" />
      </View>

      {/* Search & Filter */}
      <View className="px-6 py-4 border-b border-gray-800">
        <View className="flex-row items-center bg-gray-800 rounded-lg px-4 py-3 mb-3">
          <Search size={18} color="#9ca3af" />
          <TextInput
            placeholder="Search items..."
            placeholderTextColor="#6b7280"
            className="flex-1 ml-3 text-white text-base"
            onChangeText={setSearchQuery}
            value={searchQuery}
          />
        </View>

        {/* Filter Tabs */}
        <View className="flex-row gap-2">
          {(['all', 'in-pantry', 'not-in-pantry'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              className={`px-4 py-2 rounded-lg ${
                filterMode === mode
                  ? 'bg-blue-500'
                  : 'bg-gray-800 border border-gray-700'
              }`}
              onPress={() => setFilterMode(mode)}
            >
              <Text
                className={`text-xs font-semibold ${
                  filterMode === mode ? 'text-white' : 'text-gray-400'
                }`}
              >
                {mode === 'all' ? 'All' : mode === 'in-pantry' ? 'In Pantry' : 'Not In Pantry'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Items List */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <HistoryItemCard item={item} index={index} />
        )}
        scrollEnabled={true}
        contentContainerStyle={{ paddingTop: 0 }}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-12">
            <Text className="text-gray-500 text-base">No items found</Text>
          </View>
        }
      />

      {/* Stats Footer */}
      <View className="px-6 py-4 border-t border-gray-800 bg-gray-900/50">
        <Text className="text-gray-400 text-xs">
          {filteredItems.length} items • {MOCK_HISTORY.reduce((sum, item) => sum + item.scanCount, 0)} total scans
        </Text>
      </View>
    </SafeAreaView>
  );
}
