-- Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
-- ═══════════════════════════════════════════════════════════════
-- SEED 002: Módulos de entrenamiento y preguntas del quiz
-- 5 módulos × 10 preguntas = 50 preguntas en total
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- MÓDULOS
-- ─────────────────────────────────────────────────────────────
INSERT INTO training_modules (code, title, content, version, passing_score, total_questions, order_index) VALUES

('VRN-TRN-021', 'Módulo 1: Navegación de la Plataforma y la App del Conductor', '[
  {"title":"Primeros Pasos","body":"Descarga la app VeronaRide Conductor desde la App Store (iOS) o Google Play (Android). Busca ''VeronaRide Conductor'' — asegúrate de descargar la app de Conductor, no la de Pasajero.\n\nPara iniciar sesión: abre la app → toca Iniciar Sesión → ingresa tu correo electrónico y contraseña registrados → completa la autenticación de dos factores (código por SMS). Si olvidaste tu contraseña, toca ''Olvidé mi Contraseña'' — el enlace de restablecimiento llega en un plazo de 2 minutos."},
  {"title":"Resumen del Panel del Conductor","body":"Elementos principales de la pantalla:\n• Botón Conectarse / Desconectarse — activa o desactiva tu disponibilidad\n• Vista de mapa — muestra tu ubicación y la actividad cercana\n• Resumen de ganancias — ganancias del día en la parte superior de la pantalla\n• Ventana emergente de solicitud de viaje — aparece cuando un pasajero coincide contigo (tienes 30 segundos para aceptar)\n• Barra de navegación (inferior) — Inicio, Viajes, Ganancias, Cuenta, Ayuda\n• Indicador de estado — Verde = conectado. Gris = desconectado.\n\nPara conectarte: asegúrate de que tu vehículo esté limpio → abre la app → toca el botón grande Conectarse → el indicador de estado se pone verde."},
  {"title":"Recepción y Aceptación de Solicitudes de Viaje","body":"Cuando un pasajero solicita un viaje cerca de ti, aparece una ventana emergente. Tienes 30 segundos para aceptar o rechazar. La solicitud muestra: nombre y calificación del pasajero, ubicación de recogida y distancia, duración y distancia del viaje, tipo de viaje y ganancias estimadas.\n\nCómo aceptar un viaje:\n1. Toca Aceptar dentro de los 30 segundos\n2. Sigue el GPS hasta el punto de recogida\n3. Toca ''He Llegado'' al llegar al punto de recogida\n4. Espera hasta 5 minutos al pasajero\n5. Toca ''Iniciar Viaje'' una vez que el pasajero esté sentado\n6. Sigue el GPS hasta el destino\n7. Toca ''Finalizar Viaje'' al llegar\n\nIMPORTANTE: Confirma siempre el nombre del pasajero antes de iniciar el viaje."},
  {"title":"Durante el Viaje","body":"Navegación: la app utiliza Google Maps para las indicaciones de ruta. No te desvíes de la ruta sugerida sin el acuerdo del pasajero. Si es necesario un desvío por tráfico, informa primero al pasajero. Nunca uses el teléfono con las manos — usa siempre un soporte para el tablero.\n\nComunicación dentro de la app: toca el ícono de teléfono para llamar a través de la app (el número queda oculto). Toca el ícono de mensaje para enviar textos predefinidos. Nunca compartas tu número de teléfono personal con los pasajeros."},
  {"title":"Ganancias y Pagos","body":"Para ver tus ganancias: toca Ganancias en la barra de navegación inferior. Consulta los resúmenes diarios, semanales y mensuales. Toca cualquier viaje para ver el desglose completo de la tarifa.\n\nConfiguración de pagos: toca Cuenta → Configuración de Pagos → Registrar Método de Pago. Ingresa tu Zelle, tu cuenta de Binance o tus datos de Pago Móvil, según prefieras. La verificación se completa en 1 a 2 días hábiles. Los pagos se envían todos los lunes correspondientes a la semana anterior.\n\nRetiro Instantáneo: toca Ganancias → Retirar Ahora. Monto mínimo $5,00. Los fondos llegan en un plazo de 30 minutos. Se aplica una pequeña comisión de procesamiento."},
  {"title":"Funciones de Emergencia y Seguridad","body":"Botón SOS: ubicado en la esquina superior derecha de tu pantalla durante cualquier viaje activo. Al tocarlo, se llama de inmediato al 911, se alerta al Soporte de VeronaRide con tu ubicación GPS y se comparte tu ubicación en tiempo real con los servicios de emergencia. Usa el botón SOS únicamente para emergencias reales — las activaciones falsas violan el Acuerdo de Conductor.\n\nChat de soporte dentro de la app: toca Ayuda en la barra de navegación inferior. El soporte por chat está disponible las 24 horas, los 7 días de la semana. Para asuntos no urgentes usa el chat — para emergencias usa el SOS o llama al 911."}
]', '1.0', 8, 10, 1),
-- VERIFICAR: monto mínimo de Retiro Instantáneo ($5,00) en el contenido del Módulo 1 (sección "Ganancias y Pagos") pendiente de confirmar para Venezuela

