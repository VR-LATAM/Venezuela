-- Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
-- ═══════════════════════════════════════════════════════════════
-- SEED 003: Módulos de certificación por tipo de servicio
-- Basado en VRN-TRN-026 y VRN-TRN-027 (Manuales abril 2026)
-- 5 módulos × 10 preguntas = 50 preguntas nuevas
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- MÓDULOS
-- ─────────────────────────────────────────────────────────────
INSERT INTO training_modules (code, title, content, version, passing_score, total_questions, order_index, is_prerequisite, service_type) VALUES

-- PREREQUISITO: aplica a TODOS los servicios (embarazadas, adultos mayores, post-cirugía, niños)
('VRN-TRN-026', 'Categorías Especiales de Pasajeros', '[
  {"title":"Pasajeras Embarazadas — Comprendiendo sus Necesidades","body":"Las pasajeras embarazadas usan VeronaRide con frecuencia para citas prenatales, visitas al hospital y cuidados posparto. Los cambios físicos durante el embarazo afectan directamente la experiencia del viaje.\n\nDesafíos clave:\n• Abdomen agrandado — dificultad para sentarse y levantarse, requiere tiempo adicional\n• Dolor lumbar — las vías en mal estado y los frenazos bruscos causan malestar significativo\n• Náuseas — los olores fuertes, las curvas cerradas y el tráfico intermitente las empeoran\n• Necesidad frecuente de orinar — acepta paradas de descanso sin cuestionamientos\n• Fatiga — carga las bolsas, abre siempre las puertas\n\nProtocolo de recogida:\n• Baja del vehículo y saluda a la pasajera — nunca la hagas caminar sin asistencia\n• Ofrece tu brazo como apoyo\n• Abre la puerta completamente — permite el máximo espacio\n• Espera pacientemente hasta que esté completamente sentada y cómoda\n\nDurante el viaje:\n• Conduce con la máxima suavidad — sin frenazos bruscos, sin curvas cerradas\n• Mantén el vehículo bien ventilado — el aire fresco reduce las náuseas\n• Evita los ambientadores fuertes\n• Mantén la música apagada o muy baja\n\nUso del cinturón de seguridad:\n• Cinturón de cadera: colocado BAJO, a través de las caderas — debajo del abdomen\n• Cinturón de hombro: a través del pecho y la clavícula — entre los senos\n• Nunca sugieras omitir el cinturón de seguridad\n\nEmergencia — llama al 911 de inmediato si:\n• Las contracciones ocurren con menos de 5 minutos de diferencia\n• Se rompe la fuente\n• Dolor abdominal severo o sangrado abundante\n• La pasajera deja de responder\n• La pasajera dice ''Creo que el bebé ya viene''\nNO manejes hacia el hospital — llama al 911 y quédate con ella."},
  {"title":"Adultos Mayores (65+) — Protocolo","body":"Los adultos mayores son la base principal de pasajeros de VeronaRide. Para muchos, este es su única fuente de transporte independiente.\n\nCondiciones comunes y adaptaciones:\n• Movilidad reducida — da tiempo adicional, ofrece el brazo, abre las puertas completamente\n• Osteoporosis / dolor articular — la conducción ultra suave es fundamental\n• Pérdida auditiva — míralos de frente al hablar, habla con claridad y volumen moderado\n• Discapacidad visual — guíalos verbalmente, identifícate por tu nombre\n• Deterioro cognitivo leve / demencia — confirma el destino con paciencia, responde preguntas repetidas sin mostrar frustración\n• Problemas de equilibrio — ofrece apoyo firme, muévete despacio\n\nProtocolo de recogida:\n• Llega puntual — la ansiedad aumenta si te retrasas\n• Baja del vehículo y camina hasta la puerta — nunca toques la bocina\n• Saluda por su nombre: ''Hola, ¿es usted [Nombre]? Soy [Tu Nombre] de VeronaRide.''\n• Ofrece tu brazo — palma hacia arriba, codo doblado\n• Camina a su ritmo — nunca jales ni apresures\n• Espera hasta que indiquen que están completamente cómodos antes de cerrar la puerta\n\nProtocolo de entrega:\n• Detente lo más cerca posible de la entrada\n• Baja del vehículo y ayuda a la pasajera o pasajero a salir\n• Acompáñalos hasta la entrada del edificio si se ven inestables\n• Espera hasta que estén seguros adentro antes de retirarte\n\nLlama al 911 de inmediato si presentan:\n• Confusión o desorientación repentina\n• Habla arrastrada o caída facial\n• Debilidad en un brazo o una pierna\n• Dolor de cabeza severo y repentino o dolor en el pecho\n• Pérdida de la conciencia\nEstos pueden ser signos de un accidente cerebrovascular o un evento cardíaco — no manejes hacia el hospital."},
  {"title":"Pasajeros Post-Quirúrgicos y de Transporte Médico","body":"Los pasajeros que salen de una cirugía están entre los más vulnerables de la plataforma — con dolor, bajo efectos de la anestesia, con restricciones físicas y estrés emocional.\n\nQué esperar:\n• Anestesia reciente — el pasajero puede estar somnoliento o desorientado\n• Heridas quirúrgicas — evita cualquier contacto con la zona operada\n• Medicamentos para el dolor — pueden causar mareo, náuseas o confusión\n• Movilidad limitada — no pueden girar, agacharse ni levantar peso\n• Náuseas — mantén el vehículo ventilado, ten una bolsa disponible\n\nRecogida en un centro médico:\n• Coordina con el personal del centro — a menudo sacan al paciente en silla de ruedas\n• No apures el proceso — el alta médica toma tiempo\n• Pregunta al paciente o a la enfermera: ''¿Hay algo que deba saber para hacer este viaje más cómodo?''\n• Ayuda a abordar de forma lenta y cuidadosa\n\nDurante el viaje:\n• Máxima suavidad — no es negociable\n• Mantén la cabina fresca — los pacientes post-anestesia suelen sentir calor\n• Consulta discretamente: ''¿Se siente bien? Avíseme si necesita que me detenga.''\n• No pongas música a menos que se lo pidan\n• Si el pasajero se queda dormido, es normal — no lo despiertes\n\nLlama al 911 de inmediato si presenta:\n• Pérdida de la conciencia o falta de respuesta\n• Dificultad para respirar\n• Sangrado abundante a través de los vendajes\n• Actividad convulsiva\n• Confusión o agitación extrema\n• Dolor de pecho severo"},
  {"title":"Niños con Necesidades Especiales","body":"VeronaRide puede transportar niños con autismo (TEA), parálisis cerebral, síndrome de Down, trastornos del procesamiento sensorial y otras condiciones.\n\nIMPORTANTE: Nunca transportes a un menor de edad solo, sin un adulto acompañante, a menos que esté específicamente autorizado por escrito por VeronaRide y el representante del niño.\n\nConocimiento de las condiciones:\n• Autismo (TEA) — sensible a sonidos, luces y cambios repentinos. La rutina y la previsibilidad son tranquilizadoras.\n• Parálisis cerebral — afecta el movimiento y el habla. Ayuda con paciencia. Escucha con atención.\n• Síndrome de Down — suelen ser comunicativos. Trátalos con total dignidad y calidez.\n• Trastorno del procesamiento sensorial — hipersensibilidad a la luz, el sonido y la textura. Mantén el vehículo silencioso y limpio.\n• Niños no verbales — se comunican mediante conductas o dispositivos. Sigue las indicaciones del cuidador.\n\nProtocolo con el adulto acompañante:\n• Saluda al adulto responsable — es tu contacto principal\n• Pregunta: ''¿Hay algo que deba saber para hacer este viaje cómodo para [nombre del niño]?''\n• Sigue todas las indicaciones del cuidador\n• Mantén la cabina silenciosa — sin música alta, sin anuncios repentinos\n\nInteracción con el niño:\n• Habla con calma — nunca uses un tono infantilizado ni condescendiente\n• No toques al niño sin permiso del cuidador\n• No hagas ruidos fuertes repentinos\n• Si el niño presenta estereotipias (mecerse, aletear las manos, vocalizar) — mantén la calma, es una forma normal de autorregulación\n\nPolítica de sillas para niños:\n• La normativa venezolana de tránsito exige sistemas de retención infantil apropiados para la edad\n• Los conductores NO están obligados a proporcionar sillas para niños\n• No inicies el viaje hasta que el niño esté asegurado de forma segura\n• Si un niño menor de 8 años no tiene silla — contacta a Soporte antes de continuar"}
]', '1.0', 8, 10, 6, TRUE, NULL),

