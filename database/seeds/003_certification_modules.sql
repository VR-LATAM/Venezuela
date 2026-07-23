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
('VRN-TRN-026', 'Special Passenger Categories', '[
  {"title":"Pregnant Passengers — Understanding Their Needs","body":"Pregnant passengers frequently use VeronaRide for prenatal appointments, hospital visits, and postpartum care. Physical changes during pregnancy directly affect the ride experience.\n\nKey challenges:\n• Enlarged abdomen — difficulty sitting and standing, requires extra time\n• Lower back pain — bumpy roads and sudden braking cause significant discomfort\n• Nausea — strong odors, sharp turns, and stop-and-go traffic worsen it\n• Frequent need to urinate — accommodate rest stops without judgment\n• Fatigue — carry bags, open doors always\n\nPickup protocol:\n• Exit the vehicle and greet the passenger — never make her walk unassisted\n• Offer your arm for support\n• Open the door fully — allow maximum clearance\n• Wait patiently until she is fully seated and comfortable\n\nDuring the trip:\n• Drive with maximum smoothness — no hard braking, no sharp turns\n• Keep vehicle well-ventilated — fresh air reduces nausea\n• Avoid strong air fresheners\n• Keep music off or very low\n\nSeatbelt guidance:\n• Lap belt: positioned LOW across the hips — below the abdomen\n• Shoulder belt: across the chest and collarbone — between the breasts\n• Never suggest skipping the seatbelt\n\nEmergency — call 911 immediately if:\n• Contractions less than 5 minutes apart\n• Water breaking\n• Severe abdominal pain or heavy bleeding\n• Passenger becomes unresponsive\n• Passenger says ''I think the baby is coming''\nDo NOT drive to the hospital — call 911 and stay with her."},
  {"title":"Elderly Adults (65+) — Protocol","body":"Elderly adults are VeronaRide''s primary passenger base. For many, this is their only source of independent transportation.\n\nCommon conditions and adaptations:\n• Reduced mobility — allow extra time, offer arm, open doors fully\n• Osteoporosis / joint pain — ultra-smooth driving is critical\n• Hearing loss — face them when speaking, speak clearly at moderate volume\n• Visual impairment — guide verbally, identify yourself by name\n• Mild cognitive decline / dementia — confirm destination patiently, answer repeated questions without frustration\n• Balance issues — offer steady support, move slowly\n\nPickup protocol:\n• Arrive on time — anxiety increases if you are late\n• Exit the vehicle and walk to the door — never honk\n• Greet by name: ''Hello, are you [Name]? I''m [Your Name] with VeronaRide.''\n• Offer your arm — palm up, elbow bent\n• Walk at their pace — never pull or rush\n• Wait until they signal they are fully comfortable before closing the door\n\nDrop-off protocol:\n• Pull up as close to the entrance as possible\n• Exit the vehicle and assist the passenger out\n• Walk them to the building entrance if they appear unsteady\n• Wait until they are safely inside before driving away\n\nCall 911 immediately for:\n• Sudden confusion or disorientation\n• Slurred speech or facial drooping\n• Weakness in one arm or leg\n• Sudden severe headache or chest pain\n• Loss of consciousness\nThese may be signs of stroke or cardiac event — do not drive to the hospital."},
  {"title":"Post-Surgery & Medical Transport Passengers","body":"Post-surgery passengers are among the most vulnerable on the platform — in pain, under anesthesia effects, physically restricted, and emotionally stressed.\n\nWhat to expect:\n• Recent anesthesia — passenger may be drowsy or disoriented\n• Surgical wounds — avoid any contact with the surgical area\n• Pain medication — may cause dizziness, nausea, or confusion\n• Limited range of motion — cannot twist, bend, or lift\n• Nausea — keep vehicle aired out, have a bag available\n\nPickup from medical facility:\n• Coordinate with facility staff — they often bring the patient out in a wheelchair\n• Do not rush — discharge processes take time\n• Ask patient and/or nurse: ''Is there anything I need to know to make this ride comfortable?''\n• Assist with boarding slowly and carefully\n\nDuring the trip:\n• Maximum smoothness — non-negotiable\n• Keep cabin cool — post-anesthesia patients often feel warm\n• Check in quietly: ''Are you doing okay? Let me know if you need me to stop.''\n• Do not play music unless requested\n• If the passenger falls asleep, this is normal — do not wake them\n\nCall 911 immediately for:\n• Loss of consciousness or unresponsiveness\n• Breathing difficulty\n• Profuse bleeding through bandages\n• Seizure activity\n• Extreme confusion or agitation\n• Severe chest pain"},
  {"title":"Children with Special Needs","body":"VeronaRide may transport children with autism (ASD), cerebral palsy, Down syndrome, sensory processing disorders, and other conditions.\n\nIMPORTANT: Never transport a minor child alone without an accompanying adult unless specifically authorized in writing by VeronaRide and the child''s guardian.\n\nCondition awareness:\n• Autism (ASD) — sensitive to sounds, lights, sudden changes. Routine and predictability are calming.\n• Cerebral Palsy — affects movement and speech. Assist patiently. Listen carefully.\n• Down Syndrome — often communicative. Treat with full dignity and warmth.\n• Sensory Processing Disorder — oversensitive to light, sound, texture. Keep vehicle quiet and clean.\n• Non-verbal children — communicate through behavior or devices. Follow caregiver''s guidance.\n\nProtocol with accompanying adult:\n• Greet the adult caregiver — they are your primary contact\n• Ask: ''Is there anything I should know to make this ride comfortable for [child''s name]?''\n• Follow all guidance from the caregiver\n• Keep cabin quiet — no loud music, no sudden announcements\n\nInteracting with the child:\n• Speak calmly — never baby-talk or speak condescendingly\n• Do not touch the child without permission from the caregiver\n• Do not make sudden loud noises\n• If the child is stimming (rocking, flapping, vocalizing) — stay calm, this is normal self-regulation\n\nCar seat policy:\n• Texas law requires age-appropriate restraints\n• Drivers are NOT required to provide car seats\n• Do not begin the trip until the child is safely secured\n• If a child under 8 has no car seat — contact Support before proceeding"}
]', '1.0', 8, 10, 6, TRUE, NULL),

