-- Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
-- ═══════════════════════════════════════════════════════════════
-- SEED 002: Módulos de entrenamiento y preguntas del quiz
-- 5 módulos × 10 preguntas = 50 preguntas en total
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- MÓDULOS
-- ─────────────────────────────────────────────────────────────
INSERT INTO training_modules (code, title, content, version, passing_score, total_questions, order_index) VALUES

('VRN-TRN-021', 'Module 1: Platform & Driver App Navigation', '[
  {"title":"Getting Started","body":"Download the VeronaRide Driver App from the App Store (iOS) or Google Play (Android). Search ''VeronaRide Driver'' — make sure you download the Driver app, not the Passenger app.\n\nTo sign in: open the app → tap Sign In → enter your registered email and password → complete two-factor authentication (SMS code). If you forget your password, tap ''Forgot Password'' — a reset link arrives within 2 minutes."},
  {"title":"Driver Dashboard Overview","body":"Main screen elements:\n• Go Online / Go Offline button — toggle your availability\n• Map view — shows your location and nearby activity\n• Earnings summary — today''s earnings at top of screen\n• Ride request popup — appears when a passenger matches (30 seconds to accept)\n• Navigation bar (bottom) — Home, Trips, Earnings, Account, Help\n• Status indicator — Green = online. Gray = offline.\n\nTo go online: ensure your vehicle is clean → open the app → tap the large Go Online button → status indicator turns green."},
  {"title":"Receiving & Accepting Ride Requests","body":"When a passenger requests a ride near you, a popup appears. You have 30 seconds to accept or decline. The request shows: passenger name and rating, pickup location and distance, trip duration and distance, ride type, and estimated earnings.\n\nAccepting a ride:\n1. Tap Accept within 30 seconds\n2. Follow GPS to the pickup point\n3. Tap ''I Have Arrived'' when you reach pickup\n4. Wait up to 5 minutes for the passenger\n5. Tap ''Start Trip'' once the passenger is seated\n6. Follow GPS to destination\n7. Tap ''Complete Trip'' on arrival\n\nIMPORTANT: Always confirm the passenger''s first name before starting the trip."},
  {"title":"During the Trip","body":"Navigation: the app uses Google Maps for turn-by-turn directions. Do not deviate from the suggested route without passenger agreement. If a detour is needed due to traffic, inform the passenger first. Never use a handheld phone — use a dash mount at all times.\n\nIn-app communication: tap the phone icon to call through the app (number is masked). Tap the message icon to send pre-set texts. Never share your personal phone number with passengers."},
  {"title":"Earnings & Payments","body":"To view earnings: tap Earnings in the bottom navigation bar. View daily, weekly, and monthly summaries. Tap any trip to see the full fare breakdown.\n\nSetting up payouts: tap Account → Payment Settings → Set Up Bank Account (Stripe Connect). Enter bank account and routing number. Stripe verifies within 1–2 business days. Payouts are sent every Monday for the prior week.\n\nInstant Cashout: tap Earnings → Cash Out Now. Minimum $5.00. Funds arrive within 30 minutes. A small Stripe processing fee applies."},
  {"title":"Emergency & Safety Features","body":"SOS Button: located in the top-right corner of your screen during any active trip. Tapping it immediately calls 911, alerts VeronaRide Support with your GPS location, and shares your live location with emergency services. Only use the SOS button for genuine emergencies — false activations violate the Driver Agreement.\n\nIn-app support chat: tap Help in the bottom navigation bar. Chat support is available 24/7. For non-urgent issues use chat — for emergencies use SOS or call 911."}
]', '1.0', 8, 10, 1),

