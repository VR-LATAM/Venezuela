// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { BRAND_COLORS } from '@vride/shared';

const sections = [
  { title: '1. Introducción', body: 'Verona Group Venezuela ("V-Ride Venezuela", "nosotros" o "nuestro") está comprometido con la protección de tu privacidad. Esta Política de Privacidad explica cómo recopilamos, usamos, divulgamos y protegemos tu información cuando usas nuestra aplicación móvil y servicios relacionados.' },
  { title: '2. Información que recopilamos', body: 'Recopilamos: nombre completo, correo electrónico, número de teléfono, fecha de nacimiento e identificación oficial (conductores), foto de perfil, información de pago (procesada por Stripe — nunca almacenamos números de tarjeta), datos de ubicación GPS durante los viajes, y preferencias opcionales de movilidad/accesibilidad si eliges proporcionarlas.' },
  { title: '3. Cómo usamos tu información', body: 'Usamos tu información para: brindar y mejorar nuestro servicio, conectar pasajeros con conductores, procesar pagos y emitir recibos, enviar actualizaciones de viaje y alertas de seguridad, responder solicitudes de soporte, cumplir con obligaciones legales venezolanas, y detectar y prevenir fraudes.' },
  { title: '4. Compartición de información', body: 'Los detalles limitados del viaje se comparten entre pasajeros y conductores asignados. Trabajamos con proveedores de servicio de confianza (Stripe, Google Maps, Firebase) bajo estrictos acuerdos de confidencialidad. Podemos compartir información con autoridades legales cuando lo exija la ley venezolana. No vendemos tu información personal.' },
  { title: '5. Retención de datos', body: 'Conservamos tus datos mientras tu cuenta esté activa o según sea necesario para prestar el servicio. Los registros de viajes se conservan hasta 7 años por razones legales y contables. Puedes solicitar la eliminación de tu cuenta contactándonos.' },
  { title: '6. Seguridad', body: 'Usamos medidas de seguridad estándar de la industria, incluyendo transmisión de datos cifrada (HTTPS/TLS), infraestructura de nube segura y controles de acceso estrictos.' },
  { title: '7. Tus derechos', body: 'De acuerdo con la legislación venezolana aplicable, puedes tener derecho a acceder, corregir o eliminar tus datos personales, y a oponerte a ciertos usos. Para ejercer estos derechos, contáctanos en support@veronaride.app.' },
  { title: '8. Privacidad de menores', body: 'Nuestro servicio no está dirigido a menores de 18 años. No recopilamos intencionalmente información personal de menores de 18 años.' },
  { title: '9. Contacto', body: '¿Preguntas? Contáctanos en:\nVerona Group Venezuela\nVenezuela\nCorreo: support@veronaride.app' },
];

export default function PrivacyScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Política de privacidad</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Última actualización: 24 de abril de 2025</Text>
        {sections.map(s => (
          <View key={s.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 20,
    paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  backBtn: { marginRight: 16 },
  backText: { fontSize: 17, color: BRAND_COLORS.PRIMARY, fontWeight: '500' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: BRAND_COLORS.TEXT },
  content: { padding: 24, paddingBottom: 48 },
  updated: { fontSize: 13, color: '#9ca3af', marginBottom: 24 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 10 },
  sectionBody: { fontSize: 15, lineHeight: 24, color: '#374151' },
});
