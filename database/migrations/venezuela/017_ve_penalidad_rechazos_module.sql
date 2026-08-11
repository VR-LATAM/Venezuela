/* V-RIDE VENEZUELA — Migración 017
   Módulo de capacitación: Sistema de Penalidad por Rechazos
   Código: VE-PENALIDAD-001
   5 secciones de estudio + 10 preguntas · passing_score = 10
*/

INSERT INTO training_modules (
  code, title, content, version, passing_score, total_questions, order_index, is_required
) VALUES (
  'VE-PENALIDAD-001',
  'Sistema de Penalidad por Rechazos',
  '[
    {
      "title": "1. ¿Qué es el Sistema de Penalidad por Rechazos?",
      "body": "VERONA Ride aplica un sistema de puntos semanal para garantizar que los conductores estén comprometidos con el servicio cuando se conectan a la plataforma.\n\nCÓMO FUNCIONA:\nCada semana comienzas con 15 puntos de rechazo disponibles.\n• Cada vez que rechazas una solicitud de viaje: pierdes 1 punto.\n• Cuando tus puntos llegan a 0 (después de 15 rechazos): tu cuenta queda suspendida hasta la semana siguiente.\n• Cada viernes a medianoche el contador se reinicia automáticamente a 15 puntos para todos los conductores activos.\n\nEJEMPLO:\nSemana 1 — comienzas con 15 puntos.\nDía lunes rechazas 5 viajes → te quedan 10 puntos.\nDía miércoles rechazas 6 más → te quedan 4 puntos.\nDía jueves rechazas 4 más → llegas a 0 → SUSPENSIÓN INMEDIATA.\n\nEste sistema no afecta tu calificación de estrellas. Las estrellas solo reflejan la satisfacción de los pasajeros con tu servicio."
    },
    {
      "title": "2. ¿Cuándo se Descuenta un Punto?",
      "body": "Se descuenta 1 punto de penalidad en los siguientes casos:\n\n✗ Tocas el botón ''Rechazar'' cuando llega una solicitud.\n✗ Dejas vencer el tiempo de 30 segundos sin responder la solicitud.\n\nLO QUE NO DESCUENTA PUNTOS:\n✓ El pasajero cancela el viaje antes de que tú respondas.\n✓ El pasajero cancela después de que tú aceptaste.\n✓ Cancelas un viaje ya aceptado indicando ''Zona insegura''.\n✓ El viaje no se asignó a ti porque otro conductor aceptó primero.\n\nCONSEJO IMPORTANTE:\nSi no puedes atender viajes en un momento determinado (almuerzo, mecánico, descanso), desconéctate de la plataforma tocando ''Desconectarme''. Así las solicitudes no llegan a ti y no pierdes puntos por no responder."
    },
    {
      "title": "3. La Suspensión por Penalidad",
      "body": "Cuando tu contador de rechazos llega a 0, la suspensión es INMEDIATA y automática:\n\n¿QUÉ OCURRE AL MOMENTO DE LA SUSPENSIÓN?\n• La app te notifica que has sido suspendido por exceso de rechazos.\n• Quedas desconectado automáticamente y no puedes volver a conectarte.\n• No recibirás más solicitudes de viaje hasta que la suspensión se levante.\n• La suspensión dura hasta la siguiente semana — no hay forma de levantarla antes.\n\n¿CUÁNDO SE LEVANTA LA SUSPENSIÓN?\nLa suspensión se levanta automáticamente al inicio de tu período de reactivación (ver sección 4). No necesitas contactar al administrador ni hacer ningún trámite.\n\n¿AFECTA TU CALIFICACIÓN DE ESTRELLAS?\nNO. Tu calificación de estrellas (1 a 5) no baja por rechazos. Las estrellas solo cambian cuando un pasajero te califica al finalizar un viaje.\n\n¿PIERDES TU MEMBRESÍA?\nNO. Tu membresía sigue activa. Los días de tu semana que no pudiste usar por la suspensión se recuperan (ver sección 4)."
    },
    {
      "title": "4. Los Días de Crédito — Recuperas lo que Pagaste",
      "body": "Si te suspenden a mitad de la semana, VERONA Ride reconoce que pagaste tu membresía completa y no pudiste trabajar todos los días.\n\nCÓMO FUNCIONA EL CRÉDITO:\nLos días que no pudiste trabajar por la suspensión se convierten en días de crédito para la semana siguiente. Esos días los trabajas GRATIS, sin necesidad de pagar una nueva membresía por ellos.\n\nEJEMPLO REAL:\n• Pagaste tu membresía el viernes.\n• Trabajaste viernes, sábado y domingo normalmente.\n• El lunes te suspenden por llegar a 0 rechazos.\n• Días no usados: lunes, martes, miércoles y jueves = 4 días de crédito.\n• La siguiente semana: te reactivarán automáticamente el lunes para que trabajes lunes, martes, miércoles y jueves GRATIS.\n• El viernes siguiente pagas tu membresía normalmente como siempre.\n\nTU DÍA DE PAGO NUNCA CAMBIA:\nEl pago siempre es el viernes. El crédito simplemente te activa unos días antes de tu próximo pago, sin costo."
    },
    {
      "title": "5. Cómo Evitar la Penalidad",
      "body": "Administrar bien tus puntos de rechazo es parte de ser un conductor profesional en VERONA Ride.\n\nBUENAS PRÁCTICAS:\n\n1. DESCONÉCTATE CUANDO NO PUEDAS ATENDER\nSi tienes que almorzar, repostar gasolina, atender una emergencia o simplemente descansar, toca ''Desconectarme''. No es obligatorio estar conectado todo el día.\n\n2. EVALÚA ANTES DE CONECTARTE\nSi sabes que solo puedes trabajar 2 horas, conéctate para esas 2 horas y luego desconéctate. No dejes solicitudes sin responder.\n\n3. ACEPTA CON CRITERIO\nPuedes rechazar solicitudes que no te convengan — el sistema solo penaliza el EXCESO de rechazos (más de 15 en la semana), no los rechazos ocasionales y razonables.\n\n4. MONITOREA TUS PUNTOS\nLa app muestra tu contador de rechazos en todo momento. Cuando estés cerca de 0, evalúa si conviene desconectarte para evitar la suspensión.\n\nRECUERDA:\n15 rechazos en una semana es una cantidad muy elevada. Un conductor que trabaja normalmente raramente llega a ese límite. La suspensión por penalidad ocurre solo cuando el conductor rechaza sistemáticamente los viajes mientras permanece conectado — lo que perjudica al pasajero y a la plataforma."
    }
  ]',
  '1.0',
  10,
  10,
  24,
  TRUE
)
ON CONFLICT (code) DO UPDATE SET
  title           = EXCLUDED.title,
  content         = EXCLUDED.content,
  version         = EXCLUDED.version,
  passing_score   = EXCLUDED.passing_score,
  total_questions = EXCLUDED.total_questions;

