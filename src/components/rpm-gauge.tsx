import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";

interface RpmGaugeProps {
  rpm: number;
  speed: number;
}

export function RpmGauge({ rpm, speed }: RpmGaugeProps) {
  const maxRpm = 7000;
  const clampedRpm = Math.min(Math.max(rpm, 0), maxRpm);
  const percentage = (clampedRpm / maxRpm) * 100;

  // Determinar color de las RPM
  let rpmColor = Colors.rpmLow;
  if (clampedRpm > 5500) {
    rpmColor = Colors.rpmHigh;
  } else if (clampedRpm > 3500) {
    rpmColor = Colors.rpmMid;
  }

  // Segmentos de la barra de revoluciones (14 segmentos estilo panel digital)
  const totalSegments = 14;
  const activeSegments = Math.round((clampedRpm / maxRpm) * totalSegments);

  return (
    <View style={styles.container}>
      {/* Barra de revoluciones LED segmentada */}
      <View style={styles.segmentBar}>
        {Array.from({ length: totalSegments }).map((_, i) => {
          const isActive = i < activeSegments;
          let segmentColor = Colors.surfaceAlt;
          if (isActive) {
            if (i >= 11) segmentColor = Colors.rpmHigh;
            else if (i >= 7) segmentColor = Colors.rpmMid;
            else segmentColor = Colors.rpmLow;
          }
          return (
            <View
              key={i}
              style={[
                styles.segment,
                { backgroundColor: segmentColor },
                isActive && styles.activeSegmentGlow,
              ]}
            />
          );
        })}
      </View>

      {/* Números principales */}
      <View style={styles.cluster}>
        {/* Lado izquierdo: Tacómetro */}
        <View style={styles.meterBox}>
          <Text style={styles.meterLabel}>MOTOR</Text>
          <Text style={[styles.rpmValue, { color: rpmColor }]}>
            {clampedRpm.toLocaleString()}
          </Text>
          <Text style={styles.meterUnit}>RPM</Text>
          {clampedRpm > 5500 && (
            <View style={styles.redlineBadge}>
              <Text style={styles.redlineText}>REDLINE</Text>
            </View>
          )}
        </View>

        {/* Separador vertical */}
        <View style={styles.divider} />

        {/* Lado derecho: Velocímetro */}
        <View style={styles.meterBox}>
          <Text style={styles.meterLabel}>VELOCIDAD</Text>
          <Text style={styles.speedValue}>{Math.round(speed)}</Text>
          <Text style={styles.meterUnit}>KM / H</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  segmentBar: {
    flexDirection: "row",
    gap: 4,
    height: 10,
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  segment: {
    flex: 1,
    height: "100%",
    borderRadius: 3,
  },
  activeSegmentGlow: {
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  cluster: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  meterBox: {
    flex: 1,
    alignItems: "center",
  },
  meterLabel: {
    color: Colors.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  rpmValue: {
    fontSize: 38,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.5,
  },
  speedValue: {
    color: Colors.text,
    fontSize: 38,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.5,
  },
  meterUnit: {
    color: Colors.accent,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 50,
    backgroundColor: Colors.border,
  },
  redlineBadge: {
    backgroundColor: Colors.danger,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  redlineText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