-- STANDARD SERVICE
('VRN-TRN-027-STD', 'Standard Service — Driver Certification', '[
  {"title":"What Is Standard Service?","body":"Standard is VeronaRide''s core service — on-demand, door-to-door transportation. It is the most common ride type and forms the foundation of daily driver work.\n\nService specifications:\n• Vehicle: 4-door sedan, SUV, or minivan — 2015 or newer\n• Capacity: up to 4 passengers\n• Booking: on-demand through the passenger app\n• Acceptance window: 30 seconds\n• Typical passengers: elderly adults, mobility-aid users, general passengers\n• Certification required: Modules 1–5 + VRN-TRN-026\n\nVehicle requirements:\n• Clean interior — no trash, no odors, no pet hair\n• All seats functional with working seatbelts\n• Air conditioning and heat fully operational\n• No dashboard warning lights active\n• Phone mounted securely\n• First aid kit present"},
  {"title":"Driver Appearance & Step-by-Step Protocol","body":"Driver appearance:\n• Clean, neat clothing — no torn, stained, or overly casual attire\n• Good personal hygiene\n• No strong cologne or perfume — many elderly passengers are sensitive\n• No eating while a passenger is in the vehicle\n• No smoking in the vehicle — ever\n\nStep-by-step protocol:\n1. Receive ride request — review passenger name, pickup, estimated earnings\n2. Accept within 30 seconds\n3. Navigate to pickup — arrive on time or early\n4. Exit vehicle — greet passenger by name\n5. Assist with boarding — open door, offer arm if needed\n6. Confirm destination before departing\n7. Drive smoothly following GPS route\n8. Assist passenger with alighting at destination\n9. Tap Complete Trip — fare is automatically processed\n10. Rate the passenger"},
  {"title":"Common Standard Service Scenarios","body":"Medical Appointment (most common):\nPassenger may be anxious or unwell. Drive smoothly, be patient at drop-off, and confirm they are safely inside before leaving.\n\nGrocery or Errand Run:\nPassenger may have bags. Offer to help — place them gently in the trunk. At drop-off, bring bags to the door if the passenger needs help.\n\nSocial Visit or Family Trip:\nPassenger may be talkative. Be warm and engaging. Let them lead the conversation.\n\nKey reminders:\n• Always exit the vehicle at pickup — never wait inside\n• Confirm first name before starting every trip\n• Smooth driving is your most important skill for this passenger base\n• Never rush an elderly or mobility-impaired passenger at boarding or drop-off"}
]', '1.0', 8, 10, 7, FALSE, 'standard'),

