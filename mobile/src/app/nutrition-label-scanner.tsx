import { View, Text, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Camera, Lightbulb } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');
const OVERLAY_WIDTH = width * 0.85;
const OVERLAY_HEIGHT = OVERLAY_WIDTH * 1.4;

interface CameraGuideStep {
  title: string;
  tip: string;
  icon?: string;
}

const GUIDE_STEPS: CameraGuideStep[] = [
  {
    title: 'Distance',
    tip: 'Hold phone 6-8 inches from label',
  },
  {
    title: 'Focus',
    tip: 'Make sure all text is in focus and well lit',
  },
  {
    title: 'Positioning',
    tip: 'Capture the entire Nutrition Facts box including title',
  },
  {
    title: 'Serving Size',
    tip: 'Include the serving size section at the top',
  },
];

export default function NutritionLabelScanner() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [showGuide, setShowGuide] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [autoCapture, setAutoCapture] = useState(false);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  if (!permission?.granted) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-xl font-bold text-white mb-4 text-center">
            Camera permission required
          </Text>
          <Text className="text-gray-400 text-center mb-6">
            We need access to your camera to scan nutrition labels
          </Text>
          <TouchableOpacity
            className="bg-blue-500 rounded-lg px-6 py-3"
            onPress={requestPermission}
          >
            <Text className="text-white font-semibold">Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (showGuide) {
    return (
      <SafeAreaView className="flex-1 bg-gray-950">
        <View className="flex-1">
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 pt-4 pb-6 border-b border-gray-800">
            <TouchableOpacity onPress={() => router.back()}>
              <ChevronLeft size={24} color="#fff" />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-white flex-1 text-center">
              Scan Label
            </Text>
            <View className="w-6" />
          </View>

          <ScrollView className="flex-1 px-6 py-8">
            {/* Title */}
            <Text className="text-3xl font-bold text-white mb-2">
              Capture Nutrition Label
            </Text>
            <Text className="text-gray-400 text-base mb-8">
              Help us read the label accurately
            </Text>

            {/* Example Image Placeholder */}
            <View className="bg-gray-800 rounded-2xl overflow-hidden mb-8 aspect-video justify-center items-center border border-gray-700">
              <View className="items-center">
                <View className="w-16 h-20 bg-gray-700 rounded-lg mb-3 flex-row items-center justify-center border-2 border-dashed border-gray-600">
                  <Text className="text-gray-500 text-xs text-center px-2">
                    Example
                  </Text>
                </View>
                <Text className="text-gray-500 text-sm">
                  Ideal label capture
                </Text>
              </View>
            </View>

            {/* Guide Steps */}
            <View className="mb-8">
              <Text className="text-sm font-semibold text-gray-400 uppercase mb-4 tracking-wider">
                Steps for Best Results
              </Text>
              {GUIDE_STEPS.map((step, idx) => (
                <View key={idx} className="flex-row mb-4">
                  <View className="w-8 h-8 rounded-full bg-blue-500/20 justify-center items-center mr-4 flex-shrink-0">
                    <Text className="text-blue-400 text-sm font-bold">
                      {idx + 1}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-semibold mb-1">
                      {step.title}
                    </Text>
                    <Text className="text-gray-400 text-sm leading-5">
                      {step.tip}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Pro Tips */}
            <View className="bg-gradient-to-br from-amber-500/10 to-transparent rounded-xl p-4 mb-8 border border-amber-500/20 flex-row">
              <Lightbulb size={20} color="#fbbf24" className="mr-3 flex-shrink-0 mt-0.5" />
              <View className="flex-1">
                <Text className="text-amber-300 font-semibold text-sm mb-1">
                  Pro Tip
                </Text>
                <Text className="text-amber-200/80 text-xs leading-4">
                  Good lighting makes a huge difference. Try near a window or use your phone's flashlight.
                </Text>
              </View>
            </View>

            {/* Spacing */}
            <View className="h-4" />
          </ScrollView>

          {/* Action Button */}
          <View className="px-6 pb-6 pt-4 border-t border-gray-800">
            <TouchableOpacity
              className="bg-blue-500 rounded-xl py-4 active:opacity-80"
              onPress={() => setShowGuide(false)}
            >
              <Text className="text-white text-center font-semibold text-base">
                Got It, Open Camera
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Camera Feed with Overlay */}
      <View className="flex-1 relative">
        <CameraView
          facing="back"
          enableTorch={flashEnabled}
          onCameraReady={() => setCameraReady(true)}
          className="flex-1"
        />

        {/* Translucent Overlay */}
        <BlurView intensity={70} className="absolute inset-0">
          <View className="flex-1 bg-black/40 justify-center items-center">
            {/* Scanner Frame */}
            <Animated.View entering={FadeIn} className="relative">
              {/* Frame Corners */}
              <View
                style={{
                  width: OVERLAY_WIDTH,
                  height: OVERLAY_HEIGHT,
                  borderRadius: 16,
                }}
              >
                {/* Top-Left Corner */}
                <View className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blue-400 rounded-tl-xl" />

                {/* Top-Right Corner */}
                <View className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-blue-400 rounded-tr-xl" />

                {/* Bottom-Left Corner */}
                <View className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-blue-400 rounded-bl-xl" />

                {/* Bottom-Right Corner */}
                <View className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-blue-400 rounded-br-xl" />

                {/* Center Guide Text */}
                <View className="flex-1 justify-center items-center">
                  <Text className="text-blue-300 text-sm font-semibold text-center px-4">
                    Place Nutrition Facts
                  </Text>
                  <Text className="text-blue-300/60 text-xs mt-1">
                    label here
                  </Text>
                </View>
              </View>
            </Animated.View>
          </View>
        </BlurView>

        {/* Header Controls */}
        <View className="absolute top-0 left-0 right-0 flex-row justify-between items-center px-6 pt-2">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <ChevronLeft size={28} color="#fff" />
          </TouchableOpacity>
          <Text className="text-white font-semibold">Nutrition Label</Text>
          <TouchableOpacity
            className="p-2"
            onPress={() => setShowGuide(true)}
          >
            <Text className="text-gray-400 text-xs">Guide</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Controls */}
        <Animated.View entering={SlideInDown.delay(200)} className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent px-6 pb-8 pt-12">
          <View className="flex-row items-center justify-center gap-4 mb-6">
            {/* Flash Toggle */}
            <TouchableOpacity
              className={`p-3 rounded-full ${
                flashEnabled ? 'bg-yellow-500/20 border border-yellow-400' : 'bg-gray-800 border border-gray-700'
              }`}
              onPress={() => setFlashEnabled(!flashEnabled)}
            >
              <Text className={flashEnabled ? 'text-yellow-400' : 'text-gray-400'}>
                💡
              </Text>
            </TouchableOpacity>

            {/* Auto Capture Toggle */}
            <TouchableOpacity
              className={`px-4 py-2 rounded-full text-xs font-semibold ${
                autoCapture ? 'bg-blue-500/20 border border-blue-400' : 'bg-gray-800 border border-gray-700'
              }`}
              onPress={() => setAutoCapture(!autoCapture)}
            >
              <Text className={autoCapture ? 'text-blue-400' : 'text-gray-400'}>
                {autoCapture ? 'Auto' : 'Manual'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Capture Button */}
          <TouchableOpacity className="bg-blue-500 rounded-full h-16 flex-row items-center justify-center active:opacity-80 shadow-lg">
            <Camera size={24} color="#fff" />
            <Text className="text-white font-semibold text-base ml-3">
              Capture
            </Text>
          </TouchableOpacity>

          {/* Instruction Text */}
          <Text className="text-gray-400 text-xs text-center mt-4">
            Position label inside the frame
          </Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
