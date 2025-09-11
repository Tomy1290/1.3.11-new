import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore, useLevel } from "../src/store/useStore";
import { useRouter } from "expo-router";
import * as Haptics from 'expo-haptics';
import { getWeekRange, getCurrentWeeklyEvent, computeEventProgress } from "../src/gamification/events";
import { computeChains } from "../src/gamification/chains";

function useThemeColors(theme: string) {
  if (theme === "pink_pastel") return { bg: "#fff0f5", card: "#ffe4ef", primary: "#d81b60", text: "#3a2f33", muted: "#8a6b75" };
  if (theme === "pink_vibrant") return { bg: "#1b0b12", card: "#2a0f1b", primary: "#ff2d87", text: "#ffffff", muted: "#e59ab8" };
  if (theme === "golden_pink") return { bg: "#fff8f0", card: "#ffe9c7", primary: "#dba514", text: "#2a1e22", muted: "#9b7d4e" };
  return { bg: "#fde7ef", card: "#ffd0e0", primary: "#e91e63", text: "#2a1e22", muted: "#7c5866" };
}

export default function Home() {
  const router = useRouter();
  const { theme, days, eventHistory, completeEvent, eventsEnabled } = useAppStore();
  const { level } = useLevel();
  const colors = useThemeColors(theme);

  // Weekly event computation
  const now = new Date();
  const { weekKey, dayKeys } = getWeekRange(now);
  const weeklyEvent = getCurrentWeeklyEvent(now);
  const evProg = computeEventProgress(dayKeys, { days }, weeklyEvent);
  const evCompleted = evProg.completed || !!eventHistory[weekKey]?.completed;

  const [detailVisible, setDetailVisible] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!eventsEnabled) return;
    if (evProg.completed && !eventHistory[weekKey]?.completed) {
      completeEvent(weekKey, { id: weeklyEvent.id, xp: weeklyEvent.xp });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // simple confetti fade
      setCelebrate(true);
      fade.setValue(0);
      Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }).start(() => {
        setTimeout(() => Animated.timing(fade, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => setCelebrate(false)), 600);
      });
    }
  }, [evProg.completed, weekKey, eventsEnabled]);

  // Chains teaser (Top 1)
  const chains = useMemo(() => computeChains(useAppStore.getState()), [days]);
  const topChain = useMemo(() => chains
    .filter(c => c.completed < c.total)
    .sort((a,b) => b.nextPercent - a.nextPercent)[0], [chains]);

  const rewardList = [
    { lvl: 10, title: 'Erweiterte Statistiken' },
    { lvl: 25, title: 'Golden Pink Theme' },
    { lvl: 50, title: 'VIP-Chat' },
    { lvl: 75, title: 'Premium Insights' },
    { lvl: 100, title: 'Legendärer Status' },
  ];
  const nextReward = rewardList.find(r => level < r.lvl);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* Dashboard: Event-Karte */}
        {eventsEnabled ? (
          <TouchableOpacity onPress={() => setDetailVisible(true)} activeOpacity={0.8}>
            <View style={[styles.card, { backgroundColor: colors.card }]}> 
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{weeklyEvent.title('de')}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={() => router.push('/events')} accessibilityLabel="Archiv" style={{ padding: 6 }}>
                    <Ionicons name="calendar" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={{ color: colors.muted, marginTop: 4 }}>{weeklyEvent.description('de')}</Text>
              <View style={{ height: 8, backgroundColor: colors.bg, borderRadius: 4, overflow: 'hidden', marginTop: 8 }}>
                <View style={{ width: `${evProg.percent}%`, height: 8, backgroundColor: colors.primary }} />
              </View>
              <Text style={{ color: colors.muted, marginTop: 6 }}>{evProg.percent}% · +{weeklyEvent.xp} XP · Bonus {Math.round(weeklyEvent.bonusPercent*100)}% {evCompleted ? '· Abgeschlossen' : ''}</Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {/* Dashboard: Ketten-Teaser */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name='link' size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>Ketten</Text>
            </View>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/achievements'); }} accessibilityLabel='Zu Ketten'>
              <Ionicons name='chevron-forward' size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          {topChain ? (
            <View style={{ marginTop: 6 }}>
              <Text style={{ color: colors.muted }}>{topChain.title} · Schritt {topChain.completed+1}/{topChain.total}</Text>
              <View style={{ height: 6, backgroundColor: colors.bg, borderRadius: 3, overflow: 'hidden', marginTop: 6 }}>
                <View style={{ width: `${Math.round(topChain.nextPercent)}%`, height: 6, backgroundColor: colors.primary }} />
              </View>
              {topChain.nextTitle ? <Text style={{ color: colors.muted, marginTop: 4 }}>Als Nächstes: {topChain.nextTitle}</Text> : null}
            </View>
          ) : (
            <Text style={{ color: colors.muted, marginTop: 6 }}>Alle Ketten abgeschlossen oder keine vorhanden.</Text>
          )}
        </View>

        {/* Dashboard: Nächste Belohnung */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="gift" size={20} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>Belohnungen</Text>
          </View>
          {nextReward ? (
            <Text style={{ color: colors.muted, marginTop: 6 }}>Nächste Belohnung: {nextReward.title} ab Level {nextReward.lvl}</Text>
          ) : (
            <Text style={{ color: colors.muted, marginTop: 6 }}>Alle Belohnungen freigeschaltet! 🎉</Text>
          )}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
            <TouchableOpacity style={[styles.cta, { backgroundColor: colors.primary }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/achievements'); }}>
              <Ionicons name="trophy" size={16} color="#fff" />
              <Text style={{ color: '#fff', marginLeft: 6 }}>Erfolge</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cta, { borderColor: colors.primary, borderWidth: 1 }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/analysis'); }}>
              <Ionicons name="stats-chart" size={16} color={colors.primary} />
              <Text style={{ color: colors.text, marginLeft: 6 }}>Analyse</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Event detail modal */}
      <Modal visible={detailVisible} transparent animationType="fade" onRequestClose={() => setDetailVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: colors.card, padding: 16, borderRadius: 12, width: '88%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{weeklyEvent.title('de')}</Text>
              <TouchableOpacity onPress={() => setDetailVisible(false)}>
                <Ionicons name='close' size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: colors.muted, marginTop: 6 }}>{weeklyEvent.description('de')}</Text>
            <View style={{ height: 8, backgroundColor: colors.bg, borderRadius: 4, overflow: 'hidden', marginTop: 8 }}>
              <View style={{ width: `${evProg.percent}%`, height: 8, backgroundColor: colors.primary }} />
            </View>
            <Text style={{ color: colors.muted, marginTop: 6 }}>{evProg.percent}% · +{weeklyEvent.xp} XP · Bonus {Math.round(weeklyEvent.bonusPercent*100)}%</Text>
            <TouchableOpacity onPress={() => { setDetailVisible(false); router.push('/events'); }} style={{ alignSelf: 'flex-end', marginTop: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 8 }}>
              <Text style={{ color: '#fff' }}>Archiv</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Simple celebration overlay */}
      {celebrate ? (
        <Animated.View pointerEvents='none' style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', opacity: fade }}>
          <Text style={{ fontSize: 48 }}>🎉</Text>
        </Animated.View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 12 },
  cta: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
});