('VRN-TRN-022', 'Module 2: Customer Service Excellence', '[
  {"title":"Understanding Your Passengers","body":"VeronaRide passengers are not typical rideshare users. They are:\n• Adults aged 65+ who may no longer drive\n• Individuals using wheelchairs, walkers, canes, or other mobility aids\n• Patients traveling to and from medical appointments\n• Post-surgery or post-hospitalization patients\n• Individuals with visual or hearing impairments\n• Passengers with cognitive conditions such as mild dementia\n\nThese passengers often depend on VeronaRide as their primary transportation. For many, your arrival is the most important part of their day. Your patience and care make a real difference."},
  {"title":"The VeronaRide Service Standard — 5 Commitments","body":"1. PUNCTUAL — Arrive on time. If delayed, notify through the app immediately.\n2. PROFESSIONAL — Clean vehicle, clean appearance, respectful tone at all times.\n3. PATIENT — Never rush your passenger. Allow as much time as they need.\n4. PROACTIVE — Offer help before being asked. Open doors, offer your arm, assist with bags.\n5. PRESENT — Give your full attention to the passenger''s safety and comfort throughout the trip."},
  {"title":"Arrival & Boarding","body":"When you arrive:\n• Park as close to the pickup entrance as safely possible\n• Get out of the vehicle — do NOT honk or wait in the car\n• Greet the passenger by name: ''Hello, are you [Name]? I''m [Your Name] with VeronaRide.''\n• Offer to assist with bags, walker, or mobility device\n• Open the passenger door\n• Offer your arm if they appear to need it — but ASK first: ''May I help you to the car?''\n• Wait patiently until they are fully seated and comfortable before closing the door\n\nAssisting with mobility devices: always ask before touching a wheelchair, walker, or cane. NEVER attempt to physically lift a passenger — assist with balance and support only."},
  {"title":"During the Trip","body":"Conversation: greet warmly and ask if the temperature is comfortable. Let the passenger lead — some prefer quiet, others enjoy conversation. Never discuss religion, politics, or controversial topics. If they share health concerns, listen with empathy — do not give medical advice.\n\nDriving for comfort: accelerate and brake gradually — sudden movements cause pain and anxiety. Avoid potholes and rough roads when possible. Keep music off or very low unless requested. Never use your phone while driving."},
  {"title":"Difficult Situations","body":"Passenger confused about destination: calmly confirm — ''I want to make sure I get you to the right place. The address in the app shows [address]. Is that correct?'' If unsure, call support before departing.\n\nPassenger becomes upset: acknowledge calmly — ''I can see you''re having a difficult moment. Take your time — I''m here to get you there safely.'' Drive smoothly and quietly.\n\nPassenger moves slowly and next trip is waiting: the passenger in front of you is your ONLY priority. Never rush them.\n\nPassenger is rude or aggressive: stay calm, do not escalate. If severe, pull over safely and address it calmly. Use SOS if there are threats. Report immediately after the trip."},
  {"title":"Ratings & Feedback","body":"Your passenger rating is the most important metric on the platform. Drivers below 4.5 stars receive warnings. Sustained ratings below 4.5 can result in deactivation.\n\nThe 5-Star Checklist:\n✓ Arrive on time or early\n✓ Exit the vehicle and greet the passenger by name\n✓ Offer assistance before being asked\n✓ Drive smoothly — no sudden stops\n✓ Keep vehicle clean and at comfortable temperature\n✓ Be warm, patient, and professional throughout"}
]', '1.0', 8, 10, 2),

