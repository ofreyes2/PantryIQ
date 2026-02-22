import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Switch,
  Alert,
  Linking,
  Share,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  User,
  Key,
  Bell,
  Users,
  Moon,
  Weight,
  Database,
  Info,
  Eye,
  EyeOff,
  ChevronRight,
  ExternalLink,
  Check,
  RefreshCw,
  Download,
  Trash2,
  Camera,
  Home,
  Package,
  Utensils,
} from 'lucide-react-native';
import { useAppStore, UserProfile } from '@/lib/stores/appStore';
import { usePantryStore } from '@/lib/stores/pantryStore';
import { useMealsStore } from '@/lib/stores/mealsStore';
import { useHealthStore } from '@/lib/stores/healthStore';
import { useShoppingStore } from '@/lib/stores/shoppingStore';
import { useRecipesStore } from '@/lib/stores/recipesStore';
import { useLocationStore } from '@/lib/stores/locationStore';
import { useKitchenMapStore } from '@/lib/stores/kitchenMapStore';
import { Colors, BorderRadius, Shadows } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { Toast, useToast } from '@/components/Toast';

// ─── Section Card ──────────────────────────────────────────────────────────────

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconWrap}>{icon}</View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// ─── Row Item ──────────────────────────────────────────────────────────────────

function RowItem({
  label,
  value,
  onPress,
  rightElement,
  destructive,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <Pressable
      style={styles.rowItem}
      onPress={onPress}
      disabled={!onPress && !rightElement}
    >
      <Text style={[styles.rowLabel, destructive ? { color: Colors.error } : null]}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {value ? (
          <Text style={styles.rowValue}>{value}</Text>
        ) : null}
        {rightElement ?? null}
        {onPress && !rightElement ? (
          <ChevronRight size={16} color={Colors.textTertiary} />
        ) : null}
      </View>
    </Pressable>
  );
}

// ─── Toggle Row ────────────────────────────────────────────────────────────────

function ToggleRow({
  label,
  value,
  onToggle,
  sublabel,
}: {
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  sublabel?: string;
}) {
  return (
    <View style={styles.rowItem}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sublabel ? (
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textTertiary, marginTop: 2 }}>
            {sublabel}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Colors.surface, true: Colors.green }}
        thumbColor="#fff"
        ios_backgroundColor={Colors.surface}
      />
    </View>
  );
}

// ─── API Key Field ─────────────────────────────────────────────────────────────

