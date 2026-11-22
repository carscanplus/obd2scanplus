import React from "react";
import { StyleSheet, View } from "react-native";
import { Colors } from "@/constants/colors";

const TICKS = 48;
const START_ANGLE = -135;
const SWEEP = 270;
const REDLINE_RPM = 5500;
const AMBER_RPM = 3500;

interface RpmRingProps {
  rpm: number;
  maxRpm?: number;
  size: number;
  children?: React.ReactNode;
}

export function RpmRing({ rpm, maxRpm = 7000, size, children }: RpmRingProps) {
  const clampedRpm = Math.min(Math.max(rpm, 0), maxRpm);
  const tickSize = Math.round(size * 0.04);
  const tickLength = Math.round(size * 0.07);
  const inset = Math.round(size * 0.05);
  const innerSize = Math.round(size * 0.7);

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      {Array.from({ length: TICKS }).map((_, i) => {
        const fraction = i / (TICKS - 1);
        const tickRpm = fraction * maxRpm;
        const isActive = tickRpm <= clampedRpm;

        let color = Colors.brandDial;
        if (isActive) {
          if (tickRpm >= REDLINE_RPM) color = Colors.brandRed;
          else if (tickRpm >= AMBER_RPM) color = Colors.brandAmber;
          else color = Colors.brandOrange;
        }

        return (
          <View
            key={i}
            style={[
              StyleSheet.absoluteFill,
              { transform: [{ rotate: `${START_ANGLE + SWEEP * fraction}deg` }] },
            ]}
          >
            <View
              style={{
                position: "absolute",
                top: inset,
                left: size / 2 - tickSize / 2,
                width: tickSize,
                height: tickLength,
                borderRadius: tickSize / 2,
                backgroundColor: color,
                opacity: isActive ? 1 : 0.9,
              }}
            />
          </View>
        );
      })}

      <View
        style={[
          styles.core,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  core: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.brandCarbon,
    borderWidth: 1,
    borderColor: "rgba(255, 87, 34, 0.3)",
  },
});
