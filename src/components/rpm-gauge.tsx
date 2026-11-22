import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";
import { RpmRing } from "@/components/rpm-ring";

interface RpmGaugeProps {
  rpm: number;
  speed: number;
}

const REDLINE_RPM = 5500;

export function RpmGauge({ rpm, speed }: RpmGaugeProps) {
  const isRedline = rpm > REDLINE_RPM;

  return (
    <View style={styles.container}>
      <RpmRing rpm={rpm} size={230}>
        <Text style={styles.speedValue}>{Math.round(speed)}</Text>
        <Text style={styles.speedUnit}>KM/H</Text>
      </RpmRing>

      <View style={styles.rpmRow}>
        <Text style={[styles.rpmValue, isRedline && styles.rpmValueRedline]}>
          {Math.round(rpm).toLocaleString()}
        </Text>
        <Text style={styles.rpmUnit}>RPM</Text>
      </View>

      {isRedline && (
        <View style={styles.redlineBadge}>
          <Text style={styles.redlineText}>REDLINE</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 8,
  },
  speedValue: {
    color: Colors.text,
    fontSize: 52,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    letterSpacing: -1,
  },
  speedUnit: {
    color: Colors.brandOrange,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginTop: -2,
  },
  rpmRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: 12,
  },
  rpmValue: {
    color: Colors.text,
    fontSize: 26,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  rpmValueRedline: {
    color: Colors.brandRed,
  },
  rpmUnit: {
    color: Colors.brandOrange,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  redlineBadge: {
    backgroundColor: Colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 8,
  },
  redlineText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
});
