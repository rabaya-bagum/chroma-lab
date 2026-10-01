import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlowButton } from '../components/GlowButton';
import { Icon } from '../components/Icon';
import { theme } from '../config/theme';
import { CATEGORY_LABEL, COSMETICS } from '../data/cosmetics';
import type { CosmeticCategory, CosmeticItem } from '../data/cosmetics';
import { unlockStatus } from '../game/cosmetics';
import { CosmeticPreview } from '../render/CosmeticPreview';
import { audio } from '../services/audio';
import { useProgressStore } from '../store/progressStore';
import { useToastStore } from '../store/toastStore';
import { goBack } from '../utils/navigation';

const CATEGORIES: CosmeticCategory[] = ['tube', 'theme', 'pour'];

export function CollectionScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const save = useProgressStore((s) => s.save);
  const [category, setCategory] = useState<CosmeticCategory>('tube');
  // what is being previewed per category; defaults to what is equipped
  const [preview, setPreview] = useState<Partial<Record<CosmeticCategory, string>>>({});

  const sel = save.cosmetics.selected;
  const shown = (cat: CosmeticCategory) => preview[cat] ?? sel[cat];
  const items = COSMETICS.filter((c) => c.category === category);
  const current = COSMETICS.find((c) => c.id === shown(category))!;
  const status = unlockStatus(save, current);
  const pw = Math.min(width - 32, 420);

  const act = () => {
    const progress = useProgressStore.getState();
    if (status.owned) {
      if (progress.equipCosmetic(current.id)) { audio.play('button'); setPreview((p) => ({ ...p, [category]: undefined })); }
      return;
    }
    if (status.canBuy && progress.buyCosmetic(current.id)) {
      progress.equipCosmetic(current.id);
      audio.play('unlock');
      useToastStore.getState().show({ kind: 'info', title: 'UNLOCKED', message: `${current.name} is yours and equipped.` });
      setPreview((p) => ({ ...p, [category]: undefined }));
    }
  };

  const actionLabel = status.equipped ? 'EQUIPPED' : status.owned ? 'EQUIP' : status.cost ? `UNLOCK  ${status.cost}` : 'LOCKED';
  const actionDisabled = status.equipped || (!status.owned && !status.canBuy);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.top}>
        <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
          <Icon name="back" size={24} />
        </Pressable>
        <Text maxFontSizeMultiplier={1.3} style={styles.title} accessibilityRole="header">COLLECTION</Text>
        <Text style={styles.coins} accessibilityLabel={`${save.economy.coins} coins`}>{save.economy.coins}</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.tabs}>
          {CATEGORIES.map((c) => (
            <Pressable key={c} onPress={() => setCategory(c)} accessibilityRole="tab" accessibilityState={{ selected: category === c }}
              accessibilityLabel={CATEGORY_LABEL[c]} style={[styles.tab, category === c && styles.tabOn]}>
              <Text maxFontSizeMultiplier={1.3} style={styles.tabText}>{CATEGORY_LABEL[c]}</Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.preview, { width: pw }]}>
          <CosmeticPreview
            skinId={shown('tube')} themeId={shown('theme')} effectId={shown('pour')}
            width={pw} height={Math.min(220, pw * 0.58)}
          />
        </View>

        <View style={styles.detail}>
          <Text maxFontSizeMultiplier={1.3} style={styles.name}>{current.name.toUpperCase()}</Text>
          <Text maxFontSizeMultiplier={1.3} style={styles.desc}>{current.description}</Text>
          {!status.owned && status.progress && (
            <Text style={styles.req} accessibilityLabel={`${status.progress.current} of ${status.progress.target} ${status.progress.unit}`}>
              {status.progress.current} / {status.progress.target} {status.progress.unit}
            </Text>
          )}
          {!status.owned && status.cost && <Text style={styles.req}>{status.requirement}{status.canBuy ? '' : `  (you have ${save.economy.coins})`}</Text>}
          <GlowButton primary={!actionDisabled} label={actionLabel} disabled={actionDisabled} onPress={act}
            accessibilityLabel={status.equipped ? `${current.name} is equipped` : status.owned ? `Equip ${current.name}` : status.cost ? `Unlock ${current.name} for ${status.cost} coins` : `${current.name} is locked. ${status.requirement}`} />
        </View>

        <View style={styles.grid}>
          {items.map((item) => (
            <ItemCard key={item.id} item={item} active={item.id === current.id} onPress={() => setPreview((p) => ({ ...p, [category]: item.id }))} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function ItemCard({ item, active, onPress }: { item: CosmeticItem; active: boolean; onPress(): void }) {
  const save = useProgressStore((s) => s.save);
  const st = unlockStatus(save, item);
  const state = st.equipped ? 'EQUIPPED' : st.owned ? 'OWNED' : st.requirement.toUpperCase();
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      accessibilityLabel={`${item.name}. ${st.equipped ? 'Equipped' : st.owned ? 'Owned' : `Locked, ${st.requirement}`}`}
      accessibilityState={{ selected: active }} style={[styles.card, active && styles.cardOn]}>
      {!st.owned && <Icon name="lock" size={16} color={theme.textDim} />}
      <Text maxFontSizeMultiplier={1.3} style={styles.cardName}>{item.name}</Text>
      <Text maxFontSizeMultiplier={1.3} style={[styles.cardState, st.equipped && { color: theme.accent }]}>{state}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 8 },
  back: { width: 72, height: 48, justifyContent: 'center' },
  title: { color: theme.text, fontSize: 18, fontWeight: '800', letterSpacing: 4 },
  coins: { width: 72, textAlign: 'right', color: '#FFC83D', fontWeight: '800', fontSize: 16 },
  scroll: { alignItems: 'center', gap: 14, paddingHorizontal: 16 },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { minHeight: 44, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.glassEdge, alignItems: 'center', justifyContent: 'center' },
  tabOn: { borderColor: theme.accent, backgroundColor: 'rgba(39,227,242,0.15)' },
  tabText: { color: theme.text, fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  preview: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: theme.glassEdge },
  detail: { alignItems: 'center', gap: 8, width: '100%', maxWidth: 420 },
  name: { color: theme.text, fontSize: 18, fontWeight: '800', letterSpacing: 3 },
  desc: { color: theme.textDim, textAlign: 'center' },
  req: { color: '#FFC83D', fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  card: { width: 104, minHeight: 84, padding: 8, borderRadius: 14, borderWidth: 1, borderColor: theme.glassEdge, backgroundColor: theme.panel, alignItems: 'center', justifyContent: 'center', gap: 4 },
  cardOn: { borderColor: theme.accent },
  cardName: { color: theme.text, fontWeight: '700', textAlign: 'center' },
  cardState: { color: theme.textDim, fontSize: 10, fontWeight: '700', letterSpacing: 1, textAlign: 'center' },
});
