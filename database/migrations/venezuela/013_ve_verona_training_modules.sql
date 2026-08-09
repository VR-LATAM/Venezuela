/* ═══════════════════════════════════════════════════════════════
   VERONA Ride Venezuela — Migración 013
   Cuatro módulos de capacitación propios de Venezuela:
     VE-VERONA-001   Fundamentos del Servicio VERONA Venezuela
     VE-ATENCION-001 Servicio al Cliente Venezuela
     VE-ENCOMIENDA-001 Delivery y Encomienda
     VE-CARGA-001    Servicio de Carga (Pick-Up / Plataforma / F-350 / NPR)
   Cada módulo: 5 secciones de estudio + 10 preguntas · passing_score = 10
   ═══════════════════════════════════════════════════════════════ */


/* ─────────────────────────────────────────────────────────────
   MÓDULO 1 — Fundamentos del Servicio VERONA Venezuela
   ───────────────────────────────────────────────────────────── */

INSERT INTO training_modules (
  code, title, content, version, passing_score, total_questions, order_index, is_required
) VALUES (
  'VE-VERONA-001',
  'Fundamentos del Servicio VERONA Venezuela',
  '[
    {
      "title": "1. ¿Qué es VERONA Ride?",
      "body": "VERONA Ride es una plataforma de transporte venezolana que conecta pasajeros con conductores independientes en los 24 estados del país.\n\n¿QUÉ NOS DIFERENCIA?\nA diferencia de otras apps de transporte, VERONA aplica 0% de comisión por viaje: el conductor recibe el 100% de cada tarifa pagada por el pasajero. No hay descuento, no hay retención, no hay porcentaje retenido al finalizar el viaje.\n\nEJEMPLO REAL:\n• Pasajero paga: $5.00\n• El conductor recibe: $5.00 completos\n• VERONA retiene: $0.00\n\nEl modelo de ingresos de la plataforma es la membresía semanal fija que paga el conductor — no los viajes."
    },
    {
      "title": "2. La Membresía Semanal",
      "body": "Para operar en VERONA Ride debes tener una membresía semanal activa. La membresía cubre del viernes al jueves de cada semana.\n\nPRECIOS SEGÚN TIPO DE VEHÍCULO:\n• Moto: $15,00 por semana\n• Sedán: $25,00 por semana\n• SUV: $35,00 por semana\n\nCÓMO RENOVAR:\n1. Envía el pago al número indicado en la app (Zelle, Pago Móvil, Binance)\n2. Sube el comprobante de pago desde el menú ''Membresía'' en la app\n3. El administrador verifica y aprueba el pago\n4. Recibirás una notificación cuando tu membresía esté activa\n\nSIN MEMBRESÍA ACTIVA: no podrás conectarte ni recibir solicitudes de viaje. La app mostrará el estado de tu membresía en la pantalla principal antes de que puedas activarte."
    },
    {
      "title": "3. Tarifas y Precios en Venezuela",
      "body": "Las tarifas se calculan en dólares estadounidenses (USD) y se muestran también en bolívares usando la tasa oficial del Banco Central de Venezuela (BCV), actualizada automáticamente cada hora.\n\nESTRUCTURA DE TARIFAS BASE:\n• Tarifa base: $1,00\n• Por kilómetro: $0,40/km\n• Por minuto: $0,10/min\n• Tarifa mínima: $2,50\n• Incremento hora pico: ×1,3 (mediodía y noche)\n\nMULTIPLICADORES POR TIPO DE SERVICIO:\n• Moto: ×0,75 (más económico)\n• Sedán: ×1,0 (tarifa base)\n• SUV: ×1,30\n• Encomienda (moto): ×0,45\n• Encomienda (sedán): ×0,60\n• Pick-Up: ×1,20\n• Plataforma: ×1,60\n• F-350 / NPR: precio negociable\n\nEL PRECIO QUE RECIBES: el monto que ves al aceptar el viaje es exactamente lo que el pasajero te pagará en efectivo. No hay ningún descuento posterior."
    },
    {
      "title": "4. Cómo Conectarte y Recibir Viajes",
      "body": "PASOS PARA INICIAR TU JORNADA:\n1. Abre la app VERONA Ride Conductor\n2. Verifica que tu membresía aparece como ''Activa''\n3. Toca el botón ''Conectarme'' — tu icono del vehículo aparecerá en el mapa\n4. Cuando llegue una solicitud, tienes 30 segundos para aceptar o rechazar\n5. Al aceptar: sigue la navegación integrada hasta el punto de recogida\n6. Toca ''He llegado'' cuando estés en el lugar\n7. Confirma el nombre del pasajero antes de arrancar\n8. Toca ''Iniciar viaje'' una vez que el pasajero esté a bordo\n9. Navega al destino usando la app o Waze / Google Maps\n10. Toca ''Finalizar viaje'' al llegar — cobra en efectivo\n\nDESPUÉS DE CADA VIAJE: la app te mantiene conectado automáticamente. No necesitas volver a tocar ''Conectarme'' entre un viaje y otro."
    },
    {
      "title": "5. Código de Conducta y Consecuencias",
      "body": "CONDUCTAS QUE GENERAN SUSPENSIÓN TEMPORAL:\n• Cancelar más de 3 viajes aceptados en un mismo día\n• Maltrato verbal al pasajero\n• No presentarse al punto de recogida sin cancelar el viaje en la app\n• Cobrar un monto diferente al indicado en la app\n• Compartir datos personales del pasajero fuera de la app\n\nCONDUCTAS DE TOLERANCIA CERO (desactivación permanente):\n• Conducir bajo efectos del alcohol o drogas\n• Acoso o agresión física o sexual al pasajero\n• Robo o extorsión al pasajero\n• Activar el botón SOS de forma maliciosa o reiterada\n\nEL PASAJERO TAMBIÉN ES EVALUADO: si un pasajero tiene calificación muy baja, la plataforma puede restringir su acceso. Ambos se califican mutuamente al finalizar cada viaje."
    }
  ]',
  '1.0',
  10,
  10,
  20,
  TRUE
)
ON CONFLICT (code) DO UPDATE SET
  title          = EXCLUDED.title,
  content        = EXCLUDED.content,
  version        = EXCLUDED.version,
  passing_score  = EXCLUDED.passing_score,
  total_questions = EXCLUDED.total_questions;

