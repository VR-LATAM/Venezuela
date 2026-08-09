/* V-RIDE VENEZUELA — Módulos de capacitación por tipo de vehículo
   Módulo 1: Moto Taxi
   Base legal: Ley de Transporte Terrestre (G.O. N° 38.985, 01/08/2008)
               Decreto N° 8.495, Reglamento Parcial sobre Mototaxis (G.O. N° 39.772, 05/10/2011)
*/

INSERT INTO training_modules (
  code, title, content, version, passing_score, total_questions, order_index, is_required
) VALUES (
  'VE-MOTO-001',
  'Capacitación para Conductores de Moto Taxi',
  '[
    {
      "title": "1. Equipo de Protección Personal",
      "body": "El uso del equipo de protección es obligatorio por ley, no opcional.\n\nCASCO HOMOLOGADO\nConductor y pasajero deben usar casco protector correctamente abrochado en todo momento. Para moto taxi el casco debe ser de color BLANCO con la identificación ''Moto Taxi'' en letras reflectivas de 3,5 cm. No usar casco está sancionado con multa de 5 U.T. (LTT 2008, Art. 170.16.h · Decreto 8495, Art. 30 y Art. 54.j)\n\nCHALECO REFLECTIVO ANARANJADO\nLos conductores de moto taxi deben usar chaleco de color ANARANJADO que los identifique como prestadores del servicio. (Decreto 8495, Art. 28.6)\n\nIMPERMEABLE\nObligatorio tenerlo disponible para condiciones de lluvia. (Decreto 8495, Art. 30)\n\nGUANTES Y ZAPATOS CERRADOS\nProtegen en caso de caída y mejoran el control del vehículo."
    },
    {
      "title": "2. Normas de Conducción",
      "body": "ESTADO FÍSICO Y MENTAL\nTodo conductor debe conducir en óptimo estado de salud, física y mental. Conducir estando incapacitado físicamente está sancionado con multa de 10 U.T. (LTT 2008, Art. 73.4 y Art. 169.7)\n\nRESPETA SEMÁFOROS Y SEÑALES\nDesatender las indicaciones de los semáforos está sancionado con multa de 10 U.T. (LTT 2008, Art. 169.2)\n\nCEDE EL PASO AL PEATÓN\nMantén al menos 1 metro de distancia de la acera. (Decreto 8495, Art. 28)\n\nPROHIBIDO CIRCULAR EN CONTRA VÍA O ENTRE CANALES\nCircular entre canales a más de 60 km/h o en contra vía están sancionados con 5 U.T. cada uno. (LTT 2008, Art. 170.16.a y 170.16.g)\n\nCERO CELULAR\nConducir usando equipos de comunicación sin dispositivo de manos libres está sancionado con multa de 10 U.T. El Reglamento de Mototaxis prohíbe expresamente el uso de auriculares. (LTT 2008, Art. 169.12 · Decreto 8495, Art. 29)\n\nCERO ALCOHOL NI DROGAS\nConducir bajo los efectos de bebidas alcohólicas o sustancias estupefacientes está sancionado con multa de 10 U.T. y suspensión de la licencia. Además, se presume tu culpabilidad en cualquier accidente que ocurra mientras estés bajo esos efectos. (LTT 2008, Art. 169.8 y Art. 194)\n\nVELOCIDAD\nConducir sobrepasando el límite permitido está sancionado con multa de 10 U.T. (LTT 2008, Art. 169.4)"
    },
    {
      "title": "3. Pasajeros y Carga",
      "body": "MÁXIMO 1 PASAJERO\nLa capacidad máxima de la moto taxi es de dos personas incluyendo al conductor. Transportar más está sancionado con multa de 5 U.T. (LTT 2008, Art. 170.16.c · Decreto 8495, Art. 10)\n\nPASAJEROS NO PERMITIDOS\nEstá prohibido transportar menores de 10 años, mujeres embarazadas y personas mayores de 60 años. (Decreto 8495, Art. 31.7)\n\nSIN CARGA EXCESIVA\nNo se permite carga mayor de 90 kg ni objetos que dificulten la conducción. Estas conductas están sancionadas con 5 U.T. (LTT 2008, Art. 170.16.d y 170.16.e)\n\nSUJECIÓN CORRECTA DEL PASAJERO\nEl pasajero debe sujetarse de la cintura del conductor o de los agarraderos, con ambos pies sobre los estribos y el cuerpo alineado con el conductor. (Decreto 8495, Art. 23)"
    },
    {
      "title": "4. Mantenimiento del Vehículo",
      "body": "Todo propietario está obligado a mantener el vehículo en buenas condiciones de seguridad, funcionamiento y control de emisiones. (LTT 2008, Art. 72.5)\n\nRevisa tu moto antes de cada jornada:\n\nFRENOS\nPrueba delantero y trasero. Si responden con demora, no salgas a trabajar.\n\nLUCES Y DISPOSITIVOS DE SEGURIDAD\nDeben funcionar. Conducir con equipos de seguridad defectuosos está sancionado con 10 U.T. (LTT 2008, Art. 169.11)\n\nLLANTAS\nVerifica presión y estado del caucho. Llantas lisas o con baja presión son especialmente peligrosas en lluvia.\n\nREVISIÓN TÉCNICA\nEl vehículo debe haber aprobado su revisión técnica, mecánica y física. Conducir sin hacerla está sancionado con 10 U.T. (LTT 2008, Art. 169.3)\n\nSEGURO DE RESPONSABILIDAD CIVIL\nObligatorio y vigente. Circular sin póliza está sancionado con 5 U.T. (LTT 2008, Art. 58, Art. 72.8 y Art. 170.3)"
    },
    {
      "title": "5. Documentación Obligatoria",
      "body": "Todo conductor está obligado a portar: (LTT 2008, Art. 63 y Art. 73 · Decreto 8495, Art. 30)\n\n• Licencia de conducir vigente de SEGUNDO GRADO, Tipo B, para motos de cualquier cilindrada (mínimo 18 años). Conducir sin licencia: multa de 10 U.T. (LTT 2008, Art. 67 y Art. 169.1)\n• Certificado Médico de Salud Integral vigente. Licencia o certificado vencido: multa de 3 U.T. (LTT 2008, Art. 171.1 y 171.2)\n• Certificado psicológico vigente (LTT 2008, Art. 73.3)\n• Cédula de identidad\n• Certificado de circulación del vehículo\n• Póliza de Responsabilidad Civil vigente\n• Carnet único de motociclista (Decreto 8495, Art. 30)"
    },
    {
      "title": "6. En Caso de Accidente",
      "body": "Todo conductor involucrado en un accidente debe: (LTT 2008, Art. 86)\n\n1. Detener el vehículo en el lugar del accidente.\n2. Verificar si hay víctimas y prestarles los debidos auxilios.\n3. Avisar a la autoridad competente.\n4. Intercambiar datos de identificación con los demás involucrados.\n\nRESPONSABILIDAD CIVIL SOLIDARIA\nEl conductor, el propietario del vehículo y la aseguradora son solidariamente responsables de los daños causados. (LTT 2008, Art. 192)\n\nPRESUNCIÓN DE CULPABILIDAD\nSe presume que el conductor es responsable del accidente si al ocurrir este se encontraba bajo efectos del alcohol, drogas o conducía a exceso de velocidad. (LTT 2008, Art. 194)\n\nDAR A LA FUGA ES UN DELITO\nDarse a la fuga en caso de accidente está sancionado con multa de 10 U.T. (LTT 2008, Art. 169.23)"
    },
    {
      "title": "7. Resumen de Sanciones",
      "body": "SANCIONES GRAVES — 10 Unidades Tributarias (U.T.)\n• Sin licencia de conducir (Art. 169.1)\n• Conducir bajo alcohol o drogas (Art. 169.8) + suspensión de licencia\n• Exceso de velocidad (Art. 169.4)\n• Desatender semáforos (Art. 169.2)\n• Equipos de seguridad defectuosos (Art. 169.11)\n• Sin revisión técnica vigente (Art. 169.3)\n• Usar celular sin manos libres (Art. 169.12)\n• Darse a la fuga en accidente (Art. 169.23)\n\nSANCIONES MENOS GRAVES — 5 Unidades Tributarias (U.T.)\n• Sin póliza de seguro (Art. 170.3)\n• Exceso de pasajeros (Art. 170.16.c)\n• Sin casco (Art. 170.16.h)\n• Circular en contra vía (Art. 170.16.g)\n• Circular entre canales a más de 60 km/h (Art. 170.16.a)\n\nSANCIONES LEVES — 3 Unidades Tributarias (U.T.)\n• Licencia de conducir vencida o no portarla (Art. 171.1)\n• Certificado Médico vencido o no portarlo (Art. 171.2)\n\nBase legal: Ley de Transporte Terrestre (G.O. N° 38.985, 01/08/2008)"
    }
  ]',
  '1.0',
  10,
  10,
  10,
  TRUE
);

