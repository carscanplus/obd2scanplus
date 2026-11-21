import React from "react";
import { Modal, StyleSheet, Text, View, Pressable, ScrollView } from "react-native";
import { Colors } from "@/constants/colors";
import { downloadAndInstallUpdate, UpdateInfo } from "@/services/updater";

interface UpdateModalProps {
  visible: boolean;
  onClose: () => void;
  updateInfo: UpdateInfo | null;
}

export function UpdateModal({ visible, onClose, updateInfo }: UpdateModalProps) {
  if (!updateInfo) return null;

  const hasUpdate = updateInfo.hasUpdate;

  const handleUpdatePress = async () => {
    if (updateInfo.downloadUrl) {
      await downloadAndInstallUpdate(updateInfo.downloadUrl);
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.badge}>
              {hasUpdate ? "ACTUALIZACIÓN DISPONIBLE" : "SISTEMA ACTUALIZADO"}
            </Text>
            <Text style={styles.title}>
              {hasUpdate ? updateInfo.latestVersion : `v${updateInfo.currentVersion}`}
            </Text>
            <Text style={styles.versionSub}>
              {hasUpdate
                ? `Versión actual instalada: v${updateInfo.currentVersion}`
                : "Ya tienes la última versión instalada"}
            </Text>
          </View>

          {hasUpdate && updateInfo.releaseNotes ? (
            <ScrollView style={styles.notesContainer}>
              <Text style={styles.notesTitle}>Novedades:</Text>
              <Text style={styles.notesText}>{updateInfo.releaseNotes}</Text>
            </ScrollView>
          ) : null}

          <View style={styles.actions}>
            {hasUpdate ? (
              <Pressable style={styles.primaryButton} onPress={handleUpdatePress}>
                <Text style={styles.primaryText}>DESCARGAR E INSTALAR</Text>
              </Pressable>
            ) : null}

            <Pressable style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryText}>{hasUpdate ? "MÁS TARDE" : "ENTENDIDO"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    alignItems: "center",
    marginBottom: 16,
  },
  badge: {
    color: Colors.accent,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 6,
  },
  title: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  versionSub: {
    color: Colors.muted,
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
  },
  notesContainer: {
    maxHeight: 160,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  notesTitle: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  notesText: {
    color: Colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  actions: {
    gap: 10,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryText: {
    color: Colors.background,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  secondaryButton: {
    backgroundColor: Colors.surfaceAlt,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
});