/* Preguntas — VE-VERONA-001 */
INSERT INTO training_questions (module_id, order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT m.id, q.order_index, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option
FROM training_modules m,
(VALUES
  (1,  '¿Qué porcentaje de cada tarifa retiene VERONA Ride como comisión al conductor?',
       '13%',
       '10%',
       '5%',
       '0% — el conductor recibe el 100% completo',
       'D'),
  (2,  '¿Cuánto cuesta la membresía semanal para un conductor de Sedán?',
       '$15,00',
       '$20,00',
       '$25,00',
       '$35,00',
       'C'),
  (3,  '¿Qué periodo cubre la membresía semanal de VERONA Ride?',
       'Lunes a domingo',
       'Viernes a jueves',
       'Del 1 al 7 de cada mes',
       'Del 15 al 21 de cada mes',
       'B'),
  (4,  'Un pasajero paga $8,00 por un viaje en Sedán. ¿Cuánto recibe el conductor después de que VERONA descuenta su comisión?',
       '$6,56 (después del 18%)',
       '$7,20 (después del 10%)',
       '$8,00 completos — VERONA no descuenta nada por viaje',
       '$7,00 después de $1 de fee de plataforma',
       'C'),
  (5,  '¿Cuántos segundos tiene el conductor para aceptar o rechazar una solicitud de viaje?',
       '15 segundos',
       '20 segundos',
       '45 segundos',
       '30 segundos',
       'D'),
  (6,  '¿En qué moneda se calculan las tarifas y qué tasa se usa para convertirlas a bolívares?',
       'En bolívares usando el precio del dólar paralelo',
       'En dólares usando la tasa BCV oficial actualizada cada hora',
       'En dólares usando una tasa fija establecida por VERONA',
       'En euros convertidos al bolívar del día',
       'B'),
  (7,  'Si el conductor cancela más de 3 viajes aceptados en un mismo día, ¿qué consecuencia puede enfrentar?',
       'Reducción automática de su membresía',
       'Ninguna, puede cancelar cuantos viajes quiera',
       'Suspensión temporal de la cuenta',
       'Cobro de $1 por cada cancelación adicional',
       'C'),
  (8,  '¿Qué multiplicador de tarifa aplica al servicio de Moto?',
       '×1,0 — igual que el Sedán',
       '×0,75 — más económico que el Sedán',
       '×1,30 — más caro que el Sedán',
       '×0,50 — la mitad del precio del Sedán',
       'B'),
  (9,  'Al finalizar un viaje, ¿qué debe hacer el conductor para seguir recibiendo solicitudes?',
       'Cerrar y volver a abrir la app',
       'Tocar ''Conectarme'' nuevamente',
       'Nada — la app lo mantiene conectado automáticamente',
       'Esperar 5 minutos antes de poder recibir otro viaje',
       'C'),
  (10, '¿Cuál de las siguientes es una conducta de TOLERANCIA CERO que resulta en desactivación permanente?',
       'Cancelar un viaje aceptado por emergencia personal',
       'Conducir bajo efectos del alcohol o drogas',
       'Llegar 3 minutos tarde al punto de recogida',
       'No responder un mensaje del pasajero en la app',
       'B')
) AS q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
WHERE m.code = 'VE-VERONA-001'
ON CONFLICT DO NOTHING;


/* ─────────────────────────────────────────────────────────────
   MÓDULO 2 — Servicio al Cliente Venezuela
   ───────────────────────────────────────────────────────────── */

INSERT INTO training_modules (
  code, title, content, version, passing_score, total_questions, order_index, is_required
) VALUES (
  'VE-ATENCION-001',
  'Servicio al Cliente Venezuela',
  '[
    {
      "title": "1. El Pasajero Venezolano",
      "body": "El pasajero de VERONA es cualquier venezolano que necesita transporte: estudiantes, profesionales, amas de casa, comerciantes, turistas nacionales e internacionales. No hay un perfil único ni restringido.\n\nLO QUE EL PASAJERO VENEZOLANO MÁS VALORA:\n• Puntualidad: que el conductor llegue en el tiempo estimado por la app\n• Seguridad: conducción tranquila, respeto a señales de tránsito\n• Honestidad: cobrar exactamente lo que indica la app, sin incrementos\n• Amabilidad: un saludo, un trato respetuoso y sin juzgar\n• Discreción: el conductor no comenta el destino del pasajero ni sus asuntos personales con terceros\n\nRECUERDA: la calificación que te da el pasajero al finalizar el viaje determina tu visibilidad en la plataforma y la cantidad de solicitudes que recibirás. Un pasajero satisfecho es tu mejor publicidad."
    },
    {
      "title": "2. Presentación Personal y del Vehículo",
      "body": "El conductor ES la imagen de VERONA Ride. Cada viaje es una evaluación en tiempo real.\n\nEL CONDUCTOR:\n• Ropa limpia y presentable — sin prendas rotas, sucias ni muy informales\n• Sin olor a alcohol, tabaco, sudor fuerte o comida\n• No consumir alimentos durante el viaje\n• No fumar dentro del vehículo ni justo antes de recoger al pasajero\n• Teléfono siempre en soporte de tablero — nunca en la mano\n\nEL VEHÍCULO:\n• Interior limpio antes de cada jornada: sin basura, sin polvo visible en tablero\n• Sin olores fuertes (desodorantes de ambiente extremos también incomodan)\n• Música: apagada o muy baja al recoger al pasajero — pregunta si la quiere antes de subir el volumen\n• Temperatura: activa el aire acondicionado si el calor es intenso, especialmente en ciudades calurosas como Maracaibo\n• Sin objetos personales ocupando los asientos traseros"
    },
    {
      "title": "3. Comunicación con el Pasajero",
      "body": "AL LLEGAR AL PUNTO DE RECOGIDA:\nSaluda identificando al pasajero por su nombre: ''Hola, ¿eres [Nombre]? Soy [Tu nombre], de VERONA Ride.'' Esto confirma que el pasajero correcto está abordando tu vehículo.\n\nDURANTE EL VIAJE:\n• Lee el ambiente — algunos pasajeros quieren conversar, otros prefieren silencio\n• Si el pasajero inicia conversación, responde con amabilidad\n• TEMAS A EVITAR: política, religión, precio del dólar, críticas al gobierno, problemas personales tuyos\n• Si hay problema con la ruta: comunícaselo al pasajero ANTES de desviarte — nunca sin avisar\n\nAL LLEGAR AL DESTINO:\n• Confirma la dirección si hay alguna duda: ''¿Es aquí en [dirección]?''\n• Espera a que el pasajero esté completamente fuera del vehículo con todas sus pertenencias\n• Si dejó algo olvidado: avísale de inmediato por la app y coordina la devolución\n\nCOMUNICACIÓN SIEMPRE POR LA APP: usa el chat y el teléfono integrado de la app. No compartas tu número personal con los pasajeros."
    },
    {
      "title": "4. Situaciones Difíciles en Venezuela",
      "body": "PASAJERO CONFLICTIVO O AGRESIVO:\nMantén la calma, no respondas con agresividad. Habla con tono tranquilo: ''Entiendo que está molesto, pero necesito que mantenga un trato respetuoso para continuar el viaje.'' Si escala, detente en un lugar seguro, público e iluminado y pide al pasajero que baje con calma. Usa el botón SOS y reporta en la app.\n\nINTENTO DE ROBO O AMENAZA:\nNo te resistas físicamente — tu seguridad está primero. Activa el SOS (mantén presionado 2 segundos). Dirígete a la comandancia policial o lugar con gente más cercano.\n\nZONAS DE ALTA PELIGROSIDAD:\nVERONA Ride NO te obliga a entrar a sectores donde sientas que tu seguridad está en riesgo. Puedes cancelar indicando ''Zona insegura'' sin que esto afecte tu calificación ni tu membresía.\n\nLLUVIAS Y VÍAS INUNDADAS (especialmente mayo–octubre en Venezuela):\nReduce la velocidad considerablemente. NUNCA pases por vías inundadas — da la vuelta siempre. Si la visibilidad es muy baja, detente en un lugar seguro y espera."
    },
    {
      "title": "5. Calificaciones y Reputación en la Plataforma",
      "body": "Tu calificación promedio (de 1 a 5 estrellas) es tu reputación en VERONA Ride y determina cuántos viajes recibes.\n\nESCALA DE CALIFICACIÓN:\n• 4,8 – 5,0: Conductor de excelencia — mayor visibilidad en la plataforma\n• 4,5 – 4,7: Buen conductor\n• 4,0 – 4,4: Zona de advertencia — debes mejorar\n• Menos de 4,0: Riesgo de suspensión temporal\n\nLISTA DE VERIFICACIÓN DE 5 ESTRELLAS:\n✓ Llega en el tiempo estimado o antes\n✓ Saluda al pasajero identificándolo por su nombre\n✓ Vehículo limpio y sin olores desagradables\n✓ Maneja con suavidad — sin frenazos ni aceleraciones bruscas\n✓ Cobra exactamente lo que indica la app — sin incrementos\n✓ Trato respetuoso y amable en todo momento\n✓ Espera a que el pasajero esté completamente fuera antes de arrancar\n\nUN SOLO VIAJE NO DEFINE TU REPUTACIÓN — pero la consistencia sí lo hace."
    }
  ]',
  '1.0',
  10,
  10,
  21,
  TRUE
)
ON CONFLICT (code) DO UPDATE SET
  title          = EXCLUDED.title,
  content        = EXCLUDED.content,
  version        = EXCLUDED.version,
  passing_score  = EXCLUDED.passing_score,
  total_questions = EXCLUDED.total_questions;