-- EXECUTIVE SERVICE
('VRN-TRN-027-EXE', 'Executive Service — Driver Certification', '[
  {"title":"What Is Executive Service?","body":"Executive service is VeronaRide''s premium tier — a completely elevated experience from arrival to drop-off. Passengers pay approximately 1.8x the standard fare and expect a noticeably superior experience.\n\nService specifications:\n• Vehicle: Full-size luxury sedan or premium SUV — 2018 or newer\n• Brands: Lincoln, Cadillac, Lexus, Mercedes, BMW, Genesis, Audi (or equivalent)\n• Capacity: up to 3 passengers (comfort over capacity)\n• Interior: spotless — professionally detailed minimum weekly\n• Pricing: approximately 1.8x Standard fare\n\nVehicle standards:\n• Exterior: spotless — no dirt, bird droppings, or water spots\n• Interior: vacuumed and wiped before every shift\n• No visible clutter of any kind\n• Phone charger (USB-A and USB-C) available for passenger use\n• Small still water bottles available for passengers\n• No air fresheners — vehicle should smell clean and neutral"},
  {"title":"Executive Driver Appearance & Arrival Protocol","body":"Driver appearance (required):\n• Business or business-casual attire — button shirt, slacks or chinos\n• Clean, polished shoes — no sneakers\n• No visible tattoos on hands, neck, or face\n• Hair neat and groomed\n• No strong cologne — subtle or none\n• Name badge or VeronaRide lanyard recommended\n\nArrival protocol:\n• Arrive 5 minutes early — Executive passengers expect punctuality above all\n• Park as close to the entrance as possible\n• Exit the vehicle immediately upon arrival\n• Stand by the rear passenger door — open it as the passenger approaches\n• Greet formally: ''Good morning/afternoon/evening, [Name]. Welcome to VeronaRide.''\n• Assist with any bags — place in trunk gently\n• Close the door once the passenger is fully seated"},
  {"title":"During the Trip & Drop-Off Protocol","body":"During the trip:\n• Do not initiate conversation — wait for the passenger to speak first\n• If spoken to, respond warmly and professionally\n• Keep music off unless passenger requests it\n• Maintain smooth, unhurried driving at all times\n• Offer water at the start: ''Would you like a bottle of water?''\n• Keep phone on silent — no personal calls\n• Do not discuss other passengers, personal matters, or politics\n\nDrop-off protocol:\n• Arrive smoothly — no abrupt stops\n• Exit BEFORE the passenger opens their own door\n• Open the rear door for the passenger\n• Assist with bags — bring to the passenger, not just to the curb\n• Thank them: ''Thank you for riding with VeronaRide. Have a wonderful day.''\n• Wait until the passenger has entered the building before driving away\n\nThings to NEVER do on Executive:\n• Honk or wait in the car at pickup\n• Play music without being asked\n• Ask personal questions\n• Take personal calls during the trip\n• Arrive in a dirty or cluttered vehicle\n• Drive fast or aggressively"}
]', '1.0', 9, 10, 8, FALSE, 'executive'),

