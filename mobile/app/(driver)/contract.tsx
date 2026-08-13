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
  const [driver, setDriver]                      = useState<Record<string, any> | null>(null);
  const [loadingStatus, setLoadingStatus]        = useState(true);
  const [saving, setSaving]                      = useState(false);
  const [scrollEnabled, setScrollEnabled]        = useState(true);
  const [committedPaths, setCommittedPaths]      = useState<string[]>([]);
  const [livePath, setLivePath]                  = useState('');

  const livePathRef  = useRef('');
  const committedRef = useRef<string[]>([]);

  React.useEffect(() => {
    apiClient.get('/driver/profile').then(res => {
      const d = res.data?.data;
      setDriver(d);
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

    const pathsForPdf = committedPaths.length > 0 ? committedPaths : savedSignature;

    const buildSignatureSvg = (paths: string[]) => {
      if (paths.length === 0) return '<p style="color:#aaa;text-align:center;font-size:9pt">Sin firma</p>';
      const xs: number[] = [], ys: number[] = [];
      paths.forEach(p => {
        const tokens = p.match(/[ML]-?\d+\.?\d*,-?\d+\.?\d*/g) ?? [];
        tokens.forEach(t => {
          const [x, y] = t.slice(1).split(',').map(Number);
          xs.push(x); ys.push(y);
        });
      });
      if (xs.length === 0) return '<p style="color:#aaa;text-align:center;font-size:9pt">Sin firma</p>';
      const pad = 10;
      const minX = Math.min(...xs) - pad;
      const minY = Math.min(...ys) - pad;
      const w    = Math.max(...xs) - minX + pad;
      const h    = Math.max(...ys) - minY + pad;
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${w} ${h}" width="300" height="140" style="display:block;margin:0 auto">
        ${paths.map(p => `<path d="${p}" stroke="#1F2937" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}
      </svg>`;
    };
    const signatureSvg = buildSignatureSvg(pathsForPdf);

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @page { size: letter; margin: 1in; }
  body{font-family:Arial,sans-serif;font-size:11pt;color:#1F2937;margin:0;padding:0;line-height:1.5}
  h1{color:#1E3A8A;font-size:13pt;text-align:center;margin-bottom:2px}
  h2{color:#0D9488;font-size:10pt;text-align:center;margin-top:0;margin-bottom:2px}
  h4{color:#6B7280;font-size:9pt;text-align:center;margin-top:0;font-weight:normal}
  h3{color:#1E3A8A;font-size:10pt;margin-top:16px;margin-bottom:4px}
  .field{margin:3px 0;font-size:10pt}
  .field b{min-width:80px;display:inline-block}
  p{font-size:10pt;margin:6px 0}
  ul{margin:4px 0;padding-left:18px;font-size:10pt}
  li{margin:2px 0}
  table{width:100%;border-collapse:collapse;margin-top:20px}
  td{border:1px solid #CBD5E1;padding:12px;text-align:center;font-size:10pt}
</style></head><body>
<h1>VERONA TECHNOLOGY GROUP C.A.</h1>
<h2>CONTRATO DE SUSCRIPCIÓN, LICENCIA DE USO Y ACCESO A PLATAFORMA TECNOLÓGICA<br>PARA PRESTADORES INDEPENDIENTES DE TRANSPORTE</h2>
<h4>Versión: 2.7 &nbsp;|&nbsp; Plataforma: VERONA Ride - Venezuela</h4>
${signedLine}

<h3>LAS PARTES</h3>
<p><b>VERONA Technology Group C.A.</b>, sociedad mercantil constituida conforme a las leyes de la República Bolivariana de Venezuela, domiciliada en Venezuela, en adelante denominada la <b>"PLATAFORMA"</b>.</p>
<p>Y por la otra, el SUSCRIPTOR cuyos datos se indican a continuación, en adelante denominado el <b>"SUSCRIPTOR"</b>. Conjuntamente las "PARTES".</p>

<h3>DATOS DEL SUSCRIPTOR</h3>
<div class="field"><b>Nombre:</b> ${user?.name ?? '—'}</div>
<div class="field"><b>Correo:</b> ${user?.email ?? '—'}</div>
<div class="field"><b>Teléfono:</b> ${user?.phone ?? '—'}</div>

<h3>DATOS DE LA UNIDAD</h3>
<div class="field"><b>Marca:</b> ${driver?.vehicle_brand ?? '—'}</div>
<div class="field"><b>Modelo:</b> ${driver?.vehicle_model ?? '—'}</div>
<div class="field"><b>Año:</b> ${driver?.vehicle_year ?? '—'}</div>
<div class="field"><b>Color:</b> ${driver?.vehicle_color ?? '—'}</div>
<div class="field"><b>Placa:</b> ${driver?.vehicle_plate ?? '—'}</div>
<div class="field"><b>Seguro:</b> ${driver?.insurance_company ?? '—'}</div>
<div class="field"><b>Póliza:</b> ${driver?.insurance_policy_number ?? '—'}</div>

<h3>1. DEFINICIONES</h3>
<p><b>Aplicación o Plataforma:</b> software, aplicación móvil, portal web, interfaces, mensajería, geolocalización, módulos de seguridad, paneles administrativos y demás herramientas operadas bajo la marca VERONA Technology Group C.A.</p>
<p><b>Membresía o Suscripción:</b> servicio tecnológico pagado que permite al SUSCRIPTOR acceder a las funcionalidades del plan contratado durante un período definido.</p>
<p><b>Solicitud:</b> petición de traslado generada por un Usuario Pasajero mediante la Aplicación.</p>
<p><b>Usuario Pasajero:</b> persona que utiliza la Aplicación para solicitar un traslado.</p>
<p><b>Servicio de Transporte:</b> traslado material que el SUSCRIPTOR decide aceptar y prestar directamente al Usuario Pasajero, por su propia cuenta, riesgo y responsabilidad.</p>
<p><b>Unidad:</b> automóvil, motocicleta u otro vehículo legalmente habilitado y registrado por el SUSCRIPTOR en la Aplicación.</p>
<p><b>Código Operativo:</b> identificador público alfanumérico asignado por la PLATAFORMA para mostrar al SUSCRIPTOR ante pasajeros sin divulgar innecesariamente su identidad legal completa.</p>
<p><b>Días Restituibles:</b> crédito de acceso no monetario correspondiente a los días completos de Membresía pendientes luego de una restricción por rechazos válidos.</p>

<h3>2. OBJETO</h3>
<p>La PLATAFORMA otorga al SUSCRIPTOR una licencia limitada, personal, no exclusiva, no transferible, revocable y condicionada para utilizar las funcionalidades habilitadas de la Aplicación. Según el plan contratado, la Membresía podrá incluir: perfil profesional, recepción y gestión de Solicitudes, geolocalización, mensajería interna, historial de viajes, herramientas de seguridad, soporte técnico, sistema de calificaciones y módulos adicionales habilitados.</p>
<p>La PLATAFORMA presta tecnología y no garantiza al SUSCRIPTOR cantidad mínima de Solicitudes, pasajeros, ingresos, ganancias, rentabilidad, zona exclusiva ni disponibilidad ininterrumpida.</p>

<h3>3. NATURALEZA COMERCIAL</h3>
<p>El presente contrato regula una relación de suscripción a servicios tecnológicos. El SUSCRIPTOR contrata y paga a la PLATAFORMA por el uso de herramientas digitales. El SUSCRIPTOR declara que no recibe de la PLATAFORMA: salario, sueldo, vacaciones, bono vacacional, utilidades, prestaciones sociales, cestaticket, horas extras ni ingreso mínimo garantizado.</p>
<p>La PLATAFORMA no fija jornada, turnos, guardias, cuota mínima de horas ni exclusividad. El SUSCRIPTOR puede desarrollar actividades para sí o terceros, siempre que no utilice datos, marcas o información de usuarios obtenidos mediante la PLATAFORMA para eludirla.</p>

<h3>4. IDENTIDAD LEGAL Y REQUISITOS</h3>
<p>El SUSCRIPTOR deberá suministrar su identidad legal completa, real, vigente y verificable. Antes de activar la cuenta deberá presentar y mantener vigentes: cédula de identidad o pasaporte vigente, RIF vigente, correo y teléfono verificables, fotografía o verificación facial, licencia de conducir vigente con categoría apropiada, documento de propiedad o posesión legítima de la Unidad, placa y datos de la Unidad, seguro de responsabilidad civil vigente, permiso o habilitación exigida por el INTT, alcaldía u autoridad competente según modalidad y localidad, y cuenta bancaria o billetera a nombre del SUSCRIPTOR cuando aplique procesamiento de pagos.</p>

<h3>5. CÓDIGO ALFANUMÉRICO DE IDENTIFICACIÓN OPERATIVA</h3>
<p>Al activar la cuenta, la PLATAFORMA asignará al SUSCRIPTOR un Código Alfanumérico único, personal y no transferible para identificarlo ante los Usuarios Pasajeros sin revelar su identidad legal completa. El código podrá incluir la modalidad (MOTO, TAXI, SUV, VAN, PickUp), las dos primeras letras del apellido del SUSCRIPTOR y caracteres alfanuméricos aleatorios. Ejemplos: MT-GO-482 / SD-RA-731 / SV-LI-615 / VN-AN-902 / PU-PE-247.</p>
<p>La PLATAFORMA conservará internamente la identidad legal completa del SUSCRIPTOR para fines contractuales, tributarios, de seguridad y requerimientos de autoridades. El SUSCRIPTOR no podrá modificar, prestar, vender ni compartir su Código Alfanumérico.</p>

<h3>6. MEMBRESÍA, PRECIO Y RENOVACIÓN</h3>
<p>Precio semanal: <b>USD 10,00</b>. Fecha de pago ordinario: viernes. El período de Membresía va desde las 00:00:00 horas del sábado siguiente hasta las 23:59:59 horas del viernes siguiente.</p>
<p>El precio corresponde exclusivamente al acceso tecnológico y no constituye descuento salarial ni pago laboral. Si el SUSCRIPTOR no realiza el pago al vencimiento, la PLATAFORMA podrá limitar el acceso hasta regularizar la obligación. La PLATAFORMA notificará cualquier cambio de precio con anticipación razonable.</p>

<h3>7. DISPONIBILIDAD, RECHAZOS Y CALIDAD</h3>
<p>El SUSCRIPTOR decide libremente cuándo activar o desactivar su estado de "Disponible". No existe obligación de conexión, horario ni permanencia mínima. La PLATAFORMA podrá registrar indicadores objetivos de Solicitudes recibidas, aceptadas, rechazadas y canceladas. No se computarán como rechazos válidos los casos de error técnico, Solicitud duplicada, pasajero bloqueado, información incompleta, punto fuera de la configuración seleccionada, emergencia o fuerza mayor.</p>

<h3>8. RESTRICCIÓN POR 15 RECHAZOS</h3>
<p>Si el SUSCRIPTOR acumula quince (15) rechazos válidos antes del vencimiento de su Período de Membresía, la PLATAFORMA podrá restringir inmediatamente la recepción de nuevas Solicitudes hasta el final de dicho período.</p>
<p>La PLATAFORMA acreditará al SUSCRIPTOR los <b>Días Restituibles</b> equivalentes a los días calendario completos restantes desde la restricción hasta el viernes de vencimiento. No habrá devolución de dinero. El SUSCRIPTOR podrá solicitar revisión dentro de las 48 horas siguientes a la medida. Los Días Restituibles son personales, no transferibles, no canjeables por dinero y no acumulables con otras promociones.</p>

<h3>9. PRESENTACIÓN, EQUIPOS E IDENTIDAD VISUAL</h3>
<p>El SUSCRIPTOR mantendrá una presentación limpia, segura y respetuosa. Modalidad motocicleta: casco para conductor y pasajero, chaleco reflectivo e identificación visual aprobada. Modalidad automóvil: placa visible, documentos y seguro vigentes, identificación y señalización exigida por la autoridad competente.</p>
<p>El SUSCRIPTOR podrá adquirir accesorios conforme al Catálogo Oficial de Identificación y Seguridad publicado por la PLATAFORMA. No podrá usar logos o emblemas alterados, deteriorados o no autorizados.</p>

<h3>10. MARCA, RETIRO Y DEVOLUCIÓN</h3>
<p>La Empresa conserva la titularidad exclusiva de sus marcas, logos, emblemas, QR y demás signos distintivos. La licencia de uso de marca termina automáticamente al vencer la Membresía sin pago, desactivarse o suspenderse la cuenta. Desde la terminación, el SUSCRIPTOR deberá retirar stickers, QR, credenciales y emblemas removibles, y cubrir permanentemente los no removibles. Los bienes entregados en préstamo o comodato deberán devolverse dentro de cinco (5) días hábiles siguientes a la terminación.</p>

<h3>11. OBLIGACIONES DEL SUSCRIPTOR</h3>
<p>El SUSCRIPTOR se obliga a: mantener documentos auténticos y vigentes; conservar la Unidad en condiciones adecuadas; cumplir normas de tránsito, seguros y permisos; no conducir bajo alcohol o drogas; tratar con respeto a pasajeros y terceros; no permitir el uso de su cuenta por terceros; no alterar GPS, identidad, datos o sistemas; reportar accidentes, incidentes y documentos vencidos; asumir costos de vehículo, combustible, mantenimiento, teléfono, seguros, impuestos y gastos propios; cooperar con investigaciones de seguridad relacionadas con viajes gestionados por la Aplicación.</p>

<h3>12. PAGOS Y FACTURACIÓN</h3>
<p>El Usuario Pasajero paga directamente al SUSCRIPTOR. La PLATAFORMA solo proporciona tecnología. Los importes recibidos por viajes corresponden a la actividad independiente del SUSCRIPTOR y no constituyen salario pagado por la PLATAFORMA. La PLATAFORMA emitirá comprobante por Membresía y cargos tecnológicos propios. El SUSCRIPTOR es responsable de su facturación e impuestos por los servicios de transporte.</p>

<h3>13. NO ELUSIÓN Y DATOS DE PASAJEROS</h3>
<p>Los datos de identidad, contacto, ubicación e historial de pasajeros se suministran exclusivamente para evaluar, aceptar y ejecutar Solicitudes gestionadas mediante la Aplicación. El SUSCRIPTOR no podrá usar esos datos para ofrecer o negociar servicios por fuera de la PLATAFORMA cuando la oportunidad se origine en una Solicitud proporcionada por ella. El SUSCRIPTOR no podrá solicitar a pasajeros teléfono personal, redes sociales, dirección, datos bancarios ni información personal con el propósito de contratar fuera de la Aplicación.</p>

<h3>14. SEGURIDAD, DATOS Y RESPONSABILIDAD</h3>
<p>El SUSCRIPTOR cooperará con investigaciones de seguridad relacionadas con viajes gestionados en la Aplicación. La PLATAFORMA podrá limitar el acceso ante indicios razonables de riesgo grave, fraude, agresión, suplantación o documento falso. El SUSCRIPTOR autoriza el tratamiento de sus datos de identidad, documentos, ubicación, rutas, Solicitudes y calificaciones para operar la Aplicación, prevenir fraude, proteger usuarios y cumplir obligaciones legales. La PLATAFORMA no garantiza disponibilidad continua ni resultado económico. El SUSCRIPTOR responde por la conducción, Unidad, permisos e infracciones.</p>

<h3>15. NO RENUNCIA, LEY Y ACEPTACIÓN</h3>
<p>Nada de este contrato se interpretará como renuncia de derechos irrenunciables. Este contrato se regirá por las leyes de la República Bolivariana de Venezuela. Las PARTES procurarán resolver controversias mediante comunicación directa; de no alcanzar acuerdo, serán competentes los tribunales que correspondan conforme a la ley. Forman parte de este contrato: Política de Privacidad, Política de Seguridad, Política de Calidad y Cancelaciones, Tabla de Membresías, Política de Pagos, Catálogo Oficial de Identificación y Seguridad, Manual de Identidad Visual y Requisitos documentales publicados en la Aplicación.</p>

<p style="margin-top:20px;font-style:italic">EL SUSCRIPTOR declara que ha leído, comprendido y acepta voluntariamente el presente contrato y sus anexos en su totalidad.</p>
<p>Lugar y fecha: Venezuela, ${dateStr}</p>

<table>
  <tr><td><b>Firma del Suscriptor</b></td><td><b>Firma y Sello VERONA Technology Group C.A.</b></td></tr>
  <tr>
    <td style="height:180px;padding:8px">
      ${signatureSvg}
      <div style="margin-top:6px;font-size:9pt">${user?.name ?? ''}</div>
      <div style="font-size:8pt;color:#6B7280">${user?.email ?? ''}</div>
    </td>
    <td style="height:180px">Representante autorizado<br>VERONA TECHNOLOGY GROUP C.A.</td>
  </tr>
</table>
</body></html>`;

    try {
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
        width:  612,
        height: 792,
      });
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
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← Volver</Text>
      </TouchableOpacity>

      <Text style={styles.mainTitle}>VERONA TECHNOLOGY GROUP C.A.</Text>
      <Text style={styles.subTitle}>
        CONTRATO DE SUSCRIPCIÓN, LICENCIA DE USO Y ACCESO A PLATAFORMA TECNOLÓGICA PARA PRESTADORES INDEPENDIENTES DE TRANSPORTE
      </Text>
      <Text style={styles.version}>Versión: 2.7  |  Plataforma: VERONA Ride - Venezuela</Text>

      {contractSignedAt && (
        <View style={styles.signedBadge}>
          <Text style={styles.signedBadgeText}>
            ✅ Contrato firmado el {new Date(contractSignedAt).toLocaleDateString('es-VE')}
          </Text>
        </View>
      )}

      {/* Partes */}
      <Text style={styles.sectionTitle}>LAS PARTES</Text>
      <Text style={styles.bodyText}>
        <Text style={styles.bold}>VERONA Technology Group C.A.</Text>, sociedad mercantil constituida conforme a las leyes de la República Bolivariana de Venezuela, en adelante denominada la <Text style={styles.bold}>"PLATAFORMA"</Text>.
      </Text>
      <Text style={styles.bodyText}>
        Y por la otra, el SUSCRIPTOR cuyos datos se indican a continuación, en adelante denominado el <Text style={styles.bold}>"SUSCRIPTOR"</Text>. Conjuntamente las "PARTES".
      </Text>

      {/* Datos del Suscriptor */}
      <Text style={styles.sectionTitle}>DATOS DEL SUSCRIPTOR</Text>
      <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Nombre:</Text><Text style={styles.fieldValue}>{user?.name ?? '—'}</Text></View>
      <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Correo:</Text><Text style={styles.fieldValue}>{user?.email ?? '—'}</Text></View>
      <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Teléfono:</Text><Text style={styles.fieldValue}>{user?.phone ?? '—'}</Text></View>

      {/* Datos de la Unidad */}
      <Text style={styles.sectionTitle}>DATOS DE LA UNIDAD</Text>
      <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Marca:</Text><Text style={styles.fieldValue}>{driver?.vehicle_brand ?? '—'}</Text></View>
      <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Modelo:</Text><Text style={styles.fieldValue}>{driver?.vehicle_model ?? '—'}</Text></View>
      <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Año:</Text><Text style={styles.fieldValue}>{driver?.vehicle_year ?? '—'}</Text></View>
      <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Color:</Text><Text style={styles.fieldValue}>{driver?.vehicle_color ?? '—'}</Text></View>
      <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Placa:</Text><Text style={styles.fieldValue}>{driver?.vehicle_plate ?? '—'}</Text></View>
      <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Seguro:</Text><Text style={styles.fieldValue}>{driver?.insurance_company ?? '—'}</Text></View>
      <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Póliza:</Text><Text style={styles.fieldValue}>{driver?.insurance_policy_number ?? '—'}</Text></View>

      {/* Cláusulas */}
      <Text style={styles.sectionTitle}>CLÁUSULAS</Text>

      <Clause title="1. DEFINICIONES">
        <Text style={styles.clauseBody}>
          <Text style={styles.bold}>Aplicación o Plataforma:</Text> software, aplicación móvil, portal web, interfaces, mensajería, geolocalización, módulos de seguridad, paneles administrativos y demás herramientas operadas bajo la marca VERONA Technology Group C.A.{'\n\n'}
          <Text style={styles.bold}>Membresía o Suscripción:</Text> servicio tecnológico pagado que permite al SUSCRIPTOR acceder a las funcionalidades del plan contratado durante un período definido.{'\n\n'}
          <Text style={styles.bold}>Solicitud:</Text> petición de traslado generada por un Usuario Pasajero mediante la Aplicación.{'\n\n'}
          <Text style={styles.bold}>Usuario Pasajero:</Text> persona que utiliza la Aplicación para solicitar un traslado.{'\n\n'}
          <Text style={styles.bold}>Servicio de Transporte:</Text> traslado material que el SUSCRIPTOR decide aceptar y prestar directamente al Usuario Pasajero, por su propia cuenta, riesgo y responsabilidad, sujeto a la normativa aplicable.{'\n\n'}
          <Text style={styles.bold}>Unidad:</Text> automóvil, motocicleta u otro vehículo legalmente habilitado y registrado por el SUSCRIPTOR en la Aplicación.{'\n\n'}
          <Text style={styles.bold}>Código Operativo:</Text> identificador público alfanumérico asignado por la PLATAFORMA para mostrar al SUSCRIPTOR ante pasajeros sin divulgar innecesariamente su identidad legal completa.{'\n\n'}
          <Text style={styles.bold}>Días Restituibles:</Text> crédito de acceso no monetario correspondiente a los días completos de Membresía pendientes luego de una restricción por rechazos válidos.
        </Text>
      </Clause>

      <Clause title="2. OBJETO">
        <Text style={styles.clauseBody}>
          La PLATAFORMA otorga al SUSCRIPTOR una licencia limitada, personal, no exclusiva, no transferible, revocable y condicionada para utilizar las funcionalidades habilitadas de la Aplicación. Según el plan contratado, la Membresía podrá incluir: perfil profesional de conductor, recepción y gestión de Solicitudes, geolocalización, mensajería interna, historial de viajes, herramientas de seguridad, soporte técnico, sistema de calificaciones, campañas comerciales opcionales, procesamiento tecnológico de pagos cuando aplique, y módulos adicionales expresamente habilitados.{'\n\n'}
          La PLATAFORMA presta tecnología y no garantiza al SUSCRIPTOR cantidad mínima de Solicitudes, pasajeros, ingresos, ganancias, rentabilidad, zona exclusiva, horas de actividad ni disponibilidad ininterrumpida.
        </Text>
      </Clause>

      <Clause title="3. NATURALEZA COMERCIAL">
        <Text style={styles.clauseBody}>
          El presente contrato regula una relación de suscripción a servicios tecnológicos. El SUSCRIPTOR contrata y paga a la PLATAFORMA por el uso de herramientas digitales. El SUSCRIPTOR declara que no recibe de la PLATAFORMA: salario, sueldo, vacaciones, bono vacacional, utilidades, prestaciones sociales, cestaticket, pago de horas extras, ingreso mínimo garantizado, ni pago por tiempo de disponibilidad.{'\n\n'}
          La PLATAFORMA no fija jornada, turnos, guardias, cuota mínima de horas, cuota mínima de viajes, ruta obligatoria ni exclusividad. El SUSCRIPTOR puede desarrollar actividades para sí, clientes directos, otras aplicaciones o terceros, siempre que no utilice datos, marcas o información de usuarios obtenidos mediante la PLATAFORMA para eludirla.
        </Text>
      </Clause>

      <Clause title="4. IDENTIDAD LEGAL Y REQUISITOS">
        <Text style={styles.clauseBody}>
          El SUSCRIPTOR deberá suministrar su identidad legal completa, real, vigente y verificable para fines contractuales, administrativos, tributarios, de pagos, seguros, permisos y seguridad. Antes de activar la cuenta deberá presentar y mantener vigentes:{'\n\n'}
          • Cédula de identidad venezolana vigente o pasaporte vigente.{'\n'}
          • RIF vigente.{'\n'}
          • Correo electrónico y teléfono verificables.{'\n'}
          • Fotografía o verificación facial.{'\n'}
          • Licencia de conducir vigente con categoría apropiada.{'\n'}
          • Documento de propiedad, matrícula, certificado de origen o posesión legítima de la Unidad.{'\n'}
          • Placa, marca, modelo, color, año y demás datos de la Unidad.{'\n'}
          • Seguro de responsabilidad civil o cobertura exigible vigente.{'\n'}
          • Permiso, habilitación de taxi, mototaxi u otra autorización exigida por el INTT, alcaldía u autoridad competente según modalidad y localidad.{'\n'}
          • Cuenta bancaria o billetera a nombre del SUSCRIPTOR cuando se procesen pagos mediante la Plataforma.{'\n\n'}
          La PLATAFORMA podrá pausar la cuenta mientras un requisito obligatorio esté vencido, incompleto o bajo verificación razonable.
        </Text>
      </Clause>

      <Clause title="5. CÓDIGO ALFANUMÉRICO DE IDENTIFICACIÓN OPERATIVA">
        <Text style={styles.clauseBody}>
          Al activar la cuenta, la PLATAFORMA asignará al SUSCRIPTOR un Código Alfanumérico único, personal y no transferible para identificarlo ante los Usuarios Pasajeros sin revelar su identidad legal completa. El código incluirá la modalidad de transporte, las dos primeras letras del apellido del SUSCRIPTOR y caracteres alfanuméricos aleatorios.{'\n\n'}
          Ejemplos: MT-GO-482 (Moto) / SD-RA-731 (Auto) / SV-LI-615 (SUV) / VN-AN-902 (Van) / PU-PE-247 (Pick-Up).{'\n\n'}
          La PLATAFORMA conservará internamente la identidad legal completa del SUSCRIPTOR para fines contractuales, tributarios, de seguridad y requerimientos de autoridades competentes. El SUSCRIPTOR no podrá modificar, prestar, vender, transferir ni compartir su Código Alfanumérico.
        </Text>
      </Clause>

      <Clause title="6. MEMBRESÍA, PRECIO Y RENOVACIÓN">
        <Text style={styles.clauseBody}>
          Precio semanal: <Text style={styles.bold}>USD 10,00</Text>. Fecha de pago ordinario: viernes. El período de Membresía va desde las 00:00:00 horas del sábado siguiente hasta las 23:59:59 horas del viernes siguiente. La hora oficial será la registrada por los servidores de la PLATAFORMA.{'\n\n'}
          El precio corresponde exclusivamente al acceso tecnológico y no constituye descuento salarial, pago laboral ni anticipo de ingresos. Si el SUSCRIPTOR no realiza el pago al vencimiento, la PLATAFORMA podrá limitar el acceso hasta regularizar la obligación. La PLATAFORMA notificará cualquier cambio de precio con anticipación razonable.
        </Text>
      </Clause>

      <Clause title="7. DISPONIBILIDAD, RECHAZOS Y CALIDAD">
        <Text style={styles.clauseBody}>
          El SUSCRIPTOR decide libremente cuándo activar o desactivar su estado de "Disponible". No existe obligación de conexión, horario ni permanencia mínima. La PLATAFORMA podrá registrar indicadores objetivos de Solicitudes recibidas, aceptadas, rechazadas y canceladas, y tiempos de respuesta.{'\n\n'}
          No se computarán como rechazos válidos: error técnico de la Aplicación, Solicitud duplicada, pasajero bloqueado por el SUSCRIPTOR, información esencial incompleta, punto de recogida o destino fuera de la configuración seleccionada, distancia superior al límite informado, emergencia, riesgo razonable, caso fortuito o fuerza mayor.
        </Text>
      </Clause>

      <Clause title="8. RESTRICCIÓN POR 15 RECHAZOS">
        <Text style={styles.clauseBody}>
          Si el SUSCRIPTOR acumula quince (15) rechazos válidos y computables antes del vencimiento de su Período de Membresía, la PLATAFORMA podrá restringir inmediatamente la recepción de nuevas Solicitudes y el uso operativo de la Aplicación hasta el final del período en curso.{'\n\n'}
          La PLATAFORMA acreditará al SUSCRIPTOR los <Text style={styles.bold}>Días Restituibles</Text>, equivalentes a los días calendario completos restantes desde la restricción hasta el viernes de vencimiento. No habrá devolución de dinero. Los Días Restituibles otorgarán acceso posterior sin pago adicional, siempre que la cuenta y documentación estén vigentes.{'\n\n'}
          Ejemplo: si el SUSCRIPTOR alcanza quince rechazos un lunes, será restringido ese lunes. Los días martes, miércoles, jueves y viernes que faltaban serán Días Restituibles. La cuenta se reactivará el martes de la semana siguiente.{'\n\n'}
          El SUSCRIPTOR podrá solicitar revisión dentro de las 48 horas siguientes. Los Días Restituibles son personales, no transferibles, no canjeables por dinero y no acumulables con otras promociones.
        </Text>
      </Clause>

      <Clause title="9. PRESENTACIÓN, EQUIPOS E IDENTIDAD VISUAL">
        <Text style={styles.clauseBody}>
          El SUSCRIPTOR mantendrá una presentación limpia, segura, respetuosa y compatible con la prestación de transporte de pasajeros.{'\n\n'}
          <Text style={styles.bold}>Modalidad motocicleta o mototaxi:</Text> casco adecuado para el conductor, casco adecuado para el pasajero, chaleco reflectivo, elementos exigidos por autoridad competente e identificación visual permitida por la PLATAFORMA.{'\n\n'}
          <Text style={styles.bold}>Modalidad taxi o automóvil:</Text> placa visible, documentos vigentes, seguro vigente, identificación y señalización exigida por la autoridad competente y elementos de identidad visual aprobados por la PLATAFORMA cuando correspondan.{'\n\n'}
          La PLATAFORMA no exigirá artículos no publicados previamente en el Catálogo Oficial de Identificación y Seguridad. El SUSCRIPTOR no podrá usar logos o emblemas alterados, deteriorados, no autorizados o que oculten placas, luces o señalización oficial.
        </Text>
      </Clause>

      <Clause title="10. MARCA, RETIRO Y DEVOLUCIÓN">
        <Text style={styles.clauseBody}>
          La Empresa conserva la titularidad exclusiva de sus marcas, logos, emblemas, QR, credenciales, colores y demás signos distintivos. La licencia de uso de marca termina automáticamente cuando la Membresía vence sin pago, la cuenta se desactiva o suspende, o la PLATAFORMA revoca el acceso por razones de seguridad o incumplimiento grave.{'\n\n'}
          Desde la terminación, el SUSCRIPTOR deberá retirar stickers, QR, credenciales y emblemas removibles, cubrir permanentemente los no removibles sin afectar la seguridad del equipo, y abstenerse de presentarse como conductor activo o afiliado autorizado.{'\n\n'}
          Los bienes entregados en préstamo, comodato o custodia deberán devolverse dentro de cinco (5) días hábiles siguientes a la terminación. Todo bien entregado deberá constar en Acta de Entrega e Inventario con fotografías, seriales, estado y valor de reposición.
        </Text>
      </Clause>

      <Clause title="11. OBLIGACIONES DEL SUSCRIPTOR">
        <Text style={styles.clauseBody}>
          El SUSCRIPTOR se obliga a:{'\n\n'}
          • Mantener documentos auténticos y vigentes.{'\n'}
          • Conservar la Unidad en condiciones mecánicas, sanitarias y de seguridad adecuadas.{'\n'}
          • Cumplir las normas de tránsito, transporte, seguros, tributos, permisos y autoridades aplicables.{'\n'}
          • No conducir bajo efectos de alcohol, drogas o sustancias que afecten sus capacidades.{'\n'}
          • Tratar con respeto a pasajeros, terceros, otros conductores y personal de soporte.{'\n'}
          • No acosar, amenazar, discriminar, agredir ni realizar actos inseguros.{'\n'}
          • No permitir que otra persona use su cuenta.{'\n'}
          • No alterar GPS, ubicación, identidad, datos del vehículo, pagos ni calificaciones.{'\n'}
          • Reportar accidentes, incidentes, objetos perdidos, cambios de Unidad y documentos vencidos.{'\n'}
          • Asumir costos de vehículo, combustible, mantenimiento, teléfono, seguros, impuestos, multas, peajes y demás gastos propios.{'\n'}
          • Cooperar razonablemente con investigaciones de seguridad relacionadas con viajes gestionados por la Aplicación.
        </Text>
      </Clause>

      <Clause title="12. PAGOS Y FACTURACIÓN">
        <Text style={styles.clauseBody}>
          El Usuario Pasajero paga directamente al SUSCRIPTOR. La PLATAFORMA solo proporciona tecnología. Los importes recibidos por viajes corresponden a la actividad independiente del SUSCRIPTOR y no constituyen salario pagado por la PLATAFORMA.{'\n\n'}
          La PLATAFORMA emitirá el comprobante que corresponda por Membresía y cargos tecnológicos propios. El SUSCRIPTOR será responsable de sus comprobantes, facturación, declaraciones e impuestos por los servicios de transporte cuando legalmente corresponda.
        </Text>
      </Clause>

      <Clause title="13. NO ELUSIÓN Y DATOS DE PASAJEROS">
        <Text style={styles.clauseBody}>
          Los datos de identidad, contacto, ubicación, Solicitud, destino, historial y preferencias de pasajeros se suministran únicamente para evaluar, aceptar y ejecutar Solicitudes gestionadas mediante la Aplicación. El SUSCRIPTOR no podrá usar esos datos para ofrecer, negociar o ejecutar servicios por fuera de la PLATAFORMA cuando la oportunidad se origine en una Solicitud o dato proporcionado por ella.{'\n\n'}
          El SUSCRIPTOR no podrá solicitar a pasajeros teléfono personal, redes sociales, dirección, datos bancarios ni información personal cuando el propósito sea concretar contrataciones futuras fuera de la Aplicación. Esta regla no impide comunicaciones estrictamente necesarias para el viaje activo, emergencias, objetos perdidos u obligación legal.
        </Text>
      </Clause>

      <Clause title="14. SEGURIDAD, DATOS Y RESPONSABILIDAD">
        <Text style={styles.clauseBody}>
          El SUSCRIPTOR cooperará razonablemente con investigaciones de seguridad relacionadas con viajes gestionados en la Aplicación. Ante una emergencia, deberá priorizar la vida e integridad de las personas y contactar servicios públicos o autoridades cuando sea necesario.{'\n\n'}
          La PLATAFORMA podrá limitar inmediatamente el acceso ante indicios razonables de riesgo grave, fraude, agresión, suplantación, documento falso, conducción insegura, uso no autorizado de marca u orden de autoridad competente.{'\n\n'}
          El SUSCRIPTOR autoriza el tratamiento de sus datos de identidad, documentos, ubicación, rutas, Solicitudes, pagos, calificaciones e incidencias para operar la Aplicación, prevenir fraude, proteger usuarios, resolver reclamos, cumplir obligaciones legales y atender requerimientos de autoridades. La PLATAFORMA no garantiza disponibilidad continua ni resultado económico. El SUSCRIPTOR responde por la conducción, Unidad, permisos e infracciones.
        </Text>
      </Clause>

      <Clause title="15. NO RENUNCIA, LEY Y ACEPTACIÓN">
        <Text style={styles.clauseBody}>
          Nada de este contrato se interpretará como renuncia, limitación o menoscabo de derechos irrenunciables. Este contrato se regirá por las leyes de la República Bolivariana de Venezuela. Las PARTES procurarán resolver cualquier controversia mediante comunicación directa; de no alcanzar acuerdo, serán competentes los tribunales que correspondan conforme a la ley.{'\n\n'}
          Forman parte de este contrato: Política de Privacidad, Política de Seguridad, Política de Calidad y Cancelaciones, Tabla de Membresías, Política de Pagos, Política de Objetos Perdidos, Catálogo Oficial de Identificación y Seguridad, Manual de Identidad Visual, Acta de Entrega e Inventario y Requisitos documentales publicados en la Aplicación.
        </Text>
      </Clause>

      <Text style={styles.declaration}>
        EL SUSCRIPTOR declara que ha leído, comprendido y acepta voluntariamente el presente contrato y sus anexos en su totalidad.
      </Text>
      <Text style={styles.dateText}>Lugar y fecha: Venezuela, {dateStr}</Text>

      <TouchableOpacity style={styles.pdfBtn} onPress={handleDownloadPDF}>
        <Text style={styles.pdfBtnText}>📄 Descargar contrato en PDF</Text>
      </TouchableOpacity>

      {!contractSignedAt ? (
        <View style={styles.signSection}>
          <Text style={styles.signLabel}>Firma del Suscriptor</Text>
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
          <TouchableOpacity
            style={styles.resignBtn}
            onPress={() => setContractSignedAt(null)}
          >
            <Text style={styles.resignBtnText}>Volver a firmar</Text>
          </TouchableOpacity>
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
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F9FAFB' },
  content:     { padding: 20, paddingTop: Platform.OS === 'android' ? 48 : 60 },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },

  backBtn:     { marginBottom: 16 },
  backText:    { fontSize: 15, color: BRAND.PRIMARY, fontWeight: '600' },

  mainTitle:   { fontSize: 16, fontWeight: '800', color: BRAND.PRIMARY, textAlign: 'center', marginBottom: 6 },
  subTitle:    { fontSize: 11, color: BRAND.ACCENT, textAlign: 'center', marginBottom: 4, lineHeight: 17 },
  version:     { fontSize: 11, color: BRAND.GRAY, textAlign: 'center', marginBottom: 20 },

  signedBadge:     { backgroundColor: '#D1FAE5', borderRadius: 10, padding: 10, marginBottom: 16 },
  signedBadgeText: { color: '#065F46', fontSize: 13, fontWeight: '600', textAlign: 'center' },

  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: BRAND.PRIMARY,
    marginTop: 20, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  bodyText:    { fontSize: 12, color: '#374151', lineHeight: 19, marginBottom: 8 },
  bold:        { fontWeight: '700' },

  fieldRow:    { flexDirection: 'row', paddingVertical: 4, gap: 8 },
  fieldLabel:  { fontSize: 13, fontWeight: '600', color: BRAND.GRAY, width: 70 },
  fieldValue:  { fontSize: 13, color: BRAND.TEXT, flex: 1 },

  clause:      { marginBottom: 14 },
  clauseTitle: { fontSize: 12, fontWeight: '700', color: BRAND.PRIMARY, marginBottom: 6 },
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
  clearBtn:        { alignSelf: 'flex-end', marginTop: 6, padding: 6 },
  clearBtnText:    { fontSize: 13, color: BRAND.GRAY },
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
  resignBtn:         { marginTop: 8, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E1' },
  resignBtnText:     { fontSize: 13, color: BRAND.GRAY },
});
