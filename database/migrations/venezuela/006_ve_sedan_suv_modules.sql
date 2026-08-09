/* V-RIDE VENEZUELA — Migración 006
   Módulos de capacitación para conductores de Sedán y SUV
   Base legal: Ley de Transporte Terrestre (G.O. N° 38.985, 01/08/2008)
*/

/* ═══════════════════════════════════════════════════════════════
   MÓDULO SEDÁN — VE-SEDAN-001
   ═══════════════════════════════════════════════════════════════ */
INSERT INTO training_modules (
  code, title, content, version, passing_score, total_questions, order_index, is_required
) VALUES (
  'VE-SEDAN-001',
  'Capacitación para Conductores de Sedán',
  '[
    {
      "title": "1. Capacidad y Tipo de Servicio",
      "body": "CAPACIDAD MÁXIMA\nUn sedán transporta hasta 4 pasajeros además del conductor, para un total de 5 personas. Nunca se puede exceder la capacidad de asientos certificada por el fabricante del vehículo. Transportar más pasajeros de los permitidos está sancionado con multa de 5 U.T. (LTT 2008, Art. 170.15)\n\nCINTURÓN DE SEGURIDAD PARA TODOS\nTodo ocupante del vehículo — conductor y pasajeros — debe usar el cinturón de seguridad. El conductor es responsable de verificar que todos estén abrochados antes de iniciar la marcha. (LTT 2008, Art. 73.5)\n\nNIÑOS MENORES DE 10 AÑOS\nDeben ir obligatoriamente en los asientos traseros del vehículo. En el caso de infantes, deben ir en sillas especiales para tal fin. (LTT 2008, Art. 73.7)"
    },
    {
      "title": "2. Normas de Conducción",
      "body": "LICENCIA DE CONDUCIR\nPara conducir un sedán se requiere licencia de tercer grado (3°), Tipo B, para mayores de 18 años. (LTT 2008, Art. 67.3)\n\nCERO ALCOHOL Y DROGAS\nConducir bajo los efectos del alcohol o sustancias estupefacientes está sancionado con multa de 10 U.T. más suspensión de la licencia. Se presume culpable al conductor de cualquier accidente que ocurra bajo ese estado. (LTT 2008, Art. 169.8 y Art. 194)\n\nCERO CELULAR SIN MANOS LIBRES\nProhibido usar dispositivos de comunicación sin manos libres mientras conduces. Sanción: 10 U.T. (LTT 2008, Art. 169.12)\n\nRESPETA SEMÁFOROS Y SEÑALES\nDesatender las indicaciones de los semáforos: 10 U.T. (LTT 2008, Art. 169.2)\n\nVELOCIDAD\nConducir a exceso de velocidad: 10 U.T. (LTT 2008, Art. 169.4)\n\nNO FUMAR\nEstá prohibido fumar dentro del vehículo mientras haya pasajeros a bordo."
    },
    {
      "title": "3. Confort y Atención al Pasajero",
      "body": "El pasajero que sube a tu vehículo confía en ti. Estos estándares no son opcionales — son parte de tu compromiso como conductor de V-Ride.\n\nANTES DE CADA JORNADA\n• Vehículo limpio por dentro y por fuera — sin olores, sin basura\n• Asientos en buen estado\n• Temperatura interior agradable (aire acondicionado o ventilación)\n• Ninguna luz de advertencia del tablero encendida\n\nAL RECIBIR AL PASAJERO\n• Confirma el nombre del pasajero antes de iniciar el viaje\n• Ofrece ayuda con el equipaje\n• Asegúrate de que todos estén abrochados antes de partir\n• No inicies el viaje hasta que todos estén sentados\n\nDURANTE EL VIAJE\n• Conduce de forma suave — sin frenazos bruscos ni aceleraciones abruptas\n• Mantén la música apagada o muy baja, a menos que el pasajero la solicite\n• Evita baches y vías en mal estado cuando sea posible\n• Nunca uses el teléfono mientras conduces\n• No compartas tu número personal con los pasajeros — usa la comunicación dentro de la app"
    },
    {
      "title": "4. Mantenimiento del Vehículo",
      "body": "Todo propietario está obligado a mantener el vehículo en buenas condiciones de seguridad y funcionamiento. (LTT 2008, Art. 72.5)\n\nVerifica estos puntos antes de salir:\n\nFRENOS\nRespuesta firme en frenado normal y de emergencia. Si hay vibración, ruido o demora, no salgas a trabajar.\n\nNEUMÁTICOS\nPresión correcta y sin desgaste excesivo. Las llantas lisas son peligrosas en lluvia y constituyen un defecto de seguridad sancionable.\n\nLUCES\nDelanteras, traseras, direccionales y luces de freno deben funcionar. Conducir con equipos de seguridad defectuosos: 10 U.T. (LTT 2008, Art. 169.11)\n\nAIRE ACONDICIONADO Y CALEFACCIÓN\nFundamentales para el confort del pasajero. Mantenerlos en buen estado es parte del estándar del servicio.\n\nREVISIÓN TÉCNICA VIGENTE\nEl vehículo debe haber aprobado su revisión técnica, mecánica y física ante el INTT. Sin revisión vigente: 10 U.T. (LTT 2008, Art. 169.3)\n\nSEGURO DE RESPONSABILIDAD CIVIL VIGENTE\nObligatorio. Sin póliza: 5 U.T. y suspensión de acceso a la plataforma. (LTT 2008, Art. 58 y Art. 170.3)"
    },
    {
      "title": "5. Documentación Obligatoria",
      "body": "Todo conductor debe portar: (LTT 2008, Art. 63 y Art. 73)\n\n• Licencia de conducir vigente de tercer grado (3°), Tipo B — mínimo 18 años. Sin licencia: 10 U.T. (LTT 2008, Art. 169.1)\n• Certificado Médico de Salud Integral vigente. Vencido o no portarlo: 3 U.T. (LTT 2008, Art. 171.1 y 171.2)\n• Certificado psicológico vigente cuando lo exija el reglamento (LTT 2008, Art. 73.3)\n• Cédula de identidad\n• Certificado de circulación del vehículo\n• Póliza de Responsabilidad Civil vigente"
    },
    {
      "title": "6. En Caso de Accidente",
      "body": "Todo conductor involucrado en un accidente debe: (LTT 2008, Art. 86)\n\n1. Detener el vehículo en el lugar del accidente — no retirarte bajo ninguna circunstancia.\n2. Verificar si hay víctimas y prestarles los debidos auxilios.\n3. Avisar a la autoridad competente (PTT / INTT / 911).\n4. Intercambiar datos: nombre, cédula, placa y aseguradora con los demás involucrados.\n5. Fotografiar los daños y la escena antes de mover los vehículos.\n6. Reportar el incidente a través de la app V-Ride.\n\nRESPONSABILIDAD CIVIL SOLIDARIA\nEl conductor, el propietario del vehículo y la aseguradora son solidariamente responsables de los daños causados a terceros. (LTT 2008, Art. 192)\n\nPRESUNCIÓN DE CULPABILIDAD\nSe presume responsable al conductor si al momento del accidente se encontraba bajo efectos del alcohol, drogas o exceso de velocidad. (LTT 2008, Art. 194)\n\nDARSE A LA FUGA\nSanción: 10 U.T. más responsabilidad penal. (LTT 2008, Art. 169.23)"
    },
    {
      "title": "7. Resumen de Sanciones",
      "body": "SANCIONES GRAVES — 10 Unidades Tributarias (U.T.)\n• Sin licencia de conducir (Art. 169.1)\n• Conducir bajo alcohol o drogas (Art. 169.8) + suspensión de licencia\n• Exceso de velocidad (Art. 169.4)\n• Desatender semáforos (Art. 169.2)\n• Equipos de seguridad defectuosos (Art. 169.11)\n• Sin revisión técnica vigente (Art. 169.3)\n• Usar celular sin manos libres (Art. 169.12)\n• Darse a la fuga en accidente (Art. 169.23)\n\nSANCIONES MENOS GRAVES — 5 Unidades Tributarias (U.T.)\n• Sin póliza de seguro vigente (Art. 170.3)\n• Exceso de pasajeros (Art. 170.15)\n\nSANCIONES LEVES — 3 Unidades Tributarias (U.T.)\n• Licencia de conducir vencida o no portarla (Art. 171.1)\n• Certificado Médico vencido o no portarlo (Art. 171.2)\n\nBase legal: Ley de Transporte Terrestre (G.O. N° 38.985, 01/08/2008)"
    }
  ]',
  '1.0',
  10,
  10,
  11,
  TRUE
);