-- ACCESSIBLE SERVICE
('VRN-TRN-027-ACC', 'Accessible Service — Driver Certification', '[
  {"title":"What Is Accessible Service?","body":"Accessible service is VeronaRide''s ADA-compliant ride type for passengers who use wheelchairs, power chairs, scooters, or mobility devices that cannot be folded into a standard vehicle. This is one of VeronaRide''s most critical services — many passengers rely on it exclusively.\n\nService specifications:\n• Vehicle: ADA-accessible van or SUV with ramp or powered lift\n• Required equipment: 4-point wheelchair tie-down system, lap belt, shoulder belt\n• Interior floor space: minimum 30 inches wide × 48 inches long\n• Pricing: Standard rate + $1.50 accessibility surcharge (100% to driver)\n• Service animals: always accepted — no exceptions\n\nPre-shift vehicle check (required before every Accessible shift):\n• Test ramp or lift — deploy and retract fully\n• Inspect all 4 tie-down straps — no fraying, cuts, or worn webbing\n• Test all tie-down ratchets — must engage and hold firmly\n• Inspect lap belt and shoulder belt — buckles must click and hold\n• Confirm floor space is clear — no objects in the securement area\n• Test kneeling function if equipped\n• Confirm grab handles are secure"},
  {"title":"Accessible Arrival & Wheelchair Securement Protocol","body":"Arrival protocol:\n• Park at the most accessible entry point available\n• Exit vehicle and greet the passenger by name\n• Ask: ''How would you like me to assist you today?''\n• Deploy the ramp or lift — test once before the passenger boards\n• Assist the passenger as directed — follow their instructions\n• Guide the wheelchair into the securement area facing forward\n\nWheelchair securement — follow in EXACT ORDER every time:\n1. Position wheelchair facing FORWARD in the securement area\n2. Attach front-left tie-down at 45-degree angle — ratchet tight\n3. Attach front-right tie-down at 45-degree angle — ratchet tight\n4. Attach rear-left tie-down at 45-degree angle — ratchet tight\n5. Attach rear-right tie-down at 45-degree angle — ratchet tight\n6. Fasten lap belt across passenger''s hips — below the abdomen\n7. Fasten shoulder belt across the chest\n8. Ask: ''Are you comfortable and secure? Are you ready to go?''\n9. Do NOT move the vehicle until passenger confirms they are ready\n\nSkipping any tie-down step is a safety violation and grounds for removal from Accessible authorization."},
  {"title":"During the Trip & Drop-Off for Accessible Service","body":"During the Accessible trip:\n• Notify passenger before any sharp turns, speed bumps, or railroad crossings\n• Drive with maximum smoothness — comfort matters even with securement\n• Check in mid-trip: ''Are you doing okay? Is everything comfortable?''\n• Do not make sudden lane changes without warning the passenger\n\nDrop-off protocol:\n• Arrive smoothly — park at the most accessible entry point\n• Release tie-downs in REVERSE order: shoulder belt → lap belt → rear ties → front ties\n• Deploy ramp or lift\n• Assist passenger off the ramp — follow their guidance\n• Walk alongside them to the entrance if they need support\n• Do not leave until the passenger is safely inside or with another person\n\nPower wheelchairs & scooters:\n• Power chairs are heavier — use extra care on the ramp\n• Confirm the ramp''s weight capacity matches the device before boarding\n• Never attempt to manually push a powered-on power wheelchair — ask the passenger to drive it onto the ramp\n• For very heavy chairs, ask the passenger how they prefer to be loaded"}
]', '1.0', 9, 10, 9, FALSE, 'accessible'),