function ApiKeyField({
  label,
  value,
  onChange,
  helpUrl,
  helpLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  helpUrl: string;
  helpLabel: string;
}) {
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const isSet = value.length > 0;

  return (
    <View style={styles.apiKeyBlock}>
      <View style={styles.apiKeyRow}>
        <Text style={styles.apiKeyLabel}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.statusBadge, isSet ? styles.statusBadgeGreen : styles.statusBadgeGray]}>
            <Text style={[styles.statusText, isSet ? { color: Colors.green } : { color: Colors.textTertiary }]}>
              {isSet ? 'Connected' : 'Not set'}
            </Text>
          </View>
          <Pressable onPress={() => Linking.openURL(helpUrl)}>
            <Text style={styles.getKeyLink}>{helpLabel}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.apiInputRow}>
        <TextInput
          style={styles.apiInput}
          value={editing ? draft : (isSet ? '••••••••••••••••' : '')}
          onChangeText={setDraft}
          onFocus={() => {
            setEditing(true);
            setDraft(value);
          }}
          onBlur={() => {
            setEditing(false);
            onChange(draft);
          }}
          placeholder="Paste API key here..."
          placeholderTextColor={Colors.textTertiary}
          secureTextEntry={!visible && !editing}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable onPress={() => setVisible(!visible)} style={styles.eyeBtn}>
          {visible ? (
            <EyeOff size={18} color={Colors.textTertiary} />
          ) : (
            <Eye size={18} color={Colors.textTertiary} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ─── Profile Edit Modal ────────────────────────────────────────────────────────

function ProfileEditModal({
  visible,
  onClose,
  profile,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSave: (data: {
    name: string;
    age: number | null;
    height: { feet: number; inches: number } | null;
    gender: string;
    activityLevel: string;
  }) => void;
}) {
  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(profile.age?.toString() ?? '');
  const [feet, setFeet] = useState(profile.height?.feet?.toString() ?? '5');
  const [inches, setInches] = useState(profile.height?.inches?.toString() ?? '8');
  const [gender, setGender] = useState('male');
  const [activity, setActivity] = useState('lightly');

  const ACTIVITY_LEVELS = [
    { id: 'sedentary', label: 'Sedentary' },
    { id: 'lightly', label: 'Lightly Active' },
    { id: 'moderate', label: 'Moderately Active' },
    { id: 'very', label: 'Very Active' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Edit Profile</Text>

            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={Colors.textTertiary}
            />

            <Text style={styles.fieldLabel}>Age</Text>
            <TextInput
              style={styles.fieldInput}
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
              placeholder="e.g. 32"
              placeholderTextColor={Colors.textTertiary}
            />

            <Text style={styles.fieldLabel}>Height</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textTertiary, marginBottom: 4 }}>
                  Feet
                </Text>
                <TextInput
                  style={styles.fieldInput}
                  value={feet}
                  onChangeText={setFeet}
                  keyboardType="number-pad"
                  placeholder="5"
                  placeholderTextColor={Colors.textTertiary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textTertiary, marginBottom: 4 }}>
                  Inches
                </Text>
                <TextInput
                  style={styles.fieldInput}
                  value={inches}
                  onChangeText={setInches}
                  keyboardType="number-pad"
                  placeholder="8"
                  placeholderTextColor={Colors.textTertiary}
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Gender</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              {['male', 'female'].map((g) => (
                <Pressable
                  key={g}
                  style={[styles.chipBtn, gender === g && styles.chipBtnActive]}
                  onPress={() => setGender(g)}
                >
                  <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>
                    {g === 'male' ? 'Male' : 'Female'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Activity Level</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {ACTIVITY_LEVELS.map((a) => (
                <Pressable
                  key={a.id}
                  style={[styles.chipBtn, activity === a.id && styles.chipBtnActive]}
                  onPress={() => setActivity(a.id)}
                >
                  <Text style={[styles.chipText, activity === a.id && styles.chipTextActive]}>
                    {a.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <Pressable style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.saveButton}
                onPress={() => {
                  onSave({
                    name,
                    age: parseInt(age) || null,
                    height: { feet: parseInt(feet) || 5, inches: parseInt(inches) || 8 },
                    gender,
                    activityLevel: activity,
                  });
                  onClose();
                }}
              >
                <Text style={styles.saveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Activity Level chip selector (reused for chips pattern) ──────────────────

// ─── Main Settings Screen ──────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const setUserProfile = useAppStore((s) => s.setUserProfile);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const setOnboardingComplete = useAppStore((s) => s.setOnboardingComplete);
  const userProfile = useAppStore((s) => s.userProfile);
  const settings = useAppStore((s) => s.settings);

  const pantryItems = usePantryStore((s) => s.items);
  const deleteItem = usePantryStore((s) => s.deleteItem);
  const mealEntries = useMealsStore((s) => s.entries);
  const deleteEntry = useMealsStore((s) => s.deleteEntry);
  const weightEntries = useHealthStore((s) => s.weightEntries);
  const recipes = useRecipesStore((s) => s.recipes);
  const shoppingStores = useShoppingStore((s) => s.stores);
  const locations = useLocationStore((s) => s.locations);
  const kitchenMappedAreas = useKitchenMapStore((s) => s.mappedAreas);
  const kitchenMapOnboarding = useKitchenMapStore((s) => s.onboardingComplete);

  const { toast, showToast, hideToast } = useToast();
  const [showProfileModal, setShowProfileModal] = useState(false);

  // API key state
  const [claudeKey, setClaudeKey] = useState(userProfile.claudeApiKey);
  const [usdaKey, setUsdaKey] = useState(userProfile.usdaApiKey);

  // Photo recognition settings
  const [photoRecognitionEnabled, setPhotoRecognitionEnabled] = useState<boolean>(true);
  const [showPhotoTips, setShowPhotoTips] = useState<boolean>(true);

  React.useEffect(() => {
    AsyncStorage.getItem('pantryiq_photo_recognition_enabled').then((val) => {
      if (val !== null) setPhotoRecognitionEnabled(val === 'true');
    });
    AsyncStorage.getItem('pantryiq_skip_photo_tips').then((val) => {
      if (val !== null) setShowPhotoTips(val !== 'true');
    });
  }, []);

  // Notification state
  const [notifMeal, setNotifMeal] = useState(false);
  const [notifWeight, setNotifWeight] = useState(false);
  const [notifLowStock, setNotifLowStock] = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');

  // Family sync state
  const [familySync, setFamilySync] = useState(false);
  const [familyCode, setFamilyCode] = useState<string | null>(null);

  // Kitchen settings
  const [locationBrowsing, setLocationBrowsing] = useState(false);

  // Goals state
  const [carbGoal, setCarbGoal] = useState(userProfile.dailyCarbGoal.toString());
  const [calGoal, setCalGoal] = useState(userProfile.dailyCalorieGoal.toString());
  const [targetWeight, setTargetWeight] = useState(userProfile.targetWeight?.toString() ?? '');

  const generateFamilyCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setFamilyCode(code);
    showToast(`Invite code: ${code}`, 'info');
  };

  const saveApiKeys = () => {
    setUserProfile({ claudeApiKey: claudeKey, usdaApiKey: usdaKey });
    showToast('API keys saved', 'success');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const saveGoals = () => {
    setUserProfile({
      dailyCarbGoal: parseInt(carbGoal) || 50,
      dailyCalorieGoal: parseInt(calGoal) || 1800,
      targetWeight: parseFloat(targetWeight) || null,
    });
    showToast('Goals saved', 'success');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleExportData = () => {
    const data = {
      pantry: pantryItems,
      meals: mealEntries,
      health: weightEntries,
      recipes,
    };
    Share.share({
      message: JSON.stringify(data, null, 2),
      title: 'PantryIQ Data Export',
    });
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your pantry items, meals, recipes, and health data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            setOnboardingComplete(false);
            router.replace('/onboarding' as never);
          },
        },
      ]
    );
  };

  const avatarInitials = userProfile.name
    ? userProfile.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'PQ';

  return (
    <LinearGradient colors={['#0A1628', '#0B1C35', '#0A1628']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']} testID="settings-screen">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Settings</Text>
          </View>

          {/* Profile Section */}
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <SectionCard title="Profile" icon={<User size={18} color={Colors.green} />}>
              <View style={styles.profileRow}>
                <Pressable
                  style={styles.avatarCircle}
                  onPress={async () => {
                    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (status !== 'granted') return;
                    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
                    if (!result.canceled && result.assets[0]) {
                      setUserProfile({ avatarUri: result.assets[0].uri });
                    }
                  }}
                  testID="avatar-picker"
                >
                  {userProfile.avatarUri ? (
                    <Text style={styles.avatarInitials}>{avatarInitials}</Text>
                  ) : (
                    <Text style={styles.avatarInitials}>{avatarInitials}</Text>
                  )}
                  <View style={styles.avatarCameraOverlay}>
                    <Camera size={12} color="#fff" />
                  </View>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={styles.profileName}>{userProfile.name || 'Set your name'}</Text>
                  <Text style={styles.profileSubtitle}>
                    {userProfile.age ? `${userProfile.age} yrs` : 'Age not set'}{userProfile.height ? ` · ${userProfile.height.feet}'${userProfile.height.inches}"` : ''}
                  </Text>
                </View>
                <Pressable style={styles.editProfileBtn} onPress={() => setShowProfileModal(true)} testID="edit-profile-btn">
                  <Text style={styles.editProfileText}>Edit</Text>
                </Pressable>
              </View>
            </SectionCard>
          </View>

          {/* My Kitchen & Storage */}
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <SectionCard title="My Kitchen & Storage" icon={<Home size={18} color={Colors.green} />}>
              <RowItem
                label="Kitchen Map"
                value={kitchenMapOnboarding ? `${kitchenMappedAreas.length} area${kitchenMappedAreas.length !== 1 ? 's' : ''} mapped` : 'Not set up'}
                onPress={() => router.push('/kitchen-map' as never)}
                rightElement={
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[
                      {
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 999,
                        backgroundColor: kitchenMapOnboarding && kitchenMappedAreas.length > 0
                          ? Colors.greenMuted
                          : Colors.surface,
                      }
                    ]}>
                      <Text style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 11,
                        color: kitchenMapOnboarding && kitchenMappedAreas.length > 0
                          ? Colors.green
                          : Colors.textTertiary,
                      }}>
                        {kitchenMapOnboarding && kitchenMappedAreas.length > 0
                          ? `${kitchenMappedAreas.length} mapped`
                          : 'Set up'}
                      </Text>
                    </View>
                    <ChevronRight size={16} color={Colors.textTertiary} />
                  </View>
                }
              />
              <View style={styles.divider} />
              <RowItem
                label="Storage Locations"
                value={`${locations.length} location${locations.length !== 1 ? 's' : ''}`}
                onPress={() => router.push('/kitchen-locations' as never)}
              />
              <View style={styles.divider} />
              <ToggleRow
                label="Location-Based Browsing"
                value={locationBrowsing}
                onToggle={setLocationBrowsing}
                sublabel="Group pantry items by storage location in the Pantry tab."
              />
            </SectionCard>
          </View>

          {/* Health Goals */}
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <SectionCard title="Health Goals" icon={<Weight size={18} color={Colors.green} />}>
              <View style={styles.goalRow}>
                <Text style={styles.goalLabel}>Daily Net Carbs</Text>
                <View style={styles.goalInputWrap}>
                  <TextInput
                    style={styles.goalInput}
                    value={carbGoal}
                    onChangeText={setCarbGoal}
                    keyboardType="number-pad"
                    testID="carb-goal-input"
                  />
                  <Text style={styles.goalUnit}>g</Text>
                </View>
              </View>
              <View style={[styles.goalRow, styles.goalRowBorder]}>
                <Text style={styles.goalLabel}>Daily Calories</Text>
                <View style={styles.goalInputWrap}>
                  <TextInput
                    style={styles.goalInput}
                    value={calGoal}
                    onChangeText={setCalGoal}
                    keyboardType="number-pad"
                    testID="calorie-goal-input"
                  />
                  <Text style={styles.goalUnit}>kcal</Text>
                </View>
              </View>
              <View style={[styles.goalRow, styles.goalRowBorder]}>
                <Text style={styles.goalLabel}>Target Weight</Text>
                <View style={styles.goalInputWrap}>
                  <TextInput
                    style={styles.goalInput}
                    value={targetWeight}
                    onChangeText={setTargetWeight}
                    keyboardType="decimal-pad"
                    testID="target-weight-input"
                  />
                  <Text style={styles.goalUnit}>lbs</Text>
                </View>
              </View>
              <Pressable style={[styles.saveButton, { marginTop: 12 }]} onPress={saveGoals} testID="save-goals-btn">
                <Text style={styles.saveText}>Save Goals</Text>
              </Pressable>
            </SectionCard>
          </View>

          {/* API Keys */}
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <SectionCard title="API Keys" icon={<Key size={18} color={Colors.green} />}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textTertiary, marginBottom: 12 }}>
                Keys are stored locally on your device and never sent to our servers.
              </Text>
              <ApiKeyField
                label="Claude API Key"
                value={claudeKey}
                onChange={setClaudeKey}
                helpUrl="https://console.anthropic.com"
                helpLabel="Get Key"
              />
              <View style={styles.divider} />
              <ApiKeyField
                label="USDA Key (food name search)"
                value={usdaKey}
                onChange={setUsdaKey}
                helpUrl="https://fdc.nal.usda.gov/api-key-signup.html"
                helpLabel="Get Key"
              />
              <Pressable style={[styles.saveButton, { marginTop: 12 }]} onPress={saveApiKeys} testID="save-api-keys-btn">
                <Text style={styles.saveText}>Save API Keys</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/api-status' as never)}
                style={{
                  marginTop: 10,
                  borderRadius: BorderRadius.md,
                  paddingVertical: 12,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: Colors.green,
                }}
              >
                <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: Colors.green }}>
                  Test APIs & Check Key Status
                </Text>
              </Pressable>
              <View style={styles.divider} />
              <ToggleRow
                label="Photo Recognition"
                value={photoRecognitionEnabled}
                onToggle={(v) => {
                  setPhotoRecognitionEnabled(v);
                  AsyncStorage.setItem('pantryiq_photo_recognition_enabled', String(v));
                }}
                sublabel="Use Claude AI to identify foods from photos. Requires Claude API key."
              />
              <View style={styles.divider} />
              <ToggleRow
                label="Show Photo Tips"
                value={showPhotoTips}
                onToggle={(v) => {
                  setShowPhotoTips(v);
                  AsyncStorage.setItem('pantryiq_skip_photo_tips', String(!v));
                }}
                sublabel="Show guidance tips before taking identification photos."
              />
            </SectionCard>
          </View>

          {/* Notifications */}
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <SectionCard title="Notifications" icon={<Bell size={18} color={Colors.green} />}>
              <ToggleRow
                label="Push Notifications"
                value={settings.notifications}
                onToggle={(v) => updateSettings({ notifications: v })}
              />
              {settings.notifications ? (
                <>
                  <View style={styles.divider} />
                  <ToggleRow
                    label="Meal Logging Reminder"
                    value={notifMeal}
                    onToggle={setNotifMeal}
                    sublabel="Daily at 7:00 PM"
                  />
                  <View style={styles.divider} />
                  <ToggleRow
                    label="Weight Check-in Reminder"
                    value={notifWeight}
                    onToggle={setNotifWeight}
                    sublabel="Daily at 8:00 AM"
                  />
                  <View style={styles.divider} />
                  <ToggleRow
                    label="Low Stock Alerts"
                    value={notifLowStock}
                    onToggle={setNotifLowStock}
                  />
                </>
              ) : null}
              <View style={styles.divider} />
              <ToggleRow
                label="Email Notifications"
                value={notifEmail}
                onToggle={setNotifEmail}
              />
              {notifEmail ? (
                <TextInput
                  style={[styles.fieldInput, { marginTop: 8 }]}
                  value={emailAddress}
                  onChangeText={setEmailAddress}
                  placeholder="your@email.com"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              ) : null}
            </SectionCard>
          </View>

          {/* Family Sync */}
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <SectionCard title="Family & Sharing" icon={<Users size={18} color={Colors.green} />}>
              <ToggleRow
                label="Family Sync"
                value={familySync}
                onToggle={setFamilySync}
                sublabel="Coming soon — generate a code for future use"
              />
              {familySync ? (
                <View style={{ marginTop: 12 }}>
                  {familyCode ? (
                    <View style={styles.familyCodeBlock}>
                      <Text style={styles.familyCodeLabel}>Invite Code</Text>
                      <Text style={styles.familyCodeValue}>{familyCode}</Text>
                      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textTertiary, marginTop: 4 }}>
                        Share this code with family members
                      </Text>
                    </View>
                  ) : (
                    <Pressable style={styles.outlineButton} onPress={generateFamilyCode}>
                      <RefreshCw size={16} color={Colors.green} />
                      <Text style={styles.outlineButtonText}>Generate Invite Code</Text>
                    </Pressable>
                  )}
                  <View style={styles.divider} />
                  <Text style={styles.familyMembersLabel}>Members</Text>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary }}>
                    Just you — invite family to share pantry
                  </Text>
                </View>
              ) : null}
            </SectionCard>
          </View>

          {/* Appearance */}
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <SectionCard title="Appearance" icon={<Moon size={18} color={Colors.green} />}>
              <ToggleRow
                label="Dark Mode"
                value={settings.darkMode}
                onToggle={(v) => {
                  updateSettings({ darkMode: v });
                  showToast('Dark mode preference saved', 'info');
                }}
                sublabel="Full theme switching coming in a future update"
              />
              <View style={styles.divider} />
              <View style={styles.rowItem}>
                <Text style={styles.rowLabel}>Text Size</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {['S', 'M', 'L'].map((size) => (
                    <Pressable
                      key={size}
                      style={[styles.sizeChip, size === 'M' && styles.sizeChipActive]}
                    >
                      <Text style={[styles.sizeChipText, size === 'M' && styles.sizeChipTextActive]}>
                        {size}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </SectionCard>
          </View>

          {/* Units */}
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <SectionCard title="Units" icon={<Weight size={18} color={Colors.green} />}>
              <View style={styles.rowItem}>
                <Text style={styles.rowLabel}>Weight</Text>
                <View style={styles.unitToggle}>
                  {(['imperial', 'metric'] as const).map((u) => (
                    <Pressable
                      key={u}
                      style={[styles.unitBtn, settings.units === u && styles.unitBtnActive]}
                      onPress={() => updateSettings({ units: u })}
                    >
                      <Text style={[styles.unitBtnText, settings.units === u && styles.unitBtnTextActive]}>
                        {u === 'imperial' ? 'lbs' : 'kg'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={[styles.rowItem, styles.goalRowBorder]}>
                <Text style={styles.rowLabel}>Measurements</Text>
                <View style={styles.unitToggle}>
                  {(['imperial', 'metric'] as const).map((u) => (
                    <Pressable
                      key={u}
                      style={[styles.unitBtn, settings.units === u && styles.unitBtnActive]}
                      onPress={() => updateSettings({ units: u })}
                    >
                      <Text style={[styles.unitBtnText, settings.units === u && styles.unitBtnTextActive]}>
                        {u === 'imperial' ? 'in' : 'cm'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </SectionCard>
          </View>

          {/* Data Management */}
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <SectionCard title="Data Management" icon={<Database size={18} color={Colors.green} />}>
              <RowItem
                label="Export All Data"
                onPress={handleExportData}
                rightElement={<Download size={16} color={Colors.textTertiary} />}
              />
              <View style={styles.divider} />
              <RowItem
                label="App Version"
                value="1.0.0 (Phase 4)"
              />
              <View style={styles.divider} />
              <RowItem
                label="Reset Pantry"
                value="Clear all pantry items"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  Alert.alert(
                    'Reset Pantry?',
                    'This will delete all pantry items. Your meals, recipes, and health data will be kept.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Reset Pantry',
                        style: 'destructive',
                        onPress: () => {
                          pantryItems.forEach((item) => deleteItem(item.id));
                          Alert.alert('Done', 'Pantry has been cleared.');
                        },
                      },
                    ]
                  );
                }}
                rightElement={<Package size={16} color={Colors.amber} />}
              />
              <View style={styles.divider} />
              <RowItem
                label="Reset Meal Log"
                value="Clear all logged meals"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  Alert.alert(
                    'Reset Meal Log?',
                    'This will delete all logged meals and food entries.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Reset Meals',
                        style: 'destructive',
                        onPress: () => {
                          mealEntries.forEach((entry) => deleteEntry(entry.id));
                          Alert.alert('Done', 'Meal log has been cleared.');
                        },
                      },
                    ]
                  );
                }}
                rightElement={<Utensils size={16} color={Colors.amber} />}
              />
              <View style={styles.divider} />
              <RowItem
                label="Reset Everything"
                value="Full app reset to factory state"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  Alert.alert(
                    'Reset Everything?',
                    'This will delete ALL data including pantry items, meals, health records, and preferences. Your API keys will be kept.\n\nThis cannot be undone.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Reset Everything',
                        style: 'destructive',
                        onPress: async () => {
                          pantryItems.forEach((item) => deleteItem(item.id));
                          mealEntries.forEach((entry) => deleteEntry(entry.id));
                          Alert.alert('Done', 'App has been reset. Your API keys were kept.');
                        },
                      },
                    ]
                  );
                }}
                destructive
                rightElement={<Trash2 size={16} color={Colors.error} />}
              />
            </SectionCard>
          </View>

          {/* About */}
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <SectionCard title="About" icon={<Info size={18} color={Colors.green} />}>
              <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                <View style={styles.appLogoCircle}>
                  <Text style={styles.appLogoText}>P</Text>
                </View>
                <Text style={styles.appName}>PantryIQ</Text>
                <Text style={styles.appTagline}>Your Kitchen. Your Health. Perfectly Managed.</Text>
                <Text style={styles.appVersion}>Version 1.0.0</Text>
              </View>
              <View style={styles.divider} />
              <RowItem
                label="Contact Support"
                onPress={() => Linking.openURL('mailto:support@pantryiq.app')}
                rightElement={<ExternalLink size={16} color={Colors.textTertiary} />}
              />
              <View style={styles.divider} />
              <RowItem
                label="Privacy Policy"
                onPress={() => showToast('Privacy policy coming soon', 'info')}
                rightElement={<ExternalLink size={16} color={Colors.textTertiary} />}
              />
            </SectionCard>
          </View>
        </ScrollView>

        <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />

        <ProfileEditModal
          visible={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          profile={userProfile}
          onSave={(data) => {
            setUserProfile({
              name: data.name,
              age: data.age,
              height: data.height,
            });
            showToast('Profile updated', 'success');
          }}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  headerTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 28,
    color: Colors.textPrimary,
  },
  sectionCard: {
    backgroundColor: Colors.navyCard,
    borderRadius: BorderRadius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.greenMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: Colors.textPrimary,
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 48,
  },
  rowLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textPrimary,
    flex: 1,
  },
  rowValue: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.green,
    position: 'relative',
  },
  avatarInitials: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 20,
    color: Colors.green,
  },
  avatarCameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: Colors.textPrimary,
  },
  profileSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  editProfileBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.green,
  },
  editProfileText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.green,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  goalRowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  goalLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textPrimary,
    flex: 1,
  },
  goalInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 80,
  },
  goalInput: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: Colors.textPrimary,
    minWidth: 50,
    textAlign: 'right',
  },
  goalUnit: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  apiKeyBlock: {
    marginBottom: 4,
  },
  apiKeyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  apiKeyLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  statusBadgeGreen: {
    backgroundColor: Colors.greenMuted,
  },
  statusBadgeGray: {
    backgroundColor: Colors.surface,
  },
  statusText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
  },
  getKeyLink: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: Colors.green,
    textDecorationLine: 'underline',
  },
  apiInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
  },
  apiInput: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textPrimary,
    paddingVertical: 12,
  },
  eyeBtn: {
    padding: 4,
  },
  familyCodeBlock: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  familyCodeLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  familyCodeValue: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 32,
    color: Colors.green,
    letterSpacing: 8,
  },
  familyMembersLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: 2,
  },
  unitBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  unitBtnActive: {
    backgroundColor: Colors.green,
  },
  unitBtnText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  unitBtnTextActive: {
    color: '#fff',
  },
  sizeChip: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeChipActive: {
    backgroundColor: Colors.green,
  },
  sizeChipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  sizeChipTextActive: {
    color: '#fff',
  },
  appLogoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.greenMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.green,
    marginBottom: 12,
  },
  appLogoText: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 32,
    color: Colors.green,
  },
  appName: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 22,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  appTagline: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 6,
  },
  appVersion: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.textTertiary,
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
  saveButton: {
    backgroundColor: Colors.green,
    borderRadius: BorderRadius.lg,
    paddingVertical: 13,
    alignItems: 'center',
  },
  saveText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: '#fff',
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
    maxHeight: '90%',
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
  fieldLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  chipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipBtnActive: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  chipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: '#fff',
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
});