/* Preguntas del test — Módulo VE-SEDAN-001 */
INSERT INTO training_questions (
  module_id, question_text, option_a, option_b, option_c, option_d, correct_option, order_index
)
SELECT m.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.order_index
FROM training_modules m,
(VALUES
  (1,
   '¿Cuántas personas como máximo pueden viajar en un sedán de V-Ride Venezuela, incluyendo al conductor?',
   'Cuatro personas', 'Cinco personas', 'Seis personas', 'Depende del modelo del vehículo',
   'B'),

  (2,
   '¿Qué tipo y grado de licencia se requiere para conducir un sedán como conductor de V-Ride?',
   'Segundo grado, Tipo B', 'Cuarto grado, Tipo A', 'Tercer grado, Tipo B, mínimo 18 años', 'Quinto grado para transporte público',
   'C'),

  (3,
   '¿Quién es responsable de verificar que todos los pasajeros estén abrochados antes de iniciar el viaje?',
   'El pasajero de mayor edad', 'El conductor', 'La plataforma V-Ride', 'No hay obligación legal al respecto',
   'B'),

  (4,
   '¿Dónde deben ir obligatoriamente los niños menores de 10 años según la LTT 2008?',
   'En el asiento delantero junto al conductor', 'En los asientos traseros del vehículo', 'Puede ir en cualquier asiento si el conductor lo autoriza', 'No pueden viajar en el vehículo',
   'B'),

  (5,
   '¿Qué sanción recibe el conductor que transporta más pasajeros de los permitidos?',
   '10 U.T.', '3 U.T.', '5 U.T.', 'No existe sanción para esa infracción',
   'C'),

  (6,
   'Conducir bajo los efectos del alcohol está sancionado con:',
   '3 U.T. y una advertencia escrita', '5 U.T. sin consecuencias adicionales', '10 U.T. más suspensión de licencia, y se presume culpabilidad en accidentes', 'Solo una multa moral sin valor económico',
   'C'),

  (7,
   '¿Cuál es la sanción por circular con equipos de seguridad defectuosos (frenos, luces, neumáticos)?',
   '3 U.T.', '5 U.T.', '10 U.T.', 'No existe sanción si no ocurre un accidente',
   'C'),

  (8,
   'En caso de accidente, el conductor, el propietario del vehículo y la aseguradora son:',
   'Responsables únicamente en partes iguales según negociación', 'Solidariamente responsables de los daños causados a terceros', 'Exonerados si el conductor tenía la licencia vigente', 'Solo responsables si había exceso de velocidad',
   'B'),

  (9,
   '¿Cuánto es la multa por circular sin póliza de seguro de responsabilidad civil vigente?',
   '10 U.T.', '3 U.T.', '5 U.T.', 'No hay multa, solo una advertencia',
   'C'),

  (10,
   '¿Cuándo se presume que el conductor es responsable de un accidente de tránsito?',
   'Cuando el vehículo no tenía revisión técnica vigente', 'Cuando el conductor no portaba la licencia', 'Cuando al ocurrir el accidente estaba bajo efectos del alcohol, drogas o exceso de velocidad', 'Cuando el pasajero no tenía el cinturón puesto',
   'C')
) AS q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
WHERE m.code = 'VE-SEDAN-001';