-- STANDARD SERVICE
('VRN-TRN-027-STD', 'Servicio Estándar — Certificación de Conductor', '[
  {"title":"¿Qué es el Servicio Estándar?","body":"Estándar es el servicio principal de VeronaRide — transporte puerta a puerta bajo demanda. Es el tipo de viaje más común y constituye la base del trabajo diario del conductor.\n\nEspecificaciones del servicio:\n• Vehículo: sedán de 4 puertas, camioneta SUV o minivan — año 2015 o más reciente\n• Capacidad: hasta 4 pasajeros\n• Reserva: bajo demanda a través de la aplicación del pasajero\n• Ventana de aceptación: 30 segundos\n• Pasajeros típicos: adultos mayores, usuarios de ayudas para la movilidad, pasajeros en general\n• Certificación requerida: Módulos 1–5 + VRN-TRN-026\n\nRequisitos del vehículo:\n• Interior limpio — sin basura, sin olores, sin pelo de mascotas\n• Todos los asientos funcionales con cinturones de seguridad en buen estado\n• Aire acondicionado y calefacción totalmente operativos\n• Sin luces de advertencia activas en el tablero\n• Teléfono montado de forma segura\n• Botiquín de primeros auxilios presente"},
  {"title":"Presentación del Conductor y Protocolo Paso a Paso","body":"Presentación del conductor:\n• Ropa limpia y ordenada — sin prendas rotas, manchadas o demasiado informales\n• Buena higiene personal\n• Sin colonia ni perfume fuerte — muchos pasajeros mayores son sensibles a los olores\n• No comer mientras haya un pasajero en el vehículo\n• No fumar en el vehículo — nunca\n\nProtocolo paso a paso:\n1. Recibe la solicitud de viaje — revisa el nombre del pasajero, el punto de recogida y las ganancias estimadas\n2. Acepta dentro de los 30 segundos\n3. Dirígete al punto de recogida — llega a tiempo o antes\n4. Baja del vehículo — saluda al pasajero por su nombre\n5. Ayuda a abordar — abre la puerta, ofrece el brazo si es necesario\n6. Confirma el destino antes de partir\n7. Conduce con suavidad siguiendo la ruta del GPS\n8. Ayuda al pasajero a bajar en el destino\n9. Toca Completar Viaje — la tarifa se procesa automáticamente\n10. Califica al pasajero"},
  {"title":"Escenarios Comunes del Servicio Estándar","body":"Cita médica (el más común):\nEl pasajero puede estar ansioso o no sentirse bien. Conduce con suavidad, sé paciente al entregarlo y confirma que entró seguro antes de retirarte.\n\nCompras o diligencias:\nEl pasajero puede traer bolsas. Ofrécete a ayudar — colócalas con cuidado en el baúl. Al llegar al destino, lleva las bolsas hasta la puerta si el pasajero necesita ayuda.\n\nVisita social o viaje familiar:\nEl pasajero puede ser conversador. Sé cálido y amable. Deja que él o ella dirija la conversación.\n\nRecordatorios clave:\n• Siempre baja del vehículo en la recogida — nunca esperes adentro\n• Confirma el primer nombre antes de iniciar cada viaje\n• La conducción suave es tu habilidad más importante para este tipo de pasajeros\n• Nunca apures a un pasajero mayor o con movilidad reducida al abordar o al bajar"}
]', '1.0', 8, 10, 7, FALSE, 'standard'),

