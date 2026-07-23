// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// Sistema de insignias de conductores — basado en viajes totales y calificación

export interface DriverBadge {
  emoji: string;
  label: string;
  color: string;
}

export function getDriverBadge(totalRides: number, ratingAvg: number): DriverBadge {
  // Insignia especial por calificación perfecta (prioridad máxima)
  if (ratingAvg >= 4.9 && totalRides >= 50) {
    return { emoji: '🏆', label: 'Top Rated', color: '#F59E0B' };
  }
  // Insignias por nivel de experiencia
  if (totalRides >= 500) {
    return { emoji: '💎', label: 'Elite Driver', color: '#6366F1' };
  }
  if (totalRides >= 200) {
    return { emoji: '🌟', label: 'Pro Driver', color: '#0EA5E9' };
  }
  if (totalRides >= 50) {
    return { emoji: '⭐', label: 'Active Driver', color: '#22C55E' };
  }
  return { emoji: '🆕', label: 'New Driver', color: '#94A3B8' };
}
