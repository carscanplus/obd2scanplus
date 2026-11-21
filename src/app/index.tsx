import React from "react";
import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { NavBar } from "@/components/nav-bar";
import { RpmGauge } from "@/components/rpm-gauge";
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

  // Extraer RPM y Velocidad para el medidor principal del Cockpit
  const rpmValue = live["Engine Speed"]?.value ?? 0;
  const speedValue = live["Vehicle Speed"]?.value ?? 0;

  // Filtrar RPM y Velocidad para las tarjetas de sensores secundarias
  const secondarySensors = values.filter(
    (v) => v.name !== "Engine Speed" && v.name !== "Vehicle Speed"
  );

  return (
    <View style={styles.container}>
      {/* Barra de Navegación Rápida */}
      <NavBar
        onCheckUpdate={() => check(true)}
        hasUpdate={updateInfo?.hasUpdate}
        checkingUpdate={checking}
      />

      {/* Header de Estado Automotriz */}
      <View style={styles.header}>
        <View style={styles.statusIndicator}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: isDemoMode
                  ? Colors.warning
                  : connected
                    ? Colors.success
                    : Colors.danger,
              },
            ]}
          />
          <View>
            <Text style={styles.statusTitle}>
              {isDemoMode ? "SIMULADOR EN VIVO" : connected ? connectionName : "DESCONECTADO"}
            </Text>
            <Text style={styles.statusSubtitle}>
              {isDemoMode
                ? "Modo Demo Activo"
                : connected
                  ? "Enlace OBD-II activo"
                  : "Adaptador no conectado"}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          {connected && (
            <Pressable
              style={[styles.actionButton, paused && styles.actionButtonActive]}
              onPress={() => setPaused(!paused)}
            >
              <Text style={styles.actionText}>{paused ? "REANUDAR" : "PAUSA"}</Text>
            </Pressable>
          )}

          {isDemoMode ? (
            <Pressable style={styles.stopDemoButton} onPress={stopDemoMode}>
              <Text style={styles.stopDemoText}>SALIR DEMO</Text>
            </Pressable>
          ) : connected ? (
            <Pressable style={styles.actionButton} onPress={clearDashboard}>
              <Text style={styles.actionText}>LIMPIAR</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {values.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <Text style={styles.emptyCarIcon}>🏎️</Text>
            </View>
            <Text style={styles.emptyTitle}>COCKPIT EN ESPERA</Text>
            <Text style={styles.emptyText}>
              Conecta tu adaptador OBD2 Bluetooth (V011 BLE) o prueba todos los medidores en tiempo
              real con el simulador interactivo.
            </Text>

            {/* Botón destacado Modo Demo */}
            <Pressable style={styles.demoPrimaryButton} onPress={startDemoMode}>
              <Text style={styles.demoIcon}>⚡</Text>
              <View>
                <Text style={styles.demoButtonTitle}>PROBAR MODO DEMO</Text>
                <Text style={styles.demoButtonSub}>Simula RPM, velocidad y sensores en vivo</Text>
              </View>
            </Pressable>

            {/* Botón Ir a Conexión */}
            <Link href="/connection" asChild>
              <Pressable style={styles.connectButton}>
                <Text style={styles.connectButtonText}>📡 CONECTAR ADAPTADOR V011</Text>
              </Pressable>
            </Link>
          </View>
        ) : (
          <>
            {/* Medidor Principal Cockpit: Tacómetro & Velocímetro */}
            <RpmGauge rpm={rpmValue} speed={speedValue} />

            {/* Título de Sensores Secundarios */}
            {secondarySensors.length > 0 && (
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>SENSORES EN TIEMPO REAL</Text>
                <Text style={styles.sensorCount}>{secondarySensors.length} ACTIVOS</Text>
              </View>
            )}

            {/* Grid de Sensores */}
            <View style={styles.grid}>
              {secondarySensors.map((sensor) => (
                <SensorCard key={sensor.name} value={sensor} />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Modal de Actualización desde GitHub */}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusTitle: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  statusSubtitle: {
    color: Colors.muted,
    fontSize: 11,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  actionText: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  stopDemoButton: {
    backgroundColor: "rgba(255, 61, 87, 0.15)",
    borderWidth: 1,
    borderColor: Colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  stopDemoText: {
    color: Colors.danger,
    fontSize: 11,
    fontWeight: "800",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
    paddingHorizontal: 16,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyCarIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 8,
  },
  emptyText: {
    color: Colors.muted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  demoPrimaryButton: {
    width: "100%",
    maxWidth: 360,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    marginBottom: 14,
    elevation: 4,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  demoIcon: {
    fontSize: 28,
  },
  demoButtonTitle: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  demoButtonSub: {
    color: Colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  connectButton: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  connectButtonText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 8,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    color: Colors.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  sensorCount: {
    color: Colors.accent,
    fontSize: 10,
    fontWeight: "800",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
});