('VRN-TRN-023', 'Module 3: Safety Protocols & Emergency Procedures', '[
  {"title":"Pre-Trip Safety Checklist","body":"Before going online each day, complete this check:\n• All exterior lights — must be fully functional\n• Tires — properly inflated, no damage\n• Seat belts — all retractable and locking\n• Dashboard warning lights — none active\n• Interior cleanliness — clean and odor-free\n• Phone charge — above 50% (charge below 20% before driving)\n• Phone mount — secure dash or windshield mount\n• Personal condition — rested, alert, sober\n\nZERO TOLERANCE: VeronaRide has a zero tolerance policy for driving under the influence of alcohol, drugs, or any impairing medication. Violation results in immediate permanent deactivation."},
  {"title":"Safe Driving Standards","body":"On the road:\n• Always obey posted speed limits — no exceptions\n• Come to a complete stop at all stop signs and red lights\n• Never use a handheld phone while driving\n• Maintain safe following distance — double the standard for elderly passengers\n• Use turn signals for every lane change and turn\n• Never drive aggressively — no tailgating, no cutting off\n\nFor passenger safety:\n• Accelerate and brake gradually — always\n• Avoid railroad crossings when possible\n• Do not make sharp turns — wide, smooth turns only\n• Wait until passenger is fully seated and seatbelt fastened before moving\n• NEVER move the vehicle if a passenger is standing or not yet secured"},
  {"title":"Traffic Accident Response","body":"Immediate steps:\n1. STOP immediately — do not drive away\n2. Turn on hazard lights\n3. Check yourself and your passenger for injuries\n4. Call 911 if anyone is injured — state your location clearly\n5. If no injuries and drivable, move to the side of the road\n6. Do NOT admit fault or discuss liability\n7. Exchange information: name, license, plate, insurance company\n8. Photograph vehicle damage, scene, and road conditions\n9. Report through the VeronaRide Driver App immediately\n10. File a police report if there is any injury or dispute\n\nTexas law requires you to remain at the scene. Leaving the scene of an accident with injuries is a criminal offense.\n\nAfter an accident: stay calm. Ask the passenger ''Are you okay? Are you in any pain?'' Do NOT move the passenger if they report neck or back pain — wait for EMS."},
  {"title":"Passenger Medical Emergency","body":"Signs of a medical emergency:\n• Unresponsiveness or sudden loss of consciousness\n• Chest pain or difficulty breathing\n• Sudden severe headache or confusion\n• Seizure or uncontrolled shaking\n• Signs of stroke: facial drooping, arm weakness, speech difficulty\n• Severe allergic reaction: swelling, difficulty breathing\n\nResponse steps:\n1. Pull over safely and immediately — turn on hazard lights\n2. Call 911 — describe symptoms clearly\n3. Give dispatcher your exact GPS location from the app\n4. Use in-app SOS button to alert VeronaRide Support\n5. Stay on the line with 911 and follow instructions\n6. Do NOT leave the passenger alone\n7. If instructed by dispatcher — begin CPR\n8. Unlock vehicle doors so EMS can access\n\nDO NOT drive the passenger to the hospital yourself — call 911 and wait for EMS."},
  {"title":"Safety Threats & Severe Weather","body":"If you feel unsafe: stay calm, do not escalate. Drive to a public location, fire station, or police station. Use in-app SOS if in immediate danger. At a safe stop, ask the passenger to exit calmly.\n\nZero tolerance situations (pull over, ask passenger to exit, use SOS, report immediately):\n• Passenger is intoxicated and behaving aggressively\n• Passenger makes sexual comments or attempts physical contact\n• Passenger threatens you with any weapon\n• Passenger asks you to deviate to an unverified location\n\nSevere weather:\n• Never drive through flooded roads — ''Turn around, don''t drown'' is Texas law\n• If tornado warning: drive away from the storm path or take shelter in a sturdy building — NOT under a bridge\n• Follow all platform pause alerts in the app"}
]', '1.0', 9, 10, 3),