/* Preguntas — VE-ATENCION-001 */
INSERT INTO training_questions (module_id, order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT m.id, q.order_index, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option
FROM training_modules m,
(VALUES
  (1,  '¿Cuál es la calificación mínima que un conductor debe mantener para no recibir advertencias de la plataforma?',
       '3,5 estrellas',
       '4,0 estrellas',
       '4,5 estrellas',
       '4,8 estrellas',
       'C'),
  (2,  '¿Cómo debe saludar el conductor al pasajero al llegar al punto de recogida?',
       'Tocar la bocina para que el pasajero sepa que llegó',
       'Llamar al pasajero desde su número personal',
       'Identificar al pasajero por su nombre y presentarse con el suyo',
       'Esperar dentro del vehículo sin saludar hasta que el pasajero aborde',
       'C'),
  (3,  'Durante un viaje, el pasajero empieza a hacer comentarios agresivos. ¿Qué debe hacer el conductor?',
       'Responder con el mismo tono para que el pasajero entienda el límite',
       'Mantener la calma, hablar con tono tranquilo; si escala, detenerse en lugar seguro y pedir que baje',
       'Ignorar completamente al pasajero y subir el volumen de la música',
       'Llamar a la policía de inmediato mientras sigue conduciendo',
       'B'),
  (4,  '¿Puede el conductor negarse a entrar a una zona que considera peligrosa para su seguridad?',
       'No — debe completar el viaje sin importar el sector',
       'Sí, pero debe pagar una multa a la plataforma',
       'Solo si el administrador lo autoriza previamente',
       'Sí, puede cancelar indicando ''Zona insegura'' sin penalización en su calificación',
       'D'),
  (5,  'Un pasajero olvida su billetera en el vehículo al bajarse. ¿Qué debe hacer el conductor?',
       'Guardarla y esperar a que el pasajero llame a su número personal',
       'Avisar al pasajero de inmediato por la app y coordinar la devolución',
       'Entregar la billetera a la policía más cercana',
       'No hacer nada — es responsabilidad del pasajero revisar sus pertenencias',
       'B'),
  (6,  '¿Cuáles son temas que el conductor debe EVITAR en la conversación con el pasajero?',
       'El clima y el tráfico de la ciudad',
       'El destino del viaje y el tiempo estimado',
       'Política, religión y críticas al gobierno',
       'El tipo de servicio solicitado y la ruta que seguirá',
       'C'),
  (7,  'Un pasajero le pide al conductor que desvíe la ruta para pasar por un lugar diferente. ¿Qué debe hacer?',
       'Negarse siempre — la ruta de la app es obligatoria',
       'Desviarse sin decirle nada para ahorrar tiempo',
       'Comunicar el desvío al pasajero, confirmar el cambio y actualizar la ruta en la app',
       'Llamar al administrador de VERONA para pedir autorización',
       'C'),
  (8,  'Un pasajero le ofrece pagar $2 más de lo que indica la app ''por el buen servicio''. ¿Qué debe hacer el conductor?',
       'Aceptar el dinero extra — es una propina voluntaria del pasajero',
       'Rechazar siempre cualquier pago diferente al de la app',
       'Aceptar pero reportarlo al administrador de VERONA',
       'Aceptar solo si el monto no supera $5',
       'A'),
  (9,  '¿En qué rango de calificación se considera a un conductor como ''excelencia'' en VERONA Ride?',
       '4,0 – 4,4 estrellas',
       '4,5 – 4,7 estrellas',
       '4,8 – 5,0 estrellas',
       'Cualquier calificación por encima de 3,5',
       'C'),
  (10, '¿Puede el conductor fumar dentro del vehículo si el pasajero le da permiso?',
       'Sí, si el pasajero lo autoriza expresamente',
       'Sí, pero solo en el asiento del conductor y con la ventana abierta',
       'No — está prohibido fumar dentro del vehículo durante cualquier viaje',
       'Solo si es un cigarrillo electrónico sin humo visible',
       'C')
) AS q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
WHERE m.code = 'VE-ATENCION-001'
ON CONFLICT DO NOTHING;


/* ─────────────────────────────────────────────────────────────
   MÓDULO 3 — Delivery y Encomienda
   ───────────────────────────────────────────────────────────── */

INSERT INTO training_modules (
  code, title, content, version, passing_score, total_questions, order_index, is_required
) VALUES (
  'VE-ENCOMIENDA-001',
  'Delivery y Encomienda',
  '[
    {
      "title": "1. ¿Qué es el Servicio de Encomienda?",
      "body": "El servicio de Encomienda en VERONA Ride permite a los remitentes enviar paquetes, documentos o artículos de un punto a otro sin necesidad de acompañarlos. El conductor actúa como mensajero responsable.\n\nTIPOS DE VEHÍCULO Y SU USO:\n• Moto: paquetes pequeños y ligeros — sobres, documentos, artículos que caben en una mochila o maleta pequeña\n• Sedán: paquetes de tamaño mediano — cajas pequeñas, bolsas de compras, medicamentos, repuestos pequeños\n• SUV: paquetes voluminosos pero no de gran peso — cajas grandes, artículos del hogar que entran en el maletero\n\nINFORMACIÓN QUE RECIBIRÁS EN LA APP:\n• Descripción del paquete (lo que declara el remitente)\n• Dirección de recogida (puede ser diferente a la ubicación GPS del remitente)\n• Nombre y teléfono del remitente\n• Nombre y teléfono del destinatario\n• Dirección de entrega\n\nLee toda la información antes de aceptar el servicio."
    },
    {
      "title": "2. Protocolo de Recogida del Paquete",
      "body": "AL LLEGAR AL PUNTO DE RECOGIDA:\n1. Confirma con el remitente su nombre y el tipo de paquete\n2. Verifica que el paquete coincide con la descripción en la app\n3. Inspecciona visualmente el estado externo — si ya viene dañado, FOTOGRÁFIALO antes de aceptarlo y muéstrale la foto al remitente\n4. NO abras el paquete bajo ninguna circunstancia\n5. Toca ''Paquete recogido'' en la app una vez que lo tengas en tu poder\n\nSEÑALES DE ALERTA — tienes derecho a RECHAZAR el servicio si:\n• El remitente es evasivo sobre el contenido del paquete\n• El paquete tiene olor extraño o inusual\n• El peso no corresponde con lo descrito\n• El remitente te ofrece dinero extra para ''no declararlo en la app''\n• El remitente te pide que no verifiques el contenido bajo ningún pretexto\n\nARTÍCULOS QUE NUNCA PUEDES TRANSPORTAR:\n• Armas, municiones o explosivos\n• Sustancias ilegales o controladas (drogas)\n• Dinero en efectivo por montos superiores a $200\n• Animales vivos sin jaula y documentación apropiada\n• Artículos robados o de procedencia dudosa"
    },
    {
      "title": "3. Protocolo de Entrega",
      "body": "AL LLEGAR AL PUNTO DE ENTREGA:\n1. Llama al destinatario usando el teléfono integrado de la app (no tu número personal)\n2. Entrega el paquete ÚNICAMENTE a la persona indicada en la app, o a quien el destinatario autorice explícitamente y te indique por la app\n3. Pide al destinatario que inspeccione el paquete antes de confirmar la recepción\n4. Toca ''Entrega completada'' en la app\n\nSI EL DESTINATARIO NO ESTÁ:\n• Llama por la app — espera máximo 5 minutos\n• Si no responde, contacta al remitente a través de la app para recibir instrucciones\n• Sigue las instrucciones del remitente: intentar en otro horario, dejar con vecino autorizado (con nombre completo), o regresar el paquete\n• NUNCA dejes el paquete en la puerta o con cualquier persona sin autorización del remitente\n\nPAQUETE RECHAZADO POR EL DESTINATARIO:\nSi el destinatario se niega a recibir el paquete por cualquier motivo, regresa al remitente y repórtalo en la app. No es tu responsabilidad resolver el conflicto entre remitente y destinatario."
    },
    {
      "title": "4. Responsabilidad del Conductor sobre el Paquete",
      "body": "Eres RESPONSABLE del paquete desde el momento en que lo recibes hasta que lo entregas o lo devuelves.\n\nSI EL PAQUETE SE DAÑA BAJO TU CUSTODIA:\n1. Detente en lugar seguro\n2. Fotografía el daño inmediatamente\n3. Reporta el incidente en la app de inmediato\n4. Contacta al remitente a través de la app\n5. No continúes el viaje si la situación lo requiere\n\nSI EL PAQUETE SE PIERDE:\n• Esto puede resultar en un cargo al conductor según el valor declarado\n• Mantén siempre el paquete bajo tu vista — no lo dejes solo en el vehículo en zonas de riesgo\n\nLÍMITES DE RESPONSABILIDAD:\n• Tu seguro vehicular personal NO cubre mercancía de terceros\n• La plataforma no se hace responsable por el contenido declarado — el responsable del contenido es el remitente\n• El conductor es responsable del estado EXTERNO del paquete durante el transporte"
    },
    {
      "title": "5. Buenas Prácticas del Mensajero",
      "body": "EQUIPAMIENTO RECOMENDADO:\n• Una mochila o maleta de mensajería para paquetes pequeños en moto\n• Una caja con separadores para paquetes frágiles en sedán o SUV\n• Plástico stretch o bolsas para proteger paquetes si llueve\n\nCOMPORTAMIENTO PROFESIONAL:\n• Trata todos los paquetes como si fueran frágiles, aunque no lo declaren\n• Nunca discutas el contenido del paquete con el destinatario — no es de tu incumbencia\n• No mires, no leas y no toques el contenido aunque el paquete esté abierto\n• No hagas comentarios sobre el tipo de paquete en tus redes sociales\n\nSEÑAL DE ALERTA GRAVE: si en algún momento un remitente te ofrece dinero extra para llevar algo ''que no puede ir registrado en la app'', rechaza de inmediato y reporta el incidente al soporte de VERONA. Es una señal clara de algo ilegal.\n\nTu reputación como mensajero depende de la puntualidad, el cuidado del paquete y la honestidad. Un mensajero confiable recibe más encomiendas y mejor calificación."
    }
  ]',
  '1.0',
  10,
  10,
  22,
  TRUE
)
ON CONFLICT (code) DO UPDATE SET
  title          = EXCLUDED.title,
  content        = EXCLUDED.content,
  version        = EXCLUDED.version,
  passing_score  = EXCLUDED.passing_score,
  total_questions = EXCLUDED.total_questions;

