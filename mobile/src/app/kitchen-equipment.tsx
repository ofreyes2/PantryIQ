import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  TextInput,
  StyleSheet,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Zap,
  Flame,
  Trees,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  Cpu,
  Wind,
  Coffee,
  Waves,
  Beef,
  Circle,
  Grid3x3,
  FlameKindling,
  UtensilsCrossed,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useKitchenStore } from '@/lib/stores/kitchenStore';
import type { KitchenEquipment } from '@/lib/stores/kitchenStore';
import { Colors, BorderRadius, Shadows } from '@/constants/theme';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Helper: animate layout change ────────────────────────────────────────────

const animateLayout = () => {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
};

// ─── Types ────────────────────────────────────────────────────────────────────

type TabType = 'equipment' | 'preferences';

// ─── Multi-select Chip ────────────────────────────────────────────────────────

function Chip({
  label,
  selected,
  onPress,
  emoji,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  emoji?: string;
}) {
  return (
    <Pressable
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      {emoji ? <Text style={styles.chipEmoji}>{emoji}</Text> : null}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

// ─── Size Pill ────────────────────────────────────────────────────────────────

function SizePill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.sizePill, selected && styles.sizePillSelected]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      <Text style={[styles.sizePillText, selected && styles.sizePillTextSelected]}>{label}</Text>
    </Pressable>
  );
}

// ─── Section Header (collapsible) ─────────────────────────────────────────────

function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View style={styles.collapsibleSection}>
      <Pressable
        style={styles.collapsibleHeader}
        onPress={() => {
          animateLayout();
          setOpen((v) => !v);
        }}
      >
        <View style={styles.collapsibleIconWrap}>{icon}</View>
        <Text style={styles.collapsibleTitle}>{title}</Text>
        {open ? (
          <ChevronDown size={18} color={Colors.textSecondary} />
        ) : (
          <ChevronRight size={18} color={Colors.textSecondary} />
        )}
      </Pressable>
      {open ? <View style={styles.collapsibleBody}>{children}</View> : null}
    </View>
  );
}

// ─── Equipment Row (simple boolean toggle) ────────────────────────────────────

function BooleanEquipmentRow({
  label,
  value,
  onToggle,
  icon,
  children,
}: {
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <View>
      <View style={styles.equipmentRow}>
        {icon ? <View style={styles.equipmentIcon}>{icon}</View> : null}
        <Text style={styles.equipmentLabel}>{label}</Text>
        <Switch
          value={value}
          onValueChange={(v) => {
            animateLayout();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggle(v);
          }}
          trackColor={{ false: Colors.surface, true: Colors.green }}
          thumbColor="#fff"
          ios_backgroundColor={Colors.surface}
        />
      </View>
      {value && children ? <View style={styles.equipmentDetails}>{children}</View> : null}
    </View>
  );
}

// ─── Equipment Row (object with enabled field) ────────────────────────────────

function ObjectEquipmentRow<T extends { enabled: boolean }>({
  label,
  value,
  onToggle,
  icon,
  children,
}: {
  label: string;
  value: T;
  onToggle: (enabled: boolean) => void;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <View>
      <View style={styles.equipmentRow}>
        {icon ? <View style={styles.equipmentIcon}>{icon}</View> : null}
        <Text style={styles.equipmentLabel}>{label}</Text>
        <Switch
          value={value.enabled}
          onValueChange={(v) => {
            animateLayout();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggle(v);
          }}
          trackColor={{ false: Colors.surface, true: Colors.green }}
          thumbColor="#fff"
          ios_backgroundColor={Colors.surface}
        />
      </View>
      {value.enabled && children ? (
        <View style={styles.equipmentDetails}>{children}</View>
      ) : null}
    </View>
  );
}

// ─── Active Equipment Summary Card ───────────────────────────────────────────

function SummaryCard({ count }: { count: number }) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryBadge}>
        <UtensilsCrossed size={16} color={Colors.green} />
        <Text style={styles.summaryCount}>{count}</Text>
        <Text style={styles.summaryLabel}>items active</Text>
      </View>
      <Text style={styles.summarySubtext}>Your kitchen is set up for great cooking</Text>
    </View>
  );
}

// ─── Equipment Tab ────────────────────────────────────────────────────────────