('VRN-TRN-024', 'Module 4: ADA Compliance & Sensitivity Training', '[
  {"title":"The ADA and Your Responsibilities","body":"The Americans with Disabilities Act (ADA, 1990) is a federal civil rights law that prohibits discrimination against individuals with disabilities in all areas of public life — including transportation.\n\nAs a VeronaRide driver, you CANNOT:\n• Refuse service to a passenger because of a disability\n• Refuse service to a passenger with a service animal\n• Charge extra for accessibility needs\n• Treat a passenger with a disability with less dignity than any other passenger\n\nAny driver found to have refused service based on disability will be immediately and permanently deactivated. VeronaRide will cooperate with any ADA complaint investigation."},
  {"title":"Person-First Language","body":"Person-first language puts the person before their disability. It recognizes that a disability is one part of a person — not their identity.\n\nSay this → Not this:\n• ''Person with a disability'' → ''Disabled person'' / ''the disabled''\n• ''Person who uses a wheelchair'' → ''Wheelchair-bound'' / ''confined to a wheelchair''\n• ''Person with a visual impairment'' → ''Blind person'' / ''the blind''\n• ''Person with a hearing impairment'' → ''Deaf-mute'' / ''the deaf''\n• ''Person with a cognitive disability'' → ''Mentally retarded'' / ''slow''\n• ''Person with dementia'' → ''Demented'' / ''senile''\n\nWhen in doubt: treat every passenger the way you would want a family member to be treated."},
  {"title":"Service Animals","body":"Under the ADA, a service animal is a dog (or miniature horse) individually trained to perform a specific task for a person with a disability.\n\nYou MAY only ask TWO questions:\n1. Is this a service animal required because of a disability?\n2. What work or task has the dog been trained to perform?\n\nYou MAY NOT:\n• Ask about the nature or severity of the passenger''s disability\n• Ask for documentation, ID cards, or proof of training\n• Refuse service because of your own allergies to animals\n• Refuse service because another passenger is allergic\n• Require the service animal to ride in the trunk or cargo area\n\nEmotional support animals and therapy animals are NOT covered by ADA rules, but VeronaRide''s policy is to accommodate all animals that travel peacefully. When in doubt, accept and report concerns to Support after."},
  {"title":"Wheelchair & Mobility Device Passengers","body":"General guidelines:\n• Always ask before touching the wheelchair or any mobility device\n• Ask the passenger how they prefer to be assisted — never assume\n• Never push a manual wheelchair without permission\n• Fold walkers and canes and place in trunk or back seat as passenger prefers\n\nWheelchair securement (accessible vehicles — 4-point system required by law):\n1. Position wheelchair facing forward in the securement area\n2. Apply front tie-downs — left and right — at 45-degree angle\n3. Apply rear tie-downs — left and right — at 45-degree angle\n4. Check all four tie-downs are tight — no slack\n5. Fasten the lap belt across passenger''s lap\n6. Fasten the shoulder belt across passenger''s chest\n7. Ask: ''Are you comfortable and secure?''\n8. Do not begin driving until passenger confirms they are ready"},
  {"title":"Communicating with Passengers with Disabilities","body":"Passengers with hearing impairments:\n• Face the passenger when speaking — many lip-read\n• Speak clearly at normal volume — do not shout\n• Use in-app messaging for written communication if helpful\n• Confirm the destination in writing if there is any uncertainty\n\nPassengers with visual impairments:\n• Identify yourself by name as you approach: ''Hi, I''m [Name] from VeronaRide''\n• Offer your arm — do not grab the passenger\n• Describe the path to the vehicle: ''The car door is about three steps to your right''\n• Let them know when you arrive at the destination\n\nPassengers with cognitive or memory challenges:\n• Speak slowly and clearly — use short sentences\n• Confirm the destination before and during the trip if uncertain\n• Be patient with repetitive questions — never show frustration\n• If a passenger seems confused and unsafe, contact VeronaRide Support before ending the trip"}
]', '1.0', 9, 10, 4),

