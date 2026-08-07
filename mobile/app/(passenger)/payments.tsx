// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Pantalla de métodos de pago del pasajero
// Lista tarjetas guardadas, agrega nuevas vía Stripe SetupIntent
// Gestión de tarjeta por defecto y eliminación
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  FlatList, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useStripe } from '@stripe/stripe-react-native';
import * as Haptics from 'expo-haptics';
import { paymentService, SavedCard } from '../../src/services/paymentService';
import { BRAND_COLORS } from '@vride/shared';

// Íconos de marca por texto
const CARD_BRAND_LABEL: Record<string, string> = {
  visa:       'VISA',
  mastercard: 'Mastercard',
  amex:       'Amex',
  discover:   'Discover',
  jcb:        'JCB',
  unionpay:   'UnionPay',
};

export default function PaymentsScreen() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [cards, setCards]                 = useState<SavedCard[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [isAdding, setIsAdding]           = useState(false);
  const [deletingId, setDeletingId]       = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  const loadCards = useCallback(async () => {
    try {
      const list = await paymentService.listCards();
      setCards(list);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los métodos de pago.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadCards(); }, [loadCards]);

  // ─────────────────────────────────────
  // AGREGAR TARJETA — Stripe SetupIntent
  // ─────────────────────────────────────
  const handleAddCard = async () => {
    setIsAdding(true);
    try {
      // 1. Crear SetupIntent en el backend
      const { clientSecret, setupIntentId } = await paymentService.createSetupIntent();

      // 2. Inicializar el PaymentSheet de Stripe
      const { error: initError } = await initPaymentSheet({
        setupIntentClientSecret: clientSecret,
        merchantDisplayName:     'V-Ride',
        style:                   'alwaysLight',
        appearance: {
          colors: {
            primary:    BRAND_COLORS.PRIMARY,
            background: '#FFFFFF',
            componentBackground: '#F8F9FA',
          },
        },
      });

      if (initError) {
        Alert.alert('Error', initError.message);
        return;
      }

      // 3. Presentar la hoja de pago de Stripe — el usuario ingresa su tarjeta
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code !== 'Canceled') {
          Alert.alert('Error', presentError.message);
        }
        return;
      }

      // 4. El SetupIntent fue confirmado en Stripe.
      //    El backend recupera el PaymentMethod confirmado y lo guarda en la BD.
      const savedCard = await paymentService.confirmSetup(setupIntentId);
      setCards(prev => {
        const withoutDefault = prev.map(c => ({ ...c, is_default: false }));
        return savedCard.is_default
          ? [savedCard, ...withoutDefault.filter(c => c.id !== savedCard.id)]
          : [...withoutDefault, savedCard];
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Listo', 'Tarjeta agregada correctamente.');
    } catch {
      Alert.alert('Error', 'No se pudo agregar la tarjeta. Inténtalo de nuevo.');
    } finally {
      setIsAdding(false);
    }
  };

  // ─────────────────────────────────────
  // ELIMINAR TARJETA
  // ─────────────────────────────────────
  const handleDelete = (card: SavedCard) => {
    Alert.alert(
      'Eliminar tarjeta',
      `¿Eliminar ${CARD_BRAND_LABEL[card.brand] ?? card.brand} ···${card.last4}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(card.id);
            try {
              await paymentService.deleteCard(card.id);
              setCards(prev => prev.filter(c => c.id !== card.id));
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch {
              Alert.alert('Error', 'No se pudo eliminar la tarjeta.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  // ─────────────────────────────────────
  // CAMBIAR DEFAULT
  // ─────────────────────────────────────
  const handleSetDefault = async (card: SavedCard) => {
    if (card.is_default) return;
    setSettingDefaultId(card.id);
    try {
      await paymentService.setDefaultCard(card.id);
      setCards(prev => prev.map(c => ({ ...c, is_default: c.id === card.id })));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      Alert.alert('Error', 'No se pudo actualizar la tarjeta predeterminada.');
    } finally {
      setSettingDefaultId(null);
    }
  };

  const renderCard = ({ item }: { item: SavedCard }) => (
    <TouchableOpacity
      style={[styles.cardItem, item.is_default && styles.cardItemDefault]}
      onPress={() => handleSetDefault(item)}
      activeOpacity={0.7}
    >
      {/* Marca e ícono */}
      <View style={styles.cardLeft}>
        <View style={[styles.brandBadge, item.is_default && styles.brandBadgeDefault]}>
          <Text style={[styles.brandText, item.is_default && styles.brandTextDefault]}>
            {CARD_BRAND_LABEL[item.brand] ?? item.brand.toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={styles.cardNumber}>···· ···· ···· {item.last4}</Text>
          <Text style={styles.cardExpiry}>
            Vence {String(item.exp_month).padStart(2, '0')}/{item.exp_year}
          </Text>
        </View>
      </View>

      {/* Acciones */}
      <View style={styles.cardRight}>
        {item.is_default && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultBadgeText}>Predeterminada</Text>
          </View>
        )}
        {settingDefaultId === item.id ? (
          <ActivityIndicator size="small" color={BRAND_COLORS.PRIMARY} />
        ) : null}
        {!item.is_default && settingDefaultId !== item.id && (
          <Text style={styles.setDefaultHint}>Toca para usar como predeterminada</Text>
        )}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(item)}
          disabled={deletingId === item.id}
          accessibilityLabel={`Eliminar tarjeta ${item.last4}`}
          accessibilityRole="button"
        >
          {deletingId === item.id
            ? <ActivityIndicator size="small" color={BRAND_COLORS.ALERT} />
            : <Text style={styles.deleteBtnText}>✕</Text>
          }
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Métodos de pago</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BRAND_COLORS.PRIMARY} />
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={item => item.id}
          renderItem={renderCard}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>💳</Text>
              <Text style={styles.emptyTitle}>Sin tarjetas guardadas</Text>
              <Text style={styles.emptySubtitle}>
                Agrega una tarjeta para pagar tus viajes automáticamente
              </Text>
            </View>
          }
          ListFooterComponent={
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.addBtn, isAdding && styles.addBtnDisabled]}
                onPress={handleAddCard}
                disabled={isAdding}
                accessibilityRole="button"
                accessibilityLabel="Agregar nueva tarjeta"
              >
                {isAdding
                  ? <ActivityIndicator color="#fff" size="small" />
                  : (
                    <View style={styles.addBtnContent}>
                      <Text style={styles.addBtnIcon}>+</Text>
                      <Text style={styles.addBtnText}>Agregar tarjeta</Text>
                    </View>
                  )
                }
              </TouchableOpacity>
              <Text style={styles.secureNote}>
                🔒 Tus datos de pago son procesados de forma segura por Stripe. V-Ride nunca almacena los detalles de tu tarjeta.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
  },
  backBtnText: { fontSize: 22, color: BRAND_COLORS.TEXT },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: BRAND_COLORS.TEXT,
    fontFamily: 'Inter_700Bold',
  },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  list: { padding: 16, gap: 12 },

  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    minHeight: 72,
  },
  cardItemDefault: {
    backgroundColor: BRAND_COLORS.PRIMARY + '08',
    borderColor: BRAND_COLORS.PRIMARY,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  brandBadge: {
    backgroundColor: '#E8E8E8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 60,
    alignItems: 'center',
  },
  brandBadgeDefault: { backgroundColor: BRAND_COLORS.PRIMARY },
  brandText: { fontSize: 13, fontWeight: '700', color: '#666', fontFamily: 'Inter_700Bold' },
  brandTextDefault: { color: '#fff' },
  cardNumber: { fontSize: 17, fontWeight: '600', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_600SemiBold' },
  cardExpiry: { fontSize: 13, color: '#888', marginTop: 2, fontFamily: 'Inter_400Regular' },

  cardRight: { alignItems: 'flex-end', gap: 6 },
  defaultBadge: {
    backgroundColor: BRAND_COLORS.ACCENT + '20',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  defaultBadgeText: { fontSize: 12, color: BRAND_COLORS.ACCENT, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  setDefaultHint: { fontSize: 11, color: '#AAAAAA', fontFamily: 'Inter_400Regular', textAlign: 'right', maxWidth: 90 },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BRAND_COLORS.ALERT + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: { fontSize: 14, color: BRAND_COLORS.ALERT, fontWeight: '700' },

  emptyContainer: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: BRAND_COLORS.TEXT,
    fontFamily: 'Inter_700Bold',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    paddingHorizontal: 24,
    lineHeight: 24,
  },

  footer: { paddingTop: 8, gap: 16 },
  addBtn: {
    height: 56,
    backgroundColor: BRAND_COLORS.PRIMARY,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnDisabled: { opacity: 0.6 },
  addBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addBtnIcon: { fontSize: 24, color: '#fff', fontWeight: '300' },
  addBtnText: { fontSize: 18, color: '#fff', fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  secureNote: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
});
