import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Dimensions,
  RefreshControl,
  StyleSheet,
  FlatList,
  Image,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Circle,
  Line,
  Text as SvgText,
  G,
} from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import {
  Camera,
  Share2,
  Scale,
  ChevronRight,
  Flame,
  TrendingDown,
  Target,
  Plus,
  Trash2,
  X,
  Activity,
  BarChart2,
} from 'lucide-react-native';
import { useHealthStore, WeightEntry, MeasurementEntry } from '@/lib/stores/healthStore';
import { useAppStore } from '@/lib/stores/appStore';
import { useMealsStore } from '@/lib/stores/mealsStore';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { Toast, useToast } from '@/components/Toast';
import { ConfettiCelebration } from '@/components/ConfettiCelebration';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_HEIGHT = 180;
const CHART_PADDING_LEFT = 40;
const CHART_PADDING_RIGHT = 16;
const CHART_PADDING_TOP = 16;
const CHART_PADDING_BOTTOM = 30;

// ─── Utils ────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
}

function getBMICategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: 'Underweight', color: Colors.amber };
  if (bmi < 25) return { label: 'Normal Weight', color: Colors.green };
  if (bmi < 30) return { label: 'Overweight', color: Colors.amber };
  return { label: 'Obese', color: Colors.error };
}

function getBodyFatCategory(bf: number, gender: string): { label: string; color: string } {
  if (gender === 'female') {
    if (bf < 14) return { label: 'Essential Fat', color: Colors.amber };
    if (bf < 21) return { label: 'Athletic', color: Colors.green };
    if (bf < 25) return { label: 'Fitness', color: Colors.green };
    if (bf < 32) return { label: 'Acceptable', color: Colors.amber };
    return { label: 'Obese', color: Colors.error };
  }
  if (bf < 6) return { label: 'Essential Fat', color: Colors.amber };
  if (bf < 14) return { label: 'Athletic', color: Colors.green };
  if (bf < 18) return { label: 'Fitness', color: Colors.green };
  if (bf < 25) return { label: 'Acceptable', color: Colors.amber };
  return { label: 'Obese', color: Colors.error };
}

// ─── Weight Area Chart ────────────────────────────────────────────────────────

function WeightAreaChart({
  entries,
  goalWeight,
}: {
  entries: WeightEntry[];
  goalWeight?: number;
}) {
  const chartW = SCREEN_WIDTH - 32 - CHART_PADDING_LEFT - CHART_PADDING_RIGHT;
  const chartH = CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;

  if (entries.length < 2) {
    return (
      <View style={{ height: CHART_HEIGHT, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary }}>
          Log at least 2 entries to see a chart
        </Text>
      </View>
    );
  }

  const weights = entries.map((e) => e.weight);
  const minW = Math.min(...weights) - 2;
  const maxW = Math.max(...weights) + 2;

  const toX = (i: number) => (i / (entries.length - 1)) * chartW;
  const toY = (w: number) => chartH - ((w - minW) / (maxW - minW)) * chartH;

  const points = entries.map((e, i) => ({ x: toX(i), y: toY(e.weight) }));

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const last = points[points.length - 1];
  const first = points[0];
  const areaPath = `${linePath} L ${last?.x.toFixed(1) ?? 0} ${chartH} L ${first?.x.toFixed(1) ?? 0} ${chartH} Z`;

  // Label every ~4th entry
  const labelStep = Math.max(1, Math.floor(entries.length / 4));

  // Goal line Y position
  const goalY = goalWeight !== undefined ? toY(goalWeight) : null;

  return (
    <Svg
      width={SCREEN_WIDTH - 32}
      height={CHART_HEIGHT}
      style={{ marginLeft: 0 }}
    >
      <Defs>
        <SvgLinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={Colors.green} stopOpacity={0.35} />
          <Stop offset="100%" stopColor={Colors.green} stopOpacity={0.0} />
        </SvgLinearGradient>
      </Defs>

      <G transform={`translate(${CHART_PADDING_LEFT}, ${CHART_PADDING_TOP})`}>
        {/* Area fill */}
        <Path d={areaPath} fill="url(#areaGrad)" />

        {/* Goal dashed line */}
        {goalY !== null && goalY >= 0 && goalY <= chartH ? (
          <Line
            x1={0}
            y1={goalY}
            x2={chartW}
            y2={goalY}
            stroke={Colors.amber}
            strokeWidth={1.5}
            strokeDasharray="6,4"
          />
        ) : null}
        {goalY !== null && goalY >= 0 && goalY <= chartH ? (
          <SvgText
            x={chartW + 2}
            y={goalY + 4}
            fill={Colors.amber}
            fontSize="9"
            fontFamily="DMSans_500Medium"
          >
            Goal
          </SvgText>
        ) : null}

        {/* Line */}
        <Path
          d={linePath}
          stroke={Colors.green}
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots */}
        {points.map((p, i) => (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 ? 5 : 3}
            fill={i === points.length - 1 ? Colors.green : '#0F2040'}
            stroke={Colors.green}
            strokeWidth={1.5}
          />
        ))}

        {/* X labels */}
        {entries.map((e, i) =>
          i % labelStep === 0 || i === entries.length - 1 ? (
            <SvgText
              key={i}
              x={toX(i)}
              y={chartH + 18}
              fill={Colors.textTertiary}
              fontSize="9"
              textAnchor="middle"
              fontFamily="DMSans_400Regular"
            >
              {formatDateShort(e.date)}
            </SvgText>
          ) : null
        )}

        {/* Y labels */}
        {[minW + 1, (minW + maxW) / 2, maxW - 1].map((w, i) => (
          <SvgText
            key={i}
            x={-4}
            y={toY(w) + 4}
            fill={Colors.textTertiary}
            fontSize="9"
            textAnchor="end"
            fontFamily="DMSans_400Regular"
          >
            {Math.round(w)}
          </SvgText>
        ))}
      </G>
    </Svg>
  );
}