('VRN-TRN-022', 'Módulo 2: Excelencia en el Servicio al Cliente', '[
  {"title":"Conoce a tus Pasajeros","body":"Los pasajeros de VeronaRide no son usuarios típicos de transporte por aplicación. Son:\n• Adultos de 65 años o más que ya no conducen\n• Personas que usan sillas de ruedas, andadores, bastones u otros dispositivos de movilidad\n• Pacientes que viajan hacia y desde citas médicas\n• Pacientes en recuperación post-quirúrgica o post-hospitalaria\n• Personas con discapacidad visual o auditiva\n• Pasajeros con condiciones cognitivas, como demencia leve\n\nEstos pasajeros a menudo dependen de VeronaRide como su medio de transporte principal. Para muchos, tu llegada es la parte más importante de su día. Tu paciencia y tu cuidado marcan una diferencia real."},
  {"title":"El Estándar de Servicio VeronaRide — 5 Compromisos","body":"1. PUNTUAL — Llega a tiempo. Si te retrasas, avisa de inmediato a través de la app.\n2. PROFESIONAL — Vehículo limpio, apariencia cuidada, tono respetuoso en todo momento.\n3. PACIENTE — Nunca apresures a tu pasajero. Dale todo el tiempo que necesite.\n4. PROACTIVO — Ofrece ayuda antes de que te la pidan. Abre puertas, ofrece tu brazo, ayuda con el equipaje.\n5. PRESENTE — Dedica toda tu atención a la seguridad y comodidad del pasajero durante todo el viaje."},
  {"title":"Llegada y Abordaje","body":"Al llegar:\n• Estaciona lo más cerca posible de la entrada del punto de recogida, siempre que sea seguro\n• Baja del vehículo — NO toques la bocina ni esperes dentro del carro\n• Saluda al pasajero por su nombre: ''Hola, ¿es usted [Nombre]? Soy [Tu Nombre], de VeronaRide.''\n• Ofrece ayuda con el equipaje, el andador o el dispositivo de movilidad\n• Abre la puerta del pasajero\n• Ofrece tu brazo si parece necesitarlo — pero PREGUNTA primero: ''¿Le ayudo a llegar al carro?''\n• Espera pacientemente hasta que esté completamente sentado y cómodo antes de cerrar la puerta\n\nAyuda con dispositivos de movilidad: pregunta siempre antes de tocar una silla de ruedas, andador o bastón. NUNCA intentes levantar físicamente a un pasajero — ayuda solo con el equilibrio y el apoyo."},
  {"title":"Durante el Viaje","body":"Conversación: saluda con calidez y pregunta si la temperatura es agradable. Deja que el pasajero marque la pauta — algunos prefieren silencio, otros disfrutan conversar. Nunca discutas temas de religión, política o controversiales. Si comparten preocupaciones de salud, escucha con empatía — no des consejos médicos.\n\nConducción para su comodidad: acelera y frena de forma gradual — los movimientos bruscos causan dolor y ansiedad. Evita baches y vías en mal estado cuando sea posible. Mantén la música apagada o muy baja, a menos que te la pidan. Nunca uses el teléfono mientras conduces."},
  {"title":"Situaciones Difíciles","body":"Pasajero confundido sobre el destino: confirma con calma — ''Quiero asegurarme de llevarlo al lugar correcto. La dirección en la app indica [dirección]. ¿Es correcto?'' Si tienes dudas, llama a soporte antes de partir.\n\nPasajero se altera: reconoce la situación con calma — ''Veo que está pasando un momento difícil. Tómese su tiempo — estoy aquí para llevarlo de forma segura.'' Conduce con suavidad y en silencio.\n\nPasajero se mueve lentamente y el próximo viaje está esperando: el pasajero que tienes enfrente es tu ÚNICA prioridad. Nunca lo apresures.\n\nPasajero es grosero o agresivo: mantén la calma, no confrontes. Si la situación es grave, detente en un lugar seguro y aborda el problema con calma. Usa el SOS si hay amenazas. Reporta el incidente inmediatamente después del viaje."},
  {"title":"Calificaciones y Comentarios","body":"Tu calificación como conductor es la métrica más importante de la plataforma. Los conductores por debajo de 4,5 estrellas reciben advertencias. Calificaciones sostenidas por debajo de 4,5 pueden resultar en la desactivación de la cuenta.\n\nLa Lista de Verificación de 5 Estrellas:\n✓ Llega a tiempo o antes\n✓ Baja del vehículo y saluda al pasajero por su nombre\n✓ Ofrece ayuda antes de que te la pidan\n✓ Conduce con suavidad — sin frenazos bruscos\n✓ Mantén el vehículo limpio y a una temperatura agradable\n✓ Sé cálido, paciente y profesional en todo momento"}
]', '1.0', 8, 10, 2),