-- EXECUTIVE SERVICE
('VRN-TRN-027-EXE', 'Servicio Ejecutivo — Certificación de Conductor', '[
  {"title":"¿Qué es el Servicio Ejecutivo?","body":"El servicio Ejecutivo es la categoría premium de VeronaRide — una experiencia completamente superior desde la llegada hasta la entrega. Los pasajeros pagan aproximadamente 1.8 veces la tarifa estándar y esperan una experiencia notablemente superior.\n\nEspecificaciones del servicio:\n• Vehículo: sedán de lujo de tamaño completo o SUV premium — año 2018 o más reciente\n• Marcas: Lincoln, Cadillac, Lexus, Mercedes, BMW, Genesis, Audi (o equivalente)\n• Capacidad: hasta 3 pasajeros (se prioriza la comodidad sobre la capacidad)\n• Interior: impecable — detallado profesionalmente como mínimo una vez por semana\n• Tarifa: aproximadamente 1.8 veces la tarifa Estándar\n\nEstándares del vehículo:\n• Exterior: impecable — sin suciedad, excremento de aves ni manchas de agua\n• Interior: aspirado y limpiado antes de cada turno\n• Sin desorden visible de ningún tipo\n• Cargador de teléfono (USB-A y USB-C) disponible para uso del pasajero\n• Botellas pequeñas de agua sin gas disponibles para los pasajeros\n• Sin ambientadores — el vehículo debe oler limpio y neutro"},
  {"title":"Presentación del Conductor Ejecutivo y Protocolo de Llegada","body":"Presentación del conductor (obligatoria):\n• Vestimenta formal o business casual — camisa con botones, pantalón de vestir o chino\n• Zapatos limpios y lustrados — sin tenis\n• Sin tatuajes visibles en manos, cuello o rostro\n• Cabello arreglado y prolijo\n• Sin colonia fuerte — sutil o ninguna\n• Se recomienda gafete o cordón de identificación de VeronaRide\n\nProtocolo de llegada:\n• Llega 5 minutos antes — los pasajeros Ejecutivos esperan puntualidad por encima de todo\n• Estaciona lo más cerca posible de la entrada\n• Baja del vehículo inmediatamente al llegar\n• Ubícate junto a la puerta trasera del pasajero — ábrela cuando el pasajero se acerque\n• Saluda formalmente: ''Buenos días/tardes/noches, [Nombre]. Bienvenido a VeronaRide.''\n• Ayuda con el equipaje — colócalo en el baúl con cuidado\n• Cierra la puerta una vez que el pasajero esté completamente sentado"},
  {"title":"Durante el Viaje y Protocolo de Entrega","body":"Durante el viaje:\n• No inicies la conversación — espera a que el pasajero hable primero\n• Si le hablan, responde con calidez y profesionalismo\n• Mantén la música apagada a menos que el pasajero la solicite\n• Mantén una conducción suave y sin prisa en todo momento\n• Ofrece agua al inicio: ''¿Le gustaría una botella de agua?''\n• Mantén el teléfono en silencio — sin llamadas personales\n• No hables de otros pasajeros, asuntos personales ni política\n\nProtocolo de entrega:\n• Llega con suavidad — sin paradas bruscas\n• Baja del vehículo ANTES de que el pasajero abra su propia puerta\n• Abre la puerta trasera para el pasajero\n• Ayuda con el equipaje — llévalo hasta el pasajero, no solo hasta la acera\n• Agradécele: ''Gracias por viajar con VeronaRide. Que tenga un excelente día.''\n• Espera hasta que el pasajero haya entrado al edificio antes de retirarte\n\nCosas que NUNCA debes hacer en el servicio Ejecutivo:\n• Tocar la bocina o esperar dentro del carro en la recogida\n• Poner música sin que se lo pidan\n• Hacer preguntas personales\n• Atender llamadas personales durante el viaje\n• Llegar en un vehículo sucio o desordenado\n• Conducir rápido o de forma agresiva"}
]', '1.0', 9, 10, 8, FALSE, 'executive'),

