-- Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
-- MIGRACIÓN 030: Módulo de entrenamiento Military Service

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
  'Military & Veteran Service',
  $$[
    {"title":"The Military Community","body":"The United States has over 1.3 million active-duty personnel and more than 18 million veterans. Military members and veterans value punctuality, discipline, respect, and discretion. As a VeronaRide driver certified for Military Service, you are expected to understand their culture and provide an elevated experience that honors their service."},
    {"title":"Punctuality and Professionalism","body":"Military culture runs on precision timing. Arrive at the pickup location at least 2 minutes early. If you are running late, notify through the app immediately. Present yourself professionally: clean vehicle, no strong odors, appropriate attire."},
    {"title":"Base Access and Security Checkpoints","body":"When picking up or dropping off at a military installation you may need to pass through a security checkpoint. Always carry your valid driver license and vehicle registration. Follow all instructions from security personnel. Never photograph military facilities, equipment, or personnel."},
    {"title":"Etiquette and Respect","body":"Address military passengers as Sir or Maam unless they prefer otherwise. Do not ask about their rank, unit, deployment, or mission. Avoid political conversations. Do not ask about combat experience."},
    {"title":"Supporting Veterans with Special Needs","body":"Some veterans live with PTSD, TBI, or hearing loss. If a passenger seems distressed, remain calm and quietly ask if they are okay. Offer to open a window or take a different route. Never startle a veteran with sudden honking."},
    {"title":"Confidentiality and Discretion","body":"Never share or discuss military passengers destinations or personal information. Do not photograph passengers or their belongings. VeronaRide Military Service certification reflects honor, respect, and integrity."}
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
   'A military passenger asks you to take a longer less crowded route. What should you do?',
   'Refuse — the app calculates the optimal route',
   'Comply without comment and adjust the route as requested',
   'Ask them why they are anxious before agreeing',
   'Suggest they take a different service type',
   'B'),
  (2,
   'At a military base gate the guard asks for your documents. What do you present?',
   'Only your phone with the app open',
   'Your driver license and vehicle registration',
   'A VeronaRide company letter',
   'The passenger military ID on their behalf',
   'B'),
  (3,
   'A military passenger in uniform boards your vehicle. How do you address them?',
   'Use their first name to make them comfortable',
   'Ask their rank so you can address them correctly',
   'Use Sir or Maam unless they indicate otherwise',
   'Avoid speaking unless they speak first',
   'C'),
  (4,
   'Which topic should you AVOID with a military passenger?',
   'Local traffic and estimated arrival time',
   'Whether they have been deployed and what they experienced',
   'Weather conditions or road closures',
   'The passenger preferred temperature',
   'B'),
  (5,
   'A veteran passenger suddenly appears distressed. What is the best response?',
   'Turn up the music to help them relax',
   'Ask loudly if something is wrong',
   'Remain calm, lower the volume, and quietly ask if they need anything',
   'Pull over and ask them to exit',
   'C'),
  (6,
   'You transport a military passenger to a base hospital. A friend texts asking where you are. What do you do?',
   'Share the location — it is just a hospital',
   'Keep the passenger destination strictly confidential',
   'Tell your friend you are near the base',
   'Ask the passenger for permission first',
   'B'),
  (7,
   'A checkpoint denies your vehicle access for pickup. What should you do?',
   'Argue with the guard',
   'Contact the passenger through the app to arrange an off-base meeting point',
   'Cancel the ride immediately',
   'Drive around the base to find another entrance',
   'B'),
  (8,
   'Which behavior is NEVER acceptable near a military installation?',
   'Asking about estimated wait time',
   'Photographing military facilities or personnel',
   'Offering water to the passenger',
   'Informing the passenger of a traffic delay',
   'B'),
  (9,
   'How early should you arrive at a military pickup location?',
   'Exactly on time',
   'At least 2 minutes early',
   '5 to 10 minutes early only if the base is far',
   'Arrival time does not matter',
   'B'),
  (10,
   'A military passenger leaves belongings in your vehicle. What is the correct action?',
   'Leave the items until your next shift',
   'Post on social media to find the owner',
   'Immediately report through the app and secure the items safely',
   'Return to the base gate and leave items with the guard',
   'C')
) AS q(oi, qt, a, b, c, d, co)
WHERE m.code = 'VRN-TRN-031';
