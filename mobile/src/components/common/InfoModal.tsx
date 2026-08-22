import React from 'react';
import {
  Modal, View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Linking, Image, Platform, StatusBar,
} from 'react-native';
import { BRAND_COLORS } from '@vride/shared';

export type InfoPage = 'about' | 'privacy' | 'legal' | 'contact';

interface Props {
  page: InfoPage | null;
  onClose: () => void;
}

const PAGE_TITLES: Record<InfoPage, string> = {
  about:   'Nosotros',
  privacy: 'Política de privacidad',
  legal:   'Aviso legal',
  contact: 'Contáctanos',
};

function AboutContent() {
  return (
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <Image source={require('../../../assets/logo.png')} style={s.logo} resizeMode="contain" />
      <Text style={s.tagline}>Una nueva forma de moverse en Venezuela</Text>
      <Text style={s.body}>
        VERONA Ride Venezuela es una nueva plataforma de transporte que nació con una visión
        diferente: no venimos a competir con nadie. Creemos que el mercado tiene espacio para
        todos, y nuestra única ambición es ofrecer una experiencia de transporte más justa,
        cómoda y confiable.
      </Text>
      <Text style={s.body}>
        Nos enfocamos en dos cosas: que los clientes lleguen a su destino de forma segura y
        tranquila, y que los conductores tengan una herramienta que realmente trabaje para
        ellos — con transparencia y con respeto.
      </Text>
      <Text style={s.body}>
        Somos una plataforma joven, con ganas de crecer junto a nuestros usuarios y de
        demostrar que se puede hacer transporte de otra manera.
      </Text>
      <View style={s.card}>
        {[
          { icon: '🤝', text: 'Sin competencia — solo queremos ser la mejor opción' },
          { icon: '💰', text: 'Conductores que conservan el 100% de sus ganancias' },
          { icon: '🛡️', text: 'Conductores verificados y capacitados' },
          { icon: '📞', text: 'Soporte disponible y botón SOS en cada viaje' },
        ].map(({ icon, text }) => (
          <View key={text} style={s.cardRow}>
            <Text style={s.cardIcon}>{icon}</Text>
            <Text style={s.cardText}>{text}</Text>
          </View>
        ))}
      </View>
      <Text style={s.version}>Versión 1.0.0 · © 2025 VERONA Ride Venezuela</Text>
    </ScrollView>
  );
}

const privacySections = [
  { title: '1. Introducción', body: 'VERONA Ride Venezuela está comprometido con la protección de tu privacidad. Esta Política explica cómo recopilamos, usamos, divulgamos y protegemos tu información cuando usas nuestra aplicación.' },
  { title: '2. Información que recopilamos', body: 'Recopilamos: nombre completo, correo electrónico, número de teléfono, foto de perfil, datos de ubicación GPS durante los viajes, y preferencias opcionales si eliges proporcionarlas.' },
  { title: '3. Cómo usamos tu información', body: 'Usamos tu información para brindar y mejorar el servicio, conectar clientes con conductores, enviar actualizaciones de viaje y alertas de seguridad, y cumplir con obligaciones legales venezolanas.' },
  { title: '4. Compartición de información', body: 'Los detalles del servicio se comparten entre clientes y conductores asignados. Trabajamos con proveedores de confianza bajo acuerdos de confidencialidad. No vendemos tu información personal.' },
  { title: '5. Retención de datos', body: 'Conservamos tus datos mientras tu cuenta esté activa. Los registros de viajes se conservan hasta 7 años por razones legales. Puedes solicitar la eliminación de tu cuenta contactándonos.' },
  { title: '6. Seguridad', body: 'Usamos transmisión de datos cifrada (HTTPS/TLS), infraestructura de nube segura y controles de acceso estrictos.' },
  { title: '7. Contacto', body: 'Preguntas: support@veronaride.app' },
];

