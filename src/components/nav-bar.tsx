import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { Link, usePathname } from "expo-router";
import Svg, { Path, Rect } from "react-native-svg";
import { Colors } from "@/constants/colors";

type IconName = "dashboard" | "codes" | "connection";

function TabIcon({ name, color }: { name: IconName; color: string }) {
  const common = { fill: "none", stroke: color, strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  if (name === "dashboard") {
    return (
      <Svg width={15} height={15} viewBox="0 0 24 24">
        <Rect x={4} y={12} width={3.5} height={8} rx={1} {...common} />
        <Rect x={10.25} y={7} width={3.5} height={13} rx={1} {...common} />
        <Rect x={16.5} y={3} width={3.5} height={17} rx={1} {...common} />
      </Svg>
    );
  }

  if (name === "codes") {
    return (
      <Svg width={15} height={15} viewBox="0 0 24 24">
        <Path d="M21 21l-4.35-4.35M16.65 11a5.65 5.65 0 11-11.3 0 5.65 5.65 0 0111.3 0z" {...common} />
      </Svg>
    );
  }

  return (
    <Svg width={15} height={15} viewBox="0 0 24 24">
      <Path d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" {...common} />
    </Svg>
  );
}

export function NavBar() {
  const pathname = usePathname();

  const isHome = pathname === "/" || pathname === "/index";
  const isDtcs = pathname === "/dtcs";
  const isConnection = pathname === "/connection";

  return (
    <View style={styles.nav}>
      <Link href="/" asChild>
        <Pressable style={[styles.tab, isHome && styles.tabActive]}>
          <TabIcon name="dashboard" color={isHome ? Colors.brandOrange : Colors.muted} />
          <Text style={[styles.tabText, isHome && styles.tabTextActive]}>Dashboard</Text>
        </Pressable>
      </Link>

      <Link href="/dtcs" asChild>
        <Pressable style={[styles.tab, isDtcs && styles.tabActive]}>
          <TabIcon name="codes" color={isDtcs ? Colors.brandOrange : Colors.muted} />
          <Text style={[styles.tabText, isDtcs && styles.tabTextActive]}>Códigos</Text>
        </Pressable>
      </Link>

      <Link href="/connection" asChild>
        <Pressable style={[styles.tab, isConnection && styles.tabActive]}>
          <TabIcon name="connection" color={isConnection ? Colors.brandOrange : Colors.muted} />
          <Text style={[styles.tabText, isConnection && styles.tabTextActive]}>Conexión</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: "row",
    backgroundColor: "#08090c",
    borderWidth: 1,
    borderColor: "#272e3b",
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  tabActive: {
    backgroundColor: "rgba(255, 87, 34, 0.16)",
    borderColor: "rgba(255, 87, 34, 0.6)",
    shadowColor: Colors.brandOrange,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  tabText: {
    color: Colors.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: Colors.text,
    fontWeight: "900",
  },
});
