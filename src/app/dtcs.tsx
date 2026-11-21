import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from "react-native";

import { NavBar } from "@/components/nav-bar";
import { Colors } from "@/constants/colors";
import { CATEGORY_LABEL } from "@/obd/dtc";
import { useObdStore } from "@/store/useObdStore";

export default function DtcsScreen() {
  const dtcs = useObdStore((s) => s.dtcs);
  const scanning = useObdStore((s) => s.scanning);
  const connected = useObdStore((s) => s.status === "connected");
  const isDemoMode = useObdStore((s) => s.isDemoMode);
  const scanDtcs = useObdStore((s) => s.scanDtcs);
  const clearDtcs = useObdStore((s) => s.clearDtcs);

  return (
    <View style={styles.container}>
      {/* Barra de Navegación */}
      <NavBar />

      <View style={styles.body}>
        {/* Botones de Acción */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.button, styles.scanButton, (!connected || scanning) && styles.buttonDisabled]}
            onPress={() => void scanDtcs()}
            disabled={!connected || scanning}
          >
            {scanning ? (
              <View style={styles.scanningRow}>
                <ActivityIndicator size="small" color={Colors.background} />
                <Text style={styles.scanText}>CONSULTANDO ECU...</Text>
              </View>
            ) : (
              <Text style={styles.scanText}>🔍 ESCANEAR CÓDIGOS</Text>
            )}
          </Pressable>

          <Pressable
            style={[
              styles.button,
              styles.clearButton,
              (!connected || dtcs.length === 0) && styles.buttonDisabled,
            ]}
            onPress={() => void clearDtcs()}
            disabled={!connected || dtcs.length === 0}
          >
            <Text style={styles.clearText}>BORRAR CÓDIGOS</Text>
          </Pressable>
        </View>

        {isDemoMode && (
          <View style={styles.demoNotice}>
            <Text style={styles.demoNoticeText}>
              ⚡ Modo Demo activo: Puedes escanear y probar el borrado con datos de simulación.
            </Text>
          </View>
        )}

        {/* Lista de Códigos / Estado del Vehículo */}
        <ScrollView contentContainerStyle={styles.list}>
          {dtcs.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Text style={styles.emptyIcon}>{connected ? "🛡️" : "⚠️"}</Text>
              </View>
              <Text style={styles.emptyTitle}>
                {connected ? "SIN CÓDIGOS DE AVERÍA" : "VEHÍCULO DESCONECTADO"}
              </Text>
              <Text style={styles.emptyText}>
                {connected
                  ? 'No se detectaron fallos activos en la ECU. Pulsa "Escanear Códigos" para una comprobación en profundidad.'
                  : "Conecta tu adaptador OBD2 Bluetooth (o activa el Modo Demo) para leer los códigos de diagnóstico del motor."}
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.alertBanner}>
                <Text style={styles.alertTitle}>
                  ⚠️ {dtcs.length} CÓDIGO{dtcs.length > 1 ? "S" : ""} DETECTADO{dtcs.length > 1 ? "S" : ""}
                </Text>
                <Text style={styles.alertSub}>Se requiere atención o revisión mecánica.</Text>
              </View>

              {dtcs.map((dtc) => (
                <View key={`${dtc.code}-${dtc.permanent}`} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.code}>{dtc.code}</Text>
                    <View style={styles.badges}>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {CATEGORY_LABEL[dtc.category]?.toUpperCase() ?? "MOTOR"}
                        </Text>
                      </View>
                      {dtc.permanent && (
                        <View style={[styles.badge, styles.badgePermanent]}>
                          <Text style={styles.badgePermanentText}>PERMANENTE</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={styles.description}>{dtc.description}</Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  body: {
    flex: 1,
    padding: 16,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  scanButton: {
    backgroundColor: Colors.accent,
  },
  scanningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scanText: {
    color: Colors.background,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  clearButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.danger,
  },
  clearText: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  demoNotice: {
    backgroundColor: "rgba(255, 171, 0, 0.12)",
    borderWidth: 1,
    borderColor: Colors.warning,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  demoNoticeText: {
    color: Colors.warning,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  emptyText: {
    color: Colors.muted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  alertBanner: {
    backgroundColor: "rgba(255, 61, 87, 0.12)",
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
  },
  alertTitle: {
    color: Colors.danger,
    fontSize: 14,
    fontWeight: "900",
  },
  alertSub: {
    color: Colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.danger,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  code: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  badges: {
    flexDirection: "row",
    gap: 6,
  },
  badge: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgePermanent: {
    backgroundColor: "rgba(255, 61, 87, 0.2)",
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  badgeText: {
    color: Colors.muted,
    fontSize: 10,
    fontWeight: "800",
  },
  badgePermanentText: {
    color: Colors.danger,
    fontSize: 10,
    fontWeight: "800",
  },
  description: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
