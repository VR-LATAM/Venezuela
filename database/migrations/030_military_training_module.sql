-- Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
-- MIGRACIÓN 030: Módulo de entrenamiento de Servicio Militar

-- PASO 1: Correr esto solo primero
ALTER TYPE service_type_enum ADD VALUE IF NOT EXISTS 'military';

-- ─────────────────────────────────────
-- PASO 2: Correr todo lo de abajo junto
-- ─────────────────────────────────────

ALTER TABLE rides DROP CONSTRAINT IF EXISTS rides_service_type_check;
ALTER TABLE rides ADD CONSTRAINT rides_service_type_check
  CHECK (service_type IN (
    'standard','family','executive','accessible',
    'military','scheduled','hourly','wait_and_return'
  ));

INSERT INTO training_modules (
  code, title, content, version,
  passing_score, total_questions, order_index,
  is_required, service_type, is_prerequisite
) VALUES (
  'VRN-TRN-031',
  'Servicio Militar y de Veteranos',
  $$[
    {"title":"La Comunidad Militar","body":"Venezuela cuenta con una importante comunidad de militares activos y veteranos de la Fuerza Armada Nacional Bolivariana (FANB). Los miembros militares y veteranos valoran la puntualidad, la disciplina, el respeto y la discreción. Como conductor de VeronaRide certificado para el Servicio Militar, se espera que comprendas su cultura y brindes una experiencia superior que honre su servicio."},
    {"title":"Puntualidad y Profesionalismo","body":"La cultura militar se rige por una puntualidad precisa. Llega al punto de recogida al menos 2 minutos antes. Si vas a llegar tarde, notifícalo de inmediato a través de la aplicación. Preséntate de manera profesional: vehículo limpio, sin olores fuertes y vestimenta adecuada."},
    {"title":"Acceso a Instalaciones y Puntos de Control de Seguridad","body":"Al recoger o dejar a un pasajero en una instalación militar, es posible que debas pasar por un punto de control de seguridad. Lleva siempre contigo tu licencia de conducir vigente y el registro del vehículo. Sigue todas las instrucciones del personal de seguridad. Nunca fotografíes instalaciones, equipos o personal militar."},
    {"title":"Etiqueta y Respeto","body":"Dirígete a los pasajeros militares como señor o señora, a menos que ellos indiquen otra preferencia. No preguntes sobre su rango, unidad, despliegue o misión. Evita conversaciones políticas. No preguntes sobre experiencias de combate."},
    {"title":"Apoyo a Veteranos con Necesidades Especiales","body":"Algunos veteranos viven con estrés postraumático (TEPT), traumatismo cerebral (TCE) o pérdida auditiva. Si un pasajero parece angustiado, mantén la calma y pregúntale en voz baja si se encuentra bien. Ofrécete a abrir una ventana o tomar una ruta diferente. Nunca sobresaltes a un veterano con bocinazos repentinos."},
    {"title":"Confidencialidad y Discreción","body":"Nunca compartas ni comentes los destinos o la información personal de los pasajeros militares. No fotografíes a los pasajeros ni sus pertenencias. La certificación de Servicio Militar de VeronaRide refleja honor, respeto e integridad."}
  ]$$::jsonb,
  '1.0', 8, 10, 8, FALSE, 'military', FALSE
);

INSERT INTO training_questions (
  module_id, question_text,
  option_a, option_b, option_c, option_d,
  correct_option, order_index
)
SELECT m.id, q.qt, q.a, q.b, q.c, q.d, q.co, q.oi
FROM training_modules m,
(VALUES
  (1,
   'Un pasajero militar te pide tomar una ruta más larga y menos congestionada. ¿Qué debes hacer?',
   'Negarte — la aplicación calcula la ruta óptima',
   'Acceder sin comentarios y ajustar la ruta como se solicitó',
   'Preguntarle por qué está ansioso antes de aceptar',
   'Sugerirle que use otro tipo de servicio',
   'B'),
  (2,
   'En la entrada de una base militar, el guardia te pide tus documentos. ¿Qué le presentas?',
   'Solo tu teléfono con la aplicación abierta',
   'Tu licencia de conducir y el registro del vehículo',
   'Una carta de la empresa VeronaRide',
   'La identificación militar del pasajero en su nombre',
   'B'),
  (3,
   'Un pasajero militar uniformado aborda tu vehículo. ¿Cómo te diriges a él?',
   'Usando su nombre de pila para que se sienta cómodo',
   'Preguntándole su rango para dirigirte a él correctamente',
   'Usando señor o señora, a menos que indique lo contrario',
   'Evitando hablar a menos que él hable primero',
   'C'),
  (4,
   '¿Qué tema debes EVITAR con un pasajero militar?',
   'El tráfico local y el tiempo estimado de llegada',
   'Si ha sido desplegado y qué experimentó',
   'Las condiciones climáticas o cierres de vías',
   'La temperatura preferida del pasajero',
   'B'),
  (5,
   'Un pasajero veterano de repente parece angustiado. ¿Cuál es la mejor respuesta?',
   'Subir el volumen de la música para ayudarlo a relajarse',
   'Preguntar en voz alta si algo anda mal',
   'Mantener la calma, bajar el volumen y preguntar en voz baja si necesita algo',
   'Detenerse y pedirle que baje del vehículo',
   'C'),
  (6,
   'Transportas a un pasajero militar hasta el hospital de una base. Un amigo te escribe preguntando dónde estás. ¿Qué haces?',
   'Compartir la ubicación — es solo un hospital',
   'Mantener el destino del pasajero en estricta confidencialidad',
   'Decirle a tu amigo que estás cerca de la base',
   'Pedirle permiso al pasajero primero',
   'B'),
  (7,
   'Un punto de control le niega el acceso a tu vehículo para la recogida. ¿Qué debes hacer?',
   'Discutir con el guardia',
   'Contactar al pasajero a través de la aplicación para acordar un punto de encuentro fuera de la base',
   'Cancelar el viaje de inmediato',
   'Conducir alrededor de la base para buscar otra entrada',
   'B'),
  (8,
   '¿Cuál comportamiento NUNCA es aceptable cerca de una instalación militar?',
   'Preguntar sobre el tiempo estimado de espera',
   'Fotografiar instalaciones o personal militar',
   'Ofrecerle agua al pasajero',
   'Informarle al pasajero sobre un retraso por tráfico',
   'B'),
  (9,
   '¿Con cuánta anticipación debes llegar a un punto de recogida militar?',
   'Exactamente a tiempo',
   'Al menos 2 minutos antes',
   'De 5 a 10 minutos antes, solo si la base está lejos',
   'La hora de llegada no importa',
   'B'),
  (10,
   'Un pasajero militar deja sus pertenencias en tu vehículo. ¿Cuál es la acción correcta?',
   'Dejar los objetos hasta tu próximo turno',
   'Publicar en redes sociales para encontrar al dueño',
   'Reportarlo de inmediato a través de la aplicación y guardar los objetos de forma segura',
   'Regresar a la entrada de la base y dejar los objetos con el guardia',
   'C')
) AS q(oi, qt, a, b, c, d, co)
WHERE m.code = 'VRN-TRN-031';