/* Preguntas — VE-PENALIDAD-001 */
INSERT INTO training_questions (module_id, order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT m.id, q.order_index, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option
FROM training_modules m,
(VALUES
  (1,  '¿Con cuántos puntos de rechazo comienza cada conductor al inicio de la semana?',
       '5 puntos',
       '10 puntos',
       '15 puntos',
       '20 puntos',
       'C'),
  (2,  '¿Cuántos puntos pierde el conductor por cada solicitud de viaje que rechaza?',
       '3 puntos',
       '1 punto',
       '5 puntos',
       '2 puntos',
       'B'),
  (3,  '¿Qué ocurre cuando el contador de rechazos del conductor llega a 0?',
       'Recibe una advertencia pero puede seguir trabajando',
       'Su calificación de estrellas baja automáticamente',
       'Su cuenta queda suspendida de inmediato hasta la semana siguiente',
       'Debe pagar una multa para volver a conectarse',
       'C'),
  (4,  '¿Cada cuánto tiempo se reinicia automáticamente el contador de rechazos?',
       'Cada lunes a medianoche',
       'Cada viernes a medianoche',
       'Cada sábado al mediodía',
       'El primer día de cada mes',
       'B'),
  (5,  'Un conductor deja vencer los 30 segundos sin responder una solicitud. ¿Qué ocurre con sus puntos de penalidad?',
       'No pasa nada — solo se descuenta si presiona el botón Rechazar',
       'Pierde 2 puntos por no responder a tiempo',
       'Pierde 1 punto — equivale a un rechazo',
       'La app lo desconecta automáticamente sin descontarle puntos',
       'C'),
  (6,  'El conductor necesita almorzar y no puede atender viajes por 45 minutos. ¿Qué debe hacer para no perder puntos?',
       'Ignorar las solicitudes que lleguen durante ese tiempo',
       'Tocar "Desconectarme" antes de almorzar y reconectarse después',
       'Rechazar las solicitudes que lleguen y recuperarlas después',
       'No hay forma de evitar el descuento — debe atender igual',
       'B'),
  (7,  '¿El sistema de penalidad por rechazos afecta la calificación de estrellas del conductor?',
       'Sí — cada rechazo baja 0,01 de su calificación',
       'Sí — al suspenderse, su calificación baja a 4,85',
       'No — las estrellas solo cambian cuando un pasajero lo califica al finalizar un viaje',
       'Sí — pierde media estrella si llega a 0 puntos',
       'C'),
  (8,  'Un conductor pagó su membresía el viernes y fue suspendido el lunes por exceso de rechazos. Trabajó viernes, sábado y domingo. ¿Qué pasa con los días lunes, martes, miércoles y jueves que no pudo usar?',
       'Se pierden — es consecuencia de la penalidad',
       'Se convierten en crédito y los trabaja gratis la semana siguiente',
       'Se descuentan del próximo pago de membresía como reembolso',
       'El administrador decide caso por caso si otorga el crédito',
       'B'),
  (9,  'Un conductor tiene crédito de 4 días por una suspensión. ¿Cuándo debe pagar su próxima membresía?',
       'Debe pagar el mismo viernes de la suspensión para no perder el crédito',
       'No vuelve a pagar — el crédito cubre una semana completa',
       'Trabaja los 4 días de crédito gratis y paga normalmente el viernes siguiente',
       'Paga la mitad de la membresía por los días que sí trabajó',
       'C'),
  (10, '¿Cuál de las siguientes situaciones NO descuenta puntos de penalidad al conductor?',
       'Tocar el botón Rechazar cuando llega una solicitud',
       'Dejar vencer el tiempo de 30 segundos sin responder',
       'El pasajero cancela el viaje antes de que el conductor responda',
       'Rechazar dos solicitudes seguidas en menos de 5 minutos',
       'C')
) AS q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
WHERE m.code = 'VE-PENALIDAD-001'
ON CONFLICT DO NOTHING;
