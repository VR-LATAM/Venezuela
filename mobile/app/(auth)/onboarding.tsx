// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Pantalla de onboarding — 4 slides: servicios, bienvenida $1, referidos, seguridad
// Se puede omitir. Solo aparece la primera vez.
// ═══════════════════════════════════════════════════════════════

import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { BRAND_COLORS } from '@vride/shared';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

interface Slide {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  color: string;
}

const slides: Slide[] = [
  {
    id: '1',
    emoji: '🚗',
    title: 'Todos los servicios en una sola app',
    desc: 'Taxi, moto, SUV, carga, encomiendas, grúa, mecánico, cisterna, planta eléctrica y más. Todo lo que necesitas en Venezuela.',
    color: BRAND_COLORS.PRIMARY,
  },
  {
    id: '2',
    emoji: '🎁',
    title: '$1 de descuento en tus primeros 3 viajes',
    desc: 'Como regalo de bienvenida, cada uno de tus 3 primeros viajes tiene $1 de descuento automático. Solo regístrate y viaja.',
    color: '#7B2FBE',
  },
  {
    id: '3',
    emoji: '🤝',
    title: 'Gana créditos refiriendo amigos',
    desc: 'Comparte tu código y recibe $5 en crédito por cada grupo de 3 amigos que completen 10 viajes. Y el décimo viaje siempre tiene descuento para ti también.',
    color: '#E67E22',
  },
  {
    id: '4',
    emoji: '🛡️',
    title: 'Seguro, transparente y siempre disponible',
    desc: 'Conductores verificados, precios en USD y Bs., tracking en tiempo real y botón SOS. Tu seguridad es nuestra prioridad.',
    color: BRAND_COLORS.ACCENT,
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const goToNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      setCurrentIndex(currentIndex + 1);
    } else {
      router.replace('/(auth)/' as any);
    }
  };

  const skip = () => {
    router.replace('/(auth)/' as any);
  };

  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <View style={styles.container}>
      {/* Botón omitir */}
      {!isLastSlide && (
        <TouchableOpacity style={styles.skipButton} onPress={skip}>
          <Text style={styles.skipText}>Omitir</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.emojiContainer, { backgroundColor: item.color + '20' }]}>
              <Text style={styles.emoji}>{item.emoji}</Text>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc}>{item.desc}</Text>
          </View>
        )}
      />

      {/* Indicadores de posición */}
      <View style={styles.dots}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentIndex && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {/* Botón de avance */}
      <TouchableOpacity
        style={styles.button}
        onPress={goToNext}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>
          {isLastSlide ? 'Comenzar' : 'Siguiente'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 24, paddingBottom: 40,
  },
  skipButton: {
    alignSelf: 'flex-end',
    padding: 20,
    marginTop: 20,
  },
  skipText: {
    fontSize: 17,
    color: '#888',
    fontFamily: 'Inter_400Regular',
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    flex: 1,
  },
  emojiContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  emoji: {
    fontSize: 64,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: BRAND_COLORS.TEXT,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Inter_700Bold',
  },
  desc: {
    fontSize: 17,
    color: '#555',
    textAlign: 'center',
    lineHeight: 26,
    fontFamily: 'Inter_400Regular',
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
  },
  dotActive: {
    width: 24,
    backgroundColor: BRAND_COLORS.PRIMARY,
  },
  button: {
    backgroundColor: BRAND_COLORS.PRIMARY,
    height: 56,
    borderRadius: 14,
    width: width - 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
});