/* Preguntas del test — Módulo VE-MOTO-001
   10 preguntas · puntaje mínimo 7/10 para aprobar
*/
INSERT INTO training_questions (
  module_id, question_text, option_a, option_b, option_c, option_d, correct_option, order_index
)
SELECT m.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.order_index
FROM training_modules m,
(VALUES
  (1,
   '¿De qué color debe ser el casco del conductor de moto taxi según el Decreto 8495?',
   'Negro con franja amarilla',
   'Blanco con la identificación "Moto Taxi"',
   'Rojo con el número de placa',
   'Cualquier color homologado',
   'B'),

  (2,
   '¿Cuántas personas como máximo pueden viajar en una moto taxi, incluyendo al conductor?',
   'Una persona (solo el conductor)',
   'Tres personas',
   'Dos personas (conductor + 1 pasajero)',
   'Depende del tamaño de la moto',
   'C'),

  (3,
   '¿Qué tipo y grado de licencia se requiere para conducir una motocicleta de cualquier cilindrada con fines de moto taxi?',
   'Tercer grado, Tipo A',
   'Primer grado, Tipo B',
   'Segundo grado, Tipo B, con mínimo 18 años',
   'Quinto grado, para transporte público',
   'C'),

  (4,
   'Conducir bajo los efectos del alcohol o drogas está sancionado con:',
   '3 U.T. y una advertencia escrita',
   '5 U.T. sin consecuencias adicionales',
   '10 U.T. más suspensión de la licencia, y se presume culpabilidad en accidentes',
   'Solo una multa moral sin valor económico',
   'C'),

  (5,
   '¿Cuál de los siguientes pasajeros ESTÁ PROHIBIDO transportar en una moto taxi?',
   'Un adulto de 45 años con maletín ejecutivo',
   'Una persona mayor de 60 años',
   'Un estudiante universitario con mochila pequeña',
   'Un trabajador con ropa de trabajo',
   'B'),

  (6,
   'Si estás involucrado en un accidente de tránsito, ¿cuál de las siguientes acciones NO debes hacer?',
   'Detener el vehículo en el lugar del accidente',
   'Prestar auxilio a las víctimas',
   'Darte a la fuga para evitar problemas',
   'Avisar a la autoridad competente',
   'C'),

  (7,
   '¿Qué multa recibe el conductor de motocicleta que NO usa casco?',
   '10 U.T.',
   '3 U.T.',
   '5 U.T.',
   'No existe sanción por eso',
   'C'),

  (8,
   'En caso de accidente, el conductor, el propietario del vehículo y la aseguradora son:',
   'Responsables únicamente en partes iguales según negociación',
   'Solidariamente responsables de los daños causados',
   'Exonerados si el conductor tenía la licencia vigente',
   'Solo responsables si había exceso de velocidad',
   'B'),

  (9,
   'Según la Ley de Transporte Terrestre 2008 y el Reglamento de Mototaxis, ¿qué está EXPRESAMENTE PROHIBIDO mientras conduces?',
   'Circular con las luces encendidas de día',
   'Usar el chaleco reflectivo anaranjado',
   'Usar auriculares y dispositivos móviles sin manos libres',
   'Llevar el carnet único de motociclista',
   'C'),

  (10,
   '¿Cuál de los siguientes documentos es obligatorio portar además de la licencia de conducir?',
   'Pasaporte vigente',
   'Carnet del sindicato de transporte',
   'Certificado Médico de Salud Integral vigente',
   'Certificado de estudios secundarios',
   'C')
) AS q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
WHERE m.code = 'VE-MOTO-001';