-- SCHEDULED SERVICE
('VRN-TRN-027-SCH', 'Scheduled Service — Driver Certification', '[
  {"title":"What Is Scheduled Service?","body":"Scheduled service allows passengers to book rides up to 7 days in advance for a specific date and time. It is especially critical for elderly adults and medical patients who depend on reliable transportation for appointments that cannot be rescheduled.\n\nService specifications:\n• Advance booking window: up to 7 days\n• Notifications to driver: 24 hours before + 1 hour before + 15 minutes before pickup\n• Driver confirmation: required within 12 hours of assignment\n• Cancellation policy: free more than 24 hours before; fee applies within 24 hours\n• On-time standard: arrive within 5 minutes of scheduled time — no exceptions\n• Pricing: standard rate applies\n\nWhy Scheduled rides are different:\nOn-demand rides allow flexibility. Scheduled rides are different — the passenger has planned their entire day around your arrival. They may have:\n• A surgical procedure with a pre-set check-in time\n• A dialysis appointment that must start at an exact time\n• A flight with no flexibility\n• An elderly parent waiting alone\n\nBeing late on a Scheduled ride can cause a passenger to miss a medical procedure. Punctuality is non-negotiable."},
  {"title":"Driver Preparation & Arrival Protocol","body":"When assigned a Scheduled ride:\n• Confirm acceptance in the app within 12 hours\n• The night before: review pickup address, drive time, and passenger notes\n• Set an alarm to allow adequate preparation time\n• Plan your route — check for roadworks or traffic events\n• Ensure your vehicle is clean and fueled before the trip\n• Depart early enough to arrive 3–5 minutes before the scheduled time\n\nArrival protocol:\n• Arrive 3–5 minutes before the scheduled time\n• Tap ''Arrived'' in the app when you reach pickup — this notifies the passenger\n• Exit the vehicle and stand by — do not sit in the car\n• If no one appears within 3 minutes, call the passenger through the app\n• Wait the full 5-minute window before marking a no-show"},
  {"title":"Handling Delays & Recurring Rides","body":"If YOU are running late:\n• Contact the passenger immediately through the app\n• Give an honest updated ETA\n• Report the delay to VeronaRide Support via in-app chat\n• If more than 10 minutes late, Support will decide whether to reassign\n\nIf the PASSENGER is running late:\n• Wait the full 5-minute window — Scheduled passengers are often elderly\n• Call through the app to check on them\n• After 5 minutes, contact Support before marking no-show — they may extend for medical passengers\n\nRecurring Scheduled rides:\nSome passengers book the same ride weekly — dialysis patients, for example, go to the same clinic every Monday, Wednesday, and Friday.\n• Learn their preferences — temperature, music, route, communication style\n• Be consistent — they chose you for a reason\n• If you cannot make a recurring trip, notify Support as early as possible\n• Never cancel a recurring medical trip without adequate notice\n\nDriver cancellation policy:\n• Cancel through the app minimum 2 hours before pickup\n• Cancellations within 1 hour are flagged\n• Drivers with more than 5% Scheduled cancellation rate lose Scheduled eligibility"}
]', '1.0', 8, 10, 10, FALSE, 'scheduled');

-- ─────────────────────────────────────────────────────────────
-- PREGUNTAS — VRN-TRN-026: Special Passenger Categories
-- ─────────────────────────────────────────────────────────────
INSERT INTO training_questions (module_id, question_text, option_a, option_b, option_c, option_d, correct_option, order_index)
SELECT m.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.order_index
FROM training_modules m,
(VALUES
  (1, 'A pregnant passenger is boarding your vehicle. What is the correct action?',
      'Wait in the car and open the door remotely', 'Exit the vehicle and offer your arm for support', 'Honk so she knows you have arrived', 'Ask her to hurry since you have another trip waiting', 'B'),
  (2, 'Where should a pregnant passenger''s lap belt be positioned?',
      'Across the abdomen for maximum protection', 'Low across the hips and upper thighs — below the abdomen', 'Around the waist at the navel', 'Across the chest only', 'B'),
  (3, 'A pregnant passenger shows signs of active labor. What do you do?',
      'Drive her to the nearest hospital as fast as possible', 'Pull over, call 911, activate SOS, and stay with her until EMS arrives', 'Continue the trip — she is likely exaggerating', 'Call VeronaRide support and wait for instructions', 'B'),
  (4, 'When transporting an elderly passenger, you should:',
      'Honk when you arrive so they can come out', 'Exit the vehicle and greet them by name, walk at their pace', 'Keep the car running and wait for up to 10 minutes', 'Ask them to be quick since you are busy', 'B'),
  (5, 'An elderly passenger asks the same question three times during the trip. What do you do?',
      'Show mild frustration to signal them to stop', 'Ignore the question after the second time', 'Answer patiently each time without showing frustration', 'Call VeronaRide support to report the behavior', 'C'),
  (6, 'You are picking up a post-surgery passenger from a medical facility. What should you ask?',
      'How much their surgery cost', 'Is there anything I need to know to make this ride comfortable?', 'Why they are being discharged so soon', 'If they have someone at home to take care of them', 'B'),
  (7, 'A post-surgery passenger falls asleep during the trip. What do you do?',
      'Wake them to make sure they are okay', 'Pull over and call 911 immediately', 'Continue driving smoothly — this is normal after anesthesia', 'End the trip early since they are asleep', 'C'),
  (8, 'You are transporting a child with autism. The child begins rocking and vocalizing. What does this mean?',
      'The child is in a medical emergency — call 911', 'The child is having a behavioral crisis — pull over', 'This is normal self-regulation (stimming) — stay calm', 'The child is unhappy with the driver — notify support', 'C'),
  (9, 'An elderly passenger shows sudden facial drooping and slurred speech during the trip. You should:',
      'Ask them if they are okay and continue to their destination', 'Drive them to the nearest hospital immediately', 'Pull over immediately and call 911 — these are signs of stroke', 'Call VeronaRide support first and follow their instructions', 'C'),
  (10, 'A child under 8 years old has no car seat or booster seat. What do you do?',
       'Proceed with the trip — the child can sit in the back seat with a seatbelt', 'Contact VeronaRide Support before proceeding', 'Cancel the trip without explanation', 'Ask the caregiver to hold the child for the trip', 'B')
) AS q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
WHERE m.code = 'VRN-TRN-026';