-- ACCESSIBLE SERVICE
/* VERIFICAR: monto del recargo de accesibilidad ($1.50) pendiente de confirmar para el mercado venezolano */
('VRN-TRN-027-ACC', 'Servicio Accesible — Certificación de Conductor', '[
  {"title":"¿Qué es el Servicio Accesible?","body":"El servicio Accesible es la modalidad de VeronaRide diseñada conforme a estándares de accesibilidad para personas con discapacidad, destinada a pasajeros que usan sillas de ruedas, sillas motorizadas, scooters u otros dispositivos de movilidad que no pueden plegarse en un vehículo estándar. Este es uno de los servicios más críticos de VeronaRide — muchos pasajeros dependen exclusivamente de él.\n\nEspecificaciones del servicio:\n• Vehículo: furgoneta o SUV accesible, con rampa o elevador eléctrico\n• Equipo requerido: sistema de sujeción de silla de ruedas de 4 puntos, cinturón de cadera, cinturón de hombro\n• Espacio interior del piso: mínimo 76 cm de ancho × 122 cm de largo\n• Tarifa: tarifa Estándar + recargo de accesibilidad de $1.50 (100% para el conductor)\n• Animales de servicio: siempre aceptados — sin excepciones\n\nInspección del vehículo antes del turno (obligatoria antes de cada turno de Servicio Accesible):\n• Prueba la rampa o el elevador — despliega y repliega por completo\n• Inspecciona las 4 correas de sujeción — sin deshilachados, cortes ni desgaste\n• Prueba todos los mecanismos de trinquete de las correas — deben ajustar y sostener con firmeza\n• Inspecciona el cinturón de cadera y el cinturón de hombro — las hebillas deben cerrar con seguridad\n• Confirma que el espacio del piso esté despejado — sin objetos en el área de sujeción\n• Prueba la función de descenso (kneeling) si el vehículo la tiene\n• Confirma que los pasamanos estén firmes"},
  {"title":"Protocolo de Llegada y Sujeción de la Silla de Ruedas en el Servicio Accesible","body":"Protocolo de llegada:\n• Estaciona en el punto de acceso más accesible disponible\n• Baja del vehículo y saluda al pasajero por su nombre\n• Pregunta: ''¿Cómo le gustaría que lo asista hoy?''\n• Despliega la rampa o el elevador — pruébalo una vez antes de que el pasajero aborde\n• Asiste al pasajero según lo indique — sigue sus instrucciones\n• Guía la silla de ruedas hacia el área de sujeción mirando hacia adelante\n\nSujeción de la silla de ruedas — sigue el ORDEN EXACTO cada vez:\n1. Posiciona la silla de ruedas mirando hacia ADELANTE en el área de sujeción\n2. Sujeta la correa delantera izquierda en un ángulo de 45 grados — ajusta con el trinquete\n3. Sujeta la correa delantera derecha en un ángulo de 45 grados — ajusta con el trinquete\n4. Sujeta la correa trasera izquierda en un ángulo de 45 grados — ajusta con el trinquete\n5. Sujeta la correa trasera derecha en un ángulo de 45 grados — ajusta con el trinquete\n6. Ajusta el cinturón de cadera a través de las caderas del pasajero — debajo del abdomen\n7. Ajusta el cinturón de hombro a través del pecho\n8. Pregunta: ''¿Se siente cómodo y seguro? ¿Está listo para partir?''\n9. NO muevas el vehículo hasta que el pasajero confirme que está listo\n\nOmitir cualquier paso de sujeción constituye una violación de seguridad y es motivo de retiro de la autorización para el Servicio Accesible."},
  {"title":"Durante el Viaje y la Entrega en el Servicio Accesible","body":"Durante el viaje en Servicio Accesible:\n• Avisa al pasajero antes de cualquier curva cerrada, tope o cruce de vía férrea\n• Conduce con la máxima suavidad — la comodidad importa incluso con la sujeción puesta\n• Consulta a mitad de viaje: ''¿Se encuentra bien? ¿Todo está cómodo?''\n• No hagas cambios de carril repentinos sin advertir al pasajero\n\nProtocolo de entrega:\n• Llega con suavidad — estaciona en el punto de acceso más accesible\n• Libera las correas de sujeción en orden INVERSO: cinturón de hombro → cinturón de cadera → correas traseras → correas delanteras\n• Despliega la rampa o el elevador\n• Ayuda al pasajero a bajar por la rampa — sigue sus indicaciones\n• Camina junto a él o ella hasta la entrada si necesita apoyo\n• No te retires hasta que el pasajero esté a salvo adentro o acompañado por otra persona\n\nSillas de ruedas motorizadas y scooters:\n• Las sillas motorizadas son más pesadas — ten cuidado adicional en la rampa\n• Confirma que la capacidad de peso de la rampa sea compatible con el dispositivo antes de abordar\n• Nunca intentes empujar manualmente una silla motorizada encendida — pide al pasajero que la conduzca sobre la rampa\n• Para sillas muy pesadas, pregunta al pasajero cómo prefiere ser cargado"}
]', '1.0', 9, 10, 9, FALSE, 'accessible'),