/* ═══════════════════════════════════════════════════════════════
   MÓDULO SUV — VE-SUV-001
   ═══════════════════════════════════════════════════════════════ */
INSERT INTO training_modules (
  code, title, content, version, passing_score, total_questions, order_index, is_required
) VALUES (
  'VE-SUV-001',
  'Capacitación para Conductores de SUV',
  '[
    {
      "title": "1. Capacidad y Tipo de Servicio",
      "body": "CAPACIDAD MÁXIMA\nUn SUV puede transportar hasta 6 pasajeros además del conductor según la configuración del vehículo, sin exceder en ningún caso la cantidad de asientos certificada por el fabricante. Transportar más pasajeros de los permitidos está sancionado con multa de 5 U.T. (LTT 2008, Art. 170.15)\n\nCINTURÓN DE SEGURIDAD PARA TODOS\nCada pasajero debe ir en un asiento individual con su propio cinturón de seguridad. No se permite transportar pasajeros sin cinturón disponible ni usar un cinturón para dos personas. El conductor es responsable de verificar que todos estén abrochados antes de partir. (LTT 2008, Art. 73.5)\n\nNIÑOS MENORES DE 10 AÑOS\nDeben ir obligatoriamente en los asientos traseros. Los infantes deben ir en sillas especiales para tal fin. (LTT 2008, Art. 73.7)\n\nCARGA Y EQUIPAJE\nEl maletero puede usarse para equipaje, pero nunca para transportar personas. No está permitido cargar objetos que comprometan la visibilidad del conductor o superen la capacidad de carga del vehículo."
    },
    {
      "title": "2. Conducción de un Vehículo Grande",
      "body": "Un SUV es significativamente más grande y pesado que un sedán. Esto exige precauciones adicionales en la vía.\n\nDISTANCIA DE FRENADO\nUn SUV necesita más distancia para detenerse que un vehículo pequeño. Aumenta siempre la distancia de seguimiento con el vehículo de adelante, especialmente en lluvia o a alta velocidad.\n\nRADIO DE GIRO\nLos giros en intersecciones y estacionamientos requieren más espacio. Planifica el giro con anticipación para no invadir otros canales.\n\nVISIBILIDAD EN REVERSA\nLa parte trasera del SUV tiene puntos ciegos. Usa siempre los espejos y, si el vehículo tiene cámara de reversa, úsala. Antes de retroceder, verifica que no haya peatones ni vehículos detrás.\n\nESTACIONAMIENTO\nEl SUV ocupa más espacio. No obstruyas rampas de acceso, zonas de carga ni pasos peatonales al estacionar.\n\nVENTO Y LLUVIA\nLa mayor superficie lateral del SUV lo hace más susceptible al viento lateral en autopistas y en condiciones de lluvia fuerte. Reduce la velocidad ante condiciones climáticas adversas."
    },
    {
      "title": "3. Normas de Conducción",
      "body": "LICENCIA DE CONDUCIR\nPara conducir un SUV de hasta 9 puestos se requiere licencia de tercer grado (3°), Tipo B, para mayores de 18 años. (LTT 2008, Art. 67.3)\n\nCERO ALCOHOL Y DROGAS\nConducir bajo los efectos del alcohol o sustancias estupefacientes: 10 U.T. más suspensión de licencia. Se presume culpable al conductor de cualquier accidente que ocurra bajo ese estado. (LTT 2008, Art. 169.8 y Art. 194)\n\nCERO CELULAR SIN MANOS LIBRES\nProhibido usar dispositivos de comunicación sin manos libres. Sanción: 10 U.T. (LTT 2008, Art. 169.12)\n\nRESPETA SEMÁFOROS Y SEÑALES\nDesatender semáforos: 10 U.T. (LTT 2008, Art. 169.2)\n\nVELOCIDAD\nExceso de velocidad: 10 U.T. (LTT 2008, Art. 169.4). Recuerda que a mayor velocidad, mayor es la distancia de frenado del SUV.\n\nNO FUMAR\nProhibido fumar dentro del vehículo mientras haya pasajeros a bordo."
    },
    {
      "title": "4. Confort y Atención al Pasajero",
      "body": "ANTES DE CADA JORNADA\n• Vehículo limpio por dentro y por fuera — todos los asientos, incluidos los de la tercera fila\n• Sin olores ni residuos de viajes anteriores\n• Temperatura agradable (aire acondicionado o ventilación funcionando)\n• Ninguna luz de advertencia del tablero encendida\n\nAL RECIBIR AL PASAJERO\n• Confirma el nombre del pasajero antes de iniciar el viaje\n• Ofrece ayuda con el equipaje — el maletero del SUV es amplio, aprovéchalo\n• Si hay pasajeros en la tercera fila, verifica que puedan subir y bajar con seguridad\n• Asegúrate de que todos estén abrochados antes de partir\n\nDURANTE EL VIAJE\n• Conduce de forma suave — los movimientos bruscos se amplifican en vehículos grandes\n• Mantén la música apagada o muy baja, a menos que el pasajero la solicite\n• Evita baches y vías en mal estado — el impacto se siente más en los asientos traseros\n• Nunca uses el teléfono mientras conduces"
    },
    {
      "title": "5. Mantenimiento del Vehículo",
      "body": "Todo propietario está obligado a mantener el vehículo en buenas condiciones de seguridad y funcionamiento. (LTT 2008, Art. 72.5)\n\nVerifica estos puntos antes de salir:\n\nFRENOS\nRespuesta firme. Un SUV cargado con pasajeros necesita frenos en perfectas condiciones. Si hay vibración, ruido o demora, no salgas a trabajar.\n\nNEUMÁTICOS\nPresión correcta en las cuatro ruedas y sin desgaste excesivo. Llantas en mal estado son especialmente peligrosas en un vehículo pesado.\n\nLUCES\nDelanteras, traseras, direccionales y luces de freno deben funcionar. Equipos de seguridad defectuosos: 10 U.T. (LTT 2008, Art. 169.11)\n\nAIRE ACONDICIONADO\nEspecialmente importante en un SUV con capacidad máxima de pasajeros. El calor acumulado en 6-7 personas sin climatización adecuada es un factor de incomodidad y seguridad.\n\nREVISIÓN TÉCNICA VIGENTE\nObligatoria ante el INTT. Sin revisión vigente: 10 U.T. (LTT 2008, Art. 169.3)\n\nSEGURO DE RESPONSABILIDAD CIVIL VIGENTE\nObligatorio. Sin póliza: 5 U.T. y suspensión de acceso a la plataforma. (LTT 2008, Art. 58 y Art. 170.3)"
    },
    {
      "title": "6. En Caso de Accidente",
      "body": "Todo conductor involucrado en un accidente debe: (LTT 2008, Art. 86)\n\n1. Detener el vehículo en el lugar del accidente — no retirarte bajo ninguna circunstancia.\n2. Verificar si hay víctimas — con más pasajeros a bordo, la prioridad es revisar a todos.\n3. Prestar los debidos auxilios y llamar al 911 si hay heridos.\n4. Avisar a la autoridad competente (PTT / INTT).\n5. Intercambiar datos: nombre, cédula, placa y aseguradora con los demás involucrados.\n6. Fotografiar los daños y la escena antes de mover los vehículos.\n7. Reportar el incidente a través de la app V-Ride.\n\nRESPONSABILIDAD CIVIL SOLIDARIA\nEl conductor, el propietario del vehículo y la aseguradora son solidariamente responsables de los daños causados a terceros. (LTT 2008, Art. 192)\n\nPRESUNCIÓN DE CULPABILIDAD\nSe presume responsable al conductor si al momento del accidente estaba bajo efectos del alcohol, drogas o exceso de velocidad. (LTT 2008, Art. 194)\n\nDARSE A LA FUGA\nSanción: 10 U.T. más responsabilidad penal. Con varios pasajeros a bordo, esta situación es especialmente grave. (LTT 2008, Art. 169.23)"
    },
    {
      "title": "7. Resumen de Sanciones",
      "body": "SANCIONES GRAVES — 10 Unidades Tributarias (U.T.)\n• Sin licencia de conducir (Art. 169.1)\n• Conducir bajo alcohol o drogas (Art. 169.8) + suspensión de licencia\n• Exceso de velocidad (Art. 169.4)\n• Desatender semáforos (Art. 169.2)\n• Equipos de seguridad defectuosos (Art. 169.11)\n• Sin revisión técnica vigente (Art. 169.3)\n• Usar celular sin manos libres (Art. 169.12)\n• Darse a la fuga en accidente (Art. 169.23)\n\nSANCIONES MENOS GRAVES — 5 Unidades Tributarias (U.T.)\n• Sin póliza de seguro vigente (Art. 170.3)\n• Exceso de pasajeros (Art. 170.15)\n\nSANCIONES LEVES — 3 Unidades Tributarias (U.T.)\n• Licencia de conducir vencida o no portarla (Art. 171.1)\n• Certificado Médico vencido o no portarlo (Art. 171.2)\n\nBase legal: Ley de Transporte Terrestre (G.O. N° 38.985, 01/08/2008)"
    }
  ]',
  '1.0',
  10,
  10,
  12,
  TRUE
);