('VRN-TRN-023', 'Módulo 3: Protocolos de Seguridad y Procedimientos de Emergencia', '[
  {"title":"Lista de Verificación de Seguridad Antes del Viaje","body":"Antes de conectarte cada día, completa esta verificación:\n• Todas las luces exteriores — deben funcionar correctamente\n• Neumáticos — con presión adecuada, sin daños\n• Cinturones de seguridad — todos retráctiles y con seguro\n• Luces de advertencia del tablero — ninguna encendida\n• Limpieza interior — limpio y sin olores\n• Carga del teléfono — por encima del 50% (cárgalo si está por debajo del 20% antes de conducir)\n• Soporte del teléfono — soporte fijo en el tablero o parabrisas\n• Condición personal — descansado, alerta y sobrio\n\nTOLERANCIA CERO: VeronaRide tiene una política de tolerancia cero para conducir bajo los efectos del alcohol, drogas o cualquier medicamento que altere la capacidad de conducir. Su incumplimiento resulta en la desactivación permanente e inmediata."},
  {"title":"Estándares de Conducción Segura","body":"En la vía:\n• Respeta siempre los límites de velocidad indicados — sin excepciones\n• Detente por completo en todas las señales de PARE y semáforos en rojo\n• Nunca uses el teléfono con las manos mientras conduces\n• Mantén una distancia de seguimiento segura — el doble de lo habitual con pasajeros de edad avanzada\n• Usa las luces direccionales en cada cambio de canal y giro\n• Nunca conduzcas de forma agresiva — sin pegarte al carro de adelante ni cerrar el paso\n\nPara la seguridad del pasajero:\n• Acelera y frena de forma gradual — siempre\n• Evita los cruces ferroviarios cuando sea posible\n• No hagas giros bruscos — solo giros amplios y suaves\n• Espera hasta que el pasajero esté completamente sentado y con el cinturón puesto antes de avanzar\n• NUNCA muevas el vehículo si un pasajero está de pie o no está asegurado"},
  {"title":"Respuesta ante un Accidente de Tránsito","body":"Pasos inmediatos:\n1. DETENTE de inmediato — no te retires del lugar\n2. Enciende las luces de emergencia\n3. Verifica si tú o tu pasajero tienen lesiones\n4. Llama al 911 si hay algún herido — indica tu ubicación con claridad\n5. Si no hay heridos y el vehículo puede circular, muévete hacia el lado de la vía\n6. NO admitas responsabilidad ni discutas sobre quién tuvo la culpa\n7. Intercambia información: nombre, licencia, placa y compañía de seguros\n8. Fotografía los daños del vehículo, la escena y las condiciones de la vía\n9. Reporta el incidente de inmediato a través de la app VeronaRide Conductor\n10. Levanta un reporte policial si hay algún herido o alguna disputa\n\nLa normativa venezolana de tránsito exige permanecer en el lugar del accidente. Abandonar la escena de un accidente con heridos constituye un delito.\n\nDespués de un accidente: mantén la calma. Pregunta al pasajero ''¿Está usted bien? ¿Siente algún dolor?'' NO muevas al pasajero si reporta dolor en el cuello o la espalda — espera a los servicios de emergencia."},
  {"title":"Emergencia Médica del Pasajero","body":"Señales de una emergencia médica:\n• Falta de respuesta o pérdida súbita de conciencia\n• Dolor en el pecho o dificultad para respirar\n• Dolor de cabeza súbito y severo, o confusión\n• Convulsiones o temblores incontrolables\n• Señales de accidente cerebrovascular: caída facial, debilidad en el brazo, dificultad para hablar\n• Reacción alérgica grave: hinchazón, dificultad para respirar\n\nPasos a seguir:\n1. Detente de forma segura e inmediata — enciende las luces de emergencia\n2. Llama al 911 — describe los síntomas con claridad\n3. Indica al operador tu ubicación GPS exacta desde la app\n4. Usa el botón SOS de la app para alertar al Soporte de VeronaRide\n5. Permanece en línea con el 911 y sigue las instrucciones\n6. NO dejes solo al pasajero\n7. Si el operador te lo indica — inicia RCP\n8. Desbloquea las puertas del vehículo para que los servicios de emergencia puedan acceder\n\nNO lleves al pasajero al hospital por tu cuenta — llama al 911 y espera a los servicios de emergencia."},
  {"title":"Amenazas a la Seguridad y Clima Severo","body":"Si te sientes inseguro: mantén la calma, no confrontes. Dirígete a un lugar público, una estación de bomberos o una comandancia policial. Usa el SOS de la app si estás en peligro inmediato. Al detenerte en un lugar seguro, pide al pasajero que baje con calma.\n\nSituaciones de tolerancia cero (detente, pide al pasajero que baje, usa el SOS, reporta de inmediato):\n• El pasajero está intoxicado y se comporta de forma agresiva\n• El pasajero hace comentarios de índole sexual o intenta contacto físico\n• El pasajero te amenaza con algún arma\n• El pasajero te pide desviarte hacia un lugar no verificado\n\nClima severo:\n• Nunca conduzcas a través de vías inundadas — da la vuelta, nunca arriesgues tu vida ni la de tus pasajeros\n• Ante una alerta de tormenta severa: aléjate de la trayectoria de la tormenta o resguárdate en una edificación sólida — NUNCA debajo de un puente\n• Sigue todas las alertas de pausa de la plataforma que aparezcan en la app"}
]', '1.0', 9, 10, 3),