('VRN-TRN-025', 'Module 5: Texas Traffic Laws & TNC Regulations', '[
  {"title":"Texas Traffic Laws — Key Rules","body":"Hands-Free Driving (Texas Transportation Code §545.4251): prohibits using a handheld electronic device while driving — even at a red light. You MUST use a hands-free device at all times. VeronaRide''s policy goes beyond state law: your phone must be mounted at all times. Handheld phone use is grounds for deactivation regardless of whether law enforcement is present.\n\nSpeed limits:\n• School zone (active hours): 20 mph\n• Residential streets: 30 mph (unless posted)\n• Urban highways: 60–65 mph (as posted)\n• Rural highways: 70–75 mph (as posted)\n\nSeatbelt Law: all vehicle occupants must wear a seatbelt. You are responsible for ensuring all passengers are buckled before moving.\n\nMove Over Law: move over one lane (or slow to 20 mph below the limit) when passing emergency vehicles, tow trucks, or TxDOT vehicles with lights flashing. Violation: up to $200; up to $10,000 if a worker is struck.\n\nDWI: BAC of 0.08% or higher. VeronaRide''s zero tolerance means any detectable impairment results in immediate deactivation regardless of BAC.\n\nFlooded Roads: Texas law makes it illegal to drive past a barricade on a flooded road. If the road is flooded, turn around."},
  {"title":"Texas TNC Regulations","body":"A Transportation Network Company (TNC) is defined under Texas Transportation Code Chapter 2402 as a company that uses a digital platform to connect passengers with drivers using their personal vehicles. VeronaRide is a licensed TNC.\n\nDriver requirements under Texas law:\n• Valid driver''s license — verified at onboarding + annual MVR check\n• Background check — pre-activation + annual check\n• No DWI in past 7 years — MVR check screens this\n• No felony in past 7 years — criminal background check\n• No sex offender registry — national + Texas registry checked\n• Minimum age: 18 (state law) — VeronaRide sets higher standard of 21\n\nZero Tolerance Policy (Texas §2402.111): TNCs must immediately suspend any driver who receives a zero tolerance complaint, investigate within 24 hours, and reinstate only after a negative drug/alcohol test is confirmed."},
  {"title":"Insurance Requirements — The 3 Phases","body":"Phase 1 — App OFF: not working, personal use only. Coverage: your personal auto insurance only.\n\nPhase 2 — App ON, no ride matched: available, waiting for request. Coverage: VeronaRide contingent liability policy.\n\nPhase 3 — Ride accepted through completion: en route to pickup or carrying passenger. Coverage: VeronaRide $1 million CSL + uninsured motorist.\n\nIMPORTANT: You must have personal auto insurance AND rideshare (TNC) endorsement coverage. Standard personal auto policies do NOT cover you during Phase 2. Operating without proper coverage is illegal and grounds for deactivation."},
  {"title":"Your Rights as an Independent Contractor","body":"What independent contractor status means:\n• You are NOT an employee of VeronaRide\n• You set your own hours — no minimum hours required\n• You may work for multiple platforms simultaneously\n• You are responsible for your own taxes — VeronaRide issues 1099-NEC, not W-2\n• You are responsible for your own health insurance and business expenses\n\nYour rights:\n• Right to receive 87% of every fare as agreed in your Contractor Agreement\n• Right to a clear explanation of any deactivation decision\n• Right to dispute incorrect payments within 30 days\n• Right to access your earnings data and tax documents through the app\n• Right to terminate your contract at any time by contacting VeronaRide"},
  {"title":"Violations That Risk Deactivation","body":"Immediate permanent deactivation:\n• DUI / DWI\n• Refusing an ADA-eligible passenger\n• Sexual misconduct toward a passenger\n\nWarning → suspension → deactivation:\n• Handheld phone use while driving\n• Sustained rating below 4.5 stars\n\nImmediate suspension:\n• Operating without TNC insurance\n• Failed annual background check (suspension pending review)"}
]', '1.0', 8, 10, 5);