function PrivacyContent() {
  return (
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <Text style={s.updated}>Última actualización: 24 de abril de 2025</Text>
      {privacySections.map(sec => (
        <View key={sec.title} style={s.section}>
          <Text style={s.sectionTitle}>{sec.title}</Text>
          <Text style={s.sectionBody}>{sec.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const legalSections = [
  { title: '1. Información de la empresa', body: 'VERONA Ride Venezuela\nCorreo: support@veronaride.app' },
  { title: '2. Naturaleza del servicio', body: 'VERONA Ride opera una plataforma tecnológica que conecta clientes con proveedores de transporte y servicios independientes. Es un intermediario tecnológico, no una empresa de transporte. Los conductores son contratistas independientes.' },
  { title: '3. Limitación de responsabilidad', body: 'En la medida permitida por la ley venezolana, VERONA Ride no será responsable de daños indirectos o consecuentes derivados del uso del servicio.' },
  { title: '4. Responsabilidades del cliente', body: 'Al usar VERONA Ride aceptas: proporcionar información precisa, usar el servicio solo para fines lícitos, tratar a los conductores con respeto y cumplir con las leyes venezolanas.' },
  { title: '5. Responsabilidades del conductor', body: 'Los conductores son responsables de mantener licencia y registro válidos, contar con seguro adecuado y cumplir con la regulación de transporte venezolana.' },
  { title: '6. Propiedad intelectual', body: 'Todo el contenido de VERONA Ride Venezuela — logo, nombre, diseño y texto — es propiedad de VERONA Ride Venezuela y está protegido por las leyes venezolanas.' },
  { title: '7. Ley aplicable', body: 'Este Aviso Legal se rige por las leyes de la República Bolivariana de Venezuela.' },
  { title: '8. Contacto', body: 'Consultas legales: support@veronaride.app' },
];

function LegalContent() {
  return (
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <Text style={s.updated}>Última actualización: 24 de abril de 2025</Text>
      {legalSections.map(sec => (
        <View key={sec.title} style={s.section}>
          <Text style={s.sectionTitle}>{sec.title}</Text>
          <Text style={s.sectionBody}>{sec.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const contactItems = [
  { icon: '📧', title: 'Soporte general', desc: 'Preguntas sobre viajes, tu cuenta o la app.', email: 'support@veronaride.app' },
  { icon: '🚗', title: 'Conviértete en conductor', desc: '¿Interesado en manejar con VERONA Ride?', email: 'drivers@veronaride.app' },
  { icon: '🏢', title: 'Consultas empresariales', desc: 'Alianzas y transporte corporativo.', email: 'business@veronaride.app' },
];

function ContactContent() {
  return (
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <Text style={s.intro}>Estamos aquí para ayudarte. Escríbenos en cualquier momento.</Text>
      {contactItems.map(c => (
        <TouchableOpacity key={c.email} style={s.contactCard} onPress={() => Linking.openURL(`mailto:${c.email}`)}>
          <Text style={s.contactIcon}>{c.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.contactTitle}>{c.title}</Text>
            <Text style={s.contactDesc}>{c.desc}</Text>
            <Text style={s.contactEmail}>{c.email}</Text>
          </View>
          <Text style={{ fontSize: 18, color: '#9ca3af' }}>→</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

export function InfoModal({ page, onClose }: Props) {
  return (
    <Modal
      visible={page !== null}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.backBtn}>
            <Text style={s.backText}>← Menú</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>{page ? PAGE_TITLES[page] : ''}</Text>
          <View style={{ width: 60 }} />
        </View>
        {page === 'about'   && <AboutContent />}
        {page === 'privacy' && <PrivacyContent />}
        {page === 'legal'   && <LegalContent />}
        {page === 'contact' && <ContactContent />}
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  backBtn: { width: 60 },
  backText: { fontSize: 16, color: BRAND_COLORS.PRIMARY, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: BRAND_COLORS.TEXT },
  content: { padding: 24, paddingBottom: 48 },
  logo: { width: '100%', height: 100, marginBottom: 8 },
  tagline: { textAlign: 'center', fontSize: 15, color: '#6b7280', marginBottom: 24, fontStyle: 'italic' },
  body: { fontSize: 15, lineHeight: 24, color: '#374151', marginBottom: 16 },
  card: {
    backgroundColor: '#f0f7ff', borderRadius: 14, padding: 18,
    marginTop: 8, marginBottom: 24, gap: 12,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: { fontSize: 20 },
  cardText: { fontSize: 14, color: '#1e40af', flex: 1, lineHeight: 20 },
  version: { textAlign: 'center', fontSize: 12, color: '#9ca3af' },
  updated: { fontSize: 12, color: '#9ca3af', marginBottom: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 8 },
  sectionBody: { fontSize: 14, lineHeight: 22, color: '#374151' },
  intro: { fontSize: 15, color: '#6b7280', marginBottom: 20, lineHeight: 22 },
  contactCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#f9fafb', borderRadius: 12, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb',
  },
  contactIcon: { fontSize: 24 },
  contactTitle: { fontSize: 15, fontWeight: '700', color: BRAND_COLORS.TEXT, marginBottom: 2 },
  contactDesc: { fontSize: 12, color: '#6b7280', marginBottom: 3 },
  contactEmail: { fontSize: 13, color: BRAND_COLORS.PRIMARY, fontWeight: '600' },
});