function EquipmentTab() {
  const equipment = useKitchenStore((s) => s.equipment);
  const updateEquipment = useKitchenStore((s) => s.updateEquipment);
  const addInstantPot = useKitchenStore((s) => s.addInstantPot);
  const removeInstantPot = useKitchenStore((s) => s.removeInstantPot);
  const addCustomEquipment = useKitchenStore((s) => s.addCustomEquipment);
  const removeCustomEquipment = useKitchenStore((s) => s.removeCustomEquipment);
  const getEquipmentSummary = useKitchenStore((s) => s.getEquipmentSummary);

  const [showAddPotForm, setShowAddPotForm] = useState(false);
  const [newPotSize, setNewPotSize] = useState<'3qt' | '6qt' | '8qt'>('6qt');
  const [newPotNickname, setNewPotNickname] = useState('');
  const [showAddCustomForm, setShowAddCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');

  const activeCount = getEquipmentSummary().length;

  const handleAddPot = useCallback(() => {
    const nickname = newPotNickname.trim() || `Instant Pot ${newPotSize}`;
    addInstantPot({ size: newPotSize, nickname });
    setNewPotNickname('');
    setNewPotSize('6qt');
    setShowAddPotForm(false);
    animateLayout();
  }, [newPotNickname, newPotSize, addInstantPot]);

  const handleAddCustom = useCallback(() => {
    if (!customName.trim()) return;
    addCustomEquipment(customName.trim(), customDesc.trim());
    setCustomName('');
    setCustomDesc('');
    setShowAddCustomForm(false);
    animateLayout();
  }, [customName, customDesc, addCustomEquipment]);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
      testID="equipment-tab"
    >
      <SummaryCard count={activeCount} />

      {/* ─── Countertop Appliances ─── */}
      <CollapsibleSection
        title="Countertop Appliances"
        icon={<Zap size={16} color={Colors.amber} />}
        defaultOpen={true}
      >
        {/* Instant Pots */}
        <View style={styles.instantPotSection}>
          <Text style={styles.instantPotTitle}>Instant Pots</Text>
          {equipment.instantPots.map((pot) => (
            <View key={pot.id} style={styles.instantPotRow}>
              <View style={styles.instantPotInfo}>
                <Text style={styles.instantPotNickname}>{pot.nickname}</Text>
                <View style={[styles.sizePill, styles.sizePillSelected, { marginTop: 4 }]}>
                  <Text style={styles.sizePillTextSelected}>{pot.size}</Text>
                </View>
              </View>
              <Pressable
                style={styles.removePotBtn}
                onPress={() => {
                  animateLayout();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  removeInstantPot(pot.id);
                }}
              >
                <X size={14} color={Colors.error} />
              </Pressable>
            </View>
          ))}

          {showAddPotForm ? (
            <View style={styles.addPotForm}>
              <Text style={styles.formLabel}>Size</Text>
              <View style={styles.pillRow}>
                {(['3qt', '6qt', '8qt'] as const).map((s) => (
                  <SizePill
                    key={s}
                    label={s}
                    selected={newPotSize === s}
                    onPress={() => setNewPotSize(s)}
                  />
                ))}
              </View>
              <Text style={[styles.formLabel, { marginTop: 12 }]}>Nickname</Text>
              <TextInput
                style={styles.formInput}
                value={newPotNickname}
                onChangeText={setNewPotNickname}
                placeholder={`e.g. Large Instant Pot ${newPotSize}`}
                placeholderTextColor={Colors.textTertiary}
              />
              <View style={styles.formActions}>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => {
                    setShowAddPotForm(false);
                    animateLayout();
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.addBtn} onPress={handleAddPot}>
                  <Text style={styles.addBtnText}>Add Pot</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={styles.addPotButton}
              onPress={() => {
                setShowAddPotForm(true);
                animateLayout();
              }}
            >
              <Plus size={14} color={Colors.green} />
              <Text style={styles.addPotButtonText}>Add Instant Pot</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.divider} />

        <ObjectEquipmentRow
          label="Deep Fryer"
          value={equipment.deepFryer}
          onToggle={(enabled) => updateEquipment({ deepFryer: { ...equipment.deepFryer, enabled } })}
          icon={<Flame size={14} color={Colors.amber} />}
        >
          <Text style={styles.detailLabel}>Oil Capacity (optional)</Text>
          <TextInput
            style={styles.detailInput}
            value={equipment.deepFryer.oilCapacity ?? ''}
            onChangeText={(v) => updateEquipment({ deepFryer: { ...equipment.deepFryer, oilCapacity: v } })}
            placeholder="e.g. 3 quarts"
            placeholderTextColor={Colors.textTertiary}
          />
        </ObjectEquipmentRow>

        <View style={styles.divider} />

        <ObjectEquipmentRow
          label="Air Fryer"
          value={equipment.airFryer}
          onToggle={(enabled) => updateEquipment({ airFryer: { ...equipment.airFryer, enabled } })}
          icon={<Wind size={14} color={Colors.textSecondary} />}
        >
          <Text style={styles.detailLabel}>Size</Text>
          <View style={styles.pillRow}>
            {(['2qt', '4qt', '6qt', '8qt+'] as const).map((s) => (
              <SizePill
                key={s}
                label={s}
                selected={equipment.airFryer.size === s}
                onPress={() => updateEquipment({ airFryer: { ...equipment.airFryer, size: s } })}
              />
            ))}
          </View>
        </ObjectEquipmentRow>

        <View style={styles.divider} />

        <ObjectEquipmentRow
          label="KitchenAid Mixer"
          value={equipment.kitchenAid}
          onToggle={(enabled) => updateEquipment({ kitchenAid: { ...equipment.kitchenAid, enabled } })}
          icon={<Cpu size={14} color={Colors.textSecondary} />}
        >
          <Text style={styles.detailLabel}>Attachments (tap to toggle)</Text>
          <View style={styles.pillRow}>
            {['Dough Hook', 'Pasta Roller', 'Meat Grinder', 'Ice Cream Bowl', 'Food Grinder'].map((att) => {
              const selected = equipment.kitchenAid.attachments.includes(att);
              return (
                <SizePill
                  key={att}
                  label={att}
                  selected={selected}
                  onPress={() => {
                    const attachments = selected
                      ? equipment.kitchenAid.attachments.filter((a) => a !== att)
                      : [...equipment.kitchenAid.attachments, att];
                    updateEquipment({ kitchenAid: { ...equipment.kitchenAid, attachments } });
                  }}
                />
              );
            })}
          </View>
        </ObjectEquipmentRow>

        <View style={styles.divider} />

        <ObjectEquipmentRow
          label="Bread Maker"
          value={equipment.breadMaker}
          onToggle={(enabled) => updateEquipment({ breadMaker: { ...equipment.breadMaker, enabled } })}
        >
          <Text style={styles.detailLabel}>Loaf Size</Text>
          <View style={styles.pillRow}>
            {(['1lb', '1.5lb', '2lb'] as const).map((s) => (
              <SizePill
                key={s}
                label={s}
                selected={equipment.breadMaker.loafSize === s}
                onPress={() => updateEquipment({ breadMaker: { ...equipment.breadMaker, loafSize: s } })}
              />
            ))}
          </View>
        </ObjectEquipmentRow>

        <View style={styles.divider} />

        <ObjectEquipmentRow
          label="Waffle Maker"
          value={equipment.waffleMaker}
          onToggle={(enabled) => updateEquipment({ waffleMaker: { ...equipment.waffleMaker, enabled } })}
        >
          <Text style={styles.detailLabel}>Type</Text>
          <View style={styles.pillRow}>
            {(['Regular', 'Belgian', 'Mini'] as const).map((t) => (
              <SizePill
                key={t}
                label={t}
                selected={equipment.waffleMaker.type === t}
                onPress={() => updateEquipment({ waffleMaker: { ...equipment.waffleMaker, type: t } })}
              />
            ))}
          </View>
        </ObjectEquipmentRow>

        <View style={styles.divider} />

        <ObjectEquipmentRow
          label="Crepe Pan"
          value={equipment.crepePan}
          onToggle={(enabled) => updateEquipment({ crepePan: { ...equipment.crepePan, enabled } })}
        >
          <Text style={styles.detailLabel}>Size</Text>
          <View style={styles.pillRow}>
            {(['8inch', '10inch', '12inch'] as const).map((s) => (
              <SizePill
                key={s}
                label={s}
                selected={equipment.crepePan.size === s}
                onPress={() => updateEquipment({ crepePan: { ...equipment.crepePan, size: s } })}
              />
            ))}
          </View>
        </ObjectEquipmentRow>

        <View style={styles.divider} />

        <ObjectEquipmentRow
          label="Microwave"
          value={equipment.microwave}
          onToggle={(enabled) => updateEquipment({ microwave: { ...equipment.microwave, enabled } })}
          icon={<Waves size={14} color={Colors.textSecondary} />}
        >
          <Text style={styles.detailLabel}>Wattage (optional)</Text>
          <TextInput
            style={styles.detailInput}
            value={equipment.microwave.wattage ?? ''}
            onChangeText={(v) => updateEquipment({ microwave: { ...equipment.microwave, wattage: v } })}
            placeholder="e.g. 1000W"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="numeric"
          />
        </ObjectEquipmentRow>

        <View style={styles.divider} />

        {(
          [
            ['blender', 'Blender'],
            ['immersionBlender', 'Immersion Blender'],
            ['foodProcessor', 'Food Processor'],
            ['riceCooker', 'Rice Cooker'],
            ['electricGriddle', 'Electric Griddle'],
            ['sandwichPress', 'Sandwich Press'],
            ['toasterOven', 'Toaster Oven'],
            ['sousVide', 'Sous Vide'],
            ['dehydrator', 'Dehydrator'],
            ['pressureCanner', 'Pressure Canner'],
            ['electricSkillet', 'Electric Skillet'],
            ['juicer', 'Juicer'],
            ['espressoMachine', 'Espresso Machine'],
          ] as [keyof KitchenEquipment, string][]
        ).map(([key, label], index) => (
          <View key={key}>
            {index > 0 ? <View style={styles.divider} /> : null}
            <BooleanEquipmentRow
              label={label}
              value={equipment[key] as boolean}
              onToggle={(v) => updateEquipment({ [key]: v })}
            />
          </View>
        ))}

        <View style={styles.divider} />

        <ObjectEquipmentRow
          label="Slow Cooker"
          value={equipment.slowCooker}
          onToggle={(enabled) => updateEquipment({ slowCooker: { ...equipment.slowCooker, enabled } })}
        >
          <Text style={styles.detailLabel}>Size</Text>
          <View style={styles.pillRow}>
            {(['4qt', '6qt', '8qt'] as const).map((s) => (
              <SizePill
                key={s}
                label={s}
                selected={equipment.slowCooker.size === s}
                onPress={() => updateEquipment({ slowCooker: { ...equipment.slowCooker, size: s } })}
              />
            ))}
          </View>
        </ObjectEquipmentRow>
      </CollapsibleSection>

      {/* ─── Cooking Surfaces ─── */}
      <CollapsibleSection
        title="Cooking Surfaces"
        icon={<Flame size={16} color={Colors.error} />}
        defaultOpen={true}
      >
        <ObjectEquipmentRow
          label="Gas Stove"
          value={equipment.gasStove}
          onToggle={(enabled) => updateEquipment({ gasStove: { ...equipment.gasStove, enabled } })}
          icon={<FlameKindling size={14} color={Colors.amber} />}
        >
          <Text style={styles.detailLabel}>Burners</Text>
          <View style={styles.pillRow}>
            {[2, 4, 5, 6].map((b) => (
              <SizePill
                key={b}
                label={`${b}`}
                selected={equipment.gasStove.burners === b}
                onPress={() => updateEquipment({ gasStove: { ...equipment.gasStove, burners: b } })}
              />
            ))}
          </View>
        </ObjectEquipmentRow>

        <View style={styles.divider} />

        <ObjectEquipmentRow
          label="Electric Stove"
          value={equipment.electricStove}
          onToggle={(enabled) => updateEquipment({ electricStove: { ...equipment.electricStove, enabled } })}
        >
          <Text style={styles.detailLabel}>Burners</Text>
          <View style={styles.pillRow}>
            {[2, 4, 5, 6].map((b) => (
              <SizePill
                key={b}
                label={`${b}`}
                selected={equipment.electricStove.burners === b}
                onPress={() => updateEquipment({ electricStove: { ...equipment.electricStove, burners: b } })}
              />
            ))}
          </View>
        </ObjectEquipmentRow>

        <View style={styles.divider} />

        <BooleanEquipmentRow
          label="Induction Cooktop"
          value={equipment.inductionCooktop}
          onToggle={(v) => updateEquipment({ inductionCooktop: v })}
        />

        <View style={styles.divider} />

        <ObjectEquipmentRow
          label="Standard Oven"
          value={equipment.standardOven}
          onToggle={(enabled) => updateEquipment({ standardOven: { ...equipment.standardOven, enabled } })}
        >
          <Text style={styles.detailLabel}>Type</Text>
          <View style={styles.pillRow}>
            {(['Conventional', 'Convection'] as const).map((t) => (
              <SizePill
                key={t}
                label={t}
                selected={equipment.standardOven.type === t}
                onPress={() => updateEquipment({ standardOven: { ...equipment.standardOven, type: t } })}
              />
            ))}
          </View>
        </ObjectEquipmentRow>

        <View style={styles.divider} />

        <BooleanEquipmentRow
          label="Double Oven"
          value={equipment.doubleOven}
          onToggle={(v) => updateEquipment({ doubleOven: v })}
        />

        <View style={styles.divider} />

        <BooleanEquipmentRow
          label="Broiler"
          value={equipment.broiler}
          onToggle={(v) => updateEquipment({ broiler: v })}
          icon={<Flame size={14} color={Colors.amber} />}
        />

        <View style={styles.divider} />

        <ObjectEquipmentRow
          label="Cast Iron Skillet"
          value={equipment.castIronSkillet}
          onToggle={(enabled) => updateEquipment({ castIronSkillet: { ...equipment.castIronSkillet, enabled } })}
          icon={<Circle size={14} color={Colors.textSecondary} />}
        >
          <Text style={styles.detailLabel}>Sizes (tap to select all you own)</Text>
          <View style={styles.pillRow}>
            {['8"', '10"', '12"', '14"'].map((s) => {
              const selected = equipment.castIronSkillet.sizes.includes(s);
              return (
                <SizePill
                  key={s}
                  label={s}
                  selected={selected}
                  onPress={() => {
                    const sizes = selected
                      ? equipment.castIronSkillet.sizes.filter((x) => x !== s)
                      : [...equipment.castIronSkillet.sizes, s];
                    updateEquipment({ castIronSkillet: { ...equipment.castIronSkillet, sizes } });
                  }}
                />
              );
            })}
          </View>
        </ObjectEquipmentRow>

        <View style={styles.divider} />

        <BooleanEquipmentRow
          label="Carbon Steel Pan"
          value={equipment.carbonSteelPan}
          onToggle={(v) => updateEquipment({ carbonSteelPan: v })}
        />

        <View style={styles.divider} />

        <BooleanEquipmentRow
          label="Stainless Steel Cookware Set"
          value={equipment.stainlessSteelSet}
          onToggle={(v) => updateEquipment({ stainlessSteelSet: v })}
        />

        <View style={styles.divider} />

        <BooleanEquipmentRow
          label="Non-Stick Cookware Set"
          value={equipment.nonStickSet}
          onToggle={(v) => updateEquipment({ nonStickSet: v })}
        />

        <View style={styles.divider} />

        <ObjectEquipmentRow
          label="Dutch Oven"
          value={equipment.dutchOven}
          onToggle={(enabled) => updateEquipment({ dutchOven: { ...equipment.dutchOven, enabled } })}
        >
          <Text style={styles.detailLabel}>Size</Text>
          <View style={styles.pillRow}>
            {(['4qt', '6qt', '8qt'] as const).map((s) => (
              <SizePill
                key={s}
                label={s}
                selected={equipment.dutchOven.size === s}
                onPress={() => updateEquipment({ dutchOven: { ...equipment.dutchOven, size: s } })}
              />
            ))}
          </View>
        </ObjectEquipmentRow>

        <View style={styles.divider} />

        <BooleanEquipmentRow
          label="Wok"
          value={equipment.wok}
          onToggle={(v) => updateEquipment({ wok: v })}
        />

        <View style={styles.divider} />

        <BooleanEquipmentRow
          label="Grill Pan"
          value={equipment.grillPan}
          onToggle={(v) => updateEquipment({ grillPan: v })}
          icon={<Grid3x3 size={14} color={Colors.textSecondary} />}
        />
      </CollapsibleSection>

      {/* ─── Outdoor Cooking ─── */}
      <CollapsibleSection
        title="Outdoor Cooking"
        icon={<Trees size={16} color={Colors.green} />}
      >
        <ObjectEquipmentRow
          label="Gas Grill"
          value={equipment.gasGrill}
          onToggle={(enabled) => updateEquipment({ gasGrill: { ...equipment.gasGrill, enabled } })}
          icon={<Flame size={14} color={Colors.amber} />}
        >
          <Text style={styles.detailLabel}>Burners</Text>
          <View style={styles.pillRow}>
            {[2, 3, 4, 5, 6].map((b) => (
              <SizePill
                key={b}
                label={`${b}`}
                selected={equipment.gasGrill.burners === b}
                onPress={() => updateEquipment({ gasGrill: { ...equipment.gasGrill, burners: b } })}
              />
            ))}
          </View>
        </ObjectEquipmentRow>

        <View style={styles.divider} />

        <BooleanEquipmentRow
          label="Charcoal Grill"
          value={equipment.charcoalGrill}
          onToggle={(v) => updateEquipment({ charcoalGrill: v })}
        />

        <View style={styles.divider} />

        <BooleanEquipmentRow
          label="Pellet Smoker"
          value={equipment.pelletSmoker}
          onToggle={(v) => updateEquipment({ pelletSmoker: v })}
          icon={<Beef size={14} color={Colors.textSecondary} />}
        />

        <View style={styles.divider} />

        <BooleanEquipmentRow
          label="Offset Smoker"
          value={equipment.offsetSmoker}
          onToggle={(v) => updateEquipment({ offsetSmoker: v })}
        />

        <View style={styles.divider} />

        <BooleanEquipmentRow
          label="Kamado Grill (Big Green Egg, etc.)"
          value={equipment.kamado}
          onToggle={(v) => updateEquipment({ kamado: v })}
        />

        <View style={styles.divider} />

        <BooleanEquipmentRow
          label="Flat Top Griddle"
          value={equipment.flatTopGriddle}
          onToggle={(v) => updateEquipment({ flatTopGriddle: v })}
        />

        <View style={styles.divider} />

        <BooleanEquipmentRow
          label="Outdoor Pizza Oven"
          value={equipment.outdoorPizzaOven}
          onToggle={(v) => updateEquipment({ outdoorPizzaOven: v })}
        />
      </CollapsibleSection>

      {/* ─── Custom Equipment ─── */}
      <View style={styles.collapsibleSection}>
        <View style={[styles.collapsibleHeader, { borderBottomWidth: 0 }]}>
          <View style={styles.collapsibleIconWrap}>
            <Plus size={16} color={Colors.green} />
          </View>
          <Text style={styles.collapsibleTitle}>Custom Equipment</Text>
        </View>

        <View style={styles.collapsibleBody}>
          {equipment.customEquipment.map((item) => (
            <View key={item.id} style={styles.customEquipmentRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.customEquipmentName}>{item.name}</Text>
                {item.description ? (
                  <Text style={styles.customEquipmentDesc}>{item.description}</Text>
                ) : null}
              </View>
              <Pressable
                style={styles.removePotBtn}
                onPress={() => {
                  animateLayout();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  removeCustomEquipment(item.id);
                }}
              >
                <X size={14} color={Colors.error} />
              </Pressable>
            </View>
          ))}

          {showAddCustomForm ? (
            <View style={styles.addPotForm}>
              <Text style={styles.formLabel}>Equipment Name</Text>
              <TextInput
                style={styles.formInput}
                value={customName}
                onChangeText={setCustomName}
                placeholder="e.g. Ninja Foodi"
                placeholderTextColor={Colors.textTertiary}
              />
              <Text style={[styles.formLabel, { marginTop: 8 }]}>Description (optional)</Text>
              <TextInput
                style={styles.formInput}
                value={customDesc}
                onChangeText={setCustomDesc}
                placeholder="e.g. 8-in-1 pressure cooker"
                placeholderTextColor={Colors.textTertiary}
              />
              <View style={styles.formActions}>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => {
                    setShowAddCustomForm(false);
                    animateLayout();
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.addBtn} onPress={handleAddCustom}>
                  <Text style={styles.addBtnText}>Add</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={styles.addPotButton}
              onPress={() => {
                setShowAddCustomForm(true);
                animateLayout();
              }}
            >
              <Plus size={14} color={Colors.green} />
              <Text style={styles.addPotButtonText}>Add Custom Equipment</Text>
            </Pressable>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Preferences Tab ──────────────────────────────────────────────────────────

function PreferencesTab() {
  const preferences = useKitchenStore((s) => s.preferences);
  const updatePreferences = useKitchenStore((s) => s.updatePreferences);

  const toggleInArray = (arr: string[], val: string): string[] =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  const TEXTURES = [
    { id: 'crispy', label: 'Crispy', emoji: '🔥' },
    { id: 'juicy', label: 'Juicy', emoji: '💧' },
    { id: 'charred', label: 'Charred', emoji: '🍖' },
    { id: 'buttery', label: 'Buttery', emoji: '🧈' },
    { id: 'fresh', label: 'Fresh & Light', emoji: '🥗' },
    { id: 'hearty', label: 'Hearty & Thick', emoji: '🍲' },
    { id: 'spicy', label: 'Spicy', emoji: '🌶️' },
    { id: 'savory', label: 'Savory & Umami', emoji: '🧄' },
  ];

  const COOK_TIMES = [
    { id: 'quick' as const, label: 'Quick', sublabel: 'under 20 min', emoji: '⚡' },
    { id: 'standard' as const, label: 'Standard', sublabel: '20-45 min', emoji: '🍳' },
    { id: 'weekend' as const, label: 'Weekend Cook', sublabel: 'up to 90 min', emoji: '🕐' },
    { id: 'allday' as const, label: 'All Day', sublabel: 'slow cooks & braises', emoji: '🔥' },
  ];

  const SKILL_LEVELS = [
    { id: 'beginner' as const, label: 'Beginner', desc: 'Simple recipes' },
    { id: 'intermediate' as const, label: 'Intermediate', desc: 'Some techniques' },
    { id: 'advanced' as const, label: 'Advanced', desc: 'Complex cooking' },
  ];

  const COOKING_METHODS = [
    { id: 'deep-frying', label: 'Deep Frying' },
    { id: 'air-frying', label: 'Air Frying' },
    { id: 'pan-frying', label: 'Pan Frying' },
    { id: 'oven-roasting', label: 'Oven Roasting' },
    { id: 'broiling', label: 'Broiling' },
    { id: 'grilling', label: 'Grilling' },
    { id: 'instant-pot', label: 'Instant Pot' },
    { id: 'slow-cooking', label: 'Slow Cooking' },
    { id: 'sous-vide', label: 'Sous Vide' },
    { id: 'smoking', label: 'Smoking' },
    { id: 'steaming', label: 'Steaming' },
    { id: 'sauteing', label: 'Sauteing' },
    { id: 'baking', label: 'Baking' },
  ];

  const DIETARY_FOCUS = [
    { id: 'low-carb', label: 'Low Carb' },
    { id: 'keto-strict', label: 'Keto Strict' },
    { id: 'high-protein', label: 'High Protein' },
    { id: 'dairy-free', label: 'Dairy Free' },
    { id: 'gluten-free', label: 'Gluten Free' },
    { id: 'nut-free', label: 'Nut Free' },
  ];

  const CUISINES = [
    { id: 'american', label: 'American Comfort', emoji: '🍔' },
    { id: 'mexican', label: 'Mexican & Tex-Mex', emoji: '🌮' },
    { id: 'italian', label: 'Italian', emoji: '🍝' },
    { id: 'asian', label: 'Asian Fusion', emoji: '🍜' },
    { id: 'mediterranean', label: 'Mediterranean', emoji: '🫒' },
    { id: 'bbq', label: 'BBQ & Smoked', emoji: '🔥' },
    { id: 'southern', label: 'Southern', emoji: '🍗' },
    { id: 'greek', label: 'Greek', emoji: '🥙' },
  ];

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
      testID="preferences-tab"
    >
      {/* ─── Texture Preferences ─── */}
      <View style={styles.prefSection}>
        <Text style={styles.prefSectionTitle}>Texture Preferences</Text>
        <Text style={styles.prefSectionSubtitle}>What do you love about food?</Text>
        <View style={styles.chipGrid}>
          {TEXTURES.map((t) => (
            <Chip
              key={t.id}
              label={t.label}
              emoji={t.emoji}
              selected={preferences.texturePreferences.includes(t.id)}
              onPress={() =>
                updatePreferences({
                  texturePreferences: toggleInArray(preferences.texturePreferences, t.id),
                })
              }
            />
          ))}
        </View>
      </View>

      {/* ─── Cook Time ─── */}
      <View style={styles.prefSection}>
        <Text style={styles.prefSectionTitle}>Available Cook Time</Text>
        <Text style={styles.prefSectionSubtitle}>How long do you usually have to cook?</Text>
        <View style={styles.cookTimeGrid}>
          {COOK_TIMES.map((ct) => (
            <Pressable
              key={ct.id}
              style={[
                styles.cookTimeCard,
                preferences.cookTimeAvailability === ct.id && styles.cookTimeCardSelected,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updatePreferences({ cookTimeAvailability: ct.id });
              }}
            >
              <Text style={styles.cookTimeEmoji}>{ct.emoji}</Text>
              <Text
                style={[
                  styles.cookTimeLabel,
                  preferences.cookTimeAvailability === ct.id && styles.cookTimeLabelSelected,
                ]}
              >
                {ct.label}
              </Text>
              <Text style={styles.cookTimeSublabel}>{ct.sublabel}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ─── Skill Level ─── */}
      <View style={styles.prefSection}>
        <Text style={styles.prefSectionTitle}>Skill Level</Text>
        <Text style={styles.prefSectionSubtitle}>What's your cooking experience?</Text>
        <View style={styles.skillGrid}>
          {SKILL_LEVELS.map((sl) => (
            <Pressable
              key={sl.id}
              style={[
                styles.skillCard,
                preferences.skillLevel === sl.id && styles.skillCardSelected,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updatePreferences({ skillLevel: sl.id });
              }}
            >
              <Text
                style={[
                  styles.skillLabel,
                  preferences.skillLevel === sl.id && styles.skillLabelSelected,
                ]}
              >
                {sl.label}
              </Text>
              <Text style={styles.skillDesc}>{sl.desc}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ─── Cooking Methods ─── */}
      <View style={styles.prefSection}>
        <Text style={styles.prefSectionTitle}>Favorite Cooking Methods</Text>
        <Text style={styles.prefSectionSubtitle}>Select all that apply</Text>
        <View style={styles.chipGrid}>
          {COOKING_METHODS.map((m) => (
            <Chip
              key={m.id}
              label={m.label}
              selected={preferences.favoriteMethods.includes(m.id)}
              onPress={() =>
                updatePreferences({
                  favoriteMethods: toggleInArray(preferences.favoriteMethods, m.id),
                })
              }
            />
          ))}
        </View>
      </View>

      {/* ─── Dietary Focus ─── */}
      <View style={styles.prefSection}>
        <Text style={styles.prefSectionTitle}>Dietary Focus</Text>
        <Text style={styles.prefSectionSubtitle}>Any nutritional priorities?</Text>
        <View style={styles.chipGrid}>
          {DIETARY_FOCUS.map((d) => (
            <Chip
              key={d.id}
              label={d.label}
              selected={preferences.dietaryFocus.includes(d.id)}
              onPress={() =>
                updatePreferences({
                  dietaryFocus: toggleInArray(preferences.dietaryFocus, d.id),
                })
              }
            />
          ))}
        </View>
      </View>

      {/* ─── Cuisine Preferences ─── */}
      <View style={styles.prefSection}>
        <Text style={styles.prefSectionTitle}>Cuisine Preferences</Text>
        <Text style={styles.prefSectionSubtitle}>What flavors do you love most?</Text>
        <View style={styles.chipGrid}>
          {CUISINES.map((c) => (
            <Chip
              key={c.id}
              label={c.label}
              emoji={c.emoji}
              selected={preferences.cuisinePreferences.includes(c.id)}
              onPress={() =>
                updatePreferences({
                  cuisinePreferences: toggleInArray(preferences.cuisinePreferences, c.id),
                })
              }
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function KitchenEquipmentScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('equipment');

  return (
    <LinearGradient colors={['#0A1628', '#0B1C35', '#0A1628']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']} testID="kitchen-equipment-screen">
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backBtn}
            onPress={() => router.back()}
            testID="back-button"
          >
            <ArrowLeft size={22} color={Colors.textPrimary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Kitchen Setup</Text>
            <Text style={styles.headerSubtitle}>Tell Chef Claude about your kitchen</Text>
          </View>
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tab, activeTab === 'equipment' && styles.tabActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab('equipment');
            }}
            testID="equipment-tab-btn"
          >
            <UtensilsCrossed
              size={16}
              color={activeTab === 'equipment' ? Colors.green : Colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'equipment' && styles.tabTextActive]}>
              Equipment
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'preferences' && styles.tabActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab('preferences');
            }}
            testID="preferences-tab-btn"
          >
            <Coffee
              size={16}
              color={activeTab === 'preferences' ? Colors.green : Colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'preferences' && styles.tabTextActive]}>
              Preferences
            </Text>
          </Pressable>
        </View>

        {/* Content */}
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}>
          {activeTab === 'equipment' ? <EquipmentTab /> : <PreferencesTab />}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 22,
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: Colors.navyCard,
    borderRadius: BorderRadius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  tabActive: {
    backgroundColor: Colors.surface,
  },
  tabText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.green,
  },
  // Summary Card
  summaryCard: {
    backgroundColor: Colors.navyCard,
    borderRadius: BorderRadius.xl,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.greenMuted,
    ...Shadows.card,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  summaryCount: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 22,
    color: Colors.green,
  },
  summaryLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textSecondary,
  },
  summarySubtext: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textTertiary,
  },
  // Collapsible Section
  collapsibleSection: {
    backgroundColor: Colors.navyCard,
    borderRadius: BorderRadius.xl,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadows.card,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 10,
  },
  collapsibleIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsibleTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: Colors.textPrimary,
    flex: 1,
  },
  collapsibleBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 2,
  },
  // Equipment Row
  equipmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 10,
  },
  equipmentIcon: {
    width: 24,
    alignItems: 'center',
  },
  equipmentLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textPrimary,
    flex: 1,
  },
  equipmentDetails: {
    paddingBottom: 12,
    paddingLeft: 4,
  },
  detailLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.textTertiary,
    marginBottom: 8,
  },
  detailInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textPrimary,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  // Instant Pot
  instantPotSection: {
    marginBottom: 4,
  },
  instantPotTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  instantPotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  instantPotInfo: {
    flex: 1,
  },
  instantPotNickname: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.textPrimary,
  },
  removePotBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.errorMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.green,
    borderStyle: 'dashed',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  addPotButtonText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.green,
  },
  // Add Form
  addPotForm: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.textTertiary,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: Colors.navyCard,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  addBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.green,
    alignItems: 'center',
  },
  addBtnText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
    color: '#fff',
  },
  // Custom Equipment
  customEquipmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  customEquipmentName: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.textPrimary,
  },
  customEquipmentDesc: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  // Size Pills
  sizePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sizePillSelected: {
    backgroundColor: Colors.greenMuted,
    borderColor: Colors.green,
  },
  sizePillText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  sizePillTextSelected: {
    color: Colors.green,
  },
  // Preferences
  prefSection: {
    marginBottom: 24,
  },
  prefSectionTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  prefSectionSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textTertiary,
    marginBottom: 14,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.navyCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipSelected: {
    backgroundColor: Colors.greenMuted,
    borderColor: Colors.green,
  },
  chipEmoji: {
    fontSize: 14,
  },
  chipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    color: Colors.green,
  },
  // Cook Time Cards
  cookTimeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cookTimeCard: {
    width: '47%',
    backgroundColor: Colors.navyCard,
    borderRadius: BorderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'flex-start',
  },
  cookTimeCardSelected: {
    backgroundColor: Colors.greenMuted,
    borderColor: Colors.green,
  },
  cookTimeEmoji: {
    fontSize: 22,
    marginBottom: 6,
  },
  cookTimeLabel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  cookTimeLabelSelected: {
    color: Colors.green,
  },
  cookTimeSublabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: Colors.textTertiary,
  },
  // Skill Level Cards
  skillGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  skillCard: {
    flex: 1,
    backgroundColor: Colors.navyCard,
    borderRadius: BorderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  skillCardSelected: {
    backgroundColor: Colors.greenMuted,
    borderColor: Colors.green,
  },
  skillLabel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
    color: Colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  skillLabelSelected: {
    color: Colors.green,
  },
  skillDesc: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
});
