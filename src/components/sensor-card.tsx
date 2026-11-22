import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";
import { LiveValue } from "@/store/useObdStore";

interface SensorConfig {
  label: string;
  icon: string;
  min: number;
  max: number;
  getAccentColor?: (val: number) => string;
}

const SENSOR_META: Record<string, SensorConfig> = {
  "Coolant Temp.": {
    label: "TEMP. MOTOR",
    icon: "🌡️",
    min: 40,
    max: 120,
    getAccentColor: (val) => {
      if (val > 100) return Colors.danger;
      if (val < 70) return Colors.tempCold;
      return Colors.tempNormal;
    },
  },
  "Control Module Voltage": {
    label: "BATERÍA / ALT.",
    icon: "🔋",
    min: 10,
    max: 16,
    getAccentColor: (val) => {
      if (val < 12.2) return Colors.danger;
      if (val < 13.2) return Colors.warning;
      return Colors.success;
    },
  },
  "Engine Load": {
    label: "CARGA MOTOR",
    icon: "⚙️",
    min: 0,
    max: 100,
    getAccentColor: (val) => {
      if (val > 80) return Colors.danger;
      if (val > 50) return Colors.warning;
      return Colors.brandOrange;
    },
  },
  "Throttle Pos.": {
    label: "ACELERADOR",
    icon: "⚡",
    min: 0,
    max: 100,
    getAccentColor: () => Colors.brandOrange,
  },
  "MAF Airflow Rate": {
    label: "FLUJO MAF",
    icon: "💨",
    min: 0,
    max: 120,
    getAccentColor: () => Colors.info,
  },
  "Fuel Level Input": {
    label: "COMBUSTIBLE",
    icon: "⛽",
    min: 0,
    max: 100,
    getAccentColor: (val) => (val < 15 ? Colors.danger : Colors.fuel),
  },
  "Intake Air Temp.": {
    label: "TEMP. ADMISIÓN",
    icon: "❄️",
    min: 0,
    max: 70,
    getAccentColor: () => Colors.info,
  },
};

export function SensorCard({ value }: { value: LiveValue }) {
  const meta = SENSOR_META[value.name];
  const label = meta?.label ?? value.name.toUpperCase();
  const icon = meta?.icon ?? "📊";
  const rounded = Math.round(value.value * 10) / 10;

  let progressPercent = 0;
  let barColor = Colors.brandOrange;
  if (meta) {
    const { min, max } = meta;
    progressPercent = Math.min(Math.max(((value.value - min) / (max - min)) * 100, 0), 100);
    if (meta.getAccentColor) {
      barColor = meta.getAccentColor(value.value);
    }
  }

  return (
    <View style={styles.card}>
      <View style={[styles.accent, { backgroundColor: barColor }]} />

      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {label}
        </Text>
      </View>

      <View style={styles.valueRow}>
        <Text style={styles.value}>{rounded}</Text>
        <Text style={[styles.unit, { color: barColor }]}>{value.unit}</Text>
      </View>

      {meta ? (
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progressPercent}%`, backgroundColor: barColor },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 104,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  accent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  icon: {
    fontSize: 13,
  },
  name: {
    color: Colors.muted,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    flexShrink: 1,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginVertical: 6,
  },
  value: {
    color: Colors.text,
    fontSize: 26,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  unit: {
    fontSize: 12,
    fontWeight: "900",
  },
  progressBarBg: {
    height: 4,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
  },
});