('VRN-TRN-024', 'Módulo 4: Cumplimiento de la LOPCD y Capacitación en Sensibilización', '[
  {"title":"La LOPCD y tus Responsabilidades","body":"La Ley para las Personas con Discapacidad de Venezuela (LOPCD) es una ley nacional que protege los derechos de las personas con discapacidad y prohíbe la discriminación en todos los ámbitos de la vida pública — incluido el transporte.\n\nComo conductor de VeronaRide, NO PUEDES:\n• Negar el servicio a un pasajero por causa de una discapacidad\n• Negar el servicio a un pasajero con un animal de servicio\n• Cobrar un monto adicional por necesidades de accesibilidad\n• Tratar a un pasajero con discapacidad con menos dignidad que a cualquier otro pasajero\n\nCualquier conductor que se determine que negó el servicio por causa de una discapacidad será desactivado de forma inmediata y permanente. VeronaRide colaborará con cualquier investigación relacionada con una denuncia de este tipo."},
  {"title":"Lenguaje que Prioriza a la Persona","body":"El lenguaje que prioriza a la persona coloca a la persona antes que su discapacidad. Reconoce que una discapacidad es solo una parte de la persona — no su identidad.\n\nDi esto → No esto:\n• ''Persona con discapacidad'' → ''Discapacitado'' / ''los discapacitados''\n• ''Persona que usa silla de ruedas'' → ''Postrado en silla de ruedas'' / ''confinado a una silla de ruedas''\n• ''Persona con discapacidad visual'' → ''Ciego'' / ''los ciegos''\n• ''Persona con discapacidad auditiva'' → ''Sordomudo'' / ''los sordos''\n• ''Persona con discapacidad cognitiva'' → ''Retrasado mental'' / ''lento''\n• ''Persona con demencia'' → ''Demente'' / ''senil''\n\nEn caso de duda: trata a cada pasajero como quisieras que trataran a un familiar tuyo."},
  {"title":"Animales de Servicio","body":"Conforme a la LOPCD, un animal de servicio es un perro (o un caballo miniatura) entrenado individualmente para realizar una tarea específica para una persona con discapacidad.\n\nSOLO puedes hacer DOS preguntas:\n1. ¿Este animal de servicio es requerido debido a una discapacidad?\n2. ¿Qué trabajo o tarea ha sido entrenado para realizar el perro?\n\nNO PUEDES:\n• Preguntar sobre la naturaleza o gravedad de la discapacidad del pasajero\n• Pedir documentación, credenciales o comprobante de entrenamiento\n• Negar el servicio por tus propias alergias a los animales\n• Negar el servicio porque otro pasajero sea alérgico\n• Exigir que el animal de servicio viaje en el maletero o área de carga\n\nLos animales de apoyo emocional y los animales de terapia NO están cubiertos por la LOPCD, pero la política de VeronaRide es aceptar a todos los animales que viajen de forma tranquila. En caso de duda, acepta el viaje y reporta cualquier inquietud a Soporte después."},
  {"title":"Pasajeros con Silla de Ruedas y Dispositivos de Movilidad","body":"Pautas generales:\n• Pregunta siempre antes de tocar la silla de ruedas o cualquier dispositivo de movilidad\n• Pregunta al pasajero cómo prefiere que lo ayudes — nunca asumas\n• Nunca empujes una silla de ruedas manual sin permiso\n• Pliega andadores y bastones y colócalos en el maletero o asiento trasero según prefiera el pasajero\n\nAseguramiento de la silla de ruedas (vehículos accesibles — se requiere un sistema de 4 puntos según la normativa):\n1. Coloca la silla de ruedas mirando hacia adelante en el área de aseguramiento\n2. Coloca los amarres delanteros — izquierdo y derecho — en ángulo de 45 grados\n3. Coloca los amarres traseros — izquierdo y derecho — en ángulo de 45 grados\n4. Verifica que los cuatro amarres estén firmes — sin holgura\n5. Abrocha el cinturón de cadera sobre el regazo del pasajero\n6. Abrocha el cinturón de hombro sobre el pecho del pasajero\n7. Pregunta: ''¿Está cómodo y seguro?''\n8. No comiences a conducir hasta que el pasajero confirme que está listo"},
  {"title":"Cómo Comunicarte con Pasajeros con Discapacidad","body":"Pasajeros con discapacidad auditiva:\n• Mira al pasajero al hablar — muchos leen los labios\n• Habla con claridad y a volumen normal — no grites\n• Usa la mensajería de la app para comunicación escrita si resulta útil\n• Confirma el destino por escrito si existe alguna duda\n\nPasajeros con discapacidad visual:\n• Preséntate por tu nombre al acercarte: ''Hola, soy [Nombre], de VeronaRide''\n• Ofrece tu brazo — no tomes al pasajero por sorpresa\n• Describe el camino hacia el vehículo: ''La puerta del carro está a unos tres pasos a su derecha''\n• Avísale cuando llegues al destino\n\nPasajeros con dificultades cognitivas o de memoria:\n• Habla despacio y con claridad — usa oraciones cortas\n• Confirma el destino antes y durante el viaje si hay incertidumbre\n• Ten paciencia con las preguntas repetitivas — nunca muestres frustración\n• Si un pasajero parece confundido y en riesgo, contacta al Soporte de VeronaRide antes de finalizar el viaje"}
]', '1.0', 9, 10, 4),

