// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { BRAND_COLORS } from '@vride/shared';

const sections = [
  { title: '1. Información de la empresa', body: 'VERONA Group Venezuela\nPaís: Venezuela\nCorreo: support@veronaride.app' },
  { title: '2. Naturaleza del servicio', body: 'V-Ride Venezuela opera una plataforma tecnológica que conecta pasajeros con proveedores de transporte independientes. V-Ride es un intermediario tecnológico y no es en sí mismo una empresa de transporte. Los conductores son contratistas independientes y no empleados de VERONA Group Venezuela.' },
  { title: '3. Limitación de responsabilidad', body: 'En la medida máxima permitida por la ley venezolana aplicable, VERONA Group Venezuela no será responsable de daños indirectos, incidentales, especiales o consecuentes derivados del uso del servicio. Nuestra responsabilidad total no excederá el monto que hayas pagado a V-Ride en los tres (3) meses anteriores al reclamo.' },
  { title: '4. Descargo de garantías', body: 'El servicio se ofrece "tal cual" y "según disponibilidad" sin garantías de ningún tipo, expresas o implícitas. No garantizamos que el servicio sea ininterrumpido o libre de errores.' },
  { title: '5. Responsabilidades del usuario', body: 'Al usar V-Ride Venezuela, aceptas: proporcionar información precisa, usar el servicio solo para fines lícitos, no hacer un uso indebido de la plataforma, tratar a los conductores con respeto y cumplir con todas las leyes venezolanas aplicables.' },
  { title: '6. Responsabilidades del conductor', body: 'Los conductores son contratistas independientes responsables de: mantener una licencia y registro válidos, contar con seguro adecuado, cumplir con la regulación de transporte venezolana y garantizar la seguridad y calidad de sus servicios.' },
  { title: '7. Propiedad intelectual', body: 'Todo el contenido de V-Ride Venezuela — incluidos el logo, nombre de marca, diseño de la app y contenido escrito — es propiedad exclusiva de VERONA Group Venezuela y está protegido por las leyes de propiedad intelectual venezolanas.' },
  { title: '8. Ley aplicable', body: 'Este Aviso Legal se rige por las leyes de la República Bolivariana de Venezuela, sin perjuicio de las normas sobre conflicto de leyes.' },
  { title: '9. Resolución de disputas', body: 'Las disputas se abordarán primero mediante negociación de buena fe. Si no se resuelven en 30 días, serán sometidas a los mecanismos de resolución de conflictos establecidos por la legislación venezolana aplicable.' },
  { title: '10. Contacto', body: 'Para consultas legales:\nVERONA Group Venezuela\nVenezuela\nCorreo: support@veronaride.app' },
];

export default function LegalScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Aviso legal</Text>
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
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 24 },
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