-- ─────────────────────────────────────────────────────────────
-- PREGUNTAS — VRN-TRN-027-STD: Standard Service
-- ─────────────────────────────────────────────────────────────
INSERT INTO training_questions (module_id, question_text, option_a, option_b, option_c, option_d, correct_option, order_index)
SELECT m.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.order_index
FROM training_modules m,
(VALUES
  (1, 'What is the minimum vehicle year required for Standard service?',
      '2010', '2015', '2018', '2020', 'B'),
  (2, 'How many passengers can a Standard service vehicle carry?',
      'Up to 2', 'Up to 3', 'Up to 4', 'Up to 6', 'C'),
  (3, 'Before starting a Standard trip, you must always:',
      'Check your earnings balance', 'Confirm the passenger''s first name', 'Call the passenger on your personal phone', 'Ask the passenger to rate you 5 stars', 'B'),
  (4, 'A Standard service passenger needs help with grocery bags. You should:',
      'Tell them bags are not your responsibility', 'Offer to help and place them gently in the trunk', 'Put the bags in the front seat without asking', 'Wait for them to manage on their own', 'B'),
  (5, 'When transporting a Standard passenger to a medical appointment, you should:',
      'Drive quickly to help them be on time', 'Drive smoothly and confirm they are safely inside before leaving', 'Drop them at the curb and leave immediately', 'Ask about their medical condition', 'B'),
  (6, 'Which item is required to be present in every Standard service vehicle?',
      'A dash camera', 'A first aid kit', 'A charging cable for passengers', 'Water bottles', 'B'),
  (7, 'A Standard ride request appears. How long do you have to accept it?',
      '15 seconds', '60 seconds', '30 seconds', '2 minutes', 'C'),
  (8, 'What is NOT allowed while a passenger is in your vehicle?',
      'Having the air conditioning on', 'Eating while driving', 'Playing quiet music if asked', 'Offering to carry bags', 'B'),
  (9, 'At drop-off for a Standard service trip, you should:',
      'Tap Complete Trip and drive away immediately', 'Assist the passenger and confirm they are safely at their destination before leaving', 'Ask for a cash tip before completing the trip', 'Call support to confirm the fare', 'B'),
  (10, 'Which fragrance policy applies to Standard service drivers?',
       'Strong cologne is encouraged for a professional image', 'No strong cologne or perfume — many elderly passengers are sensitive to scents', 'Any fragrance is acceptable as long as the car is clean', 'Fragrance is required to mask vehicle odors', 'B')
) AS q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
WHERE m.code = 'VRN-TRN-027-STD';