('VRN-TRN-025', 'Módulo 5: Normativa de Tránsito y Regulaciones para Transporte por Aplicación en Venezuela', '[
  {"title":"Normativa de Tránsito en Venezuela — Reglas Clave","body":"Conducción con Manos Libres (según la normativa venezolana de tránsito): está prohibido usar un dispositivo electrónico portátil mientras conduces — incluso en un semáforo en rojo. DEBES usar un dispositivo de manos libres en todo momento. La política de VeronaRide va más allá de la ley: tu teléfono debe estar siempre montado en un soporte. El uso del teléfono en la mano es motivo de desactivación, sin importar si hay autoridades de tránsito presentes.\n\nLímites de velocidad (valores de referencia para la capacitación):\n• Zona escolar (en horario activo): 30 km/h\n• Calles residenciales: 40–50 km/h (salvo que se indique otro límite)\n• Autopistas urbanas: 80–100 km/h (según lo indicado)\n• Carreteras: 100–120 km/h (según lo indicado)\n\nLey del Cinturón de Seguridad: todos los ocupantes del vehículo deben usar el cinturón de seguridad. Eres responsable de asegurarte de que todos los pasajeros estén abrochados antes de comenzar a circular.\n\nCesión de Paso a Vehículos de Emergencia: debes cambiarte de canal (o reducir considerablemente la velocidad, aproximadamente 30 km/h por debajo del límite) al pasar junto a vehículos de emergencia, grúas o vehículos de mantenimiento vial con las luces encendidas. El incumplimiento puede acarrear sanciones importantes, especialmente si se pone en riesgo a un trabajador vial.\n\nConducir bajo los efectos del alcohol: la política de tolerancia cero de VeronaRide implica que cualquier nivel de alcohol detectado da lugar a la desactivación inmediata, independientemente de la cifra exacta que establezca la normativa vigente.\n\nVías Inundadas: está prohibido pasar una barrera o continuar circulando por una vía inundada. Si la vía está inundada, da la vuelta."},
  {"title":"Regulaciones para Empresas de Transporte por Aplicación","body":"Una empresa de transporte por aplicación (conocida internacionalmente como TNC, por sus siglas en inglés) es, según la normativa venezolana de tránsito, una empresa que utiliza una plataforma digital para conectar a pasajeros con conductores que usan sus vehículos particulares. VeronaRide opera bajo este modelo, en cumplimiento con las disposiciones del Instituto Nacional de Transporte Terrestre (INTT).\n\nRequisitos para conductores según la normativa venezolana:\n• Licencia de conducir vigente — verificada al momento de la afiliación y revisada anualmente\n• Verificación de antecedentes — previa a la activación y con revisión anual\n• Sin antecedentes de conducir bajo los efectos del alcohol en los últimos 7 años — verificado en la revisión del historial de conducción\n• Sin delitos graves en los últimos 7 años — verificado mediante antecedentes penales\n• No figurar en el registro de delincuentes sexuales — verificado en los registros correspondientes\n• Edad mínima: 18 años (según la ley) — VeronaRide establece un estándar más alto de 21 años\n\nPolítica de Tolerancia Cero: las empresas de transporte por aplicación deben suspender de inmediato a cualquier conductor que reciba una denuncia de tolerancia cero, investigar en un plazo de 24 horas y reincorporarlo solo después de confirmar un resultado negativo en la prueba de alcohol o drogas."},
  {"title":"Requisitos de Seguro — Las 3 Fases","body":"Fase 1 — App APAGADA: sin trabajar, uso personal únicamente. Cobertura: solo tu seguro personal de auto.\n\nFase 2 — App ENCENDIDA, sin viaje asignado: disponible, esperando una solicitud. Cobertura: póliza de responsabilidad contingente de VeronaRide.\n\nFase 3 — Viaje aceptado hasta su finalización: en camino a la recogida o con pasajero a bordo. Cobertura: póliza de VeronaRide de responsabilidad civil combinada por $1.000.000 más cobertura para motorista no asegurado.\n\nIMPORTANTE: debes contar con seguro personal de auto Y cobertura adicional para transporte por aplicación (TNC). Las pólizas de auto personales estándar NO te cubren durante la Fase 2. Operar sin la cobertura adecuada es ilegal y motivo de desactivación."},
  {"title":"Tus Derechos como Contratista Independiente","body":"Qué significa el estatus de contratista independiente:\n• NO eres empleado de VeronaRide\n• Estableces tu propio horario — no se exige un mínimo de horas\n• Puedes trabajar para varias plataformas al mismo tiempo\n• Eres responsable de tus propias obligaciones fiscales ante el SENIAT — VeronaRide no actúa como tu empleador a efectos tributarios\n• Eres responsable de tu propio seguro de salud y de tus gastos operativos\n\nTus derechos:\n• Derecho a recibir el 87% de cada tarifa, según lo acordado en tu Acuerdo de Contratista\n• Derecho a una explicación clara de cualquier decisión de desactivación\n• Derecho a disputar pagos incorrectos dentro de los 30 días\n• Derecho a acceder a tus datos de ganancias y documentos fiscales a través de la app\n• Derecho a terminar tu contrato en cualquier momento contactando a VeronaRide"},
  {"title":"Infracciones que Ponen en Riesgo tu Desactivación","body":"Desactivación permanente e inmediata:\n• Conducir bajo los efectos del alcohol o drogas\n• Negar el servicio a un pasajero con discapacidad que tiene derecho a ser atendido\n• Conducta sexual inapropiada hacia un pasajero\n\nAdvertencia → suspensión → desactivación:\n• Uso del teléfono con las manos mientras conduces\n• Calificación sostenida por debajo de 4,5 estrellas\n\nSuspensión inmediata:\n• Operar sin la cobertura de seguro requerida para transporte por aplicación\n• No aprobar la verificación anual de antecedentes (suspensión pendiente de revisión)"}
]', '1.0', 8, 10, 5);
-- VERIFICAR: cobertura de responsabilidad civil de $1.000.000 (Fase 3) en el contenido del Módulo 5 (sección "Requisitos de Seguro") pendiente de confirmar para Venezuela
-- VERIFICAR: porcentaje del 87% por tarifa en el contenido del Módulo 5 (sección "Tus Derechos como Contratista Independiente") pendiente de confirmar para Venezuela