/* Preguntas — VE-ENCOMIENDA-001 */
INSERT INTO training_questions (module_id, order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT m.id, q.order_index, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option
FROM training_modules m,
(VALUES
  (1,  'Al llegar al punto de recogida, el conductor nota que el paquete ya tiene golpes y está dañado externamente. ¿Qué debe hacer ANTES de aceptarlo?',
       'Aceptarlo sin decir nada para no incomodar al remitente',
       'Fotografiar el daño, mostrárselo al remitente y registrarlo antes de recibirlo',
       'Rechazar el servicio de inmediato sin dar explicaciones',
       'Llamar al soporte de VERONA y esperar instrucciones antes de tocar el paquete',
       'B'),
  (2,  'Un remitente insiste en que el conductor abra el paquete para verificar que ''no hay nada malo''. ¿Qué debe hacer?',
       'Abrir el paquete para verificar y protegerse legalmente',
       'Abrir solo si el remitente firma una autorización',
       'Negarse — el conductor no debe abrir paquetes bajo ninguna circunstancia',
       'Abrir solo si el paquete tiene olor extraño',
       'C'),
  (3,  '¿Cuánto tiempo máximo debe esperar el conductor en el punto de entrega si el destinatario no aparece ni responde?',
       '10 minutos',
       '2 minutos',
       '15 minutos',
       '5 minutos',
       'D'),
  (4,  'Si el destinatario no está y no responde, ¿qué debe hacer el conductor con el paquete?',
       'Dejarlo en la puerta del destino para no perder tiempo',
       'Entregárselo al vecino más cercano como medida de cortesía',
       'Contactar al remitente por la app y seguir sus instrucciones',
       'Regresar el paquete al punto de recogida sin avisar a nadie',
       'C'),
  (5,  '¿Cuál de los siguientes artículos NUNCA puede transportar un conductor de Encomienda?',
       'Medicamentos recetados en caja sellada',
       'Documentos legales en sobre cerrado',
       'Dinero en efectivo por un monto superior a $200',
       'Ropa usada en bolsa plástica',
       'C'),
  (6,  'Un remitente le ofrece al conductor $10 adicionales para llevar un paquete ''sin registrarlo en la app''. ¿Qué debe hacer?',
       'Aceptar si el monto extra es razonable y el paquete parece inofensivo',
       'Rechazar de inmediato y reportar el incidente al soporte de VERONA',
       'Aceptar pero reportarlo después de completar la entrega',
       'Pedir más información sobre el contenido antes de decidir',
       'B'),
  (7,  '¿A quién puede entregar el paquete el conductor?',
       'A cualquier persona mayor de edad que esté en el destino',
       'Solo al portero o vigilante del edificio si el destinatario no está',
       'Únicamente a la persona indicada en la app o quien el destinatario autorice explícitamente',
       'A cualquier familiar del destinatario que muestre su cédula',
       'C'),
  (8,  'El paquete se daña durante el transporte por un frenazo brusco. ¿Cuál es la primera acción del conductor?',
       'Continuar el viaje y avisar al llegar',
       'Detenerse, fotografiar el daño e inmediatamente reportarlo en la app',
       'Buscar cinta adhesiva para sellar el daño antes de entregar',
       'Llamar directamente al remitente desde su número personal',
       'B'),
  (9,  'El destinatario se niega a recibir el paquete porque dice que no lo pidió. ¿Qué hace el conductor?',
       'Insistir hasta que el destinatario lo acepte',
       'Dejarlo igual en la puerta y reportar la situación',
       'Devolver el paquete al remitente y reportarlo en la app',
       'Abrir el paquete para verificar si hay un error',
       'C'),
  (10, 'Un conductor de moto recibe una encomienda de un remitente que es evasivo sobre el contenido y el paquete tiene un olor inusual. ¿Qué debe hacer?',
       'Aceptar el paquete — el olor puede ser del empaque',
       'Aceptar pero manejar más despacio por precaución',
       'Ejercer su derecho de rechazar el servicio ante señales de alerta',
       'Abrir el paquete para confirmar que no hay nada peligroso',
       'C')
) AS q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
WHERE m.code = 'VE-ENCOMIENDA-001'
ON CONFLICT DO NOTHING;


/* ─────────────────────────────────────────────────────────────
   MÓDULO 4 — Servicio de Carga
   ───────────────────────────────────────────────────────────── */

INSERT INTO training_modules (
  code, title, content, version, passing_score, total_questions, order_index, is_required
) VALUES (
  'VE-CARGA-001',
  'Servicio de Carga — Pick-Up, Plataforma, F-350 y NPR',
  '[
    {
      "title": "1. Tipos de Vehículo de Carga y sus Capacidades",
      "body": "VERONA Ride ofrece 4 sub-tipos dentro del servicio de Carga:\n\nPICK-UP (Camioneta):\nCapacidad aproximada de 500 a 1.000 kg. Ideal para mudanzas ligeras, materiales de construcción, electrodomésticos, compras en depósito, muebles pequeños. El conductor debe ser capaz de coordinar o participar en la carga y descarga.\n\nPLATAFORMA (Camión plataforma/grúa):\nPara vehículos varados o averiados, maquinaria agrícola o industrial, cargas planas de gran longitud. El conductor debe conocer el uso de las correas de amarre y el sistema de plataforma de su vehículo.\n\nF-350 / PLATABANDA:\nVehículo de trabajo pesado para carga voluminosa y de peso considerable — hasta aprox. 2.000 kg. El precio es siempre NEGOCIABLE entre el pasajero y el conductor según la carga y la distancia.\n\nNPR 400 / CAMIÓN:\nPara carga industrial, comercial o de gran volumen — más de 2.000 kg. El precio es NEGOCIABLE. Requiere licencia de conducir de mayor categoría según la LTT 2008.\n\nIMPORTANTE: antes de aceptar cualquier solicitud de Carga, evalúa si el tipo de carga que describe el pasajero es compatible con tu vehículo y capacidad."
    },
    {
      "title": "2. Negociación de Precio con el Pasajero",
      "body": "En los servicios F-350 y NPR (y opcionalmente en Pick-Up y Plataforma), el precio es negociable.\n\nCÓMO FUNCIONA:\nEl pasajero propone un precio al solicitar el servicio. El conductor tiene 3 opciones:\n• ACEPTAR: si el precio compensa la distancia, el tipo de carga y el esfuerzo\n• RECHAZAR: si el precio no es razonable — el viaje se cancela sin penalización\n• CONTRA-OFERTA: propones un precio diferente con una justificación breve (ej. ''La distancia es mayor de lo indicado'' o ''Se requiere ayudante para descarga'')\n\nSi el pasajero acepta tu contra-oferta, el viaje continúa al precio acordado.\nSi el pasajero rechaza tu contra-oferta, el viaje se cancela sin penalización para ninguna de las partes.\n\nCRITERIOS PARA EVALUAR SI EL PRECIO ES JUSTO:\n• Distancia total del trayecto\n• Tipo y peso estimado de la carga\n• ¿Se requiere carga y descarga manual?\n• ¿Hay acceso difícil — edificio sin ascensor, escaleras, zona congestionada?\n• Hora del día y condiciones de tráfico\n• ¿Necesitas un ayudante y debes pagarlo?"
    },
    {
      "title": "3. Carga, Amarre y Aseguramiento de la Mercancía",
      "body": "ANTES DE CARGAR:\n1. Inspecciona visualmente la mercancía con el remitente\n2. Fotografia la carga ANTES de subirla al vehículo — esto te protege ante reclamos posteriores\n3. Si la carga está dañada previamente, documéntalo claramente en la app\n4. Confirma el peso aproximado — no aceptes carga que supere la capacidad de tu vehículo\n\nAMARRE Y ASEGURAMIENTO (obligatorio para toda la carga):\n• Toda carga debe ir AMARRADA o ASEGURADA — nunca suelta ni solo ''acomodada''\n• Usa correas de amarre o cuerdas apropiadas para el peso de la carga\n• Objetos pesados: van CONTRA LA CABINA del vehículo\n• Objetos livianos: pueden ir hacia la parte trasera pero siempre amarrados\n• Distribución del peso: equilibra la carga de lado a lado para no afectar el control del vehículo\n\nSEÑALIZACIÓN OBLIGATORIA:\nSi la carga sobresale más de 1 metro por detrás del vehículo: BANDERA ROJA obligatoria en el extremo (LTT 2008). Sin esta señalización puedes ser multado y eres responsable de cualquier accidente que cause la carga sobresaliente.\n\nCARGA PROHIBIDA:\n• Explosivos, combustibles o sustancias peligrosas sin certificación PDVSA o MPPPEE\n• Animales sin jaula y condiciones apropiadas\n• Personas en la zona de carga — es ILEGAL y puede causar la muerte\n• Carga que supere la capacidad nominal del vehículo"
    },
    {
      "title": "4. Normativa Venezolana para Vehículos de Carga",
      "body": "LICENCIA DE CONDUCIR REQUERIDA SEGÚN LA LTT 2008:\n• Pick-Up (hasta 3,5 toneladas): Licencia 3° grado, Tipo B\n• Plataforma / F-350 (3,5 a 10 toneladas): Licencia 4° grado, Tipo C\n• NPR 400 / Camión (más de 10 toneladas): Licencia 5° grado, Tipo D\n\nOperar un vehículo de carga con licencia de categoría inferior está sancionado con multa de 10 U.T. y suspensión de licencia (LTT 2008, Art. 169.1).\n\nOTROS REQUISITOS PARA VEHÍCULOS DE CARGA:\n• Revisión técnica vigente ante el INTT\n• Seguro de Responsabilidad Civil vigente — obligatorio (LTT 2008, Art. 58)\n• Si la carga sobresale: bandera o tela roja en el extremo trasero\n• Certificado de peso del vehículo si pasará por básculas del INTT\n\nRESTRICCIONES DE CIRCULACIÓN:\nEn varias ciudades venezolanas (Caracas, Valencia, Maracaibo) los vehículos de carga pesada tienen restricciones horarias en zonas céntricas. Generalmente se permite la circulación entre las 9pm y las 6am en estas zonas.\n\nConsulta las ordenanzas municipales vigentes del municipio donde operas antes de aceptar viajes de carga pesada en zonas céntricas."
    },
    {
      "title": "5. Responsabilidad y Manejo de Incidentes de Carga",
      "body": "El conductor de Carga es RESPONSABLE de la mercancía desde que la recibe hasta que la entrega o devuelve.\n\nSI LA CARGA SE DAÑA DURANTE EL TRANSPORTE:\n1. Detente en lugar seguro de inmediato\n2. Fotografía el daño inmediatamente\n3. Reporta el incidente en la app\n4. Contacta al remitente a través de la app\n5. Si la carga representa un riesgo para la vía (materiales derramados, carga caída), señaliza el área y llama al 911\n\nSI EL DESTINATARIO RECHAZA LA CARGA POR DAÑOS:\n• El conductor devuelve al remitente\n• El remitente y el conductor deben resolver el asunto entre ellos\n• Por eso es FUNDAMENTAL fotografiar antes de cargar — es tu única defensa\n\nACCIDENTE DURANTE UN VIAJE DE CARGA:\n• Prioridad 1: tu seguridad\n• Prioridad 2: la seguridad de otros en la vía\n• Asegura la carga para que no se convierta en peligro adicional en la vía\n• Activa el SOS de la app\n• Llama al 911 si hay heridos\n• Levanta acta policial (PTT/INTT) — es obligatorio si hay daños materiales\n• No muevas los vehículos hasta que llegue la autoridad\n\nIMPORTANTE: NUNCA te vayas del lugar del accidente. Darse a la fuga en Venezuela es sancionado con multa de 10 U.T. más responsabilidad penal (LTT 2008, Art. 169.23)."
    }
  ]',
  '1.0',
  10,
  10,
  23,
  TRUE
)
ON CONFLICT (code) DO UPDATE SET
  title          = EXCLUDED.title,
  content        = EXCLUDED.content,
  version        = EXCLUDED.version,
  passing_score  = EXCLUDED.passing_score,
  total_questions = EXCLUDED.total_questions;