-- SCHEDULED SERVICE
('VRN-TRN-027-SCH', 'Servicio Programado — Certificación de Conductor', '[
  {"title":"¿Qué es el Servicio Programado?","body":"El Servicio Programado permite a los pasajeros reservar viajes con hasta 7 días de anticipación, para una fecha y hora específicas. Es especialmente crítico para adultos mayores y pacientes médicos que dependen de un transporte confiable para citas que no se pueden reprogramar.\n\nEspecificaciones del servicio:\n• Ventana de reserva anticipada: hasta 7 días\n• Notificaciones al conductor: 24 horas antes + 1 hora antes + 15 minutos antes de la recogida\n• Confirmación del conductor: requerida dentro de las 12 horas siguientes a la asignación\n• Política de cancelación: gratuita si es con más de 24 horas de anticipación; aplica un cargo dentro de las 24 horas\n• Estándar de puntualidad: llegar dentro de los 5 minutos de la hora programada — sin excepciones\n• Tarifa: aplica la tarifa estándar\n\nPor qué los viajes Programados son diferentes:\nLos viajes bajo demanda permiten flexibilidad. Los viajes Programados son distintos — el pasajero ha planificado todo su día en torno a su llegada. Puede tratarse de:\n• Un procedimiento quirúrgico con una hora de ingreso preestablecida\n• Una cita de diálisis que debe comenzar a una hora exacta\n• Un vuelo sin flexibilidad\n• Un padre o madre mayor esperando solo\n\nLlegar tarde a un viaje Programado puede hacer que un pasajero pierda un procedimiento médico. La puntualidad no es negociable."},
  {"title":"Preparación del Conductor y Protocolo de Llegada","body":"Al asignarle un viaje Programado:\n• Confirma la aceptación en la aplicación dentro de las 12 horas\n• La noche anterior: revisa la dirección de recogida, el tiempo de manejo y las notas del pasajero\n• Configura una alarma para tener tiempo de preparación suficiente\n• Planifica tu ruta — verifica obras viales o eventos de tráfico\n• Asegúrate de que tu vehículo esté limpio y con combustible antes del viaje\n• Sal con suficiente antelación para llegar de 3 a 5 minutos antes de la hora programada\n\nProtocolo de llegada:\n• Llega de 3 a 5 minutos antes de la hora programada\n• Toca ''Llegué'' en la aplicación al llegar al punto de recogida — esto notifica al pasajero\n• Baja del vehículo y espera de pie — no te quedes sentado en el carro\n• Si nadie se presenta dentro de los 3 minutos, llama al pasajero a través de la aplicación\n• Espera la ventana completa de 5 minutos antes de marcar una inasistencia"},
  {"title":"Manejo de Retrasos y Viajes Recurrentes","body":"Si TÚ vas con retraso:\n• Contacta al pasajero de inmediato a través de la aplicación\n• Indica una hora estimada de llegada actualizada y honesta\n• Reporta el retraso a Soporte de VeronaRide mediante el chat de la aplicación\n• Si el retraso supera los 10 minutos, Soporte decidirá si reasigna el viaje\n\nSi el PASAJERO va con retraso:\n• Espera la ventana completa de 5 minutos — los pasajeros de viajes Programados suelen ser adultos mayores\n• Llama a través de la aplicación para verificar cómo están\n• Después de 5 minutos, contacta a Soporte antes de marcar inasistencia — pueden extender el tiempo para pasajeros médicos\n\nViajes Programados recurrentes:\nAlgunos pasajeros reservan el mismo viaje cada semana — los pacientes de diálisis, por ejemplo, acuden a la misma clínica todos los lunes, miércoles y viernes.\n• Aprende sus preferencias — temperatura, música, ruta, estilo de comunicación\n• Sé consistente — te eligieron por una razón\n• Si no puedes realizar un viaje recurrente, notifica a Soporte lo antes posible\n• Nunca canceles un viaje médico recurrente sin el aviso adecuado\n\nPolítica de cancelación del conductor:\n• Cancela a través de la aplicación con un mínimo de 2 horas antes de la recogida\n• Las cancelaciones dentro de 1 hora quedan marcadas\n• Los conductores con una tasa de cancelación de viajes Programados superior al 5% pierden la elegibilidad para este servicio"}
]', '1.0', 8, 10, 10, FALSE, 'scheduled');