-- ─────────────────────────────────────────────────────────────
-- PREGUNTAS — VRN-TRN-027-EXE: Executive Service
-- ─────────────────────────────────────────────────────────────
INSERT INTO training_questions (module_id, question_text, option_a, option_b, option_c, option_d, correct_option, order_index)
SELECT m.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.order_index
FROM training_modules m,
(VALUES
  (1, 'What is the minimum vehicle year required for Executive service?',
      '2015', '2016', '2018', '2020', 'C'),
  (2, 'Executive service pricing is approximately:',
      '1.2x the standard fare', '1.5x the standard fare', '1.8x the standard fare', '2.5x the standard fare', 'C'),
  (3, 'How should an Executive driver greet a passenger at pickup?',
      'Honk and wait for them to come to the vehicle', 'Stand by the rear door and greet formally by name', 'Text them through the app that you have arrived', 'Call them from inside the car', 'B'),
  (4, 'During an Executive trip, when should you initiate conversation?',
      'Immediately — Executive passengers expect engagement', 'Only if the passenger speaks to you first', 'After offering water', 'Never — maintain complete silence', 'B'),
  (5, 'What must an Executive driver offer at the start of every trip?',
      'A newspaper', 'A bottle of still water', 'Sparkling water or juice', 'A phone charger', 'B'),
  (6, 'What type of shoes are required for Executive service?',
      'Any clean shoes', 'Clean, polished shoes — no sneakers', 'Athletic shoes are acceptable if clean', 'Open-toed shoes in summer', 'B'),
  (7, 'An Executive passenger has not spoken during the trip. What do you do?',
      'Ask questions to start a conversation', 'Play soft music to fill the silence', 'Respect their preference for quiet — do not initiate', 'Ask if they are satisfied with the service', 'C'),
  (8, 'How often must an Executive vehicle be professionally detailed?',
      'Monthly', 'Daily', 'Minimum weekly', 'Only when visibly dirty', 'C'),
  (9, 'At Executive drop-off, when should you open the passenger''s door?',
      'After tapping Complete Trip in the app', 'Before the passenger opens it themselves — exit the vehicle first', 'Only if the passenger asks', 'After retrieving their bags from the trunk', 'B'),
  (10, 'Which action is grounds for immediate removal from Executive authorization?',
       'Playing music at passenger''s request', 'Arriving in a dirty or cluttered vehicle', 'Offering water at the start of the trip', 'Arriving 5 minutes early', 'B')
) AS q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
WHERE m.code = 'VRN-TRN-027-EXE';

-- ─────────────────────────────────────────────────────────────
-- PREGUNTAS — VRN-TRN-027-ACC: Accessible Service
-- ─────────────────────────────────────────────────────────────
INSERT INTO training_questions (module_id, question_text, option_a, option_b, option_c, option_d, correct_option, order_index)
SELECT m.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.order_index
FROM training_modules m,
(VALUES
  (1, 'Before going online for Accessible service, you must:',
      'Simply confirm your location in the app', 'Complete the full pre-shift accessible vehicle checklist', 'Call VeronaRide support for authorization', 'Wait for a test ride request from the system', 'B'),
  (2, 'The 4-point wheelchair tie-down system requires tie-downs at:',
      'Front-left and front-right only', 'Rear-left and rear-right only', 'Front-left, front-right, rear-left, and rear-right', 'Any two points chosen by the driver', 'C'),
  (3, 'At what angle should each tie-down strap be attached?',
      '90 degrees (straight down)', '45 degrees', '30 degrees', '60 degrees', 'B'),
  (4, 'In what direction must the wheelchair face during the trip?',
      'Backward — facing the rear of the vehicle', 'Sideways — facing the window', 'Forward — facing the front of the vehicle', 'Any direction the passenger prefers', 'C'),
  (5, 'What is the correct order to release the securement system at drop-off?',
      'Front ties first, then rear ties, then belts', 'Shoulder belt, lap belt, rear ties, front ties', 'Lap belt, shoulder belt, front ties, rear ties', 'Any order is acceptable', 'B'),
  (6, 'Before touching a passenger''s wheelchair, you must:',
      'Put on gloves for hygiene', 'Ask the passenger first', 'Check the app for securement notes', 'Confirm with VeronaRide support', 'B'),
  (7, 'A passenger uses a power wheelchair. What is the correct boarding procedure?',
      'Manually push the wheelchair onto the ramp', 'Ask the passenger to drive the powered wheelchair onto the ramp', 'Carry the passenger and load the chair separately', 'Ask the passenger to transfer to a standard seat', 'B'),
  (8, 'The accessibility surcharge of $1.50 for Accessible rides goes to:',
      'VeronaRide as a platform fee', '100% to the driver', 'Split 50/50 between driver and VeronaRide', 'A disability services fund', 'B'),
  (9, 'During an Accessible trip, you must notify the passenger before:',
      'Every turn on the GPS route', 'Any sharp turns, speed bumps, or railroad crossings', 'Changing the radio station', 'Checking in mid-trip', 'B'),
  (10, 'Skipping a tie-down step during wheelchair securement is:',
       'Acceptable if the passenger says they feel secure', 'A minor infraction with a warning', 'A safety violation and grounds for removal from Accessible authorization', 'Only required on trips over 10 miles', 'C')
) AS q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
WHERE m.code = 'VRN-TRN-027-ACC';

