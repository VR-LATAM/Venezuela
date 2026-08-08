// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// LicenseScanner — escanea el código de barras PDF417 del dorso
// de una licencia de conducir de EE.UU. y devuelve los datos
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { BRAND_COLORS } from '@vride/shared';
import { parseAAMVA, AAMVAData } from '../../utils/aamvaParser';

interface Props {
  visible: boolean;
  onScanned: (data: AAMVAData) => void;
  onClose: () => void;
}

export default function LicenseScanner({ visible, onScanned, onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleBarCode = ({ data }: BarcodeScanningResult) => {
    if (scanned) return;
    setScanned(true);

    const parsed = parseAAMVA(data);
    if (!parsed || !parsed.licenseNumber) {
      setError('No se pudo leer el código de barras. Asegúrate de escanear el dorso de la licencia de conducir.');
      setTimeout(() => { setScanned(false); setError(null); }, 3000);
      return;
    }

    onScanned(parsed);
  };

  if (!permission) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Escanear Licencia</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Instrucciones */}
        <View style={styles.instructions}>
          <Text style={styles.instructionsText}>
            📋  Apunta la cámara al <Text style={styles.bold}>dorso</Text> de tu licencia de conducir.{'\n'}
            Centra el código de barras PDF417 (el código ancho) en el marco.
          </Text>
        </View>

        {/* Cámara */}
        {!permission.granted ? (
          <View style={styles.permissionBox}>
            <Text style={styles.permissionText}>Se necesita acceso a la cámara para escanear el código de barras.</Text>
            <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
              <Text style={styles.permissionBtnText}>Permitir acceso</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['pdf417'] }}
              onBarcodeScanned={scanned ? undefined : handleBarCode}
            />
            {/* Marco de escaneo */}
            <View style={styles.overlay}>
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
            </View>

            {scanned && !error && (
              <View style={styles.scanningOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.scanningText}>Leyendo datos…</Text>
              </View>
            )}

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelText}>Cancelar — ingresar datos manualmente</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const CORNER_SIZE = 24;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#000' },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, backgroundColor: '#111' },
  title:       { fontSize: 18, fontWeight: '700', color: '#fff', fontFamily: 'Inter_700Bold' },
  closeBtn:    { padding: 8 },
  closeText:   { fontSize: 22, color: '#aaa' },

  instructions:     { backgroundColor: '#1a1a1a', paddingHorizontal: 20, paddingVertical: 14 },
  instructionsText: { fontSize: 14, color: '#ccc', lineHeight: 20, fontFamily: 'Inter_400Regular' },
  bold:             { fontWeight: '700', color: '#fff' },

  cameraContainer: { flex: 1, position: 'relative' },
  camera:          { flex: 1 },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: '85%',
    height: 160,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: BRAND_COLORS.PRIMARY,
  },
  topLeft:     { top: 0, left: 0, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH },
  topRight:    { top: 0, right: 0, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH },
  bottomLeft:  { bottom: 0, left: 0, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH },

  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  scanningText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_500Medium' },

  errorBanner: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    padding: 14,
  },
  errorText: { color: '#fff', fontSize: 14, textAlign: 'center', fontFamily: 'Inter_400Regular' },

  permissionBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  permissionText: { color: '#ccc', fontSize: 16, textAlign: 'center', fontFamily: 'Inter_400Regular' },
  permissionBtn:  { backgroundColor: BRAND_COLORS.PRIMARY, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  permissionBtnText: { color: '#fff', fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  cancelBtn:  { padding: 20, alignItems: 'center', backgroundColor: '#111' },
  cancelText: { color: '#888', fontSize: 15, fontFamily: 'Inter_400Regular', textDecorationLine: 'underline' },
});
