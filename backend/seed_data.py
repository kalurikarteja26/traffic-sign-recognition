import json
from pathlib import Path
from sqlalchemy.orm import Session

from backend.database import SessionLocal, Base, engine
from backend.models import (
    User, Vehicle, Challan, DashcamVideo, SafetyEvent,
    TrafficRule, QuizQuestion, Notification
)
from backend.auth import hash_password
from src.driver_alert import GTSRB_SAFETY_METADATA
from backend.rto_statutory_penalties import RTO_STATUTORY_FINES

def seed_database():
    """Initializes tables and seeds 108 RTO signs, quiz questions, mistake awareness, and demo accounts."""
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # 1. Seed Traffic Rules (108 Official Indian RTO Signs)
        existing_rules_count = db.query(TrafficRule).count()
        if existing_rules_count == 0:
            print("[SEED] Seeding 108 Official Indian RTO Traffic Signs...")
            test_dir = Path("dataset/Test")

            for cid, meta in GTSRB_SAFETY_METADATA.items():
                name = meta.get("name", f"Sign #{cid}")
                tier = meta.get("tier", "INFORMATIONAL")
                action = meta.get("advice", "Observe road sign and proceed with caution.")

                if cid in RTO_STATUTORY_FINES:
                    finfo = RTO_STATUTORY_FINES[cid]
                    category = "Mandatory" if cid <= 44 else ("Cautionary" if cid <= 86 else "Informational")
                    legal_ref = finfo.get("legal_reference", "Motor Vehicles Act, 1988")
                    penalty = finfo.get("penalty_info", "Statutory regulation compliance required")
                    action = finfo.get("required_action", action)
                    mistake = finfo.get("mistake_avoidance", f"Failing to observe '{name}'. Anticipate the sign and decelerate early.")
                elif cid <= 44:
                    category = "Mandatory"
                    legal_ref = "Motor Vehicles Act, 1988 — Section 119 (Mandatory Traffic Signs)"
                    penalty = "Fine up to ₹1,000 for 1st offense (Section 177 / 179)"
                    mistake = f"Ignoring or failing to yield to '{name}' can lead to severe intersection collisions. Anticipate the sign and decelerate early."
                elif cid <= 86:
                    category = "Cautionary"
                    legal_ref = "Motor Vehicles Act, 1988 — Schedule I (Cautionary Traffic Signs)"
                    penalty = "Advisory violation; failure to take care may constitute dangerous driving (Section 184)"
                    mistake = f"Approaching '{name}' at high speed without scanning road curvature or pedestrian zones."
                else:
                    category = "Informational"
                    legal_ref = "Motor Vehicles Act, 1988 — Schedule I (Informatory Signs)"
                    penalty = "None (Facilitatory / Wayfinding)"
                    mistake = f"Abruptly braking or lane-cutting when spotting '{name}' facilities."

                img_path = test_dir / str(cid) / "canonical.png"
                img_str = str(img_path) if img_path.exists() else None

                rule = TrafficRule(
                    class_id=cid,
                    name=name,
                    category=category,
                    risk_tier=tier,
                    required_action=action,
                    legal_reference=legal_ref,
                    description=f"Official RTO sign #{cid:03d}: {name}. Statutory regulatory standard across all Indian national highways and urban corridors.",
                    penalty_info=penalty,
                    mistake_avoidance=mistake,
                    icon=meta.get("icon", "ℹ️"),
                    canonical_image_path=img_str
                )
                db.add(rule)
            db.commit()
            print(f"[SEED] Successfully seeded {len(GTSRB_SAFETY_METADATA)} traffic rules!")

        # 2. Seed Quiz Questions
        print("[SEED] Refreshing and expanding traffic safety quiz question bank...")
        # Clear previous questions so updated curriculum loads
        db.query(QuizQuestion).delete()
        questions = [   {   'category': 'Traffic Signs',
        'correct_option_index': 1,
        'explanation': 'Section 119 of the Motor Vehicles Act mandates coming to a full 0 km/h halt behind the stop '
                       "line. A 'rolling stop' is treated as signal jumping, carrying a penalty of ₹1,000–₹5,000.",
        'legal_reference': 'Motor Vehicles Act 1988 — Section 119 & IRC:67-2012 (Code M01)',
        'options': [   'Slow down to 10 km/h and proceed if no traffic is visible',
                       'Bring the vehicle to a complete 0 km/h halt before the stop line, observe traffic, and proceed '
                       'only when clear',
                       'Sound horn continuously and cross without stopping',
                       'Stop only if an enforcement officer is visible'],
        'penalty_info': '₹1,000 to ₹5,000 for signal jumping / dangerous driving (Section 184)',
        'question_text': "What is the mandatory action required when encountering an octagonal red 'STOP' sign "
                         '(IRC:67-M01)?',
        'teaching_tip': 'Rule of Law: The Stop sign is the only octagonal sign on Indian roads so it remains '
                        "unmistakable even when covered in mud or snow. A 'rolling stop' (creeping at 5 km/h) is "
                        'legally classified as jumping a red signal.'},
    {   'category': 'Traffic Signs',
        'correct_option_index': 1,
        'explanation': 'The Give Way sign requires drivers on subsidiary roads to yield right-of-way to vehicles on '
                       'the priority roadway or roundabout before merging (Regulation 13 of Rules of the Road).',
        'legal_reference': 'Rules of the Road Regulations 1989 — Regulation 13 & IRC:67 (Code M02)',
        'options': [   'Vehicles on your subsidiary road have right-of-way over highway traffic',
                       'Yield priority to all vehicles moving on the major road or circulatory roundabout before '
                       'entering',
                       'Accelerate to merge quickly into traffic before oncoming vehicles arrive',
                       'Vehicles on the major priority road must stop for you'],
        'penalty_info': '₹1,000 to ₹3,000 (Failure to yield right of way)',
        'question_text': "What is the legal mandate when encountering a triangular inverted 'GIVE WAY' (Yield) sign "
                         '(IRC:67-M02)?',
        'teaching_tip': 'Rule of Law: Inverted triangle is uniquely reserved for Give Way / Yield. You do not always '
                        'have to come to a dead stop if the major carriageway is entirely clear, but you must '
                        'decelerate and yield unconditionally to through traffic.'},
    {   'category': 'Traffic Signs',
        'correct_option_index': 1,
        'explanation': "Circular signs with red borders are mandatory regulatory signs. '50' denotes the statutory "
                       'maximum speed limit. Exceeding it triggers automated over-speeding citations under Section '
                       '183.',
        'legal_reference': 'Motor Vehicles Act 1988 — Section 112 & Section 183',
        'options': [   'Minimum recommended speed is 50 km/h',
                       'Maximum permissible legal speed limit is 50 km/h under normal road conditions',
                       'Distance to the next highway junction is 50 kilometers',
                       'Speed limit applies only to heavy commercial transport vehicles'],
        'penalty_info': '₹1,000–₹2,000 (Light Motor Vehicle), ₹2,000–₹4,000 (Commercial/Heavy Vehicle) + DL '
                        'impoundment',
        'question_text': "What does a circular sign with a red border containing '50' indicate under Section 112 of "
                         'the Motor Vehicles Act?',
        'teaching_tip': 'Rule of Law: All circular signs with red outer rings are mandatory prohibitory regulations. '
                        'The number represents the absolute ceiling speed. In wet weather or fog, you must drive '
                        'significantly below this posted ceiling.'},
    {   'category': 'Traffic Signs',
        'correct_option_index': 0,
        'explanation': 'IRC:67 dictates that circular blue discs with white symbols are Mandatory Regulatory '
                       'directives (must obey), whereas rectangular blue signs provide non-mandatory route guidance.',
        'legal_reference': 'IRC:67-2012 Categorization Standards (Mandatory vs Informatory)',
        'options': [   'Circular blue is mandatory (Compulsory Turn Right Ahead), whereas rectangular blue is '
                       'informatory route guidance',
                       'Circular blue is a warning, whereas rectangular blue is a speed recommendation',
                       'Both indicate optional turns with no legal requirement',
                       'Rectangular blue prohibits turning right under all circumstances'],
        'penalty_info': '₹1,000 under Section 177 for disobeying mandatory directional arrows',
        'question_text': 'What is the key regulatory difference between a circular blue sign with a white right arrow '
                         'vs a rectangular blue sign with a right arrow?',
        'teaching_tip': 'Rule of Law: Color and Shape Hierarchy — Circles with blue backgrounds and white symbols '
                        "represent 'Mandatory Positive Instructions' (you MUST obey). Blue rectangles represent "
                        "'Informatory & Wayfinding' advice."},
    {   'category': 'Traffic Signs',
        'correct_option_index': 1,
        'explanation': "The 'No Entry' sign prohibits all vehicles from proceeding past that point. Driving against it "
                       'constitutes one-way violation and dangerous driving under Section 184.',
        'legal_reference': 'Motor Vehicles Act 1988 — Section 119 / IRC:67 (Sign Code M03)',
        'options': [   'End of speed restriction zone',
                       'No Entry for all vehicular traffic into the carriageway',
                       'Parking permitted for two-wheelers only',
                       'Toll plaza barrier approaching ahead'],
        'penalty_info': '₹1,000–₹5,000 under Section 184 (Dangerous Driving against traffic stream)',
        'question_text': 'Encountering a circular red disc with a single horizontal white bar indicates:',
        'teaching_tip': 'Rule of Law: Driving past a No Entry sign enters a one-way contraflow or pedestrian street, '
                        'multiplying head-on collision risk by over 1200%. Automated ANPR cameras instantly book this '
                        'as Section 184 dangerous driving.'},
    {   'category': 'Traffic Signs',
        'correct_option_index': 1,
        'explanation': 'Section 194F penalizes unwarranted honking and driving with unauthorized multi-tone horns. In '
                       'designated silence zones, honking is strictly prohibited by law.',
        'legal_reference': 'Motor Vehicles (Amendment) Act 2019 — Section 194F & Noise Pollution Rules',
        'options': [   'Sound horn continuously to alert pedestrians',
                       'Horn prohibited (Silence Zone) — sounding horn is illegal except to avert imminent danger',
                       'Faulty horn check station ahead',
                       'Two-stroke vehicles prohibited'],
        'penalty_info': '₹1,000 for 1st offense, ₹2,000 for subsequent offenses',
        'question_text': 'What does a circular sign with a red border showing a horn symbol with a diagonal red slash '
                         'across it mandate?',
        'teaching_tip': 'Rule of Law: Silence zones are designated within 100 meters around hospitals, nursing homes, '
                        'educational institutions, and courts of law. Unnecessary honking causes acute patient '
                        'distress and acoustic trauma.'},
    {   'category': 'Traffic Signs',
        'correct_option_index': 1,
        'explanation': 'Cautionary signs inform drivers of hazardous conditions ahead. Slippery road warnings indicate '
                       'reduced friction coefficients, demanding early deceleration and extended following gaps.',
        'legal_reference': 'IRC:67-2012 Cautionary Signs (Code W13)',
        'options': [   'Washing station 500m ahead',
                       'Slippery road ahead — reduce velocity, increase following distance, and avoid abrupt steering '
                       'or braking',
                       'Motor racing circuit ahead',
                       'Curved roadway with banking'],
        'penalty_info': 'Advisory sign; failure to decelerate leading to an accident triggers Section 184',
        'question_text': 'What is the meaning of an equilateral triangle with its apex pointing upward and a red '
                         'border showing a car skidding with wavy tracks?',
        'teaching_tip': 'Rule of Law: Upward-pointing triangles are Cautionary (Warning) signs. They warn of hazards '
                        'where road friction drops drastically (e.g. wet oil residue, loose gravel, or ice). '
                        'Decelerate smoothly without stabbing the brakes.'},
    {   'category': 'Right of Way',
        'correct_option_index': 1,
        'explanation': 'Under Regulation 14 of the Rules of the Road Regulations, drivers entering a roundabout must '
                       'yield right-of-way to vehicles already circulating within the roundabout on their right.',
        'legal_reference': 'Rules of the Road Regulations 1989 — Regulation 14 (Roundabout Etiquette)',
        'options': [   'Vehicles entering the roundabout have right-of-way over circulating traffic',
                       'Vehicles already circulating inside the roundabout approaching from your right have priority',
                       'The largest vehicle or heavy freight bus always has unconditional right-of-way',
                       'Whoever sounds their horn first gets priority'],
        'penalty_info': '₹1,000 for failure to yield priority (Section 177)',
        'question_text': 'When approaching a multi-lane roundabout (rotary) without traffic signal lights, who has '
                         'legal right of way?',
        'teaching_tip': "Rule of Law: 'Give Way to the Right' is the foundation of roundabout safety in India. Traffic "
                        'already inside the rotary is clearing the junction; forcing your way in causes circular '
                        'gridlock.'},
    {   'category': 'Right of Way',
        'correct_option_index': 1,
        'explanation': 'In Indian traffic law (left-hand driving system), at uncontrolled junctions without signs or '
                       'lights, drivers must give way to traffic approaching from their right.',
        'legal_reference': 'Rules of the Road Regulations 1989 — Regulation 8 & 12',
        'options': [   'Faster vehicles have priority over slower vehicles',
                       "Yield right-of-way to vehicles approaching from your right ('Give Way to the Right' rule)",
                       'The driver making a right turn has priority over straight-moving traffic',
                       'Flash high-beam headlights and proceed simultaneously'],
        'penalty_info': '₹1,000 (Dangerous junction entry)',
        'question_text': 'At an uncontrolled 4-way crossroad where vehicles arrive simultaneously without signals or '
                         'police, what is the right-of-way rule?',
        'teaching_tip': 'Rule of Law: In left-hand drive countries, if no signals, signs, or cops are present, traffic '
                        'from your right has statutory priority. Approach at walking speed, look right, look left, '
                        'look right again.'},
    {   'category': 'Right of Way',
        'correct_option_index': 1,
        'explanation': 'Drivers changing direction across oncoming lanes must yield right-of-way to all oncoming '
                       'vehicles, cyclists, and pedestrians proceeding straight.',
        'legal_reference': 'Rules of the Road Regulations 1989 — Regulation 12 (Turning Traffic)',
        'options': [   'The vehicle turning right has priority',
                       'Oncoming straight-through traffic has priority; the right-turning driver must wait until the '
                       'opposing lane is clear',
                       'The vehicle with high-beam on has priority',
                       'Turn right immediately without checking opposing traffic'],
        'penalty_info': '₹1,000–₹5,000 for unsafe lane cut / head-on collision liability',
        'question_text': 'When turning right across an opposing lane of oncoming traffic at a junction, who has '
                         'priority?',
        'teaching_tip': 'Rule of Law: Vehicles continuing straight in their established lane maintain absolute '
                        'right-of-way. Turning right across opposing flow cuts across oncoming traffic; you must yield '
                        'until a safe gap exists.'},
    {   'category': 'Right of Way',
        'correct_option_index': 1,
        'explanation': 'Regulation 15 explicitly mandates that vehicles ascending a hill have priority. Descending '
                       'vehicles must halt or pull into passing lay-bys to permit ascending vehicles safe passage.',
        'legal_reference': 'Rules of the Road Regulations 1989 — Regulation 15 (Hill Roads)',
        'options': [   'The vehicle driving downhill has priority because of momentum',
                       'The vehicle driving uphill has priority; the descending driver must pull over and give way',
                       'Whoever flashes headlights first has priority',
                       'Heavier vehicles always have priority regardless of gradient'],
        'penalty_info': '₹1,000–₹2,000 (Reckless ghat driving)',
        'question_text': 'On narrow mountain roads or steep hill gradients where passing is difficult, who has '
                         'statutory right of way?',
        'teaching_tip': 'Rule of Law: Stopping and restarting an uphill vehicle on steep inclines carries severe '
                        'roll-back risk and clutch burnout. Downhill vehicles have gravity on their side and can halt '
                        'with less mechanical hazard.'},
    {   'category': 'Right of Way',
        'correct_option_index': 1,
        'explanation': 'Flashing amber/yellow beacons signal an active junction hazard where signals are on night or '
                       'standby mode. Decelerate, yield to pedestrians and crossing vehicles, and cross with '
                       'heightened vigilance.',
        'legal_reference': 'Motor Vehicles Act 1988 — Section 119 & IRC:SP:12 (Traffic Signal Code)',
        'options': [   'Halt completely, turn off engine, and wait for green',
                       'Slow down significantly, scan in all directions, and proceed through with caution',
                       'Speed up to clear the intersection quickly',
                       'Honk continuously and cross at full speed'],
        'penalty_info': '₹1,000 for speeding through cautionary intersection beacon',
        'question_text': 'What is the mandatory action when encountering a flashing yellow traffic light at an '
                         'intersection?',
        'teaching_tip': "Rule of Law: Flashing Yellow = 'Caution: Yield to Crossing Hazard'. Flashing Red = 'Complete "
                        "Halt (equivalent to Stop sign) before proceeding'."},
    {   'category': 'Right of Way',
        'correct_option_index': 1,
        'explanation': 'Expressway through traffic has right-of-way. Merging vehicles must use the acceleration lane '
                       'to match highway speed and merge smoothly without causing existing traffic to brake sharply.',
        'legal_reference': 'Rules of the Road Regulations 1989 — Regulation 17 (Expressway Merging)',
        'options': [   'Entering vehicles have priority; expressway vehicles must brake to accommodate you',
                       'Through traffic already cruising on the expressway has unconditional priority; merging '
                       'vehicles must adjust speed and yield',
                       'Vehicles in both lanes must stop side-by-side',
                       'The vehicle with emergency hazard flashers turned on has priority'],
        'penalty_info': '₹2,000 for dangerous expressway entry cutoff',
        'question_text': 'When entering an expressway or dual-carriageway national highway from an acceleration '
                         'slip-ramp, who has right of way?',
        'teaching_tip': 'Rule of Law: High-speed expressway mainline vehicles cannot decelerate instantly. Use the '
                        'full length of the acceleration slip-lane to match mainline cruising speed and merge into an '
                        'open gap without impeding through traffic.'},
    {   'category': 'Pedestrians & Safety',
        'correct_option_index': 1,
        'explanation': 'Regulation 22 of the Rules of the Road Regulations mandates that pedestrians on marked '
                       'crossings have absolute right-of-way. Failure to yield attracts a fine of ₹1,000 and demerit '
                       'points.',
        'legal_reference': 'Rules of the Road Regulations 1989 — Regulation 22 (Pedestrian Crossings)',
        'options': [   'Sound horn to instruct pedestrian to wait until your vehicle passes',
                       'Slow down and bring the vehicle to a complete halt before the stop line to let the pedestrian '
                       'cross safely',
                       'Swerve around the pedestrian into the opposite lane',
                       'Accelerate to clear the crossing before the pedestrian reaches your lane'],
        'penalty_info': '₹1,000 fine under Section 177 + license demerit penalty points',
        'question_text': 'When a pedestrian is waiting at or stepping onto a marked Zebra crossing, what is the '
                         "driver's statutory duty?",
        'teaching_tip': 'Rule of Law: Marked pedestrian crossings grant pedestrians absolute legal protection. '
                        'Blocking a zebra crossing or intimidation by honking is a direct violation of statutory human '
                        'safety rights.'},
    {   'category': 'Pedestrians & Safety',
        'correct_option_index': 1,
        'explanation': 'Stationary school buses indicate vulnerable children boarding or alighting. Drivers must '
                       'decelerate to a crawl and be prepared to stop instantly if a child emerges from behind the '
                       'bus.',
        'legal_reference': 'Central Motor Vehicles Rules 1989 — School Bus Safety Mandates',
        'options': [   'Overtake at full speed while sounding your horn',
                       'Decelerate to walking pace, prepare to halt instantly, and anticipate children darting across '
                       'the road',
                       'Flash high-beam headlights to alert children',
                       'Force your way around the right side without slowing down'],
        'penalty_info': '₹2,000 to ₹5,000 under Section 184 (Endangering child pedestrians)',
        'question_text': "When approaching a stationary school bus with blinking hazard lights or 'School Bus' signage "
                         'stopped at the roadside:',
        'teaching_tip': 'Rule of Law: Children have limited peripheral vision and impaired velocity estimation. They '
                        'frequently cross in front of or behind school buses where drivers have severe blind spots.'},
    {   'category': 'Pedestrians & Safety',
        'correct_option_index': 0,
        'explanation': 'Defensive driving and IRC standards require providing at least 1.5 meters of lateral buffer '
                       'when passing cyclists or two-wheelers to account for wobbles, road surface imperfections, and '
                       'wind draft.',
        'legal_reference': 'IRC:103 Guidelines for Pedestrian & Non-Motorized Transport Facilities',
        'options': [   'At least 1.5 meters (5 feet) of lateral clearance',
                       '10 to 20 centimeters is sufficient',
                       'No clearance needed if you stay inside the lane markings',
                       'Just close enough to hear their bell'],
        'penalty_info': '₹1,000–₹5,000 for unsafe overtaking and side-swiping hazard',
        'question_text': 'What is the minimum safe lateral clearance required when overtaking a bicyclist or '
                         'two-wheeler rider on an urban or rural carriageway?',
        'teaching_tip': 'Rule of Law: Bicyclists must steer around potholes, drain grates, and wind gusts. Passing '
                        'closer than 1.5 meters can cause aerodynamic suction that destabilizes riders into your '
                        'wheels.'},
    {   'category': 'Pedestrians & Safety',
        'correct_option_index': 1,
        'explanation': "The 'No-Zone' refers to the extensive blind spots directly in front, directly behind, and "
                       'alongside heavy freight vehicles. Cruising in these zones makes your vehicle invisible to the '
                       'commercial operator.',
        'legal_reference': 'Defensive Driving & Heavy Commercial Vehicle Safety Guidelines',
        'options': [   'Areas where commercial vehicles are prohibited from parking',
                       'Massive blind spots on all four sides of large commercial vehicles where the truck driver '
                       'CANNOT see your car in their mirrors',
                       'Special zero-emission zones in city centers',
                       'The cargo loading bay of a trailer'],
        'penalty_info': 'Severe collision risk; rear-ending or side-crush liability',
        'question_text': "What is the 'No-Zone' rule regarding commercial freight trucks and multi-axle buses?",
        'teaching_tip': "Rule of Law: 'If you cannot see the truck driver's face in their side mirror, they CANNOT see "
                        "you.' Avoid lingering alongside or tailgating within 10 meters of heavy trucks."},
    {   'category': 'Road Markings',
        'correct_option_index': 0,
        'explanation': 'Under IRC:35 road marking standards, a continuous solid centerline indicates that crossing or '
                       'straddling to overtake is strictly forbidden due to limited sight distance or safety hazards.',
        'legal_reference': 'IRC:35-2015 Road Marking Standards & Motor Vehicles Act Section 119',
        'options': [   'Overtaking and straddling across the line is strictly prohibited; you must remain entirely '
                       'within your lane',
                       'Overtaking is permitted if you flash headlights',
                       'Line is for aesthetic separation only and has no legal enforcement',
                       'Parking is allowed directly on top of the line'],
        'penalty_info': '₹1,000–₹2,000 for solid line lane cutting (Section 177/184)',
        'question_text': 'What is the legal meaning of a single continuous solid white or yellow line along the center '
                         'of the road?',
        'teaching_tip': 'Rule of Law: Solid lines are painted specifically where road curvature, hill crests, or '
                        'narrow widths make sight distance too short for safe overtaking. Crossing it is treating '
                        'incoming blind traffic as nonexistent.'},
    {   'category': 'Road Markings',
        'correct_option_index': 0,
        'explanation': 'Double solid yellow lines represent a physical barrier equivalent. Crossing them constitutes '
                       'dangerous driving under Section 184 of the Motor Vehicles Act.',
        'legal_reference': 'IRC:35-2015 Standards for Longitudinal Road Markings',
        'options': [   'Both directions are strictly prohibited from crossing or straddling the lines under all '
                       'circumstances',
                       'Heavy commercial vehicles only are prohibited from crossing',
                       'Overtaking is permitted during clear daytime only',
                       'The road is designated as a VIP corridor'],
        'penalty_info': '₹5,000 under Section 184 (Dangerous Driving / Head-on collision hazard)',
        'question_text': 'Encountering double continuous solid yellow lines in the center of a two-way carriageway '
                         'means:',
        'teaching_tip': 'Rule of Law: Double solid yellow lines legally represent a physical concrete wall. Crossing '
                        'them into opposing traffic for any reason other than navigating around a permanent road '
                        'blockage is an egregious traffic crime.'},
    {   'category': 'Road Markings',
        'correct_option_index': 1,
        'explanation': 'Yellow box junctions prevent intersection gridlock. Vehicles must never enter the box unless '
                       'their exit is unobstructed. Blocking the box carries a fine of ₹500–₹1,000.',
        'legal_reference': 'IRC:35 Standards for Yellow Box Junctions & Rules of the Road Reg 20',
        'options': [   'You may enter and stop inside the box if your signal is green',
                       'You must NOT enter the yellow box unless your exit road is clear, except when turning right '
                       'and waiting for oncoming traffic',
                       'You can park your vehicle inside the yellow box during heavy rainfall',
                       'Yellow box is a designated overtaking acceleration strip'],
        'penalty_info': '₹500 to ₹1,000 fine for junction gridlock obstruction',
        'question_text': 'What is the mandatory rule when approaching an intersection marked with criss-cross yellow '
                         'lines (Yellow Box Junction)?',
        'teaching_tip': 'Rule of Law: Yellow box junctions prevent urban gridlock. Even if the traffic signal is '
                        'green, if traffic ahead is backed up across the junction, you must stay behind the box '
                        'entrance until space opens across it.'},
    {   'category': 'Road Markings',
        'correct_option_index': 1,
        'explanation': 'Stop Line Overreach is captured by automated ANPR cameras and penalized under Section 119/177. '
                       'The buffer space between the stop line and crossing is reserved for pedestrian safety.',
        'legal_reference': 'Motor Vehicles Act 1988 — Section 119 & IRC:35 Transverse Markings',
        'options': [   'Directly on top of the pedestrian zebra stripes',
                       'Behind the transverse solid white Stop Line, leaving the pedestrian zebra crossing completely '
                       'clear',
                       'In the middle of the junction past the traffic signal pole',
                       'Anywhere as long as the front wheels are moving slowly'],
        'penalty_info': '₹1,000 for Stop Line Overreach (captured via ANPR camera)',
        'question_text': 'Where must a vehicle come to a stop when encountering a red traffic light at an '
                         'intersection?',
        'teaching_tip': 'Rule of Law: Modern smart traffic cameras feature laser stop-line tripwires. If your front '
                        'bumper breaks the plane of the transverse white line on red, an automated e-challan is '
                        'generated automatically.'},
    {   'category': 'Road Markings',
        'correct_option_index': 0,
        'explanation': 'Broken longitudinal white lines indicate that drivers are permitted to change lanes or '
                       'overtake, provided the opposing lane is completely clear and proper turn signals are engaged.',
        'legal_reference': 'IRC:35-2015 Centerline Markings',
        'options': [   'Overtaking and lane changes are permitted when safe and clear to do so',
                       'Lane changes are prohibited at all times',
                       'Road is reserved for government convoys',
                       'Two-wheelers must ride on the line'],
        'penalty_info': 'Permissible marking; failure to signal before changing lanes attracts ₹500 fine',
        'question_text': 'What do broken (dashed) white longitudinal lines down the center of a carriageway indicate?',
        'teaching_tip': 'Rule of Law: Broken white lines indicate adequate forward sight distance. However, you must '
                        'always perform mirror checks, signal your intent, and ensure the overtaking lane is free of '
                        'oncoming traffic.'},
    {   'category': 'Road Markings',
        'correct_option_index': 1,
        'explanation': 'Chevron hatched markings are designed to channelize traffic flow and separate conflicting '
                       'movements. Entering, driving across, or stopping on painted islands is strictly prohibited '
                       'under traffic regulations.',
        'legal_reference': 'IRC:35-2015 Channelization & Island Markings',
        'options': [   'Vehicles may park inside the striped chevron area',
                       'Vehicles are strictly prohibited from driving on or stopping within painted chevron islands',
                       'Area is an emergency overtaking lane',
                       'Two-wheelers can cut across chevrons to save travel distance'],
        'penalty_info': '₹1,000 for improper lane change / driving over physical road dividers',
        'question_text': 'What is the legal mandate when encountering diagonal painted striped areas surrounded by '
                         'solid white lines (Chevron Markings / Channelizing Islands)?',
        'teaching_tip': 'Rule of Law: Chevron markings separate bifurcating or merging traffic streams at flyovers and '
                        'expressway exits. Driving over them risks hitting gore-point crash attenuators and causes '
                        'high-speed collisions.'},
    {   'category': 'Emergency Rules',
        'correct_option_index': 1,
        'explanation': 'Section 194E of the Motor Vehicles (Amendment) Act imposes a mandatory penalty of up to '
                       '₹10,000 fine and/or 6 months imprisonment for failure to give free passage to emergency '
                       'vehicles.',
        'legal_reference': 'Motor Vehicles (Amendment) Act 2019 — Section 194E',
        'options': [   'Maintain your lane and speed so the emergency vehicle can overtake around you',
                       'Safely steer to the left edge/shoulder of the roadway and stop or slow down to provide clear, '
                       'unobstructed passage',
                       'Accelerate rapidly to race ahead of the ambulance',
                       'Honk repeatedly while maintaining your position in the fast lane'],
        'penalty_info': 'Up to ₹10,000 fine and/or imprisonment up to 6 months',
        'question_text': 'What must a driver do when an emergency vehicle (Ambulance / Fire Tender / Police) '
                         'approaches with active siren or flashing lights?',
        'teaching_tip': 'Rule of Law: Section 194E was introduced in the 2019 amendment specifically to punish drivers '
                        'obstructing emergency vehicles. Drivers must immediately move to the left curb and bring '
                        'their car to a halt.'},
    {   'category': 'Emergency Rules',
        'correct_option_index': 1,
        'explanation': 'Green Corridors are specially cleared traffic routes established by traffic police to '
                       'transport harvested human organs between hospitals without delays. All other traffic must '
                       'strictly hold and yield.',
        'legal_reference': 'National Organ & Tissue Transplant Organization (NOTTO) Traffic Protocols',
        'options': [   'A roadside eco-plantation zone where trees are watered by tankers',
                       'A synchronized non-stop transit corridor cleared by traffic police for organ transplant '
                       'ambulances; all public traffic must hold at red signals until it passes',
                       'A designated parking zone for electric vehicles only',
                       'A tourist sightseeing expressway'],
        'penalty_info': 'Immediate seizure of vehicle and severe prosecution under Section 184 / 194E',
        'question_text': "What is an official 'Green Corridor' in Indian traffic management, and what is the public "
                         "driver's responsibility?",
        'teaching_tip': 'Rule of Law: Green Corridors transport living donor organs (heart, liver) with a viability '
                        'window of under 4 hours. Police manually hold all cross-traffic; public drivers must maintain '
                        'complete clearance.'},
    {   'category': 'Emergency Rules',
        'correct_option_index': 1,
        'explanation': 'Trailing closely behind an active emergency vehicle to exploit the cleared path is illegal, '
                       'constitutes reckless driving under Section 184, and severely jeopardizes road safety.',
        'legal_reference': 'Motor Vehicles Act 1988 — Section 184 (Reckless & Dangerous Driving)',
        'options': [   'Yes, it is recommended to beat traffic congestion',
                       'Strictly illegal and hazardous; trailing emergency vehicles prevents other cars from '
                       're-entering lanes and causes rear-end crashes',
                       'Permitted if you turn on hazard warning flashers',
                       'Allowed for commercial taxis only'],
        'penalty_info': '₹5,000 fine and potential suspension of driving license',
        'question_text': 'Is it legal to closely follow (draft behind) an ambulance or fire tender that is clearing a '
                         'path through heavy traffic?',
        'teaching_tip': 'Rule of Law: Ambulances must make unpredictable emergency maneuvers and sudden stops. '
                        'Tailgating an active ambulance blocks yielding vehicles from returning to their lanes and '
                        'risks crushing medical staff inside.'},
    {   'category': 'Emergency Rules',
        'correct_option_index': 1,
        'explanation': 'The Move Over principle instructs drivers to decelerate and shift over by one lane when '
                       'approaching stationary emergency or stranded vehicles on the shoulder to protect human lives.',
        'legal_reference': 'National Highway Safety Guidelines & Defensive Driving Standards',
        'options': [   'Speed up to pass before they re-enter the lane',
                       'Decelerate, scan for roadside occupants, and if safe, move over one lane to provide an empty '
                       'buffer lane',
                       'Honk continuously until the parked vehicle moves away',
                       'Pull directly behind them on the shoulder'],
        'penalty_info': 'Civil liability / criminal prosecution under Section 304A in event of impact',
        'question_text': "What is the 'Move Over' principle when passing a broken-down vehicle or police cruiser "
                         'stopped on the highway shoulder with hazard lights?',
        'teaching_tip': 'Rule of Law: Stationary highway stops are extremely hazardous. When passing vehicles stranded '
                        'on the shoulder, shift one lane away to prevent striking tow operators, police officers, or '
                        'stranded passengers.'},
    {   'category': 'Speed & Overtaking',
        'correct_option_index': 1,
        'explanation': "Under Regulation 9 of the Rules of the Road, overtaking on the left ('undertaking') is "
                       'strictly illegal, except when the vehicle in front has clearly indicated and begun turning '
                       'right.',
        'legal_reference': 'Rules of the Road Regulations 1989 — Regulation 9 (Overtaking Protocols)',
        'options': [   'Left side under all traffic conditions',
                       'Right side only, ensuring the road ahead is clear and indicating your intention beforehand',
                       'Either side depending on road shoulder width',
                       'Left shoulder of the expressway'],
        'penalty_info': '₹1,000 to ₹5,000 for illegal undertaking and reckless lane zigzagging',
        'question_text': 'In India, from which side are you legally required to overtake a vehicle moving in the same '
                         'direction?',
        'teaching_tip': 'Rule of Law: In a left-hand drive country, driver seating is on the right, meaning the right '
                        'side has maximum visibility. Undertaking on the left blind-sides other operators who do not '
                        'expect rapid passes on their curb side.'},
    {   'category': 'Speed & Overtaking',
        'correct_option_index': 0,
        'explanation': 'Overtaking on pedestrian crossings, bridges, crests, and sharp corners is prohibited because '
                       'oncoming traffic and pedestrians are hidden by physical geometry.',
        'legal_reference': 'Rules of the Road Regulations 1989 — Regulation 10',
        'options': [   'On or approaching a pedestrian crossing, bridge, blind curve, crest of a hill, or railway '
                       'level crossing',
                       'On a wide 4-lane divided national highway with straight visibility',
                       'While moving behind a slow tractor in broad daylight',
                       'On an open tollway with broken white center lines'],
        'penalty_info': '₹5,000 fine and vehicle impoundment under Section 184',
        'question_text': 'Under the Indian Motor Vehicles Act, overtaking another vehicle is strictly forbidden at '
                         'which location?',
        'teaching_tip': 'Rule of Law: Never overtake where road geometry conceals oncoming traffic. Crests of hills '
                        'and sharp curves hide 100 km/h oncoming vehicles until milliseconds before impact.'},
    {   'category': 'Speed & Overtaking',
        'correct_option_index': 1,
        'explanation': 'The Two-Second rule ensures that your distance scales with velocity. Wet or foggy roads double '
                       'braking distance due to reduced tire friction, necessitating a 4+ second gap.',
        'legal_reference': 'Rules of the Road Regulations 1989 — Regulation 23 (Following Distance)',
        'options': [   'It gives time to check your mobile phone; increase during clear daytime',
                       'It provides adequate perception-reaction and braking buffer; double to 4+ seconds during rain, '
                       'fog, or wet road conditions',
                       'It is applicable only to heavy freight multi-axle trailers',
                       'It means waiting 2 seconds before shifting from 1st to 2nd gear'],
        'penalty_info': 'Primary cause of multi-car pileups; Section 184 dangerous driving',
        'question_text': "What is the recommended following distance ('Two-Second Rule'), and when should it be "
                         'doubled to 4+ seconds?',
        'teaching_tip': 'Rule of Law: At 100 km/h, your car travels 28 meters per second! Perception-reaction takes '
                        '1.5 seconds (42 meters) before your foot even touches the brake pedal. Wet tarmac doubles '
                        'braking distance.'},
    {   'category': 'Speed & Overtaking',
        'correct_option_index': 1,
        'explanation': 'Glare from high beams causes temporary visual blindness (photokeratitis) for oncoming drivers '
                       'and pedestrians. Low beams are required on lit city streets and when following within 200m.',
        'legal_reference': 'Central Motor Vehicles Rules 1989 — Rule 106 (Deflection of Lights)',
        'options': [   'High beam should be on at all times for maximum illumination',
                       'High beam must be dipped to low beam to prevent blinding oncoming drivers and preceding cars '
                       'via their rear-view mirrors',
                       'High beam is mandatory on all city flyovers',
                       'You must flash high beam continuously in residential colonies'],
        'penalty_info': '₹500 fine under Section 177 for dazzling other road users',
        'question_text': 'What is the statutory regulation regarding high-beam headlights on illuminated urban city '
                         'streets or when following another car?',
        'teaching_tip': "Rule of Law: High-beam glare causes 'troxler fading' and temporary blindness for oncoming "
                        'drivers for up to 7 seconds. Within cities and when trailing within 200m of another vehicle, '
                        'always dip to low beam.'},
    {   'category': 'Speed & Overtaking',
        'correct_option_index': 1,
        'explanation': 'During hydroplaning, braking or sharp steering input induces an instant spin. Gently lift off '
                       'the accelerator pedal, allow momentum to bleed off, and maintain straight steering until tire '
                       'sipes grip tarmac.',
        'legal_reference': 'Expressway Safety & High-Speed Wet Weather Defensive Protocol',
        'options': [   'Slam on the brakes immediately and yank the steering wheel hard',
                       'Ease off the accelerator smoothly, keep the steering wheel pointed straight, and do NOT apply '
                       'panic braking until tires regain contact',
                       'Engage handbrake at 90 km/h',
                       'Shift directly into reverse gear'],
        'penalty_info': 'Loss of control leading to fatal rollovers; tire tread depth mandatory under CMVR',
        'question_text': "What is the correct defensive driving response if your vehicle begins to 'aquaplane' "
                         '(hydroplane) on standing water on an expressway?',
        'teaching_tip': 'Rule of Law: Hydroplaning happens when water accumulates faster under tire sipes than it can '
                        'be displaced, lifting the car onto a cushion of water. Braking or sharp turning sends the '
                        'vehicle into an uncontrollable spin.'},
    {   'category': 'Penalties & Laws',
        'correct_option_index': 1,
        'explanation': 'Section 129 requires both rider and pillion above 4 years of age to wear protective headgear '
                       'conforming to BIS standards with fastened straps. Violations carry ₹1,000 fine and 3-month DL '
                       'suspension.',
        'legal_reference': 'Motor Vehicles (Amendment) Act 2019 — Section 129',
        'options': [   'Any construction hardhat or bicycle cap is legally permissible',
                       'Must be a Bureau of Indian Standards (BIS / ISI marked) certified helmet with the chin strap '
                       'securely fastened for rider and pillion',
                       'Helmet is required for the driver only, pillion rider is exempt',
                       'Helmet is required only on national highways, not within city municipal limits'],
        'penalty_info': '₹1,000 fine and disqualification of driving license for 3 months',
        'question_text': 'Under Section 129 of the Motor Vehicles Act, what are the legal requirements for helmets '
                         'worn on a two-wheeler?',
        'teaching_tip': 'Rule of Law: The 2019 amendment mandates BIS (IS 4151) helmets with locked chinstraps for all '
                        'riders above 4 years of age. An unfastened helmet flies off upon initial impact, rendering it '
                        'useless.'},
    {   'category': 'Penalties & Laws',
        'correct_option_index': 1,
        'explanation': 'Section 194B mandates that whoever drives a motor vehicle without wearing a safety belt, or '
                       'carries passengers not wearing safety belts, is punishable with a fine of ₹1,000.',
        'legal_reference': 'Motor Vehicles (Amendment) Act 2019 — Section 194B & Rule 125(1)',
        'options': [   'Driver only must wear a seatbelt',
                       'All occupants, including front-seat passengers and rear-seat passengers, must wear seatbelts '
                       'at all times while the vehicle is in motion',
                       'Seatbelts are optional within city limits below 40 km/h',
                       'Children under 14 are exempt from seatbelt laws'],
        'penalty_info': '₹1,000 fine per unbelted passenger',
        'question_text': 'Under Section 194B of the Motor Vehicles Act, what is the statutory law regarding wearing '
                         'seatbelts in a passenger car?',
        'teaching_tip': 'Rule of Law: An unbelted rear passenger becomes a human projectile in a 50 km/h frontal '
                        'impact, colliding into front-seat passengers with the force of an elephant. Rear seatbelts '
                        'are strictly mandatory.'},
    {   'category': 'Penalties & Laws',
        'correct_option_index': 0,
        'explanation': 'Section 185 sets the statutory breath analyzer limit at 30 mg per 100 ml of blood. Driving '
                       'above this threshold attracts up to ₹10,000 fine, 6 months imprisonment, and license '
                       'suspension.',
        'legal_reference': 'Motor Vehicles (Amendment) Act 2019 — Section 185 (Drunk Driving)',
        'options': [   'Any driver with Blood Alcohol Content (BAC) exceeding 30 mg per 100 ml of blood is punishable '
                       'by law',
                       'Drivers may drink as long as they stay under 50 km/h',
                       'Alcohol is tested only after an accident has occurred',
                       'Alcohol consumption is permitted for experienced commercial drivers'],
        'penalty_info': 'Up to ₹10,000 fine and/or 6 months imprisonment for 1st offense; ₹15,000 and 2 years jail for '
                        'repeat',
        'question_text': 'What does Section 185 of the Motor Vehicles Act prescribe regarding driving under the '
                         'influence of alcohol or drugs?',
        'teaching_tip': 'Rule of Law: Blood Alcohol Concentration (BAC) above 30 mg per 100 ml measured via breath '
                        'analyzer is an arrestable offense. Alcohol degrades peripheral vision, slows neural reaction '
                        'times, and induces false confidence.'},
    {   'category': 'Penalties & Laws',
        'correct_option_index': 1,
        'explanation': 'Handheld phone usage diverts visual, manual, and cognitive attention. Section 184 penalizes it '
                       'as dangerous driving with penalties up to ₹5,000 and possible vehicle seizure.',
        'legal_reference': 'Motor Vehicles (Amendment) Act 2019 — Section 184(c)',
        'options': [   'Texting is prohibited, but handheld phone calls are permitted',
                       'Using any handheld communications device while driving is an offence of dangerous driving, '
                       'attracting a fine of ₹1,000–₹5,000',
                       'Mobile phone calls are allowed if you drive below 30 km/h',
                       'Only social media browsing is penalized'],
        'penalty_info': '₹1,000 to ₹5,000 fine and/or up to 1 year imprisonment + DL suspension',
        'question_text': 'What does Section 184(c) of the Motor Vehicles Act state regarding mobile phone usage while '
                         'operating a motor vehicle?',
        'teaching_tip': 'Rule of Law: Cognitive distraction from mobile phone usage impairs hazard perception '
                        'identically to blood alcohol intoxication. Looking at a phone for 4 seconds at 60 km/h means '
                        'driving 67 meters completely blind.'},
    {   'category': 'Penalties & Laws',
        'correct_option_index': 1,
        'explanation': 'Shoulder driving or stopping without hazard flashers and triangle cones causes fatal rear-end '
                       'collisions. It is strictly reserved for emergency breakdowns and police/ambulance operations.',
        'legal_reference': 'Motor Vehicles Act 1988 — Section 119 & NHAI Expressway Regulations',
        'options': [   'The shoulder is an express overtaking lane for high-speed cars during traffic jams',
                       'The shoulder is strictly reserved for emergency stopping, vehicle breakdowns, or ambulances; '
                       'routine driving or parking is prohibited',
                       'Two-wheelers and auto-rickshaws must drive on the shoulder',
                       'You can park on the shoulder to rest or picnic'],
        'penalty_info': '₹1,000–₹2,000 under Section 177 / 184 (Illegal shoulder driving)',
        'question_text': 'What is the statutory restriction on using the hard shoulder (leftmost continuous edge lane) '
                         'on Expressways and National Highways?',
        'teaching_tip': 'Rule of Law: Driving on the shoulder causes horrific rear-end collisions with stalled trucks. '
                        'If forced to stop due to breakdown, activate hazard flashers and deploy reflective triangle '
                        '50m behind.'},
    {   'category': 'Penalties & Laws',
        'correct_option_index': 1,
        'explanation': 'Section 134A guarantees that any person who renders emergency medical or non-medical '
                       'assistance to a crash victim shall not be liable for any civil or criminal action, nor '
                       'compelled to reveal personal details.',
        'legal_reference': 'Motor Vehicles (Amendment) Act 2019 — Section 134A (Protection of Good Samaritans)',
        'options': [   'The helper must pay the hospital admission deposit',
                       'The Good Samaritan is immune from civil or criminal liability and cannot be forced to disclose '
                       'identity or become a witness',
                       'The helper is liable for vehicle damage of the victim',
                       'The helper must report to the police station daily'],
        'penalty_info': 'Statutory protection; police or hospitals harassing helpers face severe disciplinary action',
        'question_text': "Under Section 134A of the Motor Vehicles Act, what protections are provided to a 'Good "
                         "Samaritan' who assists a road crash victim?",
        'teaching_tip': "Rule of Law: The 'Golden Hour' is the first 60 minutes after trauma where medical care saves "
                        '50% of accident victims. Section 134A ensures you can administer first aid and take victims '
                        'to hospital with zero police harassment.'}]

        for q in questions:
            qq = QuizQuestion(
                category=q["category"],
                question_text=q["question_text"],
                options_json=json.dumps(q["options"]),
                correct_option_index=q["correct_option_index"],
                explanation=q["explanation"],
                legal_reference=q.get("legal_reference", "Motor Vehicles Act, 1988"),
                penalty_info=q.get("penalty_info", None),
                teaching_tip=q.get("teaching_tip", None)
            )
            db.add(qq)
        db.commit()
        print(f"[SEED] Successfully seeded {len(questions)} educational quiz questions across 6 categories!")

        # 3. Seed Demo Users
        driver = db.query(User).filter(User.email == "driver@aerovision.ai").first()
        if not driver:
            print("[SEED] Creating demo driver account (driver@aerovision.ai / password123)...")
            driver = User(
                email="driver@aerovision.ai",
                hashed_password=hash_password("password123"),
                full_name="Aryan Sharma",
                phone="+91 98765 43210",
                role="user",
                safety_score=88,
                storage_used_bytes=15728640, # 15 MB
                storage_quota_bytes=524288000
            )
            db.add(driver)
            db.commit()
            db.refresh(driver)

            # Seed Demo Vehicles for Driver
            v1 = Vehicle(
                user_id=driver.id,
                reg_number="KA-01-MJ-2024",
                nickname="Creta Family SUV",
                vehicle_type="4-Wheeler Car",
                make_model="Hyundai Creta SX(O)",
                year=2024,
                fuel_type="Petrol",
                color="Titanium Grey",
                insurance_expiry="2027-04-15",
                puc_expiry="2026-11-20"
            )
            v2 = Vehicle(
                user_id=driver.id,
                reg_number="DL-03-EA-8890",
                nickname="City Commuter",
                vehicle_type="2-Wheeler Motorcycle",
                make_model="Royal Enfield Hunter 350",
                year=2023,
                fuel_type="Petrol",
                color="Matte Black",
                insurance_expiry="2026-12-10",
                puc_expiry="2026-10-30"
            )
            db.add_all([v1, v2])
            db.commit()
            db.refresh(v1)
            db.refresh(v2)

            # Seed Sample Challans for Driver (including Telangana State Police)
            c1 = Challan(
                user_id=driver.id,
                vehicle_id=v1.id,
                challan_number="CH-TS-HYD-2026-90412",
                violation_type="Speed Limit Violation (> 80 km/h on Outer Ring Road, Gachibowli)",
                amount=1000.0,
                violation_date="2026-09-28",
                due_date="2026-11-15",
                issuing_authority="Telangana State Police (Cyberabad)",
                state="Telangana",
                status="pending",
                payment_url="https://echallan.tspolice.gov.in/",
                source="manual_entry",
                notes="Automated ANPR speed camera capture at ORR Exit 19, Hyderabad. Direct TS Police portal link."
            )
            c2 = Challan(
                user_id=driver.id,
                vehicle_id=v2.id,
                challan_number="CH-DEL-2026-33104",
                violation_type="Pillion Rider Without Protective Helmet (Sec 194D)",
                amount=1000.0,
                violation_date="2026-08-14",
                due_date="2026-09-30",
                issuing_authority="Delhi Traffic Police",
                state="Delhi",
                status="paid",
                payment_url="https://traffic.delhipolice.gov.in/echallan",
                source="manual_entry",
                notes="Paid online via Delhi Police eChallan portal on Aug 20."
            )
            c3 = Challan(
                user_id=driver.id,
                vehicle_id=v1.id,
                challan_number="CH-TS-CYB-2026-44918",
                violation_type="Stop Line / Signal Jumping Violation at Cyber Towers (Sec 119/177)",
                amount=1000.0,
                violation_date="2026-10-05",
                due_date="2026-11-20",
                issuing_authority="Telangana State Police (Cyberabad)",
                state="Telangana",
                status="pending",
                payment_url="https://echallan.tspolice.gov.in/",
                source="manual_entry",
                notes="Captured by Cyberabad Smart Signal camera at Hitec City junction."
            )
            db.add_all([c1, c2, c3])

            # Seed Notifications
            n1 = Notification(
                user_id=driver.id,
                title="Pending Challan Reminder",
                message="Challan #CH-BLR-2026-90412 (₹1,000) for KA-01-MJ-2024 is due on 2026-11-15.",
                category="challan",
                is_read=False
            )
            n2 = Notification(
                user_id=driver.id,
                title="AeroVision AI Ready",
                message="Your dashcam cloud vault is configured with 500 MB quota.",
                category="system",
                is_read=True
            )
            db.add_all([n1, n2])
            db.commit()
            print("[SEED] Demo driver account seeded successfully!")

        # 4. Seed Admin Account and Fleet Vehicles & Challans
        admin = db.query(User).filter(User.email == "admin@aerovision.ai").first()
        if not admin:
            print("[SEED] Creating admin account (admin@aerovision.ai / admin123)...")
            admin = User(
                email="admin@aerovision.ai",
                hashed_password=hash_password("admin123"),
                full_name="AeroVision Systems Admin",
                phone="+91 99999 88888",
                role="admin",
                safety_score=99,
                storage_used_bytes=0,
                storage_quota_bytes=2147483648 # 2 GB
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            print("[SEED] Admin account seeded successfully!")

        # Ensure admin has fleet vehicles
        admin_vehicles_count = db.query(Vehicle).filter(Vehicle.user_id == admin.id).count()
        if admin_vehicles_count == 0:
            print("[SEED] Seeding Admin fleet vehicles...")
            av1 = Vehicle(
                user_id=admin.id,
                reg_number="TS-09-EA-4020",
                nickname="Cyberabad Rapid Response",
                vehicle_type="4-Wheeler SUV",
                make_model="Tata Harrier Dark Edition",
                year=2024,
                fuel_type="Diesel",
                color="Atlas Black",
                insurance_expiry="2027-05-10",
                puc_expiry="2026-12-15"
            )
            av2 = Vehicle(
                user_id=admin.id,
                reg_number="DL-01-AB-4092",
                nickname="Executive Fleet EV",
                vehicle_type="4-Wheeler Car",
                make_model="Tata Nexon EV Max",
                year=2024,
                fuel_type="Electric",
                color="Empowered Teal",
                insurance_expiry="2027-08-20",
                puc_expiry="2027-01-01"
            )
            av3 = Vehicle(
                user_id=admin.id,
                reg_number="KA-04-NX-1102",
                nickname="Bangalore Hub Patrol",
                vehicle_type="4-Wheeler Car",
                make_model="Hyundai Ioniq 5",
                year=2024,
                fuel_type="Electric",
                color="Gravity Gold Matte",
                insurance_expiry="2027-03-12",
                puc_expiry="2026-11-30"
            )
            av4 = Vehicle(
                user_id=admin.id,
                reg_number="MH-02-CP-9901",
                nickname="Expressway Escort",
                vehicle_type="4-Wheeler SUV",
                make_model="Mahindra Scorpio-N",
                year=2023,
                fuel_type="Diesel",
                color="Napoli Black",
                insurance_expiry="2026-11-25",
                puc_expiry="2026-10-31"
            )
            db.add_all([av1, av2, av3, av4])
            db.commit()
            db.refresh(av1)
            db.refresh(av2)
            db.refresh(av3)
            db.refresh(av4)

            # Seed Admin example notices across states
            ach1 = Challan(
                user_id=admin.id,
                vehicle_id=av1.id,
                challan_number="CH-TS-CYB-2026-88192",
                violation_type="Speed Limit Violation (> 95 km/h on Outer Ring Road, Gachibowli - Sec 112/183)",
                amount=1000.0,
                violation_date="2026-10-18",
                due_date="2026-11-25",
                issuing_authority="Telangana State Police (Cyberabad)",
                state="Telangana",
                status="pending",
                payment_url="https://echallan.tspolice.gov.in/",
                source="webhook",
                notes="ANPR Speed Camera capture at Exit 19, Gachibowli, Hyderabad. Registered speed: 96 km/h in 80 km/h zone."
            )
            ach2 = Challan(
                user_id=admin.id,
                vehicle_id=av2.id,
                challan_number="CH-DEL-2026-40192",
                violation_type="Stop Line & Zebra Crossing Infringement (Sec 119/177)",
                amount=500.0,
                violation_date="2026-10-12",
                due_date="2026-11-30",
                issuing_authority="Delhi Traffic Police",
                state="Delhi",
                status="disputed",
                payment_url="https://traffic.delhipolice.gov.in/echallan",
                source="camera_notice",
                notes="Automated AI Dispute filed: Dashcam telemetry confirms vehicle halted 0.8m behind line before sensor trip."
            )
            ach3 = Challan(
                user_id=admin.id,
                vehicle_id=av3.id,
                challan_number="CH-KA-BTP-2026-12055",
                violation_type="Unauthorized Entry into Dedicated Bus Priority Lane (Sec 115/177)",
                amount=1000.0,
                violation_date="2026-09-30",
                due_date="2026-10-25",
                issuing_authority="Bengaluru Traffic Police (BTP)",
                state="Karnataka",
                status="paid",
                payment_url="https://btp.gov.in/",
                source="webhook",
                notes="Settled online via Karnataka One / BTP portal on Oct 02."
            )
            ach4 = Challan(
                user_id=admin.id,
                vehicle_id=av4.id,
                challan_number="CH-MH-MUM-2026-67014",
                violation_type="Dangerous Driving / Unsafe Lane Cutting on Expressway (Sec 184)",
                amount=1500.0,
                violation_date="2026-10-08",
                due_date="2026-11-20",
                issuing_authority="Maharashtra State Traffic Police (MahaTraffic)",
                state="Maharashtra",
                status="pending",
                payment_url="https://mahatrafficechallan.gov.in/",
                source="camera_notice",
                notes="Camera notice triggered during high-speed overtaking maneuver on Mumbai-Pune Expressway km 42."
            )
            ach5 = Challan(
                user_id=admin.id,
                vehicle_id=av1.id,
                challan_number="CH-TS-HYD-2026-55910",
                violation_type="Driving Without Valid Pollution Under Control (PUC) Certificate (Sec 190(2))",
                amount=1000.0,
                violation_date="2026-10-15",
                due_date="2026-11-20",
                issuing_authority="Telangana State Police (Hyderabad City)",
                state="Telangana",
                status="pending",
                payment_url="https://echallan.tspolice.gov.in/",
                source="webhook",
                notes="Automated Parivahan cloud verification flagged expired PUC certificate at Banjara Hills Road 12."
            )
            db.add_all([ach1, ach2, ach3, ach4, ach5])
            db.commit()
            print("[SEED] Admin fleet vehicles and sample e-challans seeded successfully!")

    except Exception as e:
        db.rollback()
        print(f"[SEED ERROR] {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