-- ─────────────────────────────────────────────────────────────
-- PREGUNTAS — VRN-TRN-027-SCH: Scheduled Service
-- ─────────────────────────────────────────────────────────────
INSERT INTO training_questions (module_id, question_text, option_a, option_b, option_c, option_d, correct_option, order_index)
SELECT m.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.order_index
FROM training_modules m,
(VALUES
  (1, 'How far in advance can a passenger book a Scheduled ride?',
      '24 hours', '3 days', '7 days', '30 days', 'C'),
  (2, 'A Scheduled ride is assigned to you. Within how many hours must you confirm acceptance?',
      '1 hour', '6 hours', '12 hours', '24 hours', 'C'),
  (3, 'What is the on-time arrival standard for Scheduled service?',
      'Within 10 minutes of scheduled time', 'Within 5 minutes of scheduled time — no exceptions', 'Whenever traffic allows', 'Within 15 minutes — passengers understand delays', 'B'),
  (4, 'You are running 12 minutes late for a Scheduled ride. What should you do?',
      'Drive faster to make up the time', 'Contact the passenger and Support immediately — Support may reassign the trip', 'Say nothing and arrive as quickly as possible', 'Cancel the trip through the app', 'B'),
  (5, 'How early should you arrive at a Scheduled pickup?',
      'Exactly on time', '3–5 minutes before the scheduled time', '10 minutes early always', 'It does not matter as long as you are within the window', 'B'),
  (6, 'A Scheduled passenger is 4 minutes late coming out. What do you do?',
      'Mark them as a no-show immediately', 'Drive away — your time is valuable', 'Wait the full 5-minute window — then call through the app', 'Cancel the trip and report them to support', 'C'),
  (7, 'A dialysis patient books the same Scheduled trip every Monday, Wednesday, and Friday. What should you do?',
      'Treat each trip as a new booking with no memory of past trips', 'Learn their preferences and be consistent — they depend on you', 'Ask them to use on-demand service instead', 'Charge them a higher rate for recurring trips', 'B'),
  (8, 'Cancellations within how many hours of a Scheduled pickup incur a fee?',
      '48 hours', '12 hours', '24 hours', '6 hours', 'C'),
  (9, 'A driver who cancels more than 5% of their Scheduled rides will:',
      'Receive a warning and a fine', 'Lose Scheduled ride eligibility', 'Be permanently deactivated', 'Be required to pay passengers a penalty', 'B'),
  (10, 'Why are Scheduled rides more critical than on-demand rides for most passengers?',
       'They pay a premium rate', 'The passenger has planned their entire day — including medical procedures — around your arrival', 'They are longer trips with more earnings', 'VeronaRide monitors Scheduled rides more closely', 'B')
) AS q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
WHERE m.code = 'VRN-TRN-027-SCH';
