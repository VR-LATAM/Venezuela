// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Destinos favoritos y conductores favoritos del pasajero
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  SafeAreaView, Alert, ActivityIndicator, Modal, TextInput, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { BRAND_COLORS } from '@vride/shared';
import {
  favoritesService, FavoriteDestination, FavoriteDriver,
} from '../../src/services/favoritesService';

const ICONS = ['🏠', '🏥', '💊', '🏢', '⛪', '🛒', '🏋️', '📍'];

type Tab = 'destinations' | 'drivers';

export default function FavoritesScreen() {
  const [tab, setTab]                   = useState<Tab>('destinations');
  const [destinations, setDestinations] = useState<FavoriteDestination[]>([]);
  const [drivers, setDrivers]           = useState<FavoriteDriver[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Add destination form
  const [newName, setNewName]       = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newIcon, setNewIcon]       = useState('📍');
  const [saving, setSaving]         = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dests, drvs] = await Promise.all([
        favoritesService.getDestinations(),
        favoritesService.getFavoriteDrivers(),
      ]);
      setDestinations(dests);
      setDrivers(drvs);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los favoritos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDeleteDest = (id: string, name: string) => {
    Alert.alert('Eliminar favorito', `¿Eliminar "${name}" de favoritos?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          await favoritesService.deleteDestination(id);
          setDestinations(prev => prev.filter(d => d.id !== id));
        },
      },
    ]);
  };

  const handleDeleteDriver = (driverId: string, name: string) => {
    Alert.alert('Eliminar conductor favorito', `¿Eliminar a ${name} de favoritos?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          await favoritesService.removeFavoriteDriver(driverId);
          setDrivers(prev => prev.filter(d => d.driver_id !== driverId));
        },
      },
    ]);
  };

  const handleSaveDest = async () => {
    if (!newName.trim() || !newAddress.trim()) {
      Alert.alert('Requerido', 'Por favor ingresa un nombre y una dirección');
      return;
    }
    setSaving(true);
    try {
      // For demo — in production this would geocode the address via Google Places
      const dest = await favoritesService.upsertDestination({
        name: newName.trim(), address: newAddress.trim(),
        lat: 0, lng: 0, icon: newIcon,
      });
      setDestinations(prev => [dest, ...prev.filter(d => d.name !== dest.name)]);
      setShowAddModal(false);
      setNewName(''); setNewAddress(''); setNewIcon('📍');
    } catch {
      Alert.alert('Error', 'No se pudo guardar el destino');
    } finally {
      setSaving(false);
    }
  };

  const renderDestination = ({ item }: { item: FavoriteDestination }) => (
    <View style={styles.card}>
      <Text style={styles.cardIcon}>{item.icon}</Text>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardSub} numberOfLines={1}>{item.address}</Text>
        {item.use_count > 0 && (
          <Text style={styles.cardMeta}>Usado {item.use_count} {item.use_count !== 1 ? 'veces' : 'vez'}</Text>
        )}
      </View>
      <TouchableOpacity onPress={() => handleDeleteDest(item.id, item.name)} style={styles.deleteBtn}>
        <Text style={styles.deleteBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDriver = ({ item }: { item: FavoriteDriver }) => (
    <View style={styles.card}>
      <View style={styles.driverAvatar}>
        <Text style={{ fontSize: 22 }}>🧑</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{item.driver_name}</Text>
        <Text style={styles.cardSub}>{item.driver_vehicle}</Text>
        <Text style={styles.cardMeta}>⭐ {Number(item.driver_rating ?? 0).toFixed(1)}</Text>
      </View>
      <TouchableOpacity
        onPress={() => handleDeleteDriver(item.driver_id, item.driver_name)}
        style={styles.deleteBtn}
      >
        <Text style={styles.deleteBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Favoritos</Text>
        {tab === 'destinations' && (
          <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addBtn}>
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'destinations' && styles.tabActive]}
          onPress={() => setTab('destinations')}
        >
          <Text style={[styles.tabText, tab === 'destinations' && styles.tabTextActive]}>
            📍 Lugares
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'drivers' && styles.tabActive]}
          onPress={() => setTab('drivers')}
        >
          <Text style={[styles.tabText, tab === 'drivers' && styles.tabTextActive]}>
            🧑 Conductores
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={BRAND_COLORS.PRIMARY} style={{ marginTop: 40 }} />
      ) : tab === 'destinations' ? (
        <FlatList
          data={destinations}
          keyExtractor={i => i.id}
          renderItem={renderDestination}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📍</Text>
              <Text style={styles.emptyText}>Aún no hay lugares guardados.</Text>
              <Text style={styles.emptyMeta}>Toca + para agregar casa, clínica, farmacia…</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={drivers}
          keyExtractor={i => i.id}
          renderItem={renderDriver}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🧑</Text>
              <Text style={styles.emptyText}>Aún no hay conductores favoritos.</Text>
              <Text style={styles.emptyMeta}>Después de un buen viaje, puedes guardar al conductor como favorito.</Text>
            </View>
          }
        />
      )}

      {/* Add Destination Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Agregar lugar favorito</Text>

            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Casa, Clínica, Farmacia"
              value={newName}
              onChangeText={setNewName}
              maxLength={50}
            />

            <Text style={styles.label}>Dirección</Text>
            <TextInput
              style={styles.input}
              placeholder="Dirección completa"
              value={newAddress}
              onChangeText={setNewAddress}
              multiline
            />

            <Text style={styles.label}>Ícono</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconRow}>
              {ICONS.map(icon => (
                <TouchableOpacity
                  key={icon}
                  style={[styles.iconBtn, newIcon === icon && styles.iconBtnActive]}
                  onPress={() => setNewIcon(icon)}
                >
                  <Text style={styles.iconBtnText}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={[styles.modalBtn, styles.modalBtnCancel]}
              >
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveDest}
                style={[styles.modalBtn, styles.modalBtnSave]}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalBtnSaveText}>Guardar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F8FAFC', paddingTop: 24 },
  header:       { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn:      { padding: 4, marginRight: 8 },
  backBtnText:  { fontSize: 28, color: BRAND_COLORS.PRIMARY, lineHeight: 32 },
  headerTitle:  { flex: 1, fontSize: 20, fontWeight: '700', color: '#1E293B' },
  addBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: BRAND_COLORS.PRIMARY, alignItems: 'center', justifyContent: 'center' },
  addBtnText:   { color: '#fff', fontSize: 22, lineHeight: 26 },
  tabs:         { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tab:          { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive:    { borderBottomWidth: 2, borderBottomColor: BRAND_COLORS.PRIMARY },
  tabText:      { fontSize: 15, color: '#64748B', fontWeight: '500' },
  tabTextActive:{ color: BRAND_COLORS.PRIMARY, fontWeight: '700' },
  list:         { padding: 16, gap: 10 },
  card:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  cardIcon:     { fontSize: 28, marginRight: 12 },
  driverAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardInfo:     { flex: 1 },
  cardTitle:    { fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 2 },
  cardSub:      { fontSize: 13, color: '#64748B', marginBottom: 2 },
  cardMeta:     { fontSize: 12, color: '#94A3B8' },
  deleteBtn:    { padding: 8 },
  deleteBtnText:{ fontSize: 18, color: '#CBD5E1' },
  empty:        { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyIcon:    { fontSize: 48, marginBottom: 4 },
  emptyText:    { fontSize: 17, fontWeight: '600', color: '#334155' },
  emptyMeta:    { fontSize: 14, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 32 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet:   { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle:   { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 20 },
  label:        { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6, marginTop: 12 },
  input:        { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, fontSize: 15, color: '#1E293B', backgroundColor: '#F8FAFC' },
  iconRow:      { marginTop: 8, marginBottom: 4 },
  iconBtn:      { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9', marginRight: 8 },
  iconBtnActive:{ backgroundColor: '#DBEAFE', borderWidth: 2, borderColor: BRAND_COLORS.PRIMARY },
  iconBtnText:  { fontSize: 24 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  modalBtn:     { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalBtnCancel:     { backgroundColor: '#F1F5F9' },
  modalBtnCancelText: { color: '#475569', fontWeight: '600', fontSize: 16 },
  modalBtnSave:       { backgroundColor: BRAND_COLORS.PRIMARY },
  modalBtnSaveText:   { color: '#fff', fontWeight: '700', fontSize: 16 },
});
