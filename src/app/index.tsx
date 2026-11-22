import React from "react";
import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ConnectionBanner } from "@/components/connection-banner";
import { NavBar } from "@/components/nav-bar";
import { RpmGauge } from "@/components/rpm-gauge";
import { RpmRing } from "@/components/rpm-ring";
import { SensorCard } from "@/components/sensor-card";
import { UpdateModal } from "@/components/update-modal";
import { Colors } from "@/constants/colors";
import { useAppUpdate } from "@/hooks/use-app-update";
import { useObdStore } from "@/store/useObdStore";

export default function DashboardScreen() {
  const live = useObdStore((s) => s.live);
  const status = useObdStore((s) => s.status);
  const connectionName = useObdStore((s) => s.connectionName);
  const isDemoMode = useObdStore((s) => s.isDemoMode);
  const paused = useObdStore((s) => s.paused);
  const setPaused = useObdStore((s) => s.setPaused);
  const clearDashboard = useObdStore((s) => s.clearDashboard);
  const startDemoMode = useObdStore((s) => s.startDemoMode);
  const stopDemoMode = useObdStore((s) => s.stopDemoMode);

  const { checking, updateInfo, isModalOpen, check, closeModal } = useAppUpdate();

  const values = Object.values(live);
  const connected = status === "connected";
  const hasData = values.length > 0;

  const rpmValue = live["Engine Speed"]?.value ?? 0;
  const speedValue = live["Vehicle Speed"]?.value ?? 0;

  const secondarySensors = values.filter(
    (v) => v.name !== "Engine Speed" && v.name !== "Vehicle Speed"
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.brandStripes}>
            <View style={[styles.stripe, { backgroundColor: Colors.brandOrange, width: 10 }]} />
            <View style={[styles.stripe, { backgroundColor: Colors.brandAmber, width: 10 }]} />
            <View style={[styles.stripe, { backgroundColor: "#71717a", width: 10 }]} />
          </View>
          <Text style={styles.brandTitle}>
            OBD2 <Text style={styles.brandAccent}>AUTO</Text>
          </Text>
          <View style={styles.trackBadge}>
            <Text style={styles.trackBadgeText}>TRACK</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.refreshButton,
            pressed && styles.refreshButtonPressed,
            checking && styles.refreshButtonDisabled,
          ]}
          onPress={() => check(true)}
          disabled={checking}
          accessibilityLabel="Buscar actualización"
        >
          <Text style={styles.refreshIcon}>{checking ? "…" : "⟳"}</Text>
          {updateInfo?.hasUpdate && <View style={styles.updateDot} />}
        </Pressable>
      </View>

      <View style={styles.navWrapper}>
        <NavBar />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ConnectionBanner
          status={status}
          isDemoMode={isDemoMode}
          connectionName={connectionName}
        />

        {(connected || isDemoMode) && (
          <View style={styles.actionRow}>
            {connected && (
              <Pressable
                style={[styles.actionButton, paused && styles.actionButtonActive]}
                onPress={() => setPaused(!paused)}
              >
                <Text style={[styles.actionText, paused && styles.actionTextActive]}>
                  {paused ? "REANUDAR" : "PAUSA"}
                </Text>
              </Pressable>
            )}

            {isDemoMode ? (
              <Pressable style={styles.stopDemoButton} onPress={stopDemoMode}>
                <Text style={styles.stopDemoText}>SALIR DEMO</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.actionButton} onPress={clearDashboard}>
                <Text style={styles.actionText}>LIMPIAR</Text>
              </Pressable>
            )}
          </View>
        )}

        {hasData ? (
          <>
            <RpmGauge rpm={rpmValue} speed={speedValue} />

            {secondarySensors.length > 0 && (
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>SENSORES EN TIEMPO REAL</Text>
                <Text style={styles.sensorCount}>{secondarySensors.length} ACTIVOS</Text>
              </View>
            )}

            <View style={styles.grid}>
              {secondarySensors.map((sensor) => (
                <SensorCard key={sensor.name} value={sensor} />
              ))}
            </View>
          </>
        ) : (
          <View style={styles.standby}>
            <RpmRing rpm={0} size={190}>
              <Text style={styles.standbyIcon}>🏎️</Text>
              <Text style={styles.standbyLabel}>STANDBY</Text>
            </RpmRing>

            <View style={styles.standbyTitleBox}>
              <Text style={styles.standbyTitle}>
                AUTO EN ESPERA · <Text style={styles.brandAccent}>MOTOR APAGADO</Text>
              </Text>
            </View>

            <Text style={styles.standbyText}>
              Conecta tu adaptador OBD2 Bluetooth (V011 BLE) o prueba todos los medidores en tiempo
              real con el simulador interactivo.
            </Text>

            <Pressable
              style={({ pressed }) => [styles.demoCta, pressed && styles.ctaPressed]}
              onPress={startDemoMode}
            >
              <View style={styles.demoIconBox}>
                <Text style={styles.demoIcon}>⚡</Text>
              </View>
              <View style={styles.demoTextBox}>
                <View style={styles.demoTitleRow}>
                  <Text style={styles.demoTitle}>PROBAR MODO DEMO</Text>
                  <View style={styles.liveBadge}>
                    <Text style={styles.liveBadgeText}>LIVE</Text>
                  </View>
                </View>
                <Text style={styles.demoSubtitle} numberOfLines={1}>
                  Simula RPM, velocidad y sensores en vivo
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>

            <Link href="/connection" asChild>
              <Pressable style={({ pressed }) => [styles.connectCta, pressed && styles.ctaPressed]}>
                <Text style={styles.connectIcon}>◉</Text>
                <Text style={styles.connectText}>CONECTAR ADAPTADOR V011</Text>
              </Pressable>
            </Link>
          </View>
        )}
      </ScrollView>

      <UpdateModal visible={isModalOpen} onClose={closeModal} updateInfo={updateInfo} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandStripes: {
    gap: 3,
  },
  stripe: {
    height: 5,
    borderRadius: 1,
    transform: [{ skewX: "-12deg" }],
  },
  brandTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 1,
  },
  brandAccent: {
    color: Colors.brandOrange,
  },
  trackBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 87, 34, 0.5)",
    backgroundColor: "rgba(255, 87, 34, 0.15)",
  },
  trackBadgeText: {
    color: Colors.brandOrange,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshButtonPressed: {
    borderColor: Colors.brandOrange,
    transform: [{ scale: 0.95 }],
  },
  refreshButtonDisabled: {
    opacity: 0.5,
  },
  refreshIcon: {
    color: Colors.textSecondary,
    fontSize: 20,
    fontWeight: "700",
  },
  updateDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.brandOrange,
  },
  navWrapper: {
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 32,
    gap: 14,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    alignItems: "center",
    backgroundColor: Colors.surfaceAlt,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonActive: {
    backgroundColor: Colors.brandOrange,
    borderColor: Colors.brandOrange,
  },
  actionText: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  actionTextActive: {
    color: "#fff",
  },
  stopDemoButton: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "rgba(255, 61, 87, 0.12)",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  stopDemoText: {
    color: Colors.danger,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  standby: {
    alignItems: "center",
    paddingTop: 16,
    gap: 16,
  },
  standbyIcon: {
    fontSize: 36,
  },
  standbyLabel: {
    color: Colors.brandAmber,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    marginTop: 2,
  },
  standbyTitleBox: {
    alignSelf: "stretch",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  standbyTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 1,
    textAlign: "center",
  },
  standbyText: {
    color: Colors.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  demoCta: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.brandOrange,
    backgroundColor: Colors.surface,
    shadowColor: Colors.brandOrange,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  demoIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: Colors.brandOrange,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.brandOrange,
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  demoIcon: {
    fontSize: 22,
  },
  demoTextBox: {
    flex: 1,
    minWidth: 0,
  },
  demoTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  demoTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  liveBadge: {
    backgroundColor: Colors.brandOrange,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  liveBadgeText: {
    color: "#000",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  demoSubtitle: {
    color: Colors.muted,
    fontSize: 12,
    marginTop: 3,
  },
  chevron: {
    color: Colors.textSecondary,
    fontSize: 26,
    fontWeight: "600",
  },
  connectCta: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#141820",
  },
  connectIcon: {
    color: Colors.brandOrange,
    fontSize: 16,
    fontWeight: "900",
  },
  connectText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
  },
  ctaPressed: {
    transform: [{ scale: 0.98 }],
  },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  sectionTitle: {
    color: Colors.muted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  sensorCount: {
    color: Colors.brandOrange,
    fontSize: 10,
    fontWeight: "900",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
});
