import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { Link, usePathname } from "expo-router";
import { Colors } from "@/constants/colors";

export function NavBar() {
  const pathname = usePathname();

  const isHome = pathname === "/" || pathname === "/index";
  const isDtcs = pathname === "/dtcs";
  const isConnection = pathname === "/connection";

  return (
    <View style={styles.nav}>
      <Link href="/" asChild>
        <Pressable style={[styles.tab, isHome && styles.tabActive]}>
          <Text style={[styles.tabIcon, !isHome && styles.tabIconInactive]}>📊</Text>
          <Text style={[styles.tabText, isHome && styles.tabTextActive]}>Dashboard</Text>
        </Pressable>
      </Link>

      <Link href="/dtcs" asChild>
        <Pressable style={[styles.tab, isDtcs && styles.tabActive]}>
          <Text style={[styles.tabIcon, !isDtcs && styles.tabIconInactive]}>🔍</Text>
          <Text style={[styles.tabText, isDtcs && styles.tabTextActive]}>Códigos</Text>
        </Pressable>
      </Link>

      <Link href="/connection" asChild>
        <Pressable style={[styles.tab, isConnection && styles.tabActive]}>
          <Text style={[styles.tabIcon, !isConnection && styles.tabIconInactive]}>📡</Text>
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
  tabIcon: {
    fontSize: 13,
  },
  tabIconInactive: {
    opacity: 0.55,
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