-- ─────────────────────────────────────────────────────────────
-- PREGUNTAS — MÓDULO 1: Plataforma y Navegación de la App
-- ─────────────────────────────────────────────────────────────
INSERT INTO training_questions (module_id, question_text, option_a, option_b, option_c, option_d, correct_option, order_index)
SELECT m.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.order_index
FROM training_modules m,
(VALUES
  (1, '¿Cuánto tiempo tienes para aceptar una solicitud de viaje?',
      '15 segundos', '30 segundos', '60 segundos', '2 minutos', 'B'),
  (2, '¿Qué significa un indicador de estado verde?',
      'Viaje en curso', 'La app necesita actualizarse', 'Estás conectado y disponible', 'Las ganancias están listas', 'C'),
  (3, 'Antes de iniciar un viaje, siempre debes:',
      'Preguntar al pasajero su destino', 'Confirmar el nombre del pasajero', 'Revisar tu saldo de ganancias', 'Llamar al soporte de VeronaRide', 'B'),
  (4, '¿Dónde se encuentra el botón SOS durante un viaje?',
      'En la barra de navegación inferior', 'En la pestaña de Ganancias', 'En la esquina superior derecha de la pantalla', 'En la configuración de la cuenta', 'C'),
  (5, '¿Cómo se entregan los pagos semanales?',
      'En efectivo por correo', 'Todos los lunes mediante Zelle, Binance o Pago Móvil', 'Por PayPal todos los viernes', 'Por Venmo a solicitud', 'B'),
  (6, '¿Qué NUNCA debes compartir con los pasajeros?',
      'El modelo de tu vehículo', 'Tu nombre', 'Tu número de teléfono personal', 'Tu hora estimada de llegada', 'C'),
  (7, '¿Cuál es el monto mínimo para un Retiro Instantáneo?',
      '$1,00', '$10,00', '$5,00', '$20,00', 'C'), /* VERIFICAR: cifra específica pendiente de confirmar para Venezuela */
  (8, 'Si la navegación sugiere un desvío por tráfico, debes:',
      'Ignorarlo y tomar tu ruta preferida', 'Informar al pasajero antes de cambiar de ruta', 'Finalizar el viaje y pedir uno nuevo', 'Llamar primero a soporte', 'B'),
  (9, '¿Cuánto tiempo debes esperar a un pasajero antes de marcarlo como ausente?',
      '2 minutos', '10 minutos', '5 minutos', '15 minutos', 'C'),
  (10, '¿Dónde debes ir en la app para configurar tu método de pago?',
       'Ayuda → Pagos', 'Cuenta → Configuración de Pagos', 'Ganancias → Configurar Cuenta', 'Inicio → Finanzas', 'B')
) AS q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
WHERE m.code = 'VRN-TRN-021';

-- ─────────────────────────────────────────────────────────────
-- PREGUNTAS — MÓDULO 2: Excelencia en el Servicio al Cliente
-- ─────────────────────────────────────────────────────────────
INSERT INTO training_questions (module_id, question_text, option_a, option_b, option_c, option_d, correct_option, order_index)
SELECT m.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.order_index
FROM training_modules m,
(VALUES
  (1, 'Un pasajero se mueve lentamente hacia el carro. Debes:',
      'Tocar la bocina para llamar su atención', 'Esperar con paciencia y ofrecer ayuda', 'Marcarlo como ausente', 'Llamar a soporte para cancelar', 'B'),
  (2, 'Antes de tocar la silla de ruedas de un pasajero, debes:',
      'Simplemente hacerlo — lo esperan', 'Preguntarle primero al pasajero', 'Llamar al soporte de VeronaRide', 'Esperar a que ellos te lo pidan', 'B'),
  (3, 'La forma correcta de saludar a un pasajero en la recogida es:',
      'Tocar la bocina dos veces para que sepan que llegaste', 'Enviarle un mensaje por la app', 'Bajar del vehículo y saludarlo por su nombre', 'Llamarlo desde dentro del carro', 'C'),
  (4, 'Un pasajero está confundido sobre su destino. Debes:',
      'Simplemente conducir a la dirección de la app', 'Confirmar con calma el destino antes de partir', 'Cancelar el viaje', 'Llamar a su familia', 'B'),
  (5, '¿Qué comportamiento al conducir es MÁS importante para los pasajeros de edad avanzada?',
      'Conducir rápido para ahorrar tiempo', 'Poner música relajante', 'Aceleración gradual y frenado suave', 'Mantener las ventanas abiertas', 'C'),
  (6, '¿Qué temas debes EVITAR conversar con los pasajeros?',
      'El clima y eventos locales', 'Su destino', 'Religión y política', 'Su nombre y dirección', 'C'),
  (7, 'Tu calificación de pasajero baja de 4,5. ¿Qué sucede?',
      'Nada — las calificaciones no importan', 'Recibes una advertencia y podrías enfrentar la desactivación', 'Se te reduce el pago', 'Tu cuenta se elimina de inmediato', 'B'),
  (8, 'Un pasajero se altera durante el viaje. Debes:',
      'Hacerle preguntas detalladas sobre su problema', 'Reconocer la situación con calma y conducir con suavidad y en silencio', 'Finalizar el viaje antes de tiempo', 'Darle consejos sobre su situación', 'B'),
  (9, '¿Qué NUNCA debes intentar con un pasajero?',
      'Ofrecerte a cargar su bolso', 'Levantarlo o trasladarlo físicamente', 'Abrirle la puerta', 'Saludarlo por su nombre', 'B'),
  (10, '¿Cuál es la calificación mínima aceptable para un conductor en VeronaRide?',
       '4,0 estrellas', '3,5 estrellas', '4,8 estrellas', '4,5 estrellas', 'D')
) AS q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
WHERE m.code = 'VRN-TRN-022';