-- ─────────────────────────────────────────────────────────────
-- PREGUNTAS — VRN-TRN-026: Categorías Especiales de Pasajeros
-- ─────────────────────────────────────────────────────────────
INSERT INTO training_questions (module_id, question_text, option_a, option_b, option_c, option_d, correct_option, order_index)
SELECT m.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.order_index
FROM training_modules m,
(VALUES
  (1, 'Una pasajera embarazada está abordando su vehículo. ¿Cuál es la acción correcta?',
      'Esperar en el carro y abrir la puerta de forma remota', 'Bajar del vehículo y ofrecer el brazo como apoyo', 'Tocar la bocina para que sepa que tú llegaste', 'Pedirle que se apure porque tiene otro viaje esperando', 'B'),
  (2, '¿Dónde debe colocarse el cinturón de cadera de una pasajera embarazada?',
      'A través del abdomen para máxima protección', 'Bajo, a través de las caderas y la parte superior de los muslos — debajo del abdomen', 'Alrededor de la cintura, a la altura del ombligo', 'Solo a través del pecho', 'B'),
  (3, 'Una pasajera embarazada muestra signos de trabajo de parto activo. ¿Qué haces?',
      'Manejar hacia el hospital más cercano lo más rápido posible', 'Detenerse, llamar al 911, activar el SOS y quedarse con ella hasta que llegue el personal de emergencia', 'Continuar el viaje — probablemente está exagerando', 'Llamar a soporte de VeronaRide y esperar instrucciones', 'B'),
  (4, 'Al transportar a un pasajero mayor, debes:',
      'Tocar la bocina al llegar para que salga', 'Bajar del vehículo, saludarlo por su nombre y caminar a su ritmo', 'Dejar el carro encendido y esperar hasta 10 minutos', 'Pedirle que se apure porque tú estás ocupado', 'B'),
  (5, 'Un pasajero mayor hace la misma pregunta tres veces durante el viaje. ¿Qué haces?',
      'Mostrar algo de frustración para que deje de preguntar', 'Ignorar la pregunta después de la segunda vez', 'Responder con paciencia cada vez, sin mostrar frustración', 'Llamar a soporte de VeronaRide para reportar la conducta', 'C'),
  (6, 'Estás recogiendo a un pasajero post-quirúrgico en un centro médico. ¿Qué deberías preguntar?',
      'Cuánto costó su cirugía', '¿Hay algo que deba saber para hacer este viaje más cómodo?', 'Por qué le están dando de alta tan pronto', 'Si tiene alguien en casa que lo cuide', 'B'),
  (7, 'Un pasajero post-quirúrgico se queda dormido durante el viaje. ¿Qué haces?',
      'Despertarlo para asegurarse de que está bien', 'Detenerse y llamar al 911 de inmediato', 'Continuar manejando con suavidad — esto es normal después de la anestesia', 'Terminar el viaje antes de tiempo porque está dormido', 'C'),
  (8, 'Estás transportando a un niño con autismo. El niño comienza a mecerse y a vocalizar. ¿Qué significa esto?',
      'El niño está teniendo una emergencia médica — llamar al 911', 'El niño está teniendo una crisis conductual — detenerse', 'Es una forma normal de autorregulación (estereotipia) — mantener la calma', 'El niño está incómodo con el conductor — notificar a soporte', 'C'),
  (9, 'Un pasajero mayor presenta de forma repentina caída facial y habla arrastrada durante el viaje. Debes:',
      'Preguntarle si está bien y continuar hacia su destino', 'Llevarlo de inmediato al hospital más cercano', 'Detenerse de inmediato y llamar al 911 — son signos de un accidente cerebrovascular', 'Llamar primero a soporte de VeronaRide y seguir sus instrucciones', 'C'),
  (10, 'Un niño menor de 8 años no tiene silla ni asiento elevador. ¿Qué haces?',
       'Continuar el viaje — el niño puede ir en el asiento trasero con cinturón de seguridad', 'Contactar a Soporte de VeronaRide antes de continuar', 'Cancelar el viaje sin dar explicaciones', 'Pedirle al cuidador que sostenga al niño durante el viaje', 'B')
) AS q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
WHERE m.code = 'VRN-TRN-026';

-- ─────────────────────────────────────────────────────────────
-- PREGUNTAS — VRN-TRN-027-STD: Servicio Estándar
-- ─────────────────────────────────────────────────────────────
INSERT INTO training_questions (module_id, question_text, option_a, option_b, option_c, option_d, correct_option, order_index)
SELECT m.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.order_index
FROM training_modules m,
(VALUES
  (1, '¿Cuál es el año mínimo de vehículo requerido para el Servicio Estándar?',
      '2010', '2015', '2018', '2020', 'B'),
  (2, '¿Cuántos pasajeros puede llevar un vehículo del Servicio Estándar?',
      'Hasta 2', 'Hasta 3', 'Hasta 4', 'Hasta 6', 'C'),
  (3, 'Antes de iniciar un viaje Estándar, siempre debes:',
      'Revisar su saldo de ganancias', 'Confirmar el primer nombre del pasajero', 'Llamar al pasajero desde su teléfono personal', 'Pedirle al pasajero que lo califique con 5 estrellas', 'B'),
  (4, 'Un pasajero del Servicio Estándar necesita ayuda con las bolsas del mercado. Debes:',
      'Decirle que las bolsas no son su responsabilidad', 'Ofrecerse a ayudar y colocarlas con cuidado en el baúl', 'Poner las bolsas en el asiento delantero sin preguntar', 'Esperar a que se las arregle solo', 'B'),
  (5, 'Al transportar a un pasajero del Servicio Estándar a una cita médica, debes:',
      'Manejar rápido para ayudarlo a llegar a tiempo', 'Manejar con suavidad y confirmar que entró seguro antes de retirarse', 'Dejarlo en la acera e irse de inmediato', 'Preguntarle sobre su condición médica', 'B'),
  (6, '¿Qué artículo debe estar presente en todo vehículo del Servicio Estándar?',
      'Una cámara de tablero', 'Un botiquín de primeros auxilios', 'Un cable de carga para pasajeros', 'Botellas de agua', 'B'),
  (7, 'Aparece una solicitud de viaje Estándar. ¿Cuánto tiempo tienes para aceptarla?',
      '15 segundos', '60 segundos', '30 segundos', '2 minutos', 'C'),
  (8, '¿Qué NO está permitido mientras un pasajero está en su vehículo?',
      'Tener el aire acondicionado encendido', 'Comer mientras maneja', 'Poner música baja si se lo piden', 'Ofrecerse a cargar las bolsas', 'B'),
  (9, 'Al finalizar un viaje del Servicio Estándar, debes:',
      'Tocar Completar Viaje e irse de inmediato', 'Ayudar al pasajero y confirmar que llegó seguro a su destino antes de retirarse', 'Pedir propina en efectivo antes de completar el viaje', 'Llamar a soporte para confirmar la tarifa', 'B'),
  (10, '¿Qué política de fragancias aplica a los conductores del Servicio Estándar?',
       'Se recomienda colonia fuerte para dar una imagen profesional', 'Sin colonia ni perfume fuerte — muchos pasajeros mayores son sensibles a los olores', 'Cualquier fragancia es aceptable siempre que el carro esté limpio', 'La fragancia es obligatoria para disimular los olores del vehículo', 'B')
) AS q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
WHERE m.code = 'VRN-TRN-027-STD';