-- ─────────────────────────────────────────────────────────────
-- PREGUNTAS — MÓDULO 1: Platform & App Navigation
-- ─────────────────────────────────────────────────────────────
INSERT INTO training_questions (module_id, question_text, option_a, option_b, option_c, option_d, correct_option, order_index)
SELECT m.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.order_index
FROM training_modules m,
(VALUES
  (1, 'How long do you have to accept a ride request?',
      '15 seconds', '30 seconds', '60 seconds', '2 minutes', 'B'),
  (2, 'What does a green status indicator mean?',
      'Trip in progress', 'App needs update', 'You are online and available', 'Earnings are ready', 'C'),
  (3, 'Before starting a trip, you should always:',
      'Ask the passenger their destination', 'Confirm the passenger''s first name', 'Check your earnings balance', 'Call VeronaRide support', 'B'),
  (4, 'Where is the SOS button located during a trip?',
      'Bottom navigation bar', 'Earnings tab', 'Top-right corner of the screen', 'Account settings', 'C'),
  (5, 'How are weekly payouts delivered?',
      'Cash via mail', 'Direct deposit every Monday via Stripe', 'PayPal every Friday', 'Venmo on request', 'B'),
  (6, 'What should you NEVER share with passengers?',
      'Your vehicle model', 'Your first name', 'Your personal phone number', 'Your estimated arrival time', 'C'),
  (7, 'What is the minimum amount for an Instant Cashout?',
      '$1.00', '$10.00', '$5.00', '$20.00', 'C'),
  (8, 'If navigation suggests a detour due to traffic, you should:',
      'Ignore it and take your preferred route', 'Inform the passenger before changing routes', 'End the trip and ask for a new one', 'Call support first', 'B'),
  (9, 'How long must you wait for a passenger before marking a no-show?',
      '2 minutes', '10 minutes', '5 minutes', '15 minutes', 'C'),
  (10, 'Where do you go in the app to set up your bank account for payouts?',
       'Help → Payment', 'Account → Payment Settings', 'Earnings → Bank Setup', 'Home → Finance', 'B')
) AS q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
WHERE m.code = 'VRN-TRN-021';

-- ─────────────────────────────────────────────────────────────
-- PREGUNTAS — MÓDULO 2: Customer Service Excellence
-- ─────────────────────────────────────────────────────────────
INSERT INTO training_questions (module_id, question_text, option_a, option_b, option_c, option_d, correct_option, order_index)
SELECT m.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.order_index
FROM training_modules m,
(VALUES
  (1, 'A passenger is moving slowly to the car. You should:',
      'Honk to get their attention', 'Wait patiently and offer assistance', 'Mark them as a no-show', 'Call support to cancel', 'B'),
  (2, 'Before touching a passenger''s wheelchair, you should:',
      'Just go ahead — they expect it', 'Ask the passenger first', 'Call VeronaRide support', 'Wait for them to ask you', 'B'),
  (3, 'The correct way to greet a passenger at pickup is:',
      'Honk twice so they know you''re there', 'Text them through the app', 'Exit your vehicle and greet them by name', 'Call them from inside the car', 'C'),
  (4, 'A passenger is confused about their destination. You should:',
      'Just drive to the address in the app', 'Calmly confirm the destination before departing', 'Cancel the trip', 'Call their family', 'B'),
  (5, 'Which driving behavior is MOST important for elderly passengers?',
      'Driving quickly to save time', 'Playing relaxing music', 'Gradual acceleration and smooth braking', 'Keeping windows open', 'C'),
  (6, 'What topics should you AVOID discussing with passengers?',
      'Weather and local events', 'Their destination', 'Religion and politics', 'Their name and address', 'C'),
  (7, 'Your passenger rating drops below 4.5. What happens?',
      'Nothing — ratings don''t matter', 'You receive a warning and may face deactivation', 'You get a pay reduction', 'Your account is immediately deleted', 'B'),
  (8, 'A passenger becomes upset during the trip. You should:',
      'Ask them detailed questions about their problem', 'Acknowledge calmly and drive smoothly and quietly', 'End the trip early', 'Give them advice on their situation', 'B'),
  (9, 'What should you NEVER attempt with a passenger?',
      'Offering to carry their bag', 'Physically lifting or transferring them', 'Opening their door', 'Greeting them by name', 'B'),
  (10, 'What is the minimum acceptable driver rating on VeronaRide?',
       '4.0 stars', '3.5 stars', '4.8 stars', '4.5 stars', 'D')
) AS q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
WHERE m.code = 'VRN-TRN-022';