-- ─────────────────────────────────────────────────────────────
-- PREGUNTAS — MÓDULO 3: Protocolos de Seguridad y Procedimientos de Emergencia
-- ─────────────────────────────────────────────────────────────
INSERT INTO training_questions (module_id, question_text, option_a, option_b, option_c, option_d, correct_option, order_index)
SELECT m.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.order_index
FROM training_modules m,
(VALUES
  (1, 'Después de un accidente de tránsito, NUNCA debes:',
      'Llamar al 911 si hay heridos', 'Tomar fotografías de los daños', 'Admitir responsabilidad ante el otro conductor', 'Intercambiar información del seguro', 'C'),
  (2, 'Si un pasajero muestra señales de un accidente cerebrovascular, debes:',
      'Llevarlo al hospital más cercano', 'Llamar al 911 de inmediato y permanecer con él', 'Preguntarle si tiene algún medicamento', 'Terminar el viaje primero', 'B'),
  (3, 'La política de VeronaRide sobre conducir bajo los efectos del alcohol o drogas es:',
      'Una advertencia antes de la desactivación', 'Tolerancia cero — desactivación permanente e inmediata', 'Solo aplica al alcohol, no a los medicamentos', 'Se revisa caso por caso', 'B'),
  (4, '¿Hasta qué momento debes esperar antes de mover el vehículo?',
      'Hasta que el pasajero te indique el destino', 'Hasta que el pasajero esté completamente sentado y con el cinturón puesto', 'Hasta que confirmes el pago', 'Hasta que cargue la app de navegación', 'B'),
  (5, 'Durante una emergencia médica del pasajero, NO debes:',
      'Llamar al 911', 'Usar el botón SOS de la app', 'Llevar tú mismo al pasajero al hospital', 'Permanecer con el pasajero hasta que llegue la ayuda', 'C'),
  (6, 'Si te encuentras con una vía inundada, debes:',
      'Cruzarla despacio', 'Dar la vuelta — nunca conduzcas a través de agua de inundación', 'Detenerte y esperar a que baje el agua', 'Llamar primero al 911', 'B'),
  (7, 'Un pasajero se vuelve agresivo. Tu primera acción debe ser:',
      'Confrontarlo verbalmente para imponer autoridad', 'Llamar de inmediato al soporte de VeronaRide', 'Mantener la calma y evitar que la situación escale', 'Acelerar para terminar el viaje más rápido', 'C'),
  (8, '¿Qué carga mínima de batería se recomienda antes de comenzar un turno?',
      '20%', '80%', '50%', '100%', 'C'),
  (9, 'Si un pasajero reporta dolor de cuello después de un accidente, debes:',
      'Ayudarlo a salir del vehículo de inmediato', 'No moverlo — esperar a los servicios de emergencia', 'Llevarlo al hospital', 'Pedirle que camine para que se le pase', 'B'),
  (10, '¿A dónde debes dirigirte si te sientes amenazado por un pasajero?',
       'A una vía desolada donde puedan hablar en privado', 'A un lugar público, una estación de bomberos o una comandancia policial', 'De vuelta a la dirección de recogida', 'Llamar al soporte de VeronaRide y esperar', 'B')
) AS q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
WHERE m.code = 'VRN-TRN-023';

-- ─────────────────────────────────────────────────────────────
-- PREGUNTAS — MÓDULO 4: Cumplimiento de la LOPCD y Capacitación en Sensibilización
-- ─────────────────────────────────────────────────────────────
INSERT INTO training_questions (module_id, question_text, option_a, option_b, option_c, option_d, correct_option, order_index)
SELECT m.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.order_index
FROM training_modules m,
(VALUES
  (1, 'Conforme a la LOPCD, estás OBLIGADO a transportar:',
      'Solo a pasajeros que puedan caminar hasta el vehículo', 'A pasajeros con animales de servicio', 'Solo a pasajeros menores de 80 años', 'Solo a pasajeros con un perfil VeronaRide Accesible', 'B'),
  (2, '¿Cuál de las siguientes opciones es lenguaje que prioriza a la persona?',
      'El pasajero discapacitado', 'La persona postrada en silla de ruedas', 'Una persona que usa silla de ruedas', 'El pasajero minusválido', 'C'),
  (3, 'A un pasajero con un animal de servicio puedes preguntarle:',
      'Cuál es su discapacidad', 'Por documentación que compruebe el entrenamiento del animal', 'Qué tarea ha sido entrenado a realizar el animal', 'Por qué necesita al animal', 'C'),
  (4, 'Un pasajero con alergia a los perros te pide que retires al animal de servicio. Debes:',
      'Retirar al animal como se solicita', 'Rechazar el viaje con el animal de servicio', 'Completar el viaje — el animal de servicio tiene prioridad', 'Llamar a soporte para cancelar', 'C'),
  (5, '¿Cuántos puntos de amarre se requieren para asegurar una silla de ruedas?',
      '2', '3', '4', '6', 'C'),
  (6, 'Antes de tocar la silla de ruedas de un pasajero, debes:',
      'Simplemente hacerlo — lo esperan', 'Preguntarle primero al pasajero', 'Revisar la app para notas de aseguramiento', 'Ponerte guantes primero', 'B'),
  (7, 'Un pasajero con demencia hace la misma pregunta repetidamente. Debes:',
      'Mostrar algo de frustración para que se detenga', 'Responder con paciencia cada vez', 'Ignorar la pregunta después de la tercera vez', 'Llamar a soporte para reportarlo', 'B'),
  (8, 'Al acercarte a un pasajero con discapacidad visual, debes:',
      'Tocarle el hombro para llamar su atención', 'Tocar la bocina para que sepa dónde está el carro', 'Presentarte por tu nombre y describir el camino hacia el carro', 'Esperar a que encuentre el vehículo', 'C'),
  (9, 'Negar el servicio a un pasajero por su discapacidad resultará en:',
      'Una advertencia por escrito', 'Una suspensión de 7 días', 'Desactivación permanente e inmediata', 'Una multa de VeronaRide', 'C'),
  (10, 'NO debes comenzar a conducir después de asegurar a un pasajero en silla de ruedas hasta que:',
       'Se verifique visualmente el sistema de aseguramiento', 'El pasajero confirme que está cómodo y listo', 'Recibas la confirmación de inicio de viaje en la app', 'Ambas A y B', 'D')
) AS q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
WHERE m.code = 'VRN-TRN-024';

