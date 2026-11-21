import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { Link, usePathname } from "expo-router";
import { Colors } from "@/constants/colors";

interface NavBarProps {
  onCheckUpdate?: () => void;
  hasUpdate?: boolean;
  checkingUpdate?: boolean;
}

export function NavBar({ onCheckUpdate, hasUpdate, checkingUpdate }: NavBarProps) {
  const pathname = usePathname();

  const isHome = pathname === "/" || pathname === "/index";
  const isDtcs = pathname === "/dtcs";
  const isConnection = pathname === "/connection";

  return (
    <View style={styles.nav}>
      <Link href="/" asChild>
        <Pressable style={[styles.tab, isHome && styles.tabActive]}>
          <Text style={styles.tabIcon}>📊</Text>
          <Text style={[styles.tabText, isHome && styles.tabTextActive]}>DASHBOARD</Text>
        </Pressable>
      </Link>

      <Link href="/dtcs" asChild>
        <Pressable style={[styles.tab, isDtcs && styles.tabActive]}>
          <Text style={styles.tabIcon}>🔍</Text>
          <Text style={[styles.tabText, isDtcs && styles.tabTextActive]}>CÓDIGOS</Text>
        </Pressable>
      </Link>

      <Link href="/connection" asChild>
        <Pressable style={[styles.tab, isConnection && styles.tabActive]}>
          <Text style={styles.tabIcon}>📡</Text>
          <Text style={[styles.tabText, isConnection && styles.tabTextActive]}>CONEXIÓN</Text>
        </Pressable>
      </Link>

      {onCheckUpdate ? (
        <Pressable
          style={[styles.tab, hasUpdate && styles.tabUpdate]}
          onPress={onCheckUpdate}
          disabled={checkingUpdate}
        >
          <Text style={styles.tabIcon}>{hasUpdate ? "★" : "🔄"}</Text>
          <Text style={[styles.tabText, hasUpdate && styles.tabTextUpdate]}>
            {checkingUpdate ? "BUSCANDO..." : hasUpdate ? "NUEVA VER" : "ACTUALIZAR"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: "transparent",
  },
  tabActive: {
    backgroundColor: "rgba(0, 210, 255, 0.12)",
    borderColor: Colors.accent,
  },
  tabUpdate: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  tabIcon: {
    fontSize: 14,
    marginBottom: 2,
  },
  tabText: {
    color: Colors.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: Colors.accent,
  },
  tabTextUpdate: {
    color: Colors.background,
    fontWeight: "900",
  },
});