-- ─────────────────────────────────────────────────────────────
-- PREGUNTAS — VRN-TRN-027-EXE: Servicio Ejecutivo
-- ─────────────────────────────────────────────────────────────
INSERT INTO training_questions (module_id, question_text, option_a, option_b, option_c, option_d, correct_option, order_index)
SELECT m.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.order_index
FROM training_modules m,
(VALUES
  (1, '¿Cuál es el año mínimo de vehículo requerido para el Servicio Ejecutivo?',
      '2015', '2016', '2018', '2020', 'C'),
  (2, 'La tarifa del Servicio Ejecutivo es aproximadamente:',
      '1.2 veces la tarifa estándar', '1.5 veces la tarifa estándar', '1.8 veces la tarifa estándar', '2.5 veces la tarifa estándar', 'C'),
  (3, '¿Cómo debe saludar un conductor Ejecutivo a un pasajero en la recogida?',
      'Tocar la bocina y esperar a que se acerque al vehículo', 'Ubicarse junto a la puerta trasera y saludar formalmente por su nombre', 'Enviarle un mensaje por la aplicación avisando que llegó', 'Llamarlo desde adentro del carro', 'B'),
  (4, 'Durante un viaje Ejecutivo, ¿cuándo debe iniciar la conversación?',
      'De inmediato — los pasajeros Ejecutivos esperan interacción', 'Solo si el pasajero le habla primero', 'Después de ofrecer agua', 'Nunca — mantener silencio total', 'B'),
  (5, '¿Qué debe ofrecer un conductor Ejecutivo al inicio de cada viaje?',
      'Un periódico', 'Una botella de agua sin gas', 'Agua con gas o jugo', 'Un cargador de teléfono', 'B'),
  (6, '¿Qué tipo de calzado se requiere para el Servicio Ejecutivo?',
      'Cualquier calzado limpio', 'Zapatos limpios y lustrados — sin tenis', 'Zapatos deportivos si están limpios', 'Sandalias abiertas en verano', 'B'),
  (7, 'Un pasajero Ejecutivo no ha hablado durante el viaje. ¿Qué haces?',
      'Hacer preguntas para iniciar una conversación', 'Poner música suave para llenar el silencio', 'Respetar su preferencia por el silencio — no iniciar la conversación', 'Preguntarle si está satisfecho con el servicio', 'C'),
  (8, '¿Con qué frecuencia debe recibir detallado profesional un vehículo Ejecutivo?',
      'Mensualmente', 'Diariamente', 'Como mínimo una vez por semana', 'Solo cuando esté visiblemente sucio', 'C'),
  (9, 'Al finalizar un viaje Ejecutivo, ¿cuándo debe abrir la puerta del pasajero?',
      'Después de tocar Completar Viaje en la aplicación', 'Antes de que el pasajero la abra por su cuenta — bajar del vehículo primero', 'Solo si el pasajero lo pide', 'Después de sacar su equipaje del baúl', 'B'),
  (10, '¿Qué acción es motivo de retiro inmediato de la autorización para el Servicio Ejecutivo?',
       'Poner música a pedido del pasajero', 'Llegar en un vehículo sucio o desordenado', 'Ofrecer agua al inicio del viaje', 'Llegar 5 minutos antes', 'B')
) AS q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
WHERE m.code = 'VRN-TRN-027-EXE';

