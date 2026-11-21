import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { UpdateModal } from "@/components/update-modal";
import { Colors } from "@/constants/colors";
import { useAppUpdate } from "@/hooks/use-app-update";
import { LiveValue, useObdStore } from "@/store/useObdStore";

function MetricCard({ value }: { value: LiveValue }) {
  const rounded = Math.round(value.value * 10) / 10;

  return (
    <View style={styles.card}>
      <Text style={styles.cardName}>{value.name.toUpperCase()}</Text>
      <Text style={styles.cardValue}>{rounded}</Text>
      <Text style={styles.cardUnit}>{value.unit}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const live = useObdStore((s) => s.live);
  const status = useObdStore((s) => s.status);
  const connectionName = useObdStore((s) => s.connectionName);
  const paused = useObdStore((s) => s.paused);
  const setPaused = useObdStore((s) => s.setPaused);
  const clearDashboard = useObdStore((s) => s.clearDashboard);

  const { checking, updateInfo, isModalOpen, check, closeModal } = useAppUpdate();

  const values = Object.values(live);
  const connected = status === "connected";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.status}>
          <Text style={{ color: connected ? Colors.success : Colors.danger }}>
            {connected ? "● " : "○ "}
          </Text>
          {connected ? connectionName : "Sin conexión"}
        </Text>
        <View style={styles.actions}>
          <Pressable
            style={[
              styles.actionButton,
              connected && styles.actionButtonActive,
            ]}
            onPress={() => setPaused(!paused)}
            disabled={!connected}
          >
            <Text style={styles.actionText}>
              {paused ? "REANUDAR" : "PAUSA"}
            </Text>
          </Pressable>
          <Pressable
            style={styles.actionButton}
            onPress={clearDashboard}
            disabled={!connected}
          >
            <Text style={styles.actionText}>LIMPIAR</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.nav}>
        <Link href="/connection" asChild>
          <Pressable style={styles.navButton}>
            <Text style={styles.navText}>CONEXIÓN</Text>
          </Pressable>
        </Link>
        <Link href="/dtcs" asChild>
          <Pressable style={styles.navButton}>
            <Text style={styles.navText}>CÓDIGOS</Text>
          </Pressable>
        </Link>
        <Pressable
          style={[
            styles.navButton,
            updateInfo?.hasUpdate && styles.updateNavButton,
          ]}
          onPress={() => check(true)}
          disabled={checking}
        >
          <Text
            style={[
              styles.navText,
              updateInfo?.hasUpdate && styles.updateNavText,
            ]}
          >
            {checking
              ? "BUSCANDO..."
              : updateInfo?.hasUpdate
                ? "★ ACTUALIZAR"
                : "ACTUALIZAR"}
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {values.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Sin datos en vivo</Text>
            <Text style={styles.emptyText}>
              Conecta tu adaptador ELM327 por BLE (por ejemplo V011) o por
              Bluetooth clásico para ver los datos en vivo.
            </Text>
            <Link href="/connection" asChild>
              <Pressable style={styles.primaryButton}>
                <Text style={styles.primaryText}>IR A CONEXIÓN</Text>
              </Pressable>
            </Link>
          </View>
        ) : (
          values.map((value) => <MetricCard key={value.name} value={value} />)
        )}
      </ScrollView>

      <UpdateModal
        visible={isModalOpen}
        onClose={closeModal}
        updateInfo={updateInfo}
      />
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
  },
  status: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonActive: {
    backgroundColor: Colors.accent,
  },
  actionText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  nav: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  navButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  navText: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: "700",
  },
  updateNavButton: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  updateNavText: {
    color: Colors.background,
  },
  grid: {
    padding: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    minHeight: 110,
    justifyContent: "space-between",
  },
  cardName: {
    color: Colors.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  cardValue: {
    color: Colors.text,
    fontSize: 30,
    fontWeight: "800",
  },
  cardUnit: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
  primaryButton: {
    marginTop: 16,
    backgroundColor: Colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: "800",
  },
});
