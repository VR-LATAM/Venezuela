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
  body{font-family:Arial,sans-serif;font-size:11pt;color:#1F2937;margin:0;padding:0;line-height:1.6}
  h1{color:#1E3A8A;font-size:13pt;text-align:center;margin-bottom:2px}
  h2{color:#0D9488;font-size:10pt;text-align:center;margin-top:0;margin-bottom:2px}
  h4{color:#6B7280;font-size:9pt;text-align:center;margin-top:0;font-weight:normal}
  h3{color:#1E3A8A;font-size:10pt;margin-top:16px;margin-bottom:4px}
  h5{color:#1E3A8A;font-size:10pt;margin-top:12px;margin-bottom:2px}
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
<p><b>VERONA Technology Group C.A.</b>, sociedad mercantil constituida conforme a las leyes de la República Bolivariana de Venezuela, inscrita ante el Registro Mercantil, domiciliada en Venezuela, en adelante denominada la <b>"PLATAFORMA"</b>.</p>
<p>Y por la otra, el SUSCRIPTOR cuyos datos se indican a continuación, en adelante denominado el <b>"SUSCRIPTOR"</b>. Conjuntamente las "PARTES", convienen en celebrar el presente contrato.</p>

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
<p><b>Servicio de Transporte:</b> traslado material que el SUSCRIPTOR decide aceptar y prestar directamente al Usuario Pasajero, por su propia cuenta, riesgo y responsabilidad, sujeto a la normativa aplicable.</p>
<p><b>Unidad:</b> automóvil, motocicleta u otro vehículo legalmente habilitado y registrado por el SUSCRIPTOR en la Aplicación.</p>
<p><b>Código Operativo:</b> identificador público alfanumérico asignado por la PLATAFORMA para mostrar al SUSCRIPTOR ante pasajeros sin divulgar innecesariamente su identidad legal completa.</p>
<p><b>Días Restituibles:</b> crédito de acceso no monetario correspondiente a los días completos de Membresía pendientes luego de una restricción por rechazos válidos.</p>

<h3>2. OBJETO</h3>
<p>La PLATAFORMA otorga al SUSCRIPTOR una licencia limitada, personal, no exclusiva, no transferible, revocable y condicionada para utilizar las funcionalidades habilitadas de la Aplicación. Según el plan contratado, la Membresía podrá incluir:</p>
<ul>
  <li>Perfil profesional de conductor.</li>
  <li>Recepción y gestión de Solicitudes.</li>
  <li>Geolocalización.</li>
  <li>Mensajería interna.</li>
  <li>Historial de viajes.</li>
  <li>Herramientas de seguridad.</li>
  <li>Soporte técnico.</li>
  <li>Sistema de calificaciones.</li>
  <li>Campañas comerciales opcionales.</li>
  <li>Procesamiento tecnológico de pagos, cuando aplique.</li>
  <li>Módulos adicionales expresamente habilitados.</li>
</ul>
<p>La PLATAFORMA presta tecnología y no garantiza al SUSCRIPTOR cantidad mínima de Solicitudes, pasajeros, ingresos, ganancias, rentabilidad, zona exclusiva, horas de actividad ni disponibilidad ininterrumpida.</p>

<h3>3. NATURALEZA COMERCIAL</h3>
<p>El presente contrato regula una relación de suscripción a servicios tecnológicos. El SUSCRIPTOR contrata y paga a la PLATAFORMA por el uso de herramientas digitales. El SUSCRIPTOR declara que no recibe de la PLATAFORMA:</p>
<ul>
  <li>Salario.</li><li>Sueldo.</li><li>Vacaciones.</li><li>Bono vacacional.</li>
  <li>Utilidades.</li><li>Prestaciones sociales.</li><li>Cestaticket.</li>
  <li>Pago de horas extras.</li><li>Ingreso mínimo garantizado.</li>
  <li>Pago por tiempo de disponibilidad.</li>
</ul>
<p>La PLATAFORMA no fija jornada, turnos, guardias, cuota mínima de horas, cuota mínima de viajes, ruta obligatoria ni exclusividad. El SUSCRIPTOR puede desarrollar actividades para sí, clientes directos, otras aplicaciones o terceros, siempre que no utilice datos, marcas o información de usuarios obtenidos mediante la PLATAFORMA para eludirla.</p>
<p>Al aceptar una Solicitud, el SUSCRIPTOR podrá celebrar directamente un contrato de transporte con el Usuario Pasajero. La PLATAFORMA no es parte de dicho contrato de transporte, salvo que una norma imperativa o documento específico aplicable indique lo contrario.</p>
<p>Nada en esta cláusula implica renuncia a derechos irrenunciables ni impide que una autoridad competente califique la relación conforme a los hechos reales y la legislación aplicable.</p>

<h3>4. IDENTIDAD LEGAL Y REQUISITOS</h3>
<p>El SUSCRIPTOR deberá suministrar su identidad legal completa, real, vigente y verificable para fines contractuales, administrativos, tributarios, de pagos, seguros, permisos, seguridad, incidentes, requerimientos de autoridades y demás fines legítimos. Antes de activar la cuenta deberá presentar y mantener vigentes:</p>
<ul>
  <li>Cédula de identidad venezolana vigente o pasaporte vigente.</li>
  <li>RIF vigente.</li>
  <li>Correo electrónico y teléfono verificables.</li>
  <li>Fotografía o verificación facial.</li>
  <li>Licencia de conducir vigente con categoría apropiada.</li>
  <li>Certificado médico vial o equivalente, si resulta exigible.</li>
  <li>Documento de propiedad, matrícula, certificado de origen o posesión legítima de la Unidad.</li>
  <li>Placa, marca, modelo, color, año y demás datos de la Unidad.</li>
  <li>Seguro de responsabilidad civil o cobertura exigible vigente.</li>
  <li>Permiso, habilitación de taxi, mototaxi u otra autorización exigida por el INTT, alcaldía u autoridad competente según modalidad y localidad.</li>
  <li>Cuenta bancaria o billetera a nombre del SUSCRIPTOR cuando se procesen pagos mediante la Plataforma.</li>
  <li>Constancia de domicilio, cuando sea razonablemente requerida por seguridad, prevención de fraude o cumplimiento legal.</li>
  <li>Documentos tributarios o de facturación cuando legalmente correspondan.</li>
</ul>
<p>La PLATAFORMA podrá pausar la cuenta mientras un requisito obligatorio esté vencido, incompleto, inconsistente o bajo verificación razonable.</p>

<h3>5. CÓDIGO ALFANUMÉRICO DE IDENTIFICACIÓN OPERATIVA</h3>
${driver?.operative_code ? `<p style="background:#EFF6FF;border:1.5px solid #1E3A8A;border-radius:8px;padding:12px;text-align:center;font-size:13pt"><b>Código asignado al SUSCRIPTOR: <span style="font-size:16pt;color:#1E3A8A;letter-spacing:2px">${driver.operative_code}</span></b></p>` : ''}
<h5>5.1. Asignación del código</h5>
<p>Al momento de activar la cuenta, la PLATAFORMA asignará al SUSCRIPTOR un Código Alfanumérico de Identificación Operativa, único, personal, no transferible y verificable dentro de la Aplicación.</p>
<h5>5.2. Finalidad</h5>
<p>El Código Alfanumérico será utilizado para identificar públicamente al SUSCRIPTOR ante los Usuarios Pasajeros, sin necesidad de mostrar su nombre legal completo, cédula, RIF, licencia, domicilio, teléfono, cuenta bancaria u otros datos personales no necesarios para la ejecución del viaje.</p>
<h5>5.3. Estructura del código</h5>
<p>El Código Alfanumérico está compuesto por: modalidad de transporte, las dos primeras letras del apellido del SUSCRIPTOR y caracteres alfanuméricos aleatorios generados por la PLATAFORMA.</p>
<h5>5.4. Ejemplos</h5>
<ul>
  <li>Motocicleta: <b>MT-GO-482</b></li>
  <li>Sedán: <b>SD-RA-731</b></li>
  <li>SUV: <b>SV-LI-615</b></li>
  <li>Van: <b>VN-AN-902</b></li>
  <li>Pick-Up: <b>PU-PE-247</b></li>
</ul>
<p>Los números finales son generados aleatoriamente y no corresponden a datos personales del SUSCRIPTOR.</p>
<h5>5.5. Información visible al pasajero</h5>
<p>Antes y durante el viaje, la Aplicación podrá mostrar al Usuario Pasajero:</p>
<ul>
  <li>Código Alfanumérico del SUSCRIPTOR.</li>
  <li>Foto verificada del SUSCRIPTOR.</li>
  <li>Placa de la Unidad.</li>
  <li>Marca, modelo, color y tipo de Unidad.</li>
  <li>Código QR de verificación.</li>
  <li>Estado de la cuenta: "Activo y verificado".</li>
  <li>Calificación y demás información que la PLATAFORMA habilite.</li>
</ul>
<h5>5.6. Identidad legal interna</h5>
<p>La PLATAFORMA conservará internamente la identidad legal completa del SUSCRIPTOR, junto con sus documentos, licencias, permisos, datos de pago y demás información necesaria para fines contractuales, tributarios, de seguridad, requerimientos de autoridades y cumplimiento normativo.</p>
<h5>5.7. Restricciones de uso</h5>
<p>El SUSCRIPTOR no podrá modificar, copiar, prestar, vender, transferir, compartir o permitir que otra persona utilice su Código Alfanumérico para operar una Unidad, recibir Solicitudes, identificarse ante pasajeros o representar a la PLATAFORMA.</p>
<h5>5.8. Revocación y cambio</h5>
<p>La PLATAFORMA podrá modificar, suspender, revocar o reasignar el Código Alfanumérico cuando: la Membresía venza o no sea renovada; la cuenta sea suspendida o desactivada; exista fraude, suplantación o riesgo de seguridad; se modifique la Unidad registrada; se detecte uso indebido de marca; o sea necesario proteger a usuarios, conductores o la identidad empresarial de la PLATAFORMA.</p>
<h5>5.9. Estado de cuenta inactiva</h5>
<p>Cuando un Código Alfanumérico sea revocado, la Aplicación podrá mostrar el mensaje: <i>"Este código no corresponde actualmente a un conductor o Unidad activa y verificada en la Plataforma. Por seguridad, solicite viajes únicamente mediante perfiles mostrados en la Aplicación."</i></p>
<p>El código protege la privacidad del conductor frente al pasajero, mientras que la PLATAFORMA conserva sus datos reales para contrato, seguridad, seguros y autoridades.</p>

<h3>6. MEMBRESÍA, PRECIO Y RENOVACIÓN</h3>
<p>El SUSCRIPTOR contrata la Membresía según el tipo de Unidad registrada:</p>
<ul>
  <li>Motocicleta: <b>USD 15,00/semana</b></li>
  <li>Sedán: <b>USD 25,00/semana</b></li>
  <li>SUV: <b>USD 30,00/semana</b></li>
  <li>Pick-Up: <b>USD 35,00/semana</b></li>
  <li>Plataforma/Carga: <b>USD 40,00/semana</b></li>
</ul>
<p>Fecha de pago ordinario: viernes. El período de Membresía va desde las 00:00:00 horas del sábado siguiente hasta las 23:59:59 horas del viernes siguiente. La hora oficial será la registrada por los servidores de la PLATAFORMA.</p>
<p>El precio corresponde exclusivamente al acceso tecnológico y no constituye descuento salarial ni pago laboral. Si el SUSCRIPTOR no realiza el pago al vencimiento, la PLATAFORMA podrá limitar el acceso hasta regularizar la obligación. La PLATAFORMA notificará cualquier cambio de precio con anticipación razonable.</p>

<h3>7. DISPONIBILIDAD, RECHAZOS Y CALIDAD</h3>
<p>El SUSCRIPTOR decide libremente cuándo activar o desactivar su estado de "Disponible". No existe obligación de conexión, horario ni permanencia mínima. La PLATAFORMA podrá registrar indicadores objetivos relacionados con:</p>
<ul>
  <li>Solicitudes válidas recibidas.</li><li>Solicitudes aceptadas.</li>
  <li>Solicitudes rechazadas.</li><li>Solicitudes canceladas.</li>
  <li>Tiempo de respuesta.</li><li>Llegada al punto de recogida.</li>
  <li>Reportes de seguridad.</li><li>Incidentes.</li><li>Calificaciones verificables.</li>
</ul>
<p>No se computarán como rechazos válidos: error técnico de la Aplicación, Solicitud duplicada, pasajero bloqueado por el SUSCRIPTOR, información esencial incompleta, punto de recogida o destino fuera de la configuración seleccionada, distancia superior al límite informado, emergencia, riesgo razonable, caso fortuito o fuerza mayor.</p>
<p>Las medidas previstas en esta cláusula son controles de acceso, calidad, seguridad y confiabilidad del servicio tecnológico. No deberán comunicarse como despido, permiso, falta laboral, amonestación laboral o sanción laboral.</p>

<h3>8. RESTRICCIÓN POR 15 RECHAZOS</h3>
<p>Cada Membresía semanal se paga el día viernes y otorga acceso desde las 00:00:00 horas del sábado siguiente hasta las 23:59:59 horas del viernes siguiente. Este será el Período de Membresía.</p>
<p>Si el SUSCRIPTOR acumula quince (15) rechazos válidos y computables antes del vencimiento de su Período de Membresía, la PLATAFORMA podrá restringir inmediatamente la recepción de nuevas Solicitudes y el uso operativo de la Aplicación hasta el final del período en curso.</p>
<p>La PLATAFORMA acreditará al SUSCRIPTOR los <b>Días Restituibles</b>, equivalentes a los días calendario completos restantes desde la restricción hasta el viernes de vencimiento. No habrá devolución de dinero. Los Días Restituibles otorgarán acceso posterior sin pago adicional, siempre que la cuenta y documentación estén vigentes.</p>
<p>El acceso se reactivará el día de la semana inmediatamente posterior al día en que se activó la restricción, pero en la semana calendario siguiente.</p>
<p><b>Ejemplo:</b> si el SUSCRIPTOR alcanza quince rechazos un lunes, será restringido desde ese lunes. Los días martes, miércoles, jueves y viernes que faltaban serán Días Restituibles. Su cuenta se reactivará el martes de la semana siguiente.</p>
<p>El SUSCRIPTOR podrá solicitar revisión dentro de las cuarenta y ocho (48) horas siguientes a la medida. Los Días Restituibles son personales, no transferibles, no canjeables por dinero y no acumulables con otras promociones. Caducarán si el SUSCRIPTOR no mantiene los requisitos documentales, de seguridad o pago aplicables.</p>

<h3>9. PRESENTACIÓN, EQUIPOS E IDENTIDAD VISUAL</h3>
<p>El SUSCRIPTOR mantendrá una presentación limpia, segura, respetuosa y compatible con la prestación de transporte de pasajeros.</p>
<p><b>Modalidad motocicleta o mototaxi:</b></p>
<ul>
  <li>Casco adecuado para el conductor.</li>
  <li>Casco adecuado para el pasajero.</li>
  <li>Chaleco reflectivo.</li>
  <li>Elementos exigidos por autoridad competente.</li>
  <li>Identificación visual permitida por la PLATAFORMA.</li>
</ul>
<p><b>Modalidad taxi o automóvil:</b></p>
<ul>
  <li>Placa visible.</li>
  <li>Documentos y seguro vigentes.</li>
  <li>Identificación y señalización exigida por la autoridad competente.</li>
  <li>Elementos de identidad visual aprobados por la PLATAFORMA cuando correspondan.</li>
</ul>
<p>El SUSCRIPTOR podrá adquirir accesorios conforme al Catálogo Oficial de Identificación y Seguridad publicado por la PLATAFORMA. La PLATAFORMA no exigirá artículos no publicados previamente. El SUSCRIPTOR no podrá usar logos o emblemas alterados, deteriorados, no autorizados o que oculten placas, luces o señalización oficial.</p>

<h3>10. MARCA, RETIRO Y DEVOLUCIÓN</h3>
<p>La Empresa conserva la titularidad exclusiva de sus marcas, logos, emblemas, QR, credenciales, colores y demás signos distintivos. La licencia de uso de marca termina automáticamente cuando la Membresía vence sin pago, la cuenta se desactiva, se suspende, o la PLATAFORMA revoca el acceso por razones de seguridad o incumplimiento grave.</p>
<p>Desde la terminación, el SUSCRIPTOR deberá: retirar stickers, QR, credenciales y emblemas removibles; cubrir permanentemente los no removibles sin afectar la seguridad del equipo; y abstenerse de presentarse como conductor activo o afiliado autorizado.</p>
<p>Respecto de artículos comprados por el SUSCRIPTOR con recursos propios, podrá conservarlos, pero deberá retirar o cubrir los distintivos de la PLATAFORMA y dejar de usarlos como señal de afiliación activa.</p>
<p>Los bienes entregados en préstamo o comodato deberán devolverse dentro de cinco (5) días hábiles siguientes a la terminación. Todo bien entregado deberá constar en Acta de Entrega e Inventario con fotografías, seriales, estado y valor de reposición.</p>
<p>Si existe riesgo de suplantación o uso no autorizado de marca, la PLATAFORMA podrá revocar QR, revocar credencial digital, desactivar perfil, desvincular placa y ejercer las acciones legales que correspondan.</p>

<h3>11. OBLIGACIONES DEL SUSCRIPTOR</h3>
<p>El SUSCRIPTOR se obliga a:</p>
<ul>
  <li>Mantener documentos auténticos y vigentes.</li>
  <li>Conservar la Unidad en condiciones mecánicas, sanitarias y de seguridad adecuadas.</li>
  <li>Cumplir las normas de tránsito, transporte, seguros, tributos, permisos y autoridades aplicables.</li>
  <li>No conducir bajo efectos de alcohol, drogas o sustancias que afecten sus capacidades.</li>
  <li>Tratar con respeto a pasajeros, terceros, otros conductores y personal de soporte.</li>
  <li>No acosar, amenazar, discriminar, agredir ni realizar actos inseguros.</li>
  <li>No permitir que otra persona use su cuenta.</li>
  <li>No alterar GPS, ubicación, identidad, datos del vehículo, pagos, promociones, calificaciones o sistemas.</li>
  <li>Reportar accidentes, incidentes, objetos perdidos, cambios de Unidad y documentos vencidos.</li>
  <li>Asumir costos de vehículo, combustible o electricidad, mantenimiento, teléfono, seguros, impuestos, multas, peajes y demás gastos propios de su actividad.</li>
  <li>Cooperar razonablemente con investigaciones de seguridad relacionadas con viajes gestionados por la Aplicación.</li>
</ul>

<h3>12. PAGOS Y FACTURACIÓN</h3>
<p>El Usuario Pasajero paga directamente al SUSCRIPTOR. La PLATAFORMA solo proporciona tecnología. Los importes recibidos por viajes corresponden a la actividad independiente del SUSCRIPTOR y no constituyen salario pagado por la PLATAFORMA.</p>
<p>La PLATAFORMA emitirá el comprobante que corresponda por: Membresía; cargos tecnológicos propios; equipos vendidos, si aplica; y otros servicios propios. El SUSCRIPTOR será responsable de sus comprobantes, facturación, declaraciones e impuestos por los servicios de transporte cuando legalmente corresponda.</p>

<h3>13. NO ELUSIÓN Y DATOS DE PASAJEROS</h3>
<p>Los datos de identidad, contacto, ubicación, Solicitud, destino, historial y preferencias de pasajeros se suministran únicamente para evaluar, aceptar y ejecutar Solicitudes gestionadas mediante la Aplicación. El SUSCRIPTOR no podrá copiar, almacenar fuera de la Aplicación, divulgar, vender o usar esos datos para ofrecer servicios por fuera de la PLATAFORMA cuando la oportunidad se origine en una Solicitud o dato proporcionado por ella.</p>
<p>El SUSCRIPTOR no podrá solicitar a pasajeros:</p>
<ul>
  <li>Teléfono personal.</li><li>Redes sociales.</li><li>Dirección.</li>
  <li>Datos bancarios o medios de pago.</li><li>Información personal.</li>
</ul>
<p>Cuando el propósito sea concretar contrataciones futuras fuera de la Aplicación. Esta regla no impide comunicaciones estrictamente necesarias para el viaje activo, emergencias, objetos perdidos u obligación legal.</p>

<h3>14. SEGURIDAD, DATOS Y RESPONSABILIDAD</h3>
<p>El SUSCRIPTOR cooperará razonablemente con investigaciones de seguridad relacionadas con viajes gestionados en la Aplicación. Ante una emergencia, deberá priorizar la vida e integridad de las personas y contactar servicios públicos o autoridades cuando sea necesario.</p>
<p>La PLATAFORMA podrá limitar inmediatamente el acceso ante indicios razonables de:</p>
<ul>
  <li>Riesgo grave.</li><li>Fraude.</li><li>Agresión.</li><li>Suplantación.</li>
  <li>Documento falso.</li><li>Conducción insegura.</li>
  <li>Uso no autorizado de marca.</li><li>Orden de autoridad competente.</li>
</ul>
<p>El SUSCRIPTOR autoriza el tratamiento de sus datos de identidad, documentos, ubicación, rutas, Solicitudes, pagos, calificaciones e incidencias para:</p>
<ul>
  <li>Operar la Aplicación.</li><li>Prevenir fraude.</li><li>Proteger usuarios.</li>
  <li>Resolver reclamos.</li><li>Cumplir obligaciones legales.</li>
  <li>Mejorar el servicio.</li><li>Atender requerimientos de autoridades competentes.</li>
</ul>
<p>La aceptación electrónica del contrato se registrará con fecha, hora, versión contractual, identificador de usuario, dispositivo y demás evidencia técnica razonable de atribución. La PLATAFORMA no garantiza disponibilidad continua ni resultado económico. El SUSCRIPTOR responde por la conducción, Unidad, permisos e infracciones.</p>

<h3>15. NO RENUNCIA, LEY Y ACEPTACIÓN</h3>
<p>Nada de este contrato se interpretará como renuncia, limitación o menoscabo de derechos irrenunciables. Este contrato se regirá por las leyes de la República Bolivariana de Venezuela. Las PARTES procurarán resolver cualquier controversia mediante comunicación directa; de no alcanzar acuerdo, serán competentes los tribunales que correspondan conforme a la ley.</p>
<p>Forman parte de este contrato:</p>
<ul>
  <li>Política de Privacidad.</li>
  <li>Política de Seguridad.</li>
  <li>Política de Calidad y Cancelaciones.</li>
  <li>Tabla de Membresías.</li>
  <li>Política de Pagos.</li>
  <li>Política de Objetos Perdidos.</li>
  <li>Catálogo Oficial de Identificación y Seguridad.</li>
  <li>Manual de Identidad Visual.</li>
  <li>Acta de Entrega e Inventario.</li>
  <li>Requisitos documentales publicados en la Aplicación.</li>
</ul>

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
        Y por la otra, el SUSCRIPTOR cuyos datos se indican a continuación, en adelante denominado el <Text style={styles.bold}>"SUSCRIPTOR"</Text>. Conjuntamente las "PARTES", convienen en celebrar el presente contrato.
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
        <BulletItem label="Aplicación o Plataforma:" text="software, aplicación móvil, portal web, interfaces, mensajería, geolocalización, módulos de seguridad, paneles administrativos y demás herramientas operadas bajo la marca VERONA Technology Group C.A." />
        <BulletItem label="Membresía o Suscripción:" text="servicio tecnológico pagado que permite al SUSCRIPTOR acceder a las funcionalidades del plan contratado durante un período definido." />
        <BulletItem label="Solicitud:" text="petición de traslado generada por un Usuario Pasajero mediante la Aplicación." />
        <BulletItem label="Usuario Pasajero:" text="persona que utiliza la Aplicación para solicitar un traslado." />
        <BulletItem label="Servicio de Transporte:" text="traslado material que el SUSCRIPTOR decide aceptar y prestar directamente al Usuario Pasajero, por su propia cuenta, riesgo y responsabilidad, sujeto a la normativa aplicable." />
        <BulletItem label="Unidad:" text="automóvil, motocicleta u otro vehículo legalmente habilitado y registrado por el SUSCRIPTOR en la Aplicación." />
        <BulletItem label="Código Operativo:" text="identificador público alfanumérico asignado por la PLATAFORMA para mostrar al SUSCRIPTOR ante pasajeros sin divulgar innecesariamente su identidad legal completa." />
        <BulletItem label="Días Restituibles:" text="crédito de acceso no monetario correspondiente a los días completos de Membresía pendientes luego de una restricción por rechazos válidos." />
      </Clause>

      <Clause title="2. OBJETO">
        <Text style={styles.clauseBody}>La PLATAFORMA otorga al SUSCRIPTOR una licencia limitada, personal, no exclusiva, no transferible, revocable y condicionada para utilizar las funcionalidades habilitadas de la Aplicación. Según el plan contratado, la Membresía podrá incluir:</Text>
        {['Perfil profesional de conductor.','Recepción y gestión de Solicitudes.','Geolocalización.','Mensajería interna.','Historial de viajes.','Herramientas de seguridad.','Soporte técnico.','Sistema de calificaciones.','Campañas comerciales opcionales.','Procesamiento tecnológico de pagos, cuando aplique.','Módulos adicionales expresamente habilitados.'].map((item, i) => (
          <Text key={i} style={styles.listItem}>• {item}</Text>
        ))}
        <Text style={[styles.clauseBody, { marginTop: 8 }]}>La PLATAFORMA presta tecnología y no garantiza al SUSCRIPTOR cantidad mínima de Solicitudes, pasajeros, ingresos, ganancias, rentabilidad, zona exclusiva, horas de actividad ni disponibilidad ininterrumpida.</Text>
      </Clause>

      <Clause title="3. NATURALEZA COMERCIAL">
        <Text style={styles.clauseBody}>El presente contrato regula una relación de suscripción a servicios tecnológicos. El SUSCRIPTOR contrata y paga a la PLATAFORMA por el uso de herramientas digitales. El SUSCRIPTOR declara que no recibe de la PLATAFORMA:</Text>
        {['Salario.','Sueldo.','Vacaciones.','Bono vacacional.','Utilidades.','Prestaciones sociales.','Cestaticket.','Pago de horas extras.','Ingreso mínimo garantizado.','Pago por tiempo de disponibilidad.'].map((item, i) => (
          <Text key={i} style={styles.listItem}>• {item}</Text>
        ))}
        <Text style={[styles.clauseBody, { marginTop: 8 }]}>La PLATAFORMA no fija jornada, turnos, guardias, cuota mínima de horas, cuota mínima de viajes, ruta obligatoria ni exclusividad. El SUSCRIPTOR puede desarrollar actividades para sí, clientes directos, otras aplicaciones o terceros, siempre que no utilice datos, marcas o información de usuarios obtenidos mediante la PLATAFORMA para eludirla.</Text>
        <Text style={[styles.clauseBody, { marginTop: 6 }]}>Al aceptar una Solicitud, el SUSCRIPTOR podrá celebrar directamente un contrato de transporte con el Usuario Pasajero. La PLATAFORMA no es parte de dicho contrato de transporte, salvo que una norma imperativa o documento específico aplicable indique lo contrario.</Text>
        <Text style={[styles.clauseBody, { marginTop: 6 }]}>Nada en esta cláusula implica renuncia a derechos irrenunciables ni impide que una autoridad competente califique la relación conforme a los hechos reales y la legislación aplicable.</Text>
      </Clause>

      <Clause title="4. IDENTIDAD LEGAL Y REQUISITOS">
        <Text style={styles.clauseBody}>El SUSCRIPTOR deberá suministrar su identidad legal completa, real, vigente y verificable para fines contractuales, administrativos, tributarios, de pagos, seguros, permisos, seguridad, incidentes y requerimientos de autoridades. Antes de activar la cuenta deberá presentar y mantener vigentes:</Text>
        {[
          'Cédula de identidad venezolana vigente o pasaporte vigente.',
          'RIF vigente.',
          'Correo electrónico y teléfono verificables.',
          'Fotografía o verificación facial.',
          'Licencia de conducir vigente con categoría apropiada.',
          'Certificado médico vial o equivalente, si resulta exigible.',
          'Documento de propiedad, matrícula, certificado de origen o posesión legítima de la Unidad.',
          'Placa, marca, modelo, color, año y demás datos de la Unidad.',
          'Seguro de responsabilidad civil o cobertura exigible vigente.',
          'Permiso, habilitación de taxi, mototaxi u otra autorización exigida por el INTT, alcaldía u autoridad competente según modalidad y localidad.',
          'Cuenta bancaria o billetera a nombre del SUSCRIPTOR cuando se procesen pagos mediante la Plataforma.',
          'Constancia de domicilio, cuando sea razonablemente requerida por seguridad, prevención de fraude o cumplimiento legal.',
          'Documentos tributarios o de facturación cuando legalmente correspondan.',
        ].map((item, i) => (
          <Text key={i} style={styles.listItem}>• {item}</Text>
        ))}
        <Text style={[styles.clauseBody, { marginTop: 8 }]}>La PLATAFORMA podrá pausar la cuenta mientras un requisito obligatorio esté vencido, incompleto, inconsistente o bajo verificación razonable.</Text>
      </Clause>

      <Clause title="5. CÓDIGO ALFANUMÉRICO DE IDENTIFICACIÓN OPERATIVA">
        {driver?.operative_code && (
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>Código asignado al SUSCRIPTOR</Text>
            <Text style={styles.codeValue}>{driver.operative_code}</Text>
          </View>
        )}
        <Text style={styles.subClauseTitle}>5.1. Asignación del código</Text>
        <Text style={styles.clauseBody}>Al momento de activar la cuenta, la PLATAFORMA asignará al SUSCRIPTOR un Código Alfanumérico de Identificación Operativa, único, personal, no transferible y verificable dentro de la Aplicación.</Text>
        <Text style={styles.subClauseTitle}>5.2. Finalidad</Text>
        <Text style={styles.clauseBody}>El Código Alfanumérico será utilizado para identificar públicamente al SUSCRIPTOR ante los Usuarios Pasajeros, sin necesidad de mostrar su nombre legal completo, cédula, RIF, licencia, domicilio, teléfono, cuenta bancaria u otros datos personales no necesarios para la ejecución del viaje.</Text>
        <Text style={styles.subClauseTitle}>5.3. Estructura del código</Text>
        <Text style={styles.clauseBody}>El Código Alfanumérico está compuesto por: modalidad de transporte, las dos primeras letras del apellido del SUSCRIPTOR y caracteres alfanuméricos aleatorios generados por la PLATAFORMA.</Text>
        <Text style={styles.subClauseTitle}>5.4. Ejemplos</Text>
        {['Motocicleta: MT-GO-482','Sedán: SD-RA-731','SUV: SV-LI-615','Van: VN-AN-902','Pick-Up: PU-PE-247'].map((item, i) => (
          <Text key={i} style={styles.listItem}>• {item}</Text>
        ))}
        <Text style={[styles.clauseBody, { marginTop: 6 }]}>Los números finales son generados aleatoriamente y no corresponden a datos personales del SUSCRIPTOR.</Text>
        <Text style={styles.subClauseTitle}>5.5. Información visible al pasajero</Text>
        <Text style={styles.clauseBody}>Antes y durante el viaje, la Aplicación podrá mostrar al Usuario Pasajero:</Text>
        {['Código Alfanumérico del SUSCRIPTOR.','Foto verificada del SUSCRIPTOR.','Placa de la Unidad.','Marca, modelo, color y tipo de Unidad.','Código QR de verificación.','Estado de la cuenta: "Activo y verificado".','Calificación y demás información que la PLATAFORMA habilite.'].map((item, i) => (
          <Text key={i} style={styles.listItem}>• {item}</Text>
        ))}
        <Text style={styles.subClauseTitle}>5.6. Identidad legal interna</Text>
        <Text style={styles.clauseBody}>La PLATAFORMA conservará internamente la identidad legal completa del SUSCRIPTOR, junto con sus documentos, licencias, permisos, datos de pago y demás información necesaria para fines contractuales, tributarios, de seguridad, requerimientos de autoridades y cumplimiento normativo.</Text>
        <Text style={styles.subClauseTitle}>5.7. Restricciones de uso</Text>
        <Text style={styles.clauseBody}>El SUSCRIPTOR no podrá modificar, copiar, prestar, vender, transferir, compartir o permitir que otra persona utilice su Código Alfanumérico para operar una Unidad, recibir Solicitudes, identificarse ante pasajeros o representar a la PLATAFORMA.</Text>
        <Text style={styles.subClauseTitle}>5.8. Revocación y cambio</Text>
        <Text style={styles.clauseBody}>La PLATAFORMA podrá modificar, suspender, revocar o reasignar el Código Alfanumérico cuando: la Membresía venza o no sea renovada; la cuenta sea suspendida o desactivada; exista fraude, suplantación o riesgo de seguridad; se modifique la Unidad registrada; se detecte uso indebido de marca; o sea necesario proteger a usuarios, conductores o la identidad empresarial de la PLATAFORMA.</Text>
        <Text style={styles.subClauseTitle}>5.9. Estado de cuenta inactiva</Text>
        <Text style={styles.clauseBody}>Cuando un Código Alfanumérico sea revocado, la Aplicación podrá mostrar el mensaje: <Text style={{ fontStyle: 'italic' }}>"Este código no corresponde actualmente a un conductor o Unidad activa y verificada en la Plataforma. Por seguridad, solicite viajes únicamente mediante perfiles mostrados en la Aplicación."</Text></Text>
        <Text style={[styles.clauseBody, { marginTop: 6 }]}>El código protege la privacidad del conductor frente al pasajero, mientras que la PLATAFORMA conserva sus datos reales para contrato, seguridad, seguros y autoridades.</Text>
      </Clause>

      <Clause title="6. MEMBRESÍA, PRECIO Y RENOVACIÓN">
        <Text style={styles.clauseBody}>El SUSCRIPTOR contrata la Membresía según el tipo de Unidad registrada:</Text>
        {['Motocicleta: USD 15,00/semana','Sedán: USD 25,00/semana','SUV: USD 30,00/semana','Pick-Up: USD 35,00/semana','Plataforma/Carga: USD 40,00/semana'].map((item, i) => (
          <Text key={i} style={[styles.listItem, { fontWeight: '700' }]}>• {item}</Text>
        ))}
        <Text style={[styles.clauseBody, { marginTop: 8 }]}>Fecha de pago ordinario: viernes. El período de Membresía va desde las 00:00:00 horas del sábado siguiente hasta las 23:59:59 horas del viernes siguiente. La hora oficial será la registrada por los servidores de la PLATAFORMA.</Text>
        <Text style={[styles.clauseBody, { marginTop: 6 }]}>El precio corresponde exclusivamente al acceso tecnológico y no constituye descuento salarial ni pago laboral. Si el SUSCRIPTOR no realiza el pago al vencimiento, la PLATAFORMA podrá limitar el acceso hasta regularizar la obligación. La PLATAFORMA notificará cualquier cambio de precio con anticipación razonable.</Text>
      </Clause>

      <Clause title="7. DISPONIBILIDAD, RECHAZOS Y CALIDAD">
        <Text style={styles.clauseBody}>El SUSCRIPTOR decide libremente cuándo activar o desactivar su estado de "Disponible". No existe obligación de conexión, horario ni permanencia mínima. La PLATAFORMA podrá registrar indicadores objetivos relacionados con:</Text>
        {['Solicitudes válidas recibidas.','Solicitudes aceptadas.','Solicitudes rechazadas.','Solicitudes canceladas.','Tiempo de respuesta.','Llegada al punto de recogida.','Reportes de seguridad.','Incidentes.','Calificaciones verificables.'].map((item, i) => (
          <Text key={i} style={styles.listItem}>• {item}</Text>
        ))}
        <Text style={[styles.clauseBody, { marginTop: 8 }]}>No se computarán como rechazos válidos: error técnico de la Aplicación, Solicitud duplicada, pasajero bloqueado por el SUSCRIPTOR, información esencial incompleta, punto de recogida o destino fuera de la configuración seleccionada, distancia superior al límite informado, emergencia, riesgo razonable, caso fortuito o fuerza mayor.</Text>
        <Text style={[styles.clauseBody, { marginTop: 6 }]}>Las medidas previstas en esta cláusula son controles de acceso, calidad, seguridad y confiabilidad del servicio tecnológico. No deberán comunicarse como despido, permiso, falta laboral, amonestación laboral o sanción laboral.</Text>
      </Clause>

      <Clause title="8. RESTRICCIÓN POR 15 RECHAZOS">
        <Text style={styles.clauseBody}>Cada Membresía semanal se paga el día viernes y otorga acceso desde las 00:00:00 horas del sábado siguiente hasta las 23:59:59 horas del viernes siguiente (el "Período de Membresía"). La hora oficial será la registrada por los servidores de la PLATAFORMA.</Text>
        <Text style={[styles.clauseBody, { marginTop: 6 }]}>Si el SUSCRIPTOR acumula quince (15) rechazos válidos y computables antes del vencimiento de su Período de Membresía, la PLATAFORMA podrá restringir inmediatamente la recepción de nuevas Solicitudes y el uso operativo de la Aplicación hasta el final del período en curso.</Text>
        <Text style={[styles.clauseBody, { marginTop: 6 }]}>La PLATAFORMA acreditará al SUSCRIPTOR los <Text style={styles.bold}>Días Restituibles</Text>, equivalentes a los días calendario completos restantes desde la restricción hasta el viernes de vencimiento. No habrá devolución de dinero. Los Días Restituibles otorgarán acceso posterior sin pago adicional, siempre que la cuenta y documentación estén vigentes.</Text>
        <Text style={[styles.clauseBody, { marginTop: 6 }]}>El acceso se reactivará el día de la semana inmediatamente posterior al día en que se activó la restricción, pero en la semana calendario siguiente.</Text>
        <Text style={[styles.clauseBody, { marginTop: 6 }]}><Text style={styles.bold}>Ejemplo:</Text> si el SUSCRIPTOR alcanza quince rechazos válidos un lunes, será restringido desde ese lunes. Los días martes, miércoles, jueves y viernes que faltaban serán Días Restituibles. Su cuenta se reactivará el martes de la semana siguiente y podrá operar hasta el viernes sin pagar una nueva Membresía.</Text>
        <Text style={[styles.clauseBody, { marginTop: 6 }]}>El SUSCRIPTOR podrá solicitar revisión dentro de las cuarenta y ocho (48) horas siguientes a la medida. Los Días Restituibles son personales, no transferibles, no canjeables por dinero y no acumulables con otras promociones. Caducarán si el SUSCRIPTOR no mantiene los requisitos documentales, de seguridad o pago aplicables.</Text>
      </Clause>

      <Clause title="9. PRESENTACIÓN, EQUIPOS E IDENTIDAD VISUAL">
        <Text style={styles.clauseBody}>El SUSCRIPTOR mantendrá una presentación limpia, segura, respetuosa y compatible con la prestación de transporte de pasajeros.</Text>
        <Text style={[styles.clauseBody, { marginTop: 8, fontWeight: '700' }]}>Modalidad motocicleta o mototaxi:</Text>
        {['Casco adecuado para el conductor.','Casco adecuado para el pasajero.','Chaleco reflectivo.','Elementos exigidos por autoridad competente.','Identificación visual permitida por la PLATAFORMA.'].map((item, i) => (
          <Text key={i} style={styles.listItem}>• {item}</Text>
        ))}
        <Text style={[styles.clauseBody, { marginTop: 8, fontWeight: '700' }]}>Modalidad taxi o automóvil:</Text>
        {['Placa visible.','Documentos y seguro vigentes.','Identificación y señalización exigida por la autoridad competente.','Elementos de identidad visual aprobados por la PLATAFORMA cuando correspondan.'].map((item, i) => (
          <Text key={i} style={styles.listItem}>• {item}</Text>
        ))}
        <Text style={[styles.clauseBody, { marginTop: 8 }]}>El SUSCRIPTOR podrá adquirir accesorios conforme al Catálogo Oficial de Identificación y Seguridad publicado por la PLATAFORMA. La PLATAFORMA no exigirá artículos no publicados previamente. El SUSCRIPTOR no podrá usar logos o emblemas alterados, deteriorados, no autorizados o que oculten placas, luces o señalización oficial.</Text>
      </Clause>

      <Clause title="10. MARCA, RETIRO Y DEVOLUCIÓN">
        <Text style={styles.clauseBody}>La Empresa conserva la titularidad exclusiva de sus marcas, logos, emblemas, QR, credenciales, colores y demás signos distintivos. La licencia de uso de marca termina automáticamente cuando la Membresía vence sin pago, la cuenta se desactiva, se suspende, o la PLATAFORMA revoca el acceso por razones de seguridad o incumplimiento grave.</Text>
        <Text style={[styles.clauseBody, { marginTop: 6 }]}>Desde la terminación, el SUSCRIPTOR deberá: retirar stickers, QR, credenciales y emblemas removibles; cubrir permanentemente los no removibles sin afectar la seguridad del equipo; y abstenerse de presentarse como conductor activo o afiliado autorizado.</Text>
        <Text style={[styles.clauseBody, { marginTop: 6 }]}>Respecto de artículos comprados por el SUSCRIPTOR con recursos propios, podrá conservarlos, pero deberá retirar o cubrir los distintivos de la PLATAFORMA y dejar de usarlos como señal de afiliación activa.</Text>
        <Text style={[styles.clauseBody, { marginTop: 6 }]}>Los bienes entregados en préstamo o comodato deberán devolverse dentro de cinco (5) días hábiles siguientes a la terminación. Todo bien entregado deberá constar en Acta de Entrega e Inventario con fotografías, seriales, estado y valor de reposición.</Text>
        <Text style={[styles.clauseBody, { marginTop: 6 }]}>Si existe riesgo de suplantación o uso no autorizado de marca, la PLATAFORMA podrá revocar QR, revocar credencial digital, desactivar perfil, desvincular placa y ejercer las acciones legales que correspondan.</Text>
      </Clause>

      <Clause title="11. OBLIGACIONES DEL SUSCRIPTOR">
        <Text style={styles.clauseBody}>El SUSCRIPTOR se obliga a:</Text>
        {[
          'Mantener documentos auténticos y vigentes.',
          'Conservar la Unidad en condiciones mecánicas, sanitarias y de seguridad adecuadas.',
          'Cumplir las normas de tránsito, transporte, seguros, tributos, permisos y autoridades aplicables.',
          'No conducir bajo efectos de alcohol, drogas o sustancias que afecten sus capacidades.',
          'Tratar con respeto a pasajeros, terceros, otros conductores y personal de soporte.',
          'No acosar, amenazar, discriminar, agredir ni realizar actos inseguros.',
          'No permitir que otra persona use su cuenta.',
          'No alterar GPS, ubicación, identidad, datos del vehículo, pagos, promociones, calificaciones o sistemas.',
          'Reportar accidentes, incidentes, objetos perdidos, cambios de Unidad y documentos vencidos.',
          'Asumir costos de vehículo, combustible o electricidad, mantenimiento, teléfono, seguros, impuestos, multas, peajes y demás gastos propios de su actividad.',
          'Cooperar razonablemente con investigaciones de seguridad relacionadas con viajes gestionados por la Aplicación.',
        ].map((item, i) => (
          <Text key={i} style={styles.listItem}>• {item}</Text>
        ))}
      </Clause>

      <Clause title="12. PAGOS Y FACTURACIÓN">
        <Text style={styles.clauseBody}>El Usuario Pasajero paga directamente al SUSCRIPTOR. La PLATAFORMA solo proporciona tecnología. Los importes recibidos por viajes corresponden a la actividad independiente del SUSCRIPTOR y no constituyen salario pagado por la PLATAFORMA.</Text>
        <Text style={[styles.clauseBody, { marginTop: 6 }]}>La PLATAFORMA emitirá el comprobante que corresponda por: Membresía; cargos tecnológicos propios; equipos vendidos, si aplica; y otros servicios propios. El SUSCRIPTOR será responsable de sus comprobantes, facturación, declaraciones e impuestos por los servicios de transporte cuando legalmente corresponda.</Text>
      </Clause>

      <Clause title="13. NO ELUSIÓN Y DATOS DE PASAJEROS">
        <Text style={styles.clauseBody}>Los datos de identidad, contacto, ubicación, Solicitud, destino, historial y preferencias de pasajeros se suministran únicamente para evaluar, aceptar y ejecutar Solicitudes gestionadas mediante la Aplicación. El SUSCRIPTOR no podrá copiar, almacenar fuera de la Aplicación, divulgar, vender o usar esos datos para ofrecer servicios por fuera de la PLATAFORMA cuando la oportunidad se origine en una Solicitud o dato proporcionado por ella.</Text>
        <Text style={[styles.clauseBody, { marginTop: 6 }]}>El SUSCRIPTOR no podrá solicitar a pasajeros:</Text>
        {['Teléfono personal.','Redes sociales.','Dirección.','Datos bancarios o medios de pago.','Información personal.'].map((item, i) => (
          <Text key={i} style={styles.listItem}>• {item}</Text>
        ))}
        <Text style={[styles.clauseBody, { marginTop: 6 }]}>Cuando el propósito sea concretar contrataciones futuras fuera de la Aplicación. Esta regla no impide comunicaciones estrictamente necesarias para el viaje activo, emergencias, objetos perdidos u obligación legal. Cuando sea posible, dichas comunicaciones se realizarán mediante los canales internos de la Aplicación.</Text>
      </Clause>

      <Clause title="14. SEGURIDAD, DATOS Y RESPONSABILIDAD">
        <Text style={styles.clauseBody}>El SUSCRIPTOR cooperará razonablemente con investigaciones de seguridad relacionadas con viajes gestionados en la Aplicación. Ante una emergencia, deberá priorizar la vida e integridad de las personas y contactar servicios públicos o autoridades cuando sea necesario.</Text>
        <Text style={[styles.clauseBody, { marginTop: 6 }]}>La PLATAFORMA podrá limitar inmediatamente el acceso ante indicios razonables de:</Text>
        {['Riesgo grave.','Fraude.','Agresión.','Suplantación.','Documento falso.','Conducción insegura.','Uso no autorizado de marca.','Orden de autoridad competente.'].map((item, i) => (
          <Text key={i} style={styles.listItem}>• {item}</Text>
        ))}
        <Text style={[styles.clauseBody, { marginTop: 6 }]}>El SUSCRIPTOR autoriza el tratamiento de sus datos de identidad, documentos, ubicación, rutas, Solicitudes, pagos, calificaciones e incidencias para:</Text>
        {['Operar la Aplicación.','Prevenir fraude.','Proteger usuarios.','Resolver reclamos.','Cumplir obligaciones legales.','Mejorar el servicio.','Atender requerimientos de autoridades competentes.'].map((item, i) => (
          <Text key={i} style={styles.listItem}>• {item}</Text>
        ))}
        <Text style={[styles.clauseBody, { marginTop: 6 }]}>La aceptación electrónica del contrato se registrará con fecha, hora, versión contractual, identificador de usuario, dispositivo y demás evidencia técnica razonable de atribución. La PLATAFORMA no garantiza disponibilidad continua ni resultado económico. El SUSCRIPTOR responde por la conducción, Unidad, permisos e infracciones.</Text>
      </Clause>

      <Clause title="15. NO RENUNCIA, LEY Y ACEPTACIÓN">
        <Text style={styles.clauseBody}>Nada de este contrato se interpretará como renuncia, limitación o menoscabo de derechos irrenunciables. Este contrato se regirá por las leyes de la República Bolivariana de Venezuela. Las PARTES procurarán resolver cualquier controversia mediante comunicación directa; de no alcanzar acuerdo, serán competentes los tribunales que correspondan conforme a la ley.</Text>
        <Text style={[styles.clauseBody, { marginTop: 6 }]}>Forman parte de este contrato:</Text>
        {['Política de Privacidad.','Política de Seguridad.','Política de Calidad y Cancelaciones.','Tabla de Membresías.','Política de Pagos.','Política de Objetos Perdidos.','Catálogo Oficial de Identificación y Seguridad.','Manual de Identidad Visual.','Acta de Entrega e Inventario.','Requisitos documentales publicados en la Aplicación.'].map((item, i) => (
          <Text key={i} style={styles.listItem}>• {item}</Text>
        ))}
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

function BulletItem({ label, text }: { label: string; text: string }) {
  return (
    <Text style={[styles.clauseBody, { marginBottom: 4 }]}>
      <Text style={styles.bold}>{label}</Text> {text}
    </Text>
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

  clause:         { marginBottom: 14 },
  clauseTitle:    { fontSize: 12, fontWeight: '700', color: BRAND.PRIMARY, marginBottom: 6 },
  subClauseTitle: { fontSize: 12, fontWeight: '700', color: BRAND.ACCENT, marginTop: 10, marginBottom: 4 },
  clauseBody:     { fontSize: 12, color: '#374151', lineHeight: 19 },
  listItem:       { fontSize: 12, color: '#374151', lineHeight: 19, marginLeft: 8, marginTop: 2 },

  codeBox: {
    backgroundColor: '#EFF6FF', borderWidth: 1.5, borderColor: BRAND.PRIMARY,
    borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10,
  },
  codeLabel: { fontSize: 11, color: BRAND.GRAY, marginBottom: 4 },
  codeValue: { fontSize: 22, fontWeight: '800', color: BRAND.PRIMARY, letterSpacing: 2 },

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