-- ─────────────────────────────────────────────────────────────
-- PREGUNTAS — VRN-TRN-027-ACC: Servicio Accesible
-- ─────────────────────────────────────────────────────────────
INSERT INTO training_questions (module_id, question_text, option_a, option_b, option_c, option_d, correct_option, order_index)
SELECT m.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.order_index
FROM training_modules m,
(VALUES
  (1, 'Antes de conectarse para el Servicio Accesible, debes:',
      'Simplemente confirmar su ubicación en la aplicación', 'Completar la lista de verificación completa del vehículo antes del turno', 'Llamar a soporte de VeronaRide para obtener autorización', 'Esperar una solicitud de viaje de prueba del sistema', 'B'),
  (2, 'El sistema de sujeción de silla de ruedas de 4 puntos requiere correas en:',
      'Solo delantera izquierda y delantera derecha', 'Solo trasera izquierda y trasera derecha', 'Delantera izquierda, delantera derecha, trasera izquierda y trasera derecha', 'Dos puntos cualesquiera elegidos por el conductor', 'C'),
  (3, '¿En qué ángulo debe sujetarse cada correa de amarre?',
      '90 grados (recto hacia abajo)', '45 grados', '30 grados', '60 grados', 'B'),
  (4, '¿Hacia qué dirección debe estar orientada la silla de ruedas durante el viaje?',
      'Hacia atrás — mirando la parte trasera del vehículo', 'Hacia el lado — mirando la ventana', 'Hacia adelante — mirando el frente del vehículo', 'Hacia la dirección que prefiera el pasajero', 'C'),
  (5, '¿Cuál es el orden correcto para liberar el sistema de sujeción al finalizar el viaje?',
      'Primero las correas delanteras, luego las traseras, luego los cinturones', 'Cinturón de hombro, cinturón de cadera, correas traseras, correas delanteras', 'Cinturón de cadera, cinturón de hombro, correas delanteras, correas traseras', 'Cualquier orden es aceptable', 'B'),
  (6, 'Antes de tocar la silla de ruedas de un pasajero, debes:',
      'Ponerse guantes por higiene', 'Preguntarle primero al pasajero', 'Revisar la aplicación para ver notas de sujeción', 'Confirmar con soporte de VeronaRide', 'B'),
  (7, 'Un pasajero usa una silla de ruedas motorizada. ¿Cuál es el procedimiento correcto para abordar?',
      'Empujar manualmente la silla hacia la rampa', 'Pedirle al pasajero que conduzca la silla motorizada hacia la rampa', 'Cargar al pasajero y subir la silla por separado', 'Pedirle al pasajero que se traslade a un asiento estándar', 'B'),
  /* VERIFICAR: monto del recargo de accesibilidad ($1.50) pendiente de confirmar para Venezuela */
  (8, 'El recargo de accesibilidad de $1.50 en los viajes del Servicio Accesible corresponde a:',
      'A VeronaRide como comisión de la plataforma', '100% para el conductor', 'Se divide 50/50 entre el conductor y VeronaRide', 'A un fondo de servicios para personas con discapacidad', 'B'),
  (9, 'Durante un viaje del Servicio Accesible, debes avisar al pasajero antes de:',
      'Cada curva de la ruta del GPS', 'Cualquier curva cerrada, tope o cruce de vía férrea', 'Cambiar la estación de radio', 'Consultar cómo va a mitad de viaje', 'B'),
  (10, 'Omitir un paso de sujeción durante el amarre de la silla de ruedas es:',
       'Aceptable si el pasajero dice sentirse seguro', 'Una infracción menor con una advertencia', 'Una violación de seguridad y motivo de retiro de la autorización para el Servicio Accesible', 'Solo obligatorio en viajes de más de 16 km', 'C')
) AS q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
WHERE m.code = 'VRN-TRN-027-ACC';

-- ─────────────────────────────────────────────────────────────
-- PREGUNTAS — VRN-TRN-027-SCH: Servicio Programado
-- ─────────────────────────────────────────────────────────────
INSERT INTO training_questions (module_id, question_text, option_a, option_b, option_c, option_d, correct_option, order_index)
SELECT m.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.order_index
FROM training_modules m,
(VALUES
  (1, '¿Con cuánta anticipación puede un pasajero reservar un viaje Programado?',
      '24 horas', '3 días', '7 días', '30 días', 'C'),
  (2, 'Se le asigna un viaje Programado. ¿Dentro de cuántas horas debe confirmar la aceptación?',
      '1 hora', '6 horas', '12 horas', '24 horas', 'C'),
  (3, '¿Cuál es el estándar de puntualidad para el Servicio Programado?',
      'Dentro de los 10 minutos de la hora programada', 'Dentro de los 5 minutos de la hora programada — sin excepciones', 'Cuando el tráfico lo permita', 'Dentro de los 15 minutos — los pasajeros entienden los retrasos', 'B'),
  (4, 'Vas con 12 minutos de retraso para un viaje Programado. ¿Qué deberías hacer?',
      'Manejar más rápido para recuperar el tiempo', 'Contactar de inmediato al pasajero y a Soporte — Soporte puede reasignar el viaje', 'No decir nada y llegar lo más rápido posible', 'Cancelar el viaje a través de la aplicación', 'B'),
  (5, '¿Con cuánta anticipación debe llegar a una recogida Programada?',
      'Exactamente a la hora', 'De 3 a 5 minutos antes de la hora programada', 'Siempre 10 minutos antes', 'No importa mientras esté dentro de la ventana', 'B'),
  (6, 'Un pasajero de un viaje Programado tiene 4 minutos de retraso en salir. ¿Qué haces?',
      'Marcarlo como inasistencia de inmediato', 'Irse — su tiempo es valioso', 'Esperar la ventana completa de 5 minutos — luego llamar a través de la aplicación', 'Cancelar el viaje y reportarlo a soporte', 'C'),
  (7, 'Un paciente de diálisis reserva el mismo viaje Programado todos los lunes, miércoles y viernes. ¿Qué deberías hacer?',
      'Tratar cada viaje como una reserva nueva, sin recordar los viajes anteriores', 'Aprender sus preferencias y ser consistente — depende de ti', 'Pedirle que use el servicio bajo demanda en su lugar', 'Cobrarle una tarifa más alta por los viajes recurrentes', 'B'),
  (8, '¿Las cancelaciones dentro de cuántas horas de una recogida Programada generan un cargo?',
      '48 horas', '12 horas', '24 horas', '6 horas', 'C'),
  (9, 'Un conductor que cancele más del 5% de sus viajes Programados:',
      'Recibirá una advertencia y una multa', 'Perderá la elegibilidad para viajes Programados', 'Será desactivado de forma permanente', 'Deberá pagar una penalidad a los pasajeros', 'B'),
  (10, '¿Por qué los viajes Programados son más críticos que los viajes bajo demanda para la mayoría de los pasajeros?',
       'Pagan una tarifa premium', 'El pasajero ha planificado todo su día — incluyendo procedimientos médicos — en torno a su llegada', 'Son viajes más largos con más ganancias', 'VeronaRide supervisa los viajes Programados más de cerca', 'B')
) AS q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
WHERE m.code = 'VRN-TRN-027-SCH';