/* Preguntas — VE-CARGA-001 */
INSERT INTO training_questions (module_id, order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT m.id, q.order_index, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option
FROM training_modules m,
(VALUES
  (1,  'Según la LTT 2008, ¿qué tipo de licencia necesita un conductor para operar un NPR con más de 10 toneladas de capacidad?',
       '3° grado, Tipo B',
       '4° grado, Tipo C',
       '5° grado, Tipo D',
       '2° grado, Tipo A',
       'C'),
  (2,  'La carga que transportas sobresale 1,5 metros por detrás del vehículo. ¿Qué señalización es OBLIGATORIA según la LTT 2008?',
       'Encender las luces de emergencia durante todo el viaje',
       'Colocar una bandera o tela roja en el extremo de la carga',
       'Colocar un cono de seguridad detrás del vehículo',
       'No se requiere señalización para vehículos de carga',
       'B'),
  (3,  'Un pasajero propone $40 para un viaje de Carga F-350. El conductor considera que el precio no compensa la distancia y el esfuerzo. ¿Qué opciones tiene?',
       'Solo puede aceptar o rechazar — no hay contra-oferta en VERONA',
       'Debe aceptar el precio propuesto por el pasajero siempre',
       'Puede aceptar, rechazar o enviar una contra-oferta con nuevo precio y justificación',
       'Debe esperar a que el administrador apruebe el precio antes de decidir',
       'C'),
  (4,  'Al cargar mercancía en un Pick-Up, ¿dónde deben ir los objetos más pesados?',
       'En la parte trasera del área de carga, lo más lejos posible de la cabina',
       'Contra la cabina del vehículo',
       'En el centro del área de carga, equilibrados',
       'Arriba de los objetos livianos para aprovechar el espacio',
       'B'),
  (5,  '¿Está permitido transportar personas en la zona de carga de un Pick-Up o plataforma?',
       'Sí, si el pasajero firma un descargo de responsabilidad',
       'Sí, solo si van sentadas y amarradas con cinturón',
       'No — es ilegal y puede causar graves lesiones o la muerte',
       'Sí, si la distancia es corta y van dentro del municipio',
       'C'),
  (6,  'Antes de subir la mercancía del remitente al vehículo, ¿qué acción es FUNDAMENTAL para protegerse de reclamos posteriores?',
       'Pedir al remitente que firme un contrato de transporte',
       'Fotografiar la mercancía junto al remitente antes de cargarla',
       'Llamar al soporte de VERONA para registrar el estado de la carga',
       'Pesar la carga en una báscula antes de subirla',
       'B'),
  (7,  'Durante el transporte, parte de la carga se suelta y cae al pavimento obstruyendo el canal. ¿Cuál es la prioridad inmediata del conductor?',
       'Continuar el viaje y reportarlo al llegar al destino',
       'Llamar primero al remitente para avisarle del incidente',
       'Señalizar el área, garantizar la seguridad en la vía y llamar al 911 si hay riesgo',
       'Recoger toda la carga solo antes de que llegue la autoridad',
       'C'),
  (8,  'El conductor de un F-350 envía una contra-oferta al pasajero. El pasajero la rechaza. ¿Qué ocurre?',
       'El conductor debe aceptar el precio original del pasajero de todas formas',
       'El viaje se cancela sin penalización para ninguna de las partes',
       'El conductor es sancionado por rechazar al pasajero',
       'El administrador de VERONA interviene para fijar el precio final',
       'B'),
  (9,  'El destinatario rechaza recibir la carga porque dice que llegó dañada. ¿Cuál es la defensa más importante del conductor en esta situación?',
       'El testimonio verbal del remitente de que la carga estaba en buen estado',
       'La calificación del conductor en la plataforma',
       'Las fotografías tomadas de la mercancía ANTES de cargarla al vehículo',
       'El reporte del administrador de VERONA sobre el viaje',
       'C'),
  (10, '¿Cuál de las siguientes cargas está PROHIBIDA en cualquier vehículo de carga de VERONA Ride?',
       'Electrodomésticos grandes como neveras o lavadoras',
       'Materiales de construcción como arena o cemento en sacos',
       'Combustibles o sustancias peligrosas sin certificación oficial',
       'Muebles de hogar desmontados en cajas',
       'C')
) AS q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
WHERE m.code = 'VE-CARGA-001'
ON CONFLICT DO NOTHING;