// ─── Body Fat Gauge ───────────────────────────────────────────────────────────

function BodyFatGauge({
  bodyFat,
  gender,
}: {
  bodyFat: number | null;
  gender: string;
}) {
  const gaugeSz = 200;
  const cx = gaugeSz / 2;
  const cy = gaugeSz / 2 + 10;
  const r = 80;

  if (bodyFat === null) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 20 }}>
        <Activity size={40} color={Colors.textTertiary} />
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary, marginTop: 8, textAlign: 'center' }}>
          Log measurements to calculate body fat
        </Text>
      </View>
    );
  }

  // Segments: essential(6%), athletic(14%), fitness(18%), acceptable(25%), obese
  const segColors = [Colors.amber, Colors.green, Colors.green, Colors.amber, Colors.error];
  const segRanges = [0, 6, 14, 18, 25, 40]; // male ranges

  function polarToXY(angleDeg: number, radius: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  }

  function arcPath(startDeg: number, endDeg: number, radius: number): string {
    const start = polarToXY(startDeg, radius);
    const end = polarToXY(endDeg, radius);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  }

  // Map bodyFat 0-40 to angle 180-360 (semicircle)
  const maxBF = 40;
  const needleAngle = 180 + (Math.min(bodyFat, maxBF) / maxBF) * 180;
  const needleTip = polarToXY(needleAngle, r - 10);
  const needleBase1 = polarToXY(needleAngle + 90, 6);
  const needleBase2 = polarToXY(needleAngle - 90, 6);

  const cat = getBodyFatCategory(bodyFat, gender);

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={gaugeSz} height={gaugeSz / 2 + 30}>
        {/* Segments */}
        {segRanges.slice(0, -1).map((_, i) => {
          const startPct = (segRanges[i] ?? 0) / maxBF;
          const endPct = (segRanges[i + 1] ?? 0) / maxBF;
          const startAngle = 180 + startPct * 180;
          const endAngle = 180 + endPct * 180;
          return (
            <Path
              key={i}
              d={arcPath(startAngle, endAngle, r)}
              stroke={segColors[i] ?? Colors.green}
              strokeWidth={18}
              fill="none"
              strokeLinecap="butt"
            />
          );
        })}

        {/* Needle */}
        <Path
          d={`M ${needleBase1.x.toFixed(2)} ${needleBase1.y.toFixed(2)} L ${needleTip.x.toFixed(2)} ${needleTip.y.toFixed(2)} L ${needleBase2.x.toFixed(2)} ${needleBase2.y.toFixed(2)} Z`}
          fill={Colors.textPrimary}
        />
        <Circle cx={cx} cy={cy} r={8} fill={Colors.textPrimary} />
        <Circle cx={cx} cy={cy} r={4} fill={Colors.navyCard} />
      </Svg>

      <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 28, color: cat.color, marginTop: -8 }}>
        {bodyFat.toFixed(1)}%
      </Text>
      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: cat.color }}>
        {cat.label}
      </Text>
      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.textTertiary, marginTop: 2 }}>
        {gender === 'female' ? 'Healthy Range: 21-24%' : 'Healthy Range: 14-17%'}
      </Text>
    </View>
  );
}