-- ─────────────────────────────────────────────────────────────
-- PREGUNTAS — MÓDULO 3: Safety Protocols & Emergency Procedures
-- ─────────────────────────────────────────────────────────────
INSERT INTO training_questions (module_id, question_text, option_a, option_b, option_c, option_d, correct_option, order_index)
SELECT m.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.order_index
FROM training_modules m,
(VALUES
  (1, 'After a traffic accident, you should NEVER:',
      'Call 911 if there are injuries', 'Take photographs of the damage', 'Admit fault to the other driver', 'Exchange insurance information', 'C'),
  (2, 'If a passenger shows signs of a stroke, you should:',
      'Drive them to the nearest hospital', 'Call 911 immediately and stay with them', 'Ask them if they have medication', 'Complete the trip first', 'B'),
  (3, 'VeronaRide''s policy on driving under the influence is:',
      'One warning before deactivation', 'Zero tolerance — immediate permanent deactivation', 'Only applies to alcohol, not medication', 'Reviewed case by case', 'B'),
  (4, 'You must wait until what before moving the vehicle?',
      'Passenger has told you the destination', 'Passenger is fully seated and seatbelt is fastened', 'You have confirmed payment', 'Navigation app is loaded', 'B'),
  (5, 'During a passenger medical emergency, you should NOT:',
      'Call 911', 'Use the in-app SOS button', 'Drive the passenger to the hospital yourself', 'Stay with the passenger until EMS arrives', 'C'),
  (6, 'In Texas, if you encounter a flooded road you should:',
      'Drive through slowly', 'Turn around — never drive through flood water', 'Stop and wait for the water to recede', 'Call 911 first', 'B'),
  (7, 'A passenger becomes aggressive. Your first action should be:',
      'Escalate verbally to establish authority', 'Call VeronaRide support immediately', 'Stay calm and avoid escalating the situation', 'Speed up to end the trip faster', 'C'),
  (8, 'What minimum phone charge is recommended before starting a shift?',
      '20%', '80%', '50%', '100%', 'C'),
  (9, 'If a passenger reports neck pain after an accident, you should:',
      'Help them out of the vehicle immediately', 'Do not move them — wait for EMS', 'Drive them to the hospital', 'Ask them to walk it off', 'B'),
  (10, 'Where should you go if you feel threatened by a passenger?',
       'A deserted road where you can talk privately', 'A public location, fire station, or police station', 'Back to the pickup address', 'Call VeronaRide support and wait', 'B')
) AS q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
WHERE m.code = 'VRN-TRN-023';

