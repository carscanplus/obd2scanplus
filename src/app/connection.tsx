import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { NavBar } from "@/components/nav-bar";
import { Colors } from "@/constants/colors";
import { useObdStore } from "@/store/useObdStore";
import {
    cancelClassicDiscovery,
    DiscoveredDevice,
    isObdLikeDevice,
    listSppDevices,
    scanBleDevices,
    startClassicDiscovery,
} from "@/transport/discovery";

function mergeDevice(
  list: DiscoveredDevice[],
  device: DiscoveredDevice,
): DiscoveredDevice[] {
  return list.some((item) => item.id === device.id) ? list : [...list, device];
}

/** Deja primero los dispositivos que parecen adaptadores OBD-II. */
function sortDevices(list: DiscoveredDevice[]): DiscoveredDevice[] {
  return [...list].sort((a, b) => {
    const aObd = isObdLikeDevice(a.name) ? 0 : 1;
    const bObd = isObdLikeDevice(b.name) ? 0 : 1;
    return aObd - bObd || a.name.localeCompare(b.name);
  });
}

export default function ConnectionScreen() {
  const status = useObdStore((s) => s.status);
  const connectionMessage = useObdStore((s) => s.connectionMessage);
  const connectSpp = useObdStore((s) => s.connectSpp);
  const connectBle = useObdStore((s) => s.connectBle);
  const disconnect = useObdStore((s) => s.disconnect);

  const [sppDevices, setSppDevices] = useState<DiscoveredDevice[]>([]);
  const [bleDevices, setBleDevices] = useState<DiscoveredDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const bleScanRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (Platform.OS === "android") {
      listSppDevices()
        .then((devices) => {
          if (!cancelled) setSppDevices(devices);
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            setSppDevices([]);
            setScanError(
              error instanceof Error ? error.message : String(error),
            );
          }
        });
    }

    return () => {
      cancelled = true;
      bleScanRef.current?.stop();
      cancelClassicDiscovery();
    };
  }, []);

  const stopAllScanning = () => {
    if (bleScanRef.current) {
      bleScanRef.current.stop();
      bleScanRef.current = null;
    }
    setScanning(false);
    cancelClassicDiscovery();
    setDiscovering(false);
  };

  const startBleScan = () => {
    stopAllScanning();
    setBleDevices([]);
    setScanError(null);
    setScanning(true);
    bleScanRef.current = scanBleDevices(
      (device) => {
        setBleDevices((prev) => mergeDevice(prev, device));
      },
      5,
      (message) => {
        setScanError(message);
      },
    );
    setTimeout(() => {
      setScanning(false);
      bleScanRef.current = null;
    }, 5500);
  };

  const startClassicScan = async () => {
    if (discovering) return;
    stopAllScanning();
    setDiscovering(true);
    setScanError(null);
    try {
      await startClassicDiscovery((device) => {
        setSppDevices((prev) => mergeDevice(prev, device));
      });
    } catch (error) {
      setScanError(error instanceof Error ? error.message : String(error));
    } finally {
      setDiscovering(false);
    }
  };

  const handleConnectBle = async (id: string, name: string) => {
    stopAllScanning();
    setConnectingId(id);
    try {
      await connectBle(id, name);
    } finally {
      setConnectingId(null);
    }
  };

  const handleConnectSpp = async (id: string, name: string) => {
    stopAllScanning();
    setConnectingId(id);
    try {
      await connectSpp(id, name);
    } finally {
      setConnectingId(null);
    }
  };

  const isConnecting = status === "connecting";
  const connected = status === "connected" || isConnecting;

  return (
    <View style={styles.container}>
      <NavBar />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>{connectionMessage}</Text>
          {connected && (
            <Pressable
              style={styles.disconnectButton}
              onPress={() => void disconnect()}
            >
              <Text style={styles.disconnectText}>DESCONECTAR</Text>
            </Pressable>
          )}
        </View>

      {Platform.OS === "android" && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>BLUETOOTH CLÁSICO (SPP)</Text>
            <Pressable
              style={styles.scanButton}
              onPress={() => void startClassicScan()}
              disabled={discovering}
            >
              <Text style={styles.scanText}>
                {discovering ? "BUSCANDO..." : "BUSCAR"}
              </Text>
            </Pressable>
          </View>
          {scanError ? (
            <Text style={styles.sectionError}>{scanError}</Text>
          ) : null}
          {sppDevices.length === 0 ? (
            <Text style={styles.sectionHint}>
              {discovering
                ? "Buscando dispositivos cercanos. El adaptador ELM327 debe estar encendido y visible."
                : 'No hay dispositivos. Pulsa "Buscar", activa la ubicación del sistema y, si no aparece, vincula el ELM327 en Ajustes de Bluetooth.'}
            </Text>
          ) : (
            sortDevices(sppDevices).map((item) => {
              const thisConnecting = isConnecting && connectingId === item.id;
              return (
                <Pressable
                  key={item.id}
                  style={[styles.device, thisConnecting && styles.deviceConnecting]}
                  onPress={() => void handleConnectSpp(item.id, item.name)}
                  disabled={isConnecting}
                >
                  <View style={styles.deviceHeader}>
                    <Text style={styles.deviceName}>{item.name}</Text>
                    {thisConnecting && (
                      <ActivityIndicator size="small" color={Colors.accent} />
                    )}
                    {isObdLikeDevice(item.name) && (
                      <View style={styles.obdBadge}>
                        <Text style={styles.obdBadgeText}>OBD</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.deviceId}>
                    {thisConnecting ? "Conectando e inicializando..." : item.id}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>BLUETOOTH LE (BLE)</Text>
          <Pressable
            style={styles.scanButton}
            onPress={startBleScan}
            disabled={scanning || isConnecting}
          >
            <Text style={styles.scanText}>
              {scanning ? "ESCANEANDO..." : "ESCANEAR"}
            </Text>
          </Pressable>
        </View>
        {bleDevices.length === 0 ? (
          <Text style={styles.sectionHint}>
            {scanning
              ? "Buscando dispositivos..."
              : 'Pulsa "Escanear" y elige tu adaptador BLE (por ejemplo "V011", servicio FFE0).'}
          </Text>
        ) : (
          sortDevices(bleDevices).map((item) => {
            const thisConnecting = isConnecting && connectingId === item.id;
            return (
              <Pressable
                key={item.id}
                style={[styles.device, thisConnecting && styles.deviceConnecting]}
                onPress={() => void handleConnectBle(item.id, item.name)}
                disabled={isConnecting}
              >
                <View style={styles.deviceHeader}>
                  <Text style={styles.deviceName}>{item.name}</Text>
                  {thisConnecting && (
                    <ActivityIndicator size="small" color={Colors.accent} />
                  )}
                  {isObdLikeDevice(item.name) && (
                    <View style={styles.obdBadge}>
                      <Text style={styles.obdBadgeText}>OBD</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.deviceId}>
                  {thisConnecting ? "Conectando e inicializando..." : item.id}
                </Text>
              </Pressable>
            );
          })
        )}
      </View>
    </ScrollView>
  </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    gap: 20,
    paddingBottom: 40,
  },
  statusBox: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusText: {
    color: Colors.text,
    fontSize: 14,
    flex: 1,
  },
  disconnectButton: {
    backgroundColor: Colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  disconnectText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: Colors.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  sectionHint: {
    color: Colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  sectionError: {
    color: Colors.danger,
    fontSize: 13,
    lineHeight: 19,
  },
  scanButton: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  scanText: {
    color: Colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },
  device: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  deviceConnecting: {
    borderColor: Colors.accent,
    backgroundColor: Colors.surfaceAlt,
  },
  deviceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  obdBadge: {
    backgroundColor: Colors.accent,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  obdBadgeText: {
    color: Colors.background,
    fontSize: 10,
    fontWeight: "800",
  },
  deviceName: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  deviceId: {
    color: Colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
});
