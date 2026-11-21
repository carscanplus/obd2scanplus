import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";
import { LiveValue } from "@/store/useObdStore";

interface SensorConfig {
  label: string;
  icon: string;
  min: number;
  max: number;
  unitOverride?: string;
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
      return Colors.accent;
    },
  },
  "Throttle Pos.": {
    label: "ACELERADOR",
    icon: "⚡",
    min: 0,
    max: 100,
    getAccentColor: () => Colors.accent,
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

  // Cálculo de barra de porcentaje si se define rango
  let progressPercent = 0;
  let barColor = Colors.accent;
  if (meta) {
    const min = meta.min;
    const max = meta.max;
    progressPercent = Math.min(Math.max(((value.value - min) / (max - min)) * 100, 0), 100);
    if (meta.getAccentColor) {
      barColor = meta.getAccentColor(value.value);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {label}
        </Text>
      </View>

      <View style={styles.valueRow}>
        <Text style={styles.value}>{rounded}</Text>
        <Text style={[styles.unit, { color: barColor }]}>
          {meta?.unitOverride ?? value.unit}
        </Text>
      </View>

      {/* Mini barra de progreso del sensor */}
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
    borderRadius: 12,
    padding: 14,
    minHeight: 100,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  icon: {
    fontSize: 14,
  },
  name: {
    color: Colors.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginVertical: 4,
  },
  value: {
    color: Colors.text,
    fontSize: 26,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  unit: {
    fontSize: 12,
    fontWeight: "800",
  },
  progressBarBg: {
    height: 4,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 4,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
  },
});
