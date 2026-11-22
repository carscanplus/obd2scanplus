import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";
import { ConnectionStatus } from "@/store/useObdStore";

interface ConnectionBannerProps {
  status: ConnectionStatus;
  isDemoMode: boolean;
  connectionName: string;
}

export function ConnectionBanner({ status, isDemoMode, connectionName }: ConnectionBannerProps) {
  const connected = status === "connected";

  let color = Colors.brandOrange;
  let title = "DESCONECTADO";
  let subtitle = "Adaptador no conectado";
  let tag = "SIN ENLACE";

  if (isDemoMode) {
    color = Colors.brandAmber;
    title = "SIMULADOR EN VIVO";
    subtitle = "Modo demo activo";
    tag = "DEMO";
  } else if (connected) {
    color = Colors.success;
    title = "CONECTADO";
    subtitle = connectionName;
    tag = "EN VIVO";
  } else if (status === "connecting") {
    color = Colors.brandAmber;
    title = "CONECTANDO";
    subtitle = "Estableciendo enlace con el adaptador";
    tag = "BLE";
  }

  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color, shadowColor: color }]} />
      <View style={styles.textBlock}>
        <Text style={[styles.title, { color }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <View style={[styles.tag, { borderColor: color }]}>
        <Text style={[styles.tagText, { color }]}>{tag}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
  },
  subtitle: {
    color: Colors.muted,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  tag: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
