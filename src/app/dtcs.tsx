import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/colors";
import { CATEGORY_LABEL } from "@/obd/dtc";
import { useObdStore } from "@/store/useObdStore";

export default function DtcsScreen() {
  const dtcs = useObdStore((s) => s.dtcs);
  const scanning = useObdStore((s) => s.scanning);
  const connected = useObdStore((s) => s.status === "connected");
  const scanDtcs = useObdStore((s) => s.scanDtcs);
  const clearDtcs = useObdStore((s) => s.clearDtcs);

  return (
    <View style={styles.container}>
      <View style={styles.actions}>
        <Pressable
          style={[styles.button, styles.scanButton]}
          onPress={() => void scanDtcs()}
          disabled={!connected || scanning}
        >
          <Text style={styles.scanText}>
            {scanning ? "ESCANEANDO..." : "ESCANEAR"}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.clearButton]}
          onPress={() => void clearDtcs()}
          disabled={!connected || dtcs.length === 0}
        >
          <Text style={styles.clearText}>LIMPIAR</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {dtcs.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Sin códigos de falla</Text>
            <Text style={styles.emptyText}>
              {connected
                ? 'Pulsa "Escanear" para leer los códigos del vehículo.'
                : "Conecta un adaptador para leer códigos."}
            </Text>
          </View>
        ) : (
          dtcs.map((dtc) => (
            <View key={`${dtc.code}-${dtc.permanent}`} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.code}>{dtc.code}</Text>
                <View style={styles.badges}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {CATEGORY_LABEL[dtc.category].toUpperCase()}
                    </Text>
                  </View>
                  {dtc.permanent && (
                    <View style={[styles.badge, styles.badgePermanent]}>
                      <Text style={styles.badgeText}>PERMANENTE</Text>
                    </View>
                  )}
                </View>
              </View>
              <Text style={styles.description}>{dtc.description}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  scanButton: {
    backgroundColor: Colors.accent,
  },
  scanText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: "800",
  },
  clearButton: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  clearText: {
    color: Colors.danger,
    fontSize: 14,
    fontWeight: "800",
  },
  list: {
    gap: 10,
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  emptyText: {
    color: Colors.muted,
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  code: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "800",
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
    backgroundColor: Colors.warning,
  },
  badgeText: {
    color: Colors.text,
    fontSize: 10,
    fontWeight: "800",
  },
  description: {
    color: Colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
