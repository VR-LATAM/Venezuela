import React, { useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Platform, PanResponder,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useUser } from '../../src/store/authStore';
import { driverMobileService } from '../../src/services/driverService';
import { apiClient } from '../../src/services/apiClient';

const BRAND = { PRIMARY: '#1E3A8A', ACCENT: '#0D9488', TEXT: '#1F2937', GRAY: '#6B7280' };

export default function ContractScreen() {
  const user = useUser();

  const [contractSignedAt, setContractSignedAt] = useState<string | null>(null);
  const [savedSignature, setSavedSignature]      = useState<string[]>([]);
  const [loadingStatus, setLoadingStatus]        = useState(true);
  const [saving, setSaving]                      = useState(false);
  const [scrollEnabled, setScrollEnabled]        = useState(true);
  const [committedPaths, setCommittedPaths]      = useState<string[]>([]);
  const [livePath, setLivePath]                  = useState('');

  const livePathRef    = useRef('');
  const committedRef   = useRef<string[]>([]);

  React.useEffect(() => {
    apiClient.get('/driver/profile').then(res => {
      const d = res.data?.data;
      setContractSignedAt(d?.contract_signed_at ?? null);
      if (d?.contract_signature) {
        setSavedSignature((d.contract_signature as string).split('|').filter(Boolean));
      }
    }).catch(() => {}).finally(() => setLoadingStatus(false));
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (e) => {
        const { locationX: x, locationY: y } = e.nativeEvent;
        livePathRef.current = `M${x.toFixed(1)},${y.toFixed(1)}`;
        setLivePath(livePathRef.current);
        setScrollEnabled(false);
      },
      onPanResponderMove: (e) => {
        const { locationX: x, locationY: y } = e.nativeEvent;
        livePathRef.current += ` L${x.toFixed(1)},${y.toFixed(1)}`;
        setLivePath(livePathRef.current);
      },
      onPanResponderRelease: () => {
        if (livePathRef.current) {
          committedRef.current = [...committedRef.current, livePathRef.current];
          setCommittedPaths([...committedRef.current]);
          livePathRef.current = '';
          setLivePath('');
        }
        setScrollEnabled(true);
      },
    })
  ).current;

  const handleClear = () => {
    committedRef.current = [];
    livePathRef.current  = '';
    setCommittedPaths([]);
    setLivePath('');
  };

  const handleDownloadPDF = async () => {
    const today = new Date();
    const dateStr = `${today.getDate().toString().padStart(2,'0')}/${(today.getMonth()+1).toString().padStart(2,'0')}/${today.getFullYear()}`;
    const signedLine = contractSignedAt
      ? `<p style="color:#065F46;font-weight:bold">✓ Firmado digitalmente el ${new Date(contractSignedAt).toLocaleDateString('es-VE')}</p>`
      : '';

    // Firma: usar la recién dibujada si existe, si no la guardada en BD
    const pathsForPdf = committedPaths.length > 0 ? committedPaths : savedSignature;
    const signatureSvg = pathsForPdf.length > 0
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="100" style="display:block;margin:0 auto">
          ${pathsForPdf.map(p => `<path d="${p}" stroke="#1F2937" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}
         </svg>`
      : '<p style="color:#aaa;text-align:center;font-size:9pt">Sin firma</p>';

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body{font-family:Arial,sans-serif;font-size:11pt;color:#1F2937;padding:30px;line-height:1.5}
  h1{color:#1E3A8A;font-size:14pt;text-align:center;margin-bottom:4px}
  h2{color:#0D9488;font-size:11pt;text-align:center;margin-top:0}
  h3{color:#1E3A8A;font-size:10pt;margin-top:18px;margin-bottom:4px}
  .field{margin:3px 0;font-size:10pt}
  .field b{min-width:80px;display:inline-block}
  p{font-size:10pt;margin:6px 0}
  .sign-box{border:1px solid #CBD5E1;border-radius:8px;height:80px;margin-top:8px}
  table{width:100%;border-collapse:collapse;margin-top:20px}
  td{border:1px solid #CBD5E1;padding:12px;text-align:center;font-size:10pt}
</style></head><body>
<h1>VERONA RIDE — VENEZUELA</h1>
<h2>CONTRATO DE PRESTACIÓN DE SERVICIOS COMO CONDUCTOR INDEPENDIENTE</h2>
${signedLine}
<h3>DATOS DEL CONDUCTOR</h3>
<div class="field"><b>Nombre:</b> ${user?.name ?? '—'}</div>
<div class="field"><b>Correo:</b> ${user?.email ?? '—'}</div>
<div class="field"><b>Teléfono:</b> ${user?.phone ?? '—'}</div>

<h3>PRIMERA — NATURALEZA DEL SERVICIO</h3>
<p>EL CONDUCTOR prestará servicios de transporte de personas y/o encomiendas a través de la plataforma tecnológica VERONA Ride, operando como trabajador independiente. No existe relación laboral, de dependencia ni subordinación entre EL CONDUCTOR y LA PLATAFORMA.</p>

<h3>SEGUNDA — MEMBRESÍA SEMANAL</h3>
<p>EL CONDUCTOR se compromete a pagar la membresía semanal según el tipo de vehículo:<br>
Motocicleta: USD 15,00/sem — Sedán: USD 25,00/sem — SUV: USD 30,00/sem — Pick-Up: USD 35,00/sem — Plataforma/Carga: USD 40,00/sem.<br>
El período va de viernes a jueves. El pago debe realizarse antes de iniciar operaciones.</p>

<h3>TERCERA — COMISIÓN</h3>
<p>VERONA Ride Venezuela opera con CERO POR CIENTO (0%) de comisión. EL CONDUCTOR conserva el 100% del valor cobrado por cada servicio.</p>

<h3>CUARTA — TARIFAS Y FORMA DE COBRO</h3>
<p>El cobro se realiza en dólares estadounidenses (USD) en efectivo. Las tarifas son calculadas automáticamente por la plataforma. Los montos en bolívares se expresan de manera referencial conforme a la tasa BCV vigente.</p>

<h3>QUINTA — PENALIZACIÓN POR CANCELACIÓN</h3>
<p>Las cancelaciones del pasajero después de 2 minutos de gracia generan cargos fijos según el tipo de vehículo. EL CONDUCTOR recibe el 100% de la penalización cobrada.</p>

<h3>SEXTA — CÓDIGO DE CONDUCTA</h3>
<p>EL CONDUCTOR se compromete a mantener calificación mínima de 4.5 estrellas, no operar bajo efectos de alcohol o drogas, mantener el vehículo en condiciones óptimas, tratar a los pasajeros con respeto y profesionalismo, no fumar durante el servicio, y completar los cursos de certificación requeridos.</p>

<h3>SÉPTIMA — SUSPENSIÓN Y CANCELACIÓN</h3>
<p>LA PLATAFORMA puede suspender o cancelar la cuenta por incumplimiento del contrato, calificación sostenida inferior a 4.5 estrellas por más de 7 días, uso fraudulento, conducta inapropiada, o incumplimiento del pago de membresía.</p>

<h3>OCTAVA — RESPONSABILIDAD DEL CONDUCTOR</h3>
<p>EL CONDUCTOR es responsable de mantener vigentes todos sus documentos: licencia, seguro, revisión técnica, tarjeta de propiedad y cualquier documento exigido por las autoridades venezolanas.</p>

<h3>NOVENA — PROTECCIÓN DE DATOS</h3>
<p>EL CONDUCTOR autoriza a VERONA Ride a almacenar y procesar sus datos personales con la finalidad exclusiva de operar y mejorar el servicio.</p>

<h3>DÉCIMA — VIGENCIA Y TERMINACIÓN</h3>
<p>Este contrato entra en vigencia a partir de la fecha de firma con duración indefinida. Cualquiera de las partes puede darlo por terminado con 7 días de aviso previo.</p>

<p style="margin-top:20px;font-style:italic">EL CONDUCTOR declara que ha leído, comprendido y acepta voluntariamente el presente contrato en su totalidad.</p>
<p>Lugar y fecha: Venezuela, ${dateStr}</p>

<table>
  <tr><td><b>Firma del Conductor</b></td><td><b>Firma y Sello VERONA Ride</b></td></tr>
  <tr>
    <td style="height:110px;padding:8px">
      ${signatureSvg}
      <div style="margin-top:6px;font-size:9pt">${user?.name ?? ''}</div>
      <div style="font-size:8pt;color:#6B7280">${user?.email ?? ''}</div>
    </td>
    <td style="height:110px">Representante autorizado<br>VERONA RIDE VENEZUELA</td>
  </tr>
</table>
</body></html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Contrato VERONA Ride' });
      } else {
        Alert.alert('PDF generado', `Guardado en:\n${uri}`);
      }
    } catch {
      Alert.alert('Error', 'No se pudo generar el PDF.');
    }
  };

  const handleSign = async () => {
    if (committedPaths.length === 0) {
      Alert.alert('Firma requerida', 'Por favor dibuja tu firma antes de continuar.');
      return;
    }
    const signature = committedPaths.join('|');
    setSaving(true);
    try {
      await driverMobileService.saveContractSignature(signature);
      setSavedSignature([...committedPaths]);
      setContractSignedAt(new Date().toISOString());
      setCommittedPaths([]);
      committedRef.current = [];
      Alert.alert('Contrato firmado', 'Tu firma ha sido registrada correctamente.');
    } catch {
      Alert.alert('Error', 'No se pudo guardar la firma. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingStatus) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={BRAND.PRIMARY} />
      </View>
    );
  }

  const today = new Date();
  const dateStr = `${today.getDate().toString().padStart(2,'0')}/${(today.getMonth()+1).toString().padStart(2,'0')}/${today.getFullYear()}`;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      scrollEnabled={scrollEnabled}
    >
      {/* Header */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← Volver</Text>
      </TouchableOpacity>

      <Text style={styles.mainTitle}>VERONA RIDE — VENEZUELA</Text>
      <Text style={styles.subTitle}>CONTRATO DE PRESTACIÓN DE SERVICIOS COMO CONDUCTOR INDEPENDIENTE</Text>

      {contractSignedAt && (
        <View style={styles.signedBadge}>
          <Text style={styles.signedBadgeText}>
            ✅ Contrato firmado el {new Date(contractSignedAt).toLocaleDateString('es-VE')}
          </Text>
        </View>
      )}

      {/* Datos del conductor */}
      <Text style={styles.sectionTitle}>DATOS DEL CONDUCTOR</Text>
      <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Nombre:</Text><Text style={styles.fieldValue}>{user?.name ?? '—'}</Text></View>
      <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Correo:</Text><Text style={styles.fieldValue}>{user?.email ?? '—'}</Text></View>
      <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Teléfono:</Text><Text style={styles.fieldValue}>{user?.phone ?? '—'}</Text></View>

      {/* Cláusulas */}
      <Text style={styles.sectionTitle}>CLÁUSULAS DEL CONTRATO</Text>

      <Clause title="PRIMERA — NATURALEZA DEL SERVICIO">
        EL CONDUCTOR prestará servicios de transporte de personas y/o encomiendas a través de la plataforma tecnológica VERONA Ride, operando como trabajador independiente. No existe relación laboral, de dependencia ni subordinación entre EL CONDUCTOR y LA PLATAFORMA.
      </Clause>

      <Clause title="SEGUNDA — MEMBRESÍA SEMANAL">
        EL CONDUCTOR se compromete a pagar la membresía semanal correspondiente al tipo de vehículo registrado:{'\n'}
        {'   '}Motocicleta: USD 15,00/semana{'\n'}
        {'   '}Sedán: USD 25,00/semana{'\n'}
        {'   '}SUV: USD 30,00/semana{'\n'}
        {'   '}Pick-Up: USD 35,00/semana{'\n'}
        {'   '}Plataforma/Carga: USD 40,00/semana{'\n'}
        El período va de viernes a jueves. El pago debe realizarse antes de iniciar operaciones.
      </Clause>

      <Clause title="TERCERA — COMISIÓN">
        VERONA Ride Venezuela opera con CERO POR CIENTO (0%) de comisión. EL CONDUCTOR conserva el 100% del valor cobrado por cada servicio prestado.
      </Clause>

      <Clause title="CUARTA — TARIFAS Y FORMA DE COBRO">
        El cobro se realiza en dólares estadounidenses (USD) en efectivo. Las tarifas son calculadas automáticamente por la plataforma. Los montos en bolívares se expresan de manera referencial conforme a la tasa BCV vigente.
      </Clause>

      <Clause title="QUINTA — PENALIZACIÓN POR CANCELACIÓN">
        Las cancelaciones del pasajero después de 2 minutos de gracia generan cargos fijos según el tipo de vehículo. EL CONDUCTOR recibe el 100% de la penalización cobrada.
      </Clause>

      <Clause title="SEXTA — CÓDIGO DE CONDUCTA">
        EL CONDUCTOR se compromete a mantener calificación mínima de 4.5 estrellas, no operar bajo efectos de alcohol o drogas, mantener el vehículo en condiciones óptimas, tratar a los pasajeros con respeto y profesionalismo, no fumar durante el servicio, y completar los cursos de certificación requeridos.
      </Clause>

      <Clause title="SÉPTIMA — SUSPENSIÓN Y CANCELACIÓN">
        LA PLATAFORMA puede suspender o cancelar la cuenta por incumplimiento del contrato, calificación sostenida inferior a 4.5 estrellas por más de 7 días, uso fraudulento, conducta inapropiada, o incumplimiento del pago de membresía.
      </Clause>

      <Clause title="OCTAVA — RESPONSABILIDAD DEL CONDUCTOR">
        EL CONDUCTOR es responsable de mantener vigentes todos sus documentos: licencia, seguro, revisión técnica, tarjeta de propiedad y cualquier documento exigido por las autoridades venezolanas.
      </Clause>

      <Clause title="NOVENA — PROTECCIÓN DE DATOS">
        EL CONDUCTOR autoriza a VERONA Ride a almacenar y procesar sus datos personales con la finalidad exclusiva de operar y mejorar el servicio.
      </Clause>

      <Clause title="DÉCIMA — VIGENCIA Y TERMINACIÓN">
        Este contrato entra en vigencia a partir de la fecha de firma con duración indefinida. Cualquiera de las partes puede darlo por terminado con 7 días de aviso previo.
      </Clause>

      {/* Declaración */}
      <Text style={styles.declaration}>
        EL CONDUCTOR declara que ha leído, comprendido y acepta voluntariamente el presente contrato en su totalidad.
      </Text>
      <Text style={styles.dateText}>Lugar y fecha: Venezuela, {dateStr}</Text>

      {/* Botón PDF */}
      <TouchableOpacity style={styles.pdfBtn} onPress={handleDownloadPDF}>
        <Text style={styles.pdfBtnText}>📄 Descargar contrato en PDF</Text>
      </TouchableOpacity>

      {/* Firma */}
      {!contractSignedAt ? (
        <View style={styles.signSection}>
          <Text style={styles.signLabel}>Firma del conductor</Text>
          <View style={styles.signCanvas} {...panResponder.panHandlers}>
            <Svg height="140" width="100%">
              {committedPaths.map((p, i) => (
                <Path key={i} d={p} stroke={BRAND.TEXT} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              ))}
              {livePath ? (
                <Path d={livePath} stroke={BRAND.TEXT} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              ) : null}
            </Svg>
            {committedPaths.length === 0 && !livePath && (
              <Text style={styles.signPlaceholder}>Dibuja tu firma aquí</Text>
            )}
          </View>
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Limpiar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.signBtn, saving && { opacity: 0.6 }]}
            onPress={handleSign}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.signBtnText}>Firmar contrato</Text>
            }
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.alreadySigned}>
          <Text style={styles.alreadySignedText}>✅ Contrato firmado digitalmente</Text>
          <Text style={styles.alreadySignedDate}>
            {new Date(contractSignedAt).toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })}
          </Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function Clause({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.clause}>
      <Text style={styles.clauseTitle}>{title}</Text>
      <Text style={styles.clauseBody}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F9FAFB' },
  content:     { padding: 20, paddingTop: Platform.OS === 'android' ? 48 : 60 },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },

  backBtn:     { marginBottom: 16 },
  backText:    { fontSize: 15, color: BRAND.PRIMARY, fontWeight: '600' },

  mainTitle:   { fontSize: 17, fontWeight: '800', color: BRAND.PRIMARY, textAlign: 'center', marginBottom: 4 },
  subTitle:    { fontSize: 12, color: BRAND.ACCENT, textAlign: 'center', marginBottom: 20, lineHeight: 18 },

  signedBadge: { backgroundColor: '#D1FAE5', borderRadius: 10, padding: 10, marginBottom: 16 },
  signedBadgeText: { color: '#065F46', fontSize: 13, fontWeight: '600', textAlign: 'center' },

  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: BRAND.PRIMARY,
    marginTop: 20, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  fieldRow:    { flexDirection: 'row', paddingVertical: 4, gap: 8 },
  fieldLabel:  { fontSize: 13, fontWeight: '600', color: BRAND.GRAY, width: 70 },
  fieldValue:  { fontSize: 13, color: BRAND.TEXT, flex: 1 },

  clause:      { marginBottom: 14 },
  clauseTitle: { fontSize: 12, fontWeight: '700', color: BRAND.PRIMARY, marginBottom: 4 },
  clauseBody:  { fontSize: 12, color: '#374151', lineHeight: 19 },

  declaration: { fontSize: 13, color: BRAND.TEXT, marginTop: 20, lineHeight: 20, fontStyle: 'italic' },
  dateText:    { fontSize: 12, color: BRAND.GRAY, marginTop: 8, marginBottom: 20 },

  signSection: { marginTop: 8 },
  signLabel:   { fontSize: 14, fontWeight: '700', color: BRAND.TEXT, marginBottom: 8 },
  signCanvas:  {
    height: 140, borderWidth: 1.5, borderColor: '#CBD5E1',
    borderRadius: 12, backgroundColor: '#fff',
    overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
  },
  signPlaceholder: { color: '#CBD5E1', fontSize: 14, position: 'absolute' },
  clearBtn:    { alignSelf: 'flex-end', marginTop: 6, padding: 6 },
  clearBtnText:{ fontSize: 13, color: BRAND.GRAY },
  signBtn: {
    backgroundColor: BRAND.PRIMARY, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginTop: 16,
  },
  signBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  pdfBtn: {
    borderWidth: 1.5, borderColor: BRAND.PRIMARY, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', marginBottom: 20,
  },
  pdfBtnText: { color: BRAND.PRIMARY, fontSize: 14, fontWeight: '600' },

  alreadySigned:     { alignItems: 'center', paddingVertical: 24, gap: 6 },
  alreadySignedText: { fontSize: 16, fontWeight: '700', color: '#065F46' },
  alreadySignedDate: { fontSize: 13, color: BRAND.GRAY },
});