// ─── Streak Heatmap ───────────────────────────────────────────────────────────

function StreakHeatmap() {
  const entries = useMealsStore((s) => s.entries);
  const carbGoal = useAppStore((s) => s.userProfile.dailyCarbGoal);

  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 29 + i);
    return d.toISOString().split('T')[0];
  });

  const getDayColor = (date: string) => {
    const dayEntries = entries.filter((e) => e.date === date);
    if (dayEntries.length === 0) return Colors.surface;
    const netCarbs = dayEntries.reduce((sum, e) => sum + e.netCarbs * e.servings, 0);
    return netCarbs <= (carbGoal || 50) ? Colors.green : Colors.error;
  };

  // 5 rows x 6 cols = 30 dots
  const rows = Array.from({ length: 5 }, (_, row) =>
    last30.slice(row * 6, row * 6 + 6)
  );

  return (
    <View style={{ gap: 4 }}>
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row', gap: 4 }}>
          {row.map((date, ci) => (
            <View
              key={ci}
              style={{
                width: (SCREEN_WIDTH - 32 - 32 - 20) / 6,
                height: 14,
                borderRadius: 3,
                backgroundColor: getDayColor(date),
              }}
            />
          ))}
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: Colors.green }} />
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: Colors.textTertiary }}>Within goal</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: Colors.error }} />
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: Colors.textTertiary }}>Over goal</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: Colors.surface }} />
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: Colors.textTertiary }}>No data</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Log Weight Modal ─────────────────────────────────────────────────────────

function LogWeightModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (weight: number, unit: 'lbs' | 'kg', note: string) => void;
}) {
  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState<'lbs' | 'kg'>('lbs');
  const [note, setNote] = useState('');
  const today = new Date().toISOString().split('T')[0];

  const handleSave = () => {
    const w = parseFloat(weight);
    if (isNaN(w) || w <= 0) return;
    onSave(w, unit, note);
    setWeight('');
    setNote('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Log Weight</Text>

            {/* Unit toggle */}
            <View style={styles.unitToggle}>
              {(['lbs', 'kg'] as const).map((u) => (
                <Pressable
                  key={u}
                  style={[styles.unitButton, unit === u && styles.unitButtonActive]}
                  onPress={() => setUnit(u)}
                >
                  <Text style={[styles.unitButtonText, unit === u && styles.unitButtonTextActive]}>
                    {u}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Weight input */}
            <TextInput
              style={styles.bigInput}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholder="0.0"
              placeholderTextColor={Colors.textTertiary}
            />

            <Text style={styles.inputLabel}>Today — {formatDate(today)}</Text>

            {/* Note */}
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Optional note..."
              placeholderTextColor={Colors.textTertiary}
              multiline
            />

            <View style={styles.modalButtons}>
              <Pressable style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveText}>Save Weight</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Log Measurements Modal ────────────────────────────────────────────────────

function LogMeasurementsModal({
  visible,
  onClose,
  onSave,
  gender,
  bodyFatPreview,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (m: Omit<MeasurementEntry, 'id'>) => void;
  gender: string;
  bodyFatPreview: number | null;
}) {
  const [neck, setNeck] = useState('');
  const [waist, setWaist] = useState('');
  const [hips, setHips] = useState('');
  const [chest, setChest] = useState('');
  const [unit, setUnit] = useState<'in' | 'cm'>('in');
  const calculateBodyFat = useHealthStore((s) => s.calculateBodyFat);
  const userHeight = useAppStore((s) => s.userProfile.height);
  const heightInches = userHeight ? userHeight.feet * 12 + userHeight.inches : 68;

  const preview = (() => {
    const n = parseFloat(neck);
    const w = parseFloat(waist);
    const h = parseFloat(hips);
    if (isNaN(n) || isNaN(w)) return null;
    return calculateBodyFat(
      gender === 'female' ? 'female' : 'male',
      w, n, isNaN(h) ? undefined : h, heightInches
    );
  })();

  const handleSave = () => {
    const today = new Date().toISOString().split('T')[0];
    onSave({
      date: today,
      neck: parseFloat(neck) || undefined,
      waist: parseFloat(waist) || undefined,
      hips: parseFloat(hips) || undefined,
      chest: parseFloat(chest) || undefined,
      unit,
    });
    setNeck(''); setWaist(''); setHips(''); setChest('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Log Measurements</Text>

            {/* Unit toggle */}
            <View style={styles.unitToggle}>
              {(['in', 'cm'] as const).map((u) => (
                <Pressable
                  key={u}
                  style={[styles.unitButton, unit === u && styles.unitButtonActive]}
                  onPress={() => setUnit(u)}
                >
                  <Text style={[styles.unitButtonText, unit === u && styles.unitButtonTextActive]}>
                    {u}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.measureRow}>
              <View style={styles.measureField}>
                <Text style={styles.measureLabel}>Neck ({unit})</Text>
                <TextInput style={styles.measureInput} value={neck} onChangeText={setNeck} keyboardType="decimal-pad" placeholder="0.0" placeholderTextColor={Colors.textTertiary} />
              </View>
              <View style={styles.measureField}>
                <Text style={styles.measureLabel}>Waist ({unit})</Text>
                <TextInput style={styles.measureInput} value={waist} onChangeText={setWaist} keyboardType="decimal-pad" placeholder="0.0" placeholderTextColor={Colors.textTertiary} />
              </View>
            </View>

            <View style={styles.measureRow}>
              <View style={styles.measureField}>
                <Text style={styles.measureLabel}>Hips ({unit})</Text>
                <TextInput style={styles.measureInput} value={hips} onChangeText={setHips} keyboardType="decimal-pad" placeholder="0.0" placeholderTextColor={Colors.textTertiary} />
              </View>
              <View style={styles.measureField}>
                <Text style={styles.measureLabel}>Chest ({unit})</Text>
                <TextInput style={styles.measureInput} value={chest} onChangeText={setChest} keyboardType="decimal-pad" placeholder="0.0" placeholderTextColor={Colors.textTertiary} />
              </View>
            </View>

            {preview !== null ? (
              <View style={styles.previewBadge}>
                <Text style={styles.previewText}>Estimated Body Fat: {preview.toFixed(1)}%</Text>
              </View>
            ) : null}

            <View style={styles.modalButtons}>
              <Pressable style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Set Goal Modal ───────────────────────────────────────────────────────────

function SetGoalModal({
  visible,
  onClose,
  onSave,
  currentWeight,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (targetWeight: number, targetBodyFat?: number) => void;
  currentWeight: number;
}) {
  const [targetWeight, setTargetWeight] = useState('');
  const [targetBF, setTargetBF] = useState('');

  const handleSave = () => {
    const tw = parseFloat(targetWeight);
    if (isNaN(tw) || tw <= 0) return;
    const tbf = parseFloat(targetBF);
    onSave(tw, isNaN(tbf) ? undefined : tbf);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Set Your Goal</Text>

            <Text style={styles.inputLabel}>Target Weight (lbs)</Text>
            <TextInput
              style={styles.fieldInput}
              value={targetWeight}
              onChangeText={setTargetWeight}
              keyboardType="decimal-pad"
              placeholder="e.g. 175"
              placeholderTextColor={Colors.textTertiary}
            />

            <Text style={styles.inputLabel}>Target Body Fat % (optional)</Text>
            <TextInput
              style={styles.fieldInput}
              value={targetBF}
              onChangeText={setTargetBF}
              keyboardType="decimal-pad"
              placeholder="e.g. 18"
              placeholderTextColor={Colors.textTertiary}
            />

            <View style={styles.modalButtons}>
              <Pressable style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveText}>Save Goal</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Period Selector ──────────────────────────────────────────────────────────

const PERIODS = ['7D', '30D', '90D', '1Y'] as const;
type Period = typeof PERIODS[number];

function PeriodSelector({
  selected,
  onSelect,
}: {
  selected: Period;
  onSelect: (p: Period) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {PERIODS.map((p) => (
        <Pressable
          key={p}
          style={[
            styles.periodBtn,
            selected === p && styles.periodBtnActive,
          ]}
          onPress={() => onSelect(p)}
        >
          <Text
            style={[
              styles.periodText,
              selected === p && styles.periodTextActive,
            ]}
          >
            {p}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <View style={[styles.card, style]}>{children}</View>
  );
}

// ─── Main Health Screen ────────────────────────────────────────────────────────

export default function HealthScreen() {
  const [period, setPeriod] = useState<Period>('30D');
  const [showLogWeight, setShowLogWeight] = useState(false);
  const [showLogMeasure, setShowLogMeasure] = useState(false);
  const [showSetGoal, setShowSetGoal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [celebration, setCelebration] = useState<{
    visible: boolean;
    message: string;
    subMessage?: string;
  }>({ visible: false, message: '' });
  const { toast, showToast, hideToast } = useToast();

  const {
    weightEntries,
    measurementEntries,
    progressPhotos,
    goal,
    addWeightEntry,
    deleteWeightEntry,
    addMeasurementEntry,
    addProgressPhoto,
    deleteProgressPhoto,
    setGoal,
    getLatestWeight,
    getLatestMeasurements,
    getWeightTrend,
    calculateBMI,
    calculateBodyFat,
  } = useHealthStore();

  const userProfile = useAppStore((s) => s.userProfile);
  const streak = useAppStore((s) => s.streak);

  const heightInches = userProfile.height
    ? userProfile.height.feet * 12 + userProfile.height.inches
    : 68;
  const gender = 'male'; // default — Settings will update this

  const latestWeight = getLatestWeight();
  const latestMeasure = getLatestMeasurements();
  const bmi = calculateBMI(heightInches);
  const bodyFat = latestMeasure
    ? calculateBodyFat(
        gender,
        latestMeasure.waist ?? 34,
        latestMeasure.neck ?? 15,
        latestMeasure.hips,
        heightInches
      )
    : null;

  const periodDays: Record<Period, number> = {
    '7D': 7,
    '30D': 30,
    '90D': 90,
    '1Y': 365,
  };
  const filteredEntries = getWeightTrend(periodDays[period]);

  // Milestone detection
  useEffect(() => {
    if (!latestWeight || !goal || weightEntries.length < 2) return;
    const lostFromStart = goal.startWeight - latestWeight.weight;
    const prevEntry = weightEntries[weightEntries.length - 2];
    const prevLost = prevEntry ? goal.startWeight - prevEntry.weight : 0;
    const milestones = [5, 10, 15, 20, 25, 30];
    const hit = milestones.find((m) => lostFromStart >= m && prevLost < m);
    if (hit) {
      setCelebration({
        visible: true,
        message: `${hit} lbs lost!`,
        subMessage: "You're absolutely crushing it!",
      });
    }
    // Streak milestones
    if (streak.current === 7) {
      setCelebration({ visible: true, message: '7-Day Streak!', subMessage: 'One week strong!' });
    } else if (streak.current === 30) {
      setCelebration({ visible: true, message: '30-Day Streak!', subMessage: 'A whole month — legendary!' });
    }
  }, [weightEntries]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const handleAddPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showToast('Camera permission required', 'error');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const today = new Date().toISOString().split('T')[0];
      addProgressPhoto({ date: today, uri: result.assets[0].uri });
      showToast('Progress photo added!', 'success');
    }
  };

  const handleExport = () => {
    const data = JSON.stringify({ weightEntries, measurementEntries, progressPhotos, goal }, null, 2);
    Share.share({ message: data, title: 'PantryIQ Health Export' });
  };

  const weightChange = (() => {
    if (weightEntries.length < 2) return null;
    const last = weightEntries[weightEntries.length - 1];
    const first = weightEntries[weightEntries.length - 8] ?? weightEntries[0];
    if (!last || !first) return null;
    return Math.round((last.weight - first.weight) * 10) / 10;
  })();

  const goalProgress = (() => {
    if (!goal || !latestWeight) return null;
    const total = Math.abs(goal.startWeight - goal.targetWeight);
    const done = Math.abs(goal.startWeight - latestWeight.weight);
    return Math.min(100, Math.round((done / total) * 100));
  })();

  return (
    <LinearGradient colors={['#0A1628', '#0B1C35', '#0A1628']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']} testID="health-screen">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Health</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable onPress={handleAddPhoto} style={styles.headerBtn} testID="progress-photos-btn">
                <Camera size={20} color={Colors.textSecondary} />
              </Pressable>
              <Pressable onPress={handleExport} style={styles.headerBtn} testID="export-health-btn">
                <Share2 size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {/* Summary Card */}
          <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
            <Card>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{latestWeight?.weight.toFixed(1) ?? '--'}</Text>
                  <Text style={styles.summaryLabel}>Current Weight</Text>
                  <Text style={styles.summaryUnit}>{latestWeight?.unit ?? 'lbs'}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, bmi ? { color: getBMICategory(bmi).color } : {}]}>
                    {bmi?.toFixed(1) ?? '--'}
                  </Text>
                  <Text style={styles.summaryLabel}>BMI</Text>
                  {bmi ? <Text style={[styles.summaryUnit, { color: getBMICategory(bmi).color }]}>{getBMICategory(bmi).label}</Text> : null}
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, bodyFat ? { color: getBodyFatCategory(bodyFat, gender).color } : {}]}>
                    {bodyFat?.toFixed(1) ?? '--'}
                  </Text>
                  <Text style={styles.summaryLabel}>Body Fat</Text>
                  <Text style={styles.summaryUnit}>%</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: Colors.amber }]}>
                    {streak.current}
                  </Text>
                  <Text style={styles.summaryLabel}>Streak</Text>
                  <Text style={styles.summaryUnit}>days</Text>
                </View>
              </View>

              {weightChange !== null ? (
                <View style={styles.trendRow}>
                  {weightChange <= 0 ? (
                    <TrendingDown size={14} color={Colors.green} />
                  ) : null}
                  <Text style={[styles.trendText, { color: weightChange <= 0 ? Colors.green : Colors.error }]}>
                    {weightChange > 0 ? '+' : ''}{weightChange} lbs this week
                    {goal && latestWeight ? ` · ${Math.abs(goal.targetWeight - latestWeight.weight).toFixed(1)} lbs to goal` : ''}
                  </Text>
                </View>
              ) : null}
            </Card>
          </View>

          {/* Weight Section */}
          <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Weight</Text>
              <PeriodSelector selected={period} onSelect={setPeriod} />
            </View>
            <Card style={{ paddingHorizontal: 0, overflow: 'hidden' }}>
              <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
                <WeightAreaChart entries={filteredEntries} goalWeight={goal?.targetWeight} />
              </View>
              <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                <Pressable
                  style={styles.outlineButton}
                  onPress={() => setShowLogWeight(true)}
                  testID="log-weight-btn"
                >
                  <Scale size={16} color={Colors.green} />
                  <Text style={styles.outlineButtonText}>Log Weight</Text>
                </Pressable>
              </View>
            </Card>
          </View>

          {/* Body Fat Section */}
          <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
            <Text style={styles.sectionTitle}>Body Composition</Text>
            <Card style={{ alignItems: 'center' }}>
              <BodyFatGauge bodyFat={bodyFat} gender={gender} />
              <Pressable
                style={[styles.outlineButton, { marginTop: 16, alignSelf: 'stretch' }]}
                onPress={() => setShowLogMeasure(true)}
                testID="log-measurements-btn"
              >
                <BarChart2 size={16} color={Colors.green} />
                <Text style={styles.outlineButtonText}>Log Measurements</Text>
              </Pressable>
            </Card>
          </View>

          {/* Latest Measurements */}
          {latestMeasure ? (
            <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
              <Text style={styles.sectionTitle}>Latest Measurements</Text>
              <Card>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  {[
                    { label: 'Neck', value: latestMeasure.neck },
                    { label: 'Waist', value: latestMeasure.waist },
                    { label: 'Hips', value: latestMeasure.hips },
                    { label: 'Chest', value: latestMeasure.chest },
                  ].map((m) => (
                    m.value !== undefined ? (
                      <View key={m.label} style={styles.measureCard}>
                        <Text style={styles.measureCardValue}>{m.value}"</Text>
                        <Text style={styles.measureCardLabel}>{m.label}</Text>
                      </View>
                    ) : null
                  ))}
                </View>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.textTertiary, marginTop: 8 }}>
                  Logged {formatDate(latestMeasure.date)}
                </Text>
              </Card>
            </View>
          ) : null}

          {/* BMI Card */}
          {bmi ? (
            <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
              <Text style={styles.sectionTitle}>BMI</Text>
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={[styles.bigNumber, { color: getBMICategory(bmi).color }]}>
                      {bmi.toFixed(1)}
                    </Text>
                    <Text style={[styles.categoryLabel, { color: getBMICategory(bmi).color }]}>
                      {getBMICategory(bmi).label}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 20 }}>
                    {/* BMI scale bar */}
                    <View style={styles.bmiBarContainer}>
                      {[
                        { label: 'Under', end: 18.5, color: Colors.amber },
                        { label: 'Normal', end: 25, color: Colors.green },
                        { label: 'Over', end: 30, color: Colors.amber },
                        { label: 'Obese', end: 40, color: Colors.error },
                      ].map((seg, i, arr) => {
                        const start = i === 0 ? 10 : (arr[i - 1]?.end ?? 10);
                        const width = ((seg.end - start) / 30) * 100;
                        return (
                          <View key={seg.label} style={[styles.bmiSegment, { width: `${width}%`, backgroundColor: seg.color }]} />
                        );
                      })}
                    </View>
                    {/* Marker */}
                    <View style={[styles.bmiMarker, { left: `${Math.min(100, Math.max(0, ((bmi - 10) / 30) * 100))}%` as any }]} />
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: Colors.textTertiary, marginTop: 6 }}>
                      10 — Underweight — 18.5 — Normal — 25 — Overweight — 30 — Obese — 40+
                    </Text>
                  </View>
                </View>
              </Card>
            </View>
          ) : null}

          {/* Streak Section */}
          <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
            <Text style={styles.sectionTitle}>Streak</Text>
            <Card>
              <View style={{ flexDirection: 'row', gap: 20, marginBottom: 16 }}>
                <View style={styles.streakStat}>
                  <Flame size={20} color={Colors.amber} />
                  <Text style={[styles.bigNumber, { color: Colors.amber }]}>{streak.current}</Text>
                  <Text style={styles.streakLabel}>Current</Text>
                </View>
                <View style={[styles.streakStat, { borderLeftWidth: 1, borderLeftColor: Colors.border, paddingLeft: 20 }]}>
                  <Text style={{ fontSize: 20 }}>🏆</Text>
                  <Text style={styles.bigNumber}>{streak.longest}</Text>
                  <Text style={styles.streakLabel}>Best</Text>
                </View>
              </View>
              {streak.current > 0 ? (
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary, marginBottom: 12 }}>
                  {streak.current >= 30
                    ? 'Incredible! 30 days strong!'
                    : streak.current >= 7
                    ? `${7 - (streak.current % 7)} days until next 7-day milestone!`
                    : `${7 - streak.current} days until your first 7-day streak!`}
                </Text>
              ) : null}
              <Text style={[styles.sectionTitle, { fontSize: 13, marginBottom: 8 }]}>Last 30 Days</Text>
              <StreakHeatmap />
            </Card>
          </View>

          {/* Progress Photos */}
          <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Progress Photos</Text>
              <Pressable onPress={handleAddPhoto} style={styles.addBtn} testID="add-photo-btn">
                <Plus size={16} color={Colors.green} />
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.green }}>Add</Text>
              </Pressable>
            </View>
            {progressPhotos.length === 0 ? (
              <Card style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Camera size={40} color={Colors.textTertiary} />
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: Colors.textSecondary, marginTop: 12 }}>
                  No progress photos yet
                </Text>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textTertiary, marginTop: 4, textAlign: 'center' }}>
                  Take a photo to track your visual progress
                </Text>
                <Pressable style={[styles.outlineButton, { marginTop: 16 }]} onPress={handleAddPhoto}>
                  <Camera size={16} color={Colors.green} />
                  <Text style={styles.outlineButtonText}>Take Photo</Text>
                </Pressable>
              </Card>
            ) : (
              <View style={styles.photoGrid}>
                {progressPhotos.map((photo) => (
                  <Pressable
                    key={photo.id}
                    style={styles.photoThumb}
                    onLongPress={() => deleteProgressPhoto(photo.id)}
                  >
                    <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                    <Text style={styles.photoDate}>{formatDate(photo.date)}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Goals Section */}
          <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
            <Text style={styles.sectionTitle}>My Goals</Text>
            <Card>
              {!goal ? (
                <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                  <Target size={36} color={Colors.textTertiary} />
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: Colors.textSecondary, marginTop: 8 }}>
                    No goal set yet
                  </Text>
                  <Pressable style={[styles.saveButton, { marginTop: 16 }]} onPress={() => setShowSetGoal(true)}>
                    <Text style={styles.saveText}>Set Goal</Text>
                  </Pressable>
                </View>
              ) : (
                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textPrimary }}>
                      Target: {goal.targetWeight} lbs
                    </Text>
                    {goalProgress !== null ? (
                      <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.green }}>
                        {goalProgress}%
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${goalProgress ?? 0}%` }]} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.textTertiary }}>
                      Start: {goal.startWeight} lbs
                    </Text>
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.textTertiary }}>
                      Goal: {goal.targetWeight} lbs
                    </Text>
                  </View>
                  <Pressable style={[styles.outlineButton, { marginTop: 12 }]} onPress={() => setShowSetGoal(true)}>
                    <Text style={styles.outlineButtonText}>Edit Goal</Text>
                  </Pressable>
                </View>
              )}
            </Card>
          </View>

          {/* Recent Weight Entries */}
          {weightEntries.length > 0 ? (
            <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
              <Text style={styles.sectionTitle}>Recent Weigh-Ins</Text>
              <Card>
                {weightEntries.slice(-5).reverse().map((entry, i, arr) => (
                  <View
                    key={entry.id}
                    style={[
                      styles.listRow,
                      i < arr.length - 1 ? styles.listRowBorder : null,
                    ]}
                  >
                    <View>
                      <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.textPrimary }}>
                        {entry.weight} {entry.unit}
                      </Text>
                      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary }}>
                        {formatDate(entry.date)}
                      </Text>
                    </View>
                    <Pressable onPress={() => deleteWeightEntry(entry.id)}>
                      <Trash2 size={16} color={Colors.textTertiary} />
                    </Pressable>
                  </View>
                ))}
              </Card>
            </View>
          ) : null}
        </ScrollView>

        {/* Toast */}
        <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />

        {/* Celebration */}
        <ConfettiCelebration
          visible={celebration.visible}
          message={celebration.message}
          subMessage={celebration.subMessage}
          onDismiss={() => setCelebration((prev) => ({ ...prev, visible: false }))}
        />

        {/* Modals */}
        <LogWeightModal
          visible={showLogWeight}
          onClose={() => setShowLogWeight(false)}
          onSave={(weight, unit, note) => {
            const today = new Date().toISOString().split('T')[0];
            addWeightEntry({ date: today, weight, unit, note: note || undefined });
            showToast(`Logged ${weight} ${unit}`, 'success');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }}
        />
        <LogMeasurementsModal
          visible={showLogMeasure}
          onClose={() => setShowLogMeasure(false)}
          onSave={(m) => {
            addMeasurementEntry(m);
            showToast('Measurements saved!', 'success');
          }}
          gender={gender}
          bodyFatPreview={bodyFat}
        />
        <SetGoalModal
          visible={showSetGoal}
          onClose={() => setShowSetGoal(false)}
          onSave={(targetWeight, targetBF) => {
            const today = new Date().toISOString().split('T')[0];
            setGoal({
              startWeight: latestWeight?.weight ?? targetWeight,
              startDate: today,
              targetWeight,
              targetBodyFat: targetBF,
            });
            showToast('Goal saved!', 'success');
          }}
          currentWeight={latestWeight?.weight ?? 0}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  headerTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 28,
    color: Colors.textPrimary,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: Colors.navyCard,
    borderRadius: BorderRadius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  summaryItem: {
    flex: 1,
    minWidth: '40%',
    alignItems: 'center',
  },
  summaryValue: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 22,
    color: Colors.textPrimary,
    lineHeight: 28,
  },
  summaryLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  summaryUnit: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    color: Colors.textTertiary,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  trendText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },
  periodBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
  },
  periodBtnActive: {
    backgroundColor: Colors.green,
  },
  periodText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  periodTextActive: {
    color: '#fff',
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.green,
    borderRadius: BorderRadius.lg,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  outlineButtonText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: Colors.green,
  },
  bigNumber: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 28,
    color: Colors.textPrimary,
  },
  categoryLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },
  bmiBarContainer: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  bmiSegment: {
    height: '100%',
  },
  bmiMarker: {
    position: 'absolute',
    top: -2,
    width: 4,
    height: 12,
    borderRadius: 2,
    backgroundColor: Colors.textPrimary,
    marginLeft: -2,
  },
  streakStat: {
    alignItems: 'center',
    gap: 4,
  },
  streakLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  measureCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: 12,
    alignItems: 'center',
    minWidth: 70,
    flex: 1,
  },
  measureCardValue: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 18,
    color: Colors.textPrimary,
  },
  measureCardLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoThumb: {
    width: (SCREEN_WIDTH - 32 - 16) / 3,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    aspectRatio: 1,
  },
  photoDate: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    color: Colors.textTertiary,
    paddingTop: 4,
    paddingBottom: 2,
    textAlign: 'center',
  },
  progressBar: {
    height: 10,
    backgroundColor: Colors.surface,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.green,
    borderRadius: 5,
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  listRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#0F2040',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 22,
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: 3,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  unitButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  unitButtonActive: {
    backgroundColor: Colors.green,
  },
  unitButtonText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  unitButtonTextActive: {
    color: '#fff',
  },
  bigInput: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 48,
    color: Colors.textPrimary,
    textAlign: 'center',
    paddingVertical: 8,
    marginBottom: 8,
  },
  fieldInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  inputLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  noteInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textPrimary,
    minHeight: 60,
    marginBottom: 20,
  },
  measureRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  measureField: {
    flex: 1,
  },
  measureLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  measureInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textPrimary,
  },
  previewBadge: {
    backgroundColor: Colors.greenMuted,
    borderRadius: BorderRadius.md,
    padding: 10,
    marginBottom: 12,
    alignItems: 'center',
  },
  previewText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.green,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: Colors.textSecondary,
  },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.green,
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: '#fff',
  },
});
