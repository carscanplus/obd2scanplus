import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { Colors } from "@/constants/colors";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.text,
          headerTitleStyle: { fontWeight: "800", fontSize: 17 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: "OBD2 Auto" }} />
        <Stack.Screen name="connection" options={{ title: "Conexión Bluetooth" }} />
        <Stack.Screen name="dtcs" options={{ title: "Diagnóstico DTC" }} />
      </Stack>
    </>
  );
}