-- ─────────────────────────────────────────────────────────────
-- PREGUNTAS — MÓDULO 4: ADA Compliance & Sensitivity Training
-- ─────────────────────────────────────────────────────────────
INSERT INTO training_questions (module_id, question_text, option_a, option_b, option_c, option_d, correct_option, order_index)
SELECT m.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.order_index
FROM training_modules m,
(VALUES
  (1, 'Under the ADA, you are REQUIRED to transport:',
      'Only passengers who can walk to the vehicle', 'Passengers with service animals', 'Only passengers under age 80', 'Only passengers with a VeronaRide Accessible profile', 'B'),
  (2, 'Which of the following is person-first language?',
      'The disabled passenger', 'The wheelchair-bound person', 'A person who uses a wheelchair', 'The handicapped rider', 'C'),
  (3, 'You may ask a passenger with a service animal:',
      'What their disability is', 'For documentation proving the animal is trained', 'What task the animal has been trained to perform', 'Why they need the animal', 'C'),
  (4, 'A passenger with allergies to dogs requests you remove the service animal. You should:',
      'Remove the animal as requested', 'Refuse the service animal trip', 'Complete the trip — service animal takes priority', 'Call support to cancel', 'C'),
  (5, 'How many tie-down points are required for wheelchair securement?',
      '2', '3', '4', '6', 'C'),
  (6, 'Before touching a passenger''s wheelchair, you should:',
      'Just go ahead — they expect it', 'Ask the passenger first', 'Check the app for securement notes', 'Put on gloves first', 'B'),
  (7, 'A passenger with dementia asks the same question repeatedly. You should:',
      'Show mild frustration so they stop', 'Answer patiently each time', 'Ignore the question after the third time', 'Call support to report them', 'B'),
  (8, 'When approaching a passenger with a visual impairment, you should:',
      'Touch their shoulder to get their attention', 'Honk so they know where the car is', 'Identify yourself by name and describe the path to the car', 'Wait for them to find the vehicle', 'C'),
  (9, 'Refusing service to a passenger because of their disability will result in:',
      'A written warning', 'A 7-day suspension', 'Immediate permanent deactivation', 'A fine from VeronaRide', 'C'),
  (10, 'You should NOT begin driving after securing a wheelchair passenger until:',
       'The securement system is visually checked', 'The passenger confirms they are comfortable and ready', 'You receive a trip start confirmation from the app', 'Both A and B', 'D')
) AS q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
WHERE m.code = 'VRN-TRN-024';

-- ─────────────────────────────────────────────────────────────
-- PREGUNTAS — MÓDULO 5: Texas Traffic Laws & TNC Regulations
-- ─────────────────────────────────────────────────────────────
INSERT INTO training_questions (module_id, question_text, option_a, option_b, option_c, option_d, correct_option, order_index)
SELECT m.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.order_index
FROM training_modules m,
(VALUES
  (1, 'Texas law prohibits using a handheld device while driving. The fine for a first offense is:',
      '$200', '$500', 'Up to $99', '$50', 'C'),
  (2, 'VeronaRide''s minimum driver age is:',
      '18 (matching Texas state law)', '21 — VeronaRide sets a higher standard', '25', '19', 'B'),
  (3, 'When does VeronaRide''s $1 million liability insurance become active?',
      'When you turn the app on', 'When a ride is accepted through completion', 'At all times while the app is installed', 'Only when carrying a passenger with a disability', 'B'),
  (4, 'As an independent contractor, VeronaRide will issue you a:',
      'W-2 form', 'W-4 form', '1099-NEC form', '1040 form', 'C'),
  (5, 'Texas''s Move Over Law requires you to:',
      'Yield to all pedestrians', 'Move over one lane or slow to 20 mph below limit near stopped emergency vehicles', 'Stop completely when you see flashing lights', 'Flash your headlights when passing emergency vehicles', 'B'),
  (6, 'What is the legal BAC limit for DWI in Texas?',
      '0.10%', '0.05%', '0.08%', '0.04%', 'C'),
  (7, 'During Phase 2 (app on, no ride matched), what insurance applies?',
      'Your personal auto insurance only', 'VeronaRide''s $1M CSL policy', 'VeronaRide''s contingent liability policy', 'No insurance is required', 'C'),
  (8, 'A driver who receives a zero tolerance (DUI) complaint must:',
      'Be immediately suspended and pass a drug/alcohol test before reinstatement', 'Receive one warning first', 'Complete additional training', 'Pay a fine to the platform', 'A'),
  (9, 'You are an independent contractor. This means:',
      'VeronaRide controls your schedule', 'You are entitled to employee benefits', 'You set your own hours and may work for other platforms', 'VeronaRide pays your self-employment taxes', 'C'),
  (10, 'If a road ahead is flooded, Texas law and VeronaRide policy require you to:',
       'Drive through slowly if the water appears shallow', 'Turn around — never drive through flood water', 'Wait 30 minutes for water to recede', 'Call VeronaRide for instructions', 'B')
) AS q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
WHERE m.code = 'VRN-TRN-025';