-- ─────────────────────────────────────────────────────────────
-- PREGUNTAS — MÓDULO 5: Normativa de Tránsito y Regulaciones para Transporte por Aplicación
-- ─────────────────────────────────────────────────────────────
INSERT INTO training_questions (module_id, question_text, option_a, option_b, option_c, option_d, correct_option, order_index)
SELECT m.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.order_index
FROM training_modules m,
(VALUES
  (1, 'El uso del teléfono con las manos mientras conduces está prohibido por la normativa venezolana y la política de VeronaRide. El incumplimiento puede resultar en:',
      'Solo una advertencia verbal', 'Ninguna consecuencia si no hay autoridades presentes', 'Motivo de desactivación, sin importar si hay autoridades presentes', 'Una reducción del 10% en tus ganancias', 'C'),
  (2, '¿Cuál es la edad mínima para conducir con VeronaRide?',
      '18 años (según la ley)', '21 años — VeronaRide establece un estándar más alto', '25 años', '19 años', 'B'),
  (3, '¿Cuándo entra en vigencia la póliza de responsabilidad civil de $1.000.000 de VeronaRide?',
      'Cuando enciendes la app', 'Desde que se acepta un viaje hasta su finalización', 'En todo momento mientras la app esté instalada', 'Solo cuando transportas a un pasajero con discapacidad', 'B'), /* VERIFICAR: cifra específica pendiente de confirmar para Venezuela */
  (4, 'Como contratista independiente, tus obligaciones fiscales en Venezuela son responsabilidad de:',
      'VeronaRide, que paga tus impuestos por ti', 'El SENIAT, sin que tengas que hacer nada', 'Ti mismo, ante el SENIAT', 'Nadie — los conductores están exentos de impuestos', 'C'),
  (5, 'La normativa de cesión de paso a vehículos de emergencia requiere que:',
      'Cedas el paso a todos los peatones', 'Te cambies de canal o reduzcas la velocidad considerablemente cerca de vehículos de emergencia detenidos', 'Te detengas por completo al ver luces intermitentes', 'Enciendas y apagues las luces altas al pasar junto a vehículos de emergencia', 'B'),
  (6, '¿Cuál es la política de VeronaRide sobre conducir bajo los efectos del alcohol?',
      'Se permite hasta cierto nivel, igual que en otros países', 'No existe una política al respecto', 'Tolerancia cero — cualquier nivel de alcohol detectado implica desactivación inmediata', 'Se permite un nivel bajo si el conductor se siente en condiciones', 'C'),
  (7, 'Durante la Fase 2 (app encendida, sin viaje asignado), ¿qué cobertura aplica?',
      'Solo tu seguro personal de auto', 'La póliza de $1.000.000 de VeronaRide', 'La póliza de responsabilidad contingente de VeronaRide', 'No se requiere ningún seguro', 'C'),
  (8, 'Un conductor que recibe una denuncia de tolerancia cero (por conducir bajo los efectos del alcohol o drogas) debe:',
      'Ser suspendido de inmediato y aprobar una prueba de alcohol o drogas antes de ser reincorporado', 'Recibir primero una advertencia', 'Completar capacitación adicional', 'Pagar una multa a la plataforma', 'A'),
  (9, 'Eres un contratista independiente. Esto significa que:',
      'VeronaRide controla tu horario', 'Tienes derecho a beneficios de empleado', 'Estableces tu propio horario y puedes trabajar para otras plataformas', 'VeronaRide paga tus impuestos como trabajador independiente', 'C'),
  (10, 'Si la vía que tienes por delante está inundada, la normativa vigente y la política de VeronaRide exigen que:',
       'Cruces despacio si el agua parece poco profunda', 'Des la vuelta — nunca conduzcas a través de agua de inundación', 'Esperes 30 minutos a que baje el agua', 'Llames a VeronaRide para recibir instrucciones', 'B')
) AS q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
WHERE m.code = 'VRN-TRN-025';