/* Preguntas del test — Módulo VE-SUV-001 */
INSERT INTO training_questions (
  module_id, question_text, option_a, option_b, option_c, option_d, correct_option, order_index
)
SELECT m.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.order_index
FROM training_modules m,
(VALUES
  (1,
   '¿Cuántos pasajeros como máximo puede transportar un SUV en V-Ride Venezuela, además del conductor?',
   'Cuatro', 'Cinco', 'Seis, sin exceder la capacidad certificada del fabricante', 'Los que quepan físicamente en el vehículo',
   'C'),

  (2,
   '¿Qué tipo y grado de licencia se requiere para conducir un SUV de hasta 9 puestos?',
   'Segundo grado, Tipo B', 'Cuarto grado para transporte público', 'Tercer grado, Tipo B, mínimo 18 años', 'Quinto grado con título profesional',
   'C'),

  (3,
   '¿Por qué un SUV necesita mayor distancia de seguimiento con el vehículo de adelante?',
   'Porque consume más combustible a alta velocidad', 'Porque su mayor peso aumenta la distancia de frenado', 'Porque la visibilidad delantera es menor que en un sedán', 'No necesita mayor distancia que un vehículo pequeño',
   'B'),

  (4,
   '¿Está permitido transportar pasajeros en el maletero del SUV?',
   'Sí, si hay más pasajeros que asientos disponibles', 'Sí, solo para trayectos cortos', 'No — el maletero es únicamente para equipaje', 'Sí, si el pasajero firma una autorización',
   'C'),

  (5,
   '¿Qué sanción recibe el conductor que supera la capacidad de pasajeros del vehículo?',
   '10 U.T.', '3 U.T.', '5 U.T.', 'No existe sanción para esa infracción',
   'C'),

  (6,
   'Al retroceder con el SUV, ¿qué precaución adicional debes tomar?',
   'Acelerar para hacer el movimiento más rápido', 'Usar los espejos, la cámara de reversa si está disponible, y verificar que no haya peatones ni vehículos detrás', 'Tocar la bocina repetidamente y retroceder de inmediato', 'No es necesaria ninguna precaución adicional',
   'B'),

  (7,
   'Conducir bajo los efectos del alcohol en un SUV con pasajeros está sancionado con:',
   '3 U.T. y advertencia', '5 U.T.', '10 U.T. más suspensión de licencia, y se presume culpabilidad en accidentes', 'Solo una multa moral',
   'C'),

  (8,
   'En caso de accidente con varios pasajeros a bordo, ¿cuál es la primera acción?',
   'Llamar a V-Ride para reportar el incidente', 'Tomar fotos del accidente antes de cualquier otra acción', 'Detener el vehículo y verificar el estado de todos los pasajeros', 'Mover el vehículo al lado de la vía antes de revisar a los pasajeros',
   'C'),

  (9,
   '¿Cuánto es la multa por circular con el SUV sin póliza de seguro de responsabilidad civil vigente?',
   '10 U.T.', '3 U.T.', '5 U.T.', 'No hay multa, solo se exige en caso de accidente',
   'C'),

  (10,
   'El conductor, el propietario del vehículo y la aseguradora son solidariamente responsables de los daños causados en un accidente según:',
   'El Código Civil Venezolano, Art. 1.185', 'La Ley de Transporte Terrestre 2008, Art. 192', 'El Decreto 8495 de Mototaxis', 'La LOPCD, G.O. N° 38.598',
   'B')
) AS q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
WHERE m.code = 'VE-SUV-001';
