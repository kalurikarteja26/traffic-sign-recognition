"""Official Statutory Traffic Sign Penalties under Indian Motor Vehicles Act and IRC:67-2012."""

RTO_STATUTORY_FINES = {
    # ── MANDATORY / REGULATORY SIGNS ──
    0: {
        "penalty_info": "₹1,000 – ₹5,000 (Signal Violation / Dangerous Driving)",
        "legal_reference": "MV Act Sec 119 read with Sec 184 & IRC:67-M01",
        "required_action": "Mandatory full 0 km/h halt before stop line. Yield unconditionally to all crossing traffic.",
        "mistake_avoidance": "Rolling stops (creeping through at 5 km/h) under nocturnal conditions or low traffic."
    },
    1: {
        "penalty_info": "₹1,000 – ₹3,000 (Failure to Yield Right-of-Way)",
        "legal_reference": "MV Act Sec 119 & Rules of Road Reg 13 (Yield Priority)",
        "required_action": "Yield priority to circulating traffic on roundabout or major carriageway before merging.",
        "mistake_avoidance": "Entering multi-lane rotaries without checking blind spots or yielding to circulating vehicles."
    },
    2: {
        "penalty_info": "₹2,000 – ₹5,000 & Vehicle Impoundment (Wrong Way)",
        "legal_reference": "MV Act Sec 115 read with Sec 184 (Prohibited Roadway Entry)",
        "required_action": "Strict prohibition: Do not enter. Roadway is one-way in reverse or closed to incoming traffic.",
        "mistake_avoidance": "Entering one-way ramps or closed urban roads during night or low visibility."
    },
    3: {
        "penalty_info": "₹1,000 – ₹2,000 (Vehicular Movement Prohibited)",
        "legal_reference": "MV Act Sec 115 & Sec 177A (Pedestrian/Secure Zone)",
        "required_action": "All motor vehicles prohibited in both directions. Non-motorized pedestrian precinct only.",
        "mistake_avoidance": "Ignoring restricted timing boards in pedestrian market plazas or heritage zones."
    },
    4: {
        "penalty_info": "₹1,000 – ₹5,000 (Wrong-Way Driving Violation)",
        "legal_reference": "MV Act Sec 119 read with Sec 184 (One-Way Traffic Directive)",
        "required_action": "One-way traffic to the left only. Driving towards the right is strictly prohibited.",
        "mistake_avoidance": "Taking shortcut against traffic flow to reach adjacent side alley."
    },
    5: {
        "penalty_info": "₹1,000 – ₹5,000 (Wrong-Way Driving Violation)",
        "legal_reference": "MV Act Sec 119 read with Sec 184 (One-Way Traffic Directive)",
        "required_action": "One-way traffic to the right only. Driving towards the left is strictly prohibited.",
        "mistake_avoidance": "Executing unauthorized reverse turns against designated one-way stream."
    },
    6: {
        "penalty_info": "₹1,000 for 1st offense / ₹2,000 repeat (Illegal Turn)",
        "legal_reference": "MV Act Sec 119 & Rules of Road Reg 12 (Prohibited Turn)",
        "required_action": "Left turn strictly prohibited. Continue straight ahead or turn right as permitted.",
        "mistake_avoidance": "Cutting across left lane at signalized junction during red arrow."
    },
    7: {
        "penalty_info": "₹1,000 for 1st offense / ₹2,000 repeat (Illegal Turn)",
        "legal_reference": "MV Act Sec 119 & Rules of Road Reg 12 (Prohibited Turn)",
        "required_action": "Right turn strictly prohibited. Proceed straight or make designated loop turn.",
        "mistake_avoidance": "Turning right across oncoming high-speed traffic instead of using flyover loop."
    },
    8: {
        "penalty_info": "₹1,000 – ₹2,000 (Unauthorized U-Turn)",
        "legal_reference": "MV Act Sec 119 & Rules of Road Reg 12(3) (Median U-Turn Ban)",
        "required_action": "U-turn strictly prohibited. Continue forward to designated median turnaround rotary.",
        "mistake_avoidance": "Making sharp U-turn across continuous median divider causing traffic lockup."
    },
    9: {
        "penalty_info": "₹1,000 – ₹5,000 (Dangerous Overtaking / Solid Line Jump)",
        "legal_reference": "MV Act Sec 184 & Rules of Road Reg 11 (Overtaking Prohibition)",
        "required_action": "Overtaking strictly prohibited. Stay in lane behind preceding vehicle until restriction ends.",
        "mistake_avoidance": "Crossing continuous white/yellow centerline on narrow bridges, curves, or crests."
    },
    10: {
        "penalty_info": "₹1,000 (1st offense) / ₹2,000 repeat (Silence Zone)",
        "legal_reference": "MV Act Sec 194F(1) (Noise Pollution / Silence Zone Honking)",
        "required_action": "Do not sound horn. Strict silence zone near hospitals, schools, courts, and nursing homes.",
        "mistake_avoidance": "Honking Rohit / impatiently in hospital ambulance bays or school arrival gates."
    },
    11: {
        "penalty_info": "₹500 (1st) / ₹1,500 repeat + Towing Charges",
        "legal_reference": "MV Act Sec 122 read with Sec 177 / 177A (Illegal Parking)",
        "required_action": "Parking prohibited. Brief stopping to pick up or drop passengers is permitted if not obstructing.",
        "mistake_avoidance": "Leaving vehicle unattended on roadway with hazard lights blinking."
    },
    12: {
        "penalty_info": "₹1,000 – ₹1,500 + Immediate Vehicle Towing",
        "legal_reference": "MV Act Sec 122 & Sec 177A (Clearway / No Stopping)",
        "required_action": "Stopping and standing strictly prohibited. Vehicle must maintain uninterrupted motion.",
        "mistake_avoidance": "Stopping on urban flyovers, bridge ramps, or tunnel approaches to inspect vehicle."
    },
    13: {
        "penalty_info": "₹1,000 – ₹2,000 (LMV) / ₹4,000 (HMV) for > 30 km/h",
        "legal_reference": "MV Act Sec 112 read with Sec 183 (Speed Violation in School/Residential)",
        "required_action": "Maximum legal ground velocity 30 km/h. Critical school/hospital/pedestrian zone.",
        "mistake_avoidance": "Carrying 50 km/h suburban velocity into narrow residential alleys."
    },
    14: {
        "penalty_info": "₹1,000 – ₹2,000 (LMV) / ₹4,000 (HMV) for > 40 km/h",
        "legal_reference": "MV Act Sec 112 read with Sec 183 (Urban Corridor Speed Limit)",
        "required_action": "Maximum legal speed 40 km/h. Dense mixed-traffic urban zone.",
        "mistake_avoidance": "Accelerating abruptly between closely-spaced traffic signals."
    },
    15: {
        "penalty_info": "₹1,000 – ₹2,000 (LMV) / ₹4,000 (HMV) for > 50 km/h",
        "legal_reference": "MV Act Sec 112 read with Sec 183 (City Arterial Speed Limit)",
        "required_action": "Maximum legal speed 50 km/h. Standard city arterial speed ceiling.",
        "mistake_avoidance": "Downhill gradient momentum triggering roadside speed radar cameras."
    },
    16: {
        "penalty_info": "₹1,000 – ₹2,000 (LMV) / ₹4,000 (HMV) for > 60 km/h",
        "legal_reference": "MV Act Sec 112 read with Sec 183 (Suburban Radial Speed Limit)",
        "required_action": "Maximum legal speed 60 km/h. Divided suburban radial corridor.",
        "mistake_avoidance": "Failing to decelerate when multi-lane bypass enters populated borough."
    },
    17: {
        "penalty_info": "₹1,000 – ₹2,000 (LMV) / ₹4,000 (HMV) for > 70 km/h",
        "legal_reference": "MV Act Sec 112 read with Sec 183 (Ring Road / Highway Speed Limit)",
        "required_action": "Maximum legal speed 70 km/h. Outer ring road / state highway boundary.",
        "mistake_avoidance": "Overspeeding during night hours when speed-enforcement cameras are flash-triggered."
    },
    18: {
        "penalty_info": "₹1,000 – ₹2,000 (LMV) / ₹4,000 (HMV) for > 80 km/h",
        "legal_reference": "MV Act Sec 112 read with Sec 183 (National Highway Speed Limit)",
        "required_action": "Maximum legal speed 80 km/h. National Highway commercial corridor limit.",
        "mistake_avoidance": "Heavy trucks or commercial vehicles exceeding the 80 km/h statutory speed governor limit."
    },
    19: {
        "penalty_info": "₹1,000 – ₹2,000 (LMV) / ₹4,000 (HMV) for > 90 km/h",
        "legal_reference": "MV Act Sec 112 read with Sec 183 (Express Corridor Speed Limit)",
        "required_action": "Maximum legal speed 90 km/h. Grade-separated dual carriageway.",
        "mistake_avoidance": "Entering slip lanes without reducing velocity to ramp advisory speed."
    },
    20: {
        "penalty_info": "₹2,000 (LMV) / ₹4,000 (HMV) + License Suspension on repeat",
        "legal_reference": "MV Act Sec 112 read with Sec 183 (Expressway Speed Ceiling)",
        "required_action": "Maximum legal speed 100 km/h for motorcars on 4-lane access-controlled highway.",
        "mistake_avoidance": "Excessive speed in rain creating tire aquaplaning hazard."
    },
    21: {
        "penalty_info": "₹2,000 (LMV) / ₹4,000 (HMV) + License Suspension on repeat",
        "legal_reference": "MV Act Sec 112 read with Sec 183 (High-Speed Expressway)",
        "required_action": "Maximum legal speed 110 km/h. High-speed dual-carriageway access-controlled sector.",
        "mistake_avoidance": "Braking abruptly on highway lanes instead of smooth deceleration."
    },
    22: {
        "penalty_info": "₹2,000 (LMV) / ₹4,000 (HMV) + License Suspension on repeat",
        "legal_reference": "MV Act Sec 112 read with Sec 183 (National Expressway Ceiling 120 km/h)",
        "required_action": "Maximum statutory ceiling 120 km/h on national expressways (e.g. DME/Samruddhi).",
        "mistake_avoidance": "Tyre blowout risk: Inspect tire pressure and tread wear before high-speed cruising."
    },
    23: {
        "penalty_info": "₹500 (1st) / ₹1,500 repeat (Direction Disobedience)",
        "legal_reference": "MV Act Sec 119 & Sec 177A (Compulsory Ahead Directive)",
        "required_action": "You must proceed straight ahead only. Turning left or right is illegal.",
        "mistake_avoidance": "Attempting last-second turn into cross-street across multiple lanes."
    },
    24: {
        "penalty_info": "₹500 (1st) / ₹1,500 repeat (Direction Disobedience)",
        "legal_reference": "MV Act Sec 119 & Sec 177A (Compulsory Left Turn)",
        "required_action": "Mandatory left turn ahead. Proceeding straight or turning right is strictly prohibited.",
        "mistake_avoidance": "Missing dedicated turn lane and blocking following traffic."
    },
    25: {
        "penalty_info": "₹500 (1st) / ₹1,500 repeat (Direction Disobedience)",
        "legal_reference": "MV Act Sec 119 & Sec 177A (Compulsory Right Turn)",
        "required_action": "Mandatory right turn ahead. Proceeding straight or turning left is strictly prohibited.",
        "mistake_avoidance": "Failing to position vehicle in right-turning pocket before junction."
    },
    26: {
        "penalty_info": "₹500 (1st) / ₹1,500 repeat (Direction Disobedience)",
        "legal_reference": "MV Act Sec 119 & Sec 177A (Compulsory Ahead or Turn Left)",
        "required_action": "You must proceed straight ahead or turn left. Right turn is prohibited.",
        "mistake_avoidance": "Turning right against compulsory directional lane arrow."
    },
    27: {
        "penalty_info": "₹500 (1st) / ₹1,500 repeat (Direction Disobedience)",
        "legal_reference": "MV Act Sec 119 & Sec 177A (Compulsory Ahead or Turn Right)",
        "required_action": "You must proceed straight ahead or turn right. Left turn is prohibited.",
        "mistake_avoidance": "Cutting left across oncoming lane."
    },
    28: {
        "penalty_info": "₹500 (1st) / ₹1,500 repeat (Lane Discipline)",
        "legal_reference": "MV Act Sec 119 & Rules of Road Reg 2 (Keep Left Mandate)",
        "required_action": "Mandatory: Keep left of traffic island, bollard, or divider structure ahead.",
        "mistake_avoidance": "Colliding with concrete divider nose due to last-second lane indecision."
    },
    29: {
        "penalty_info": "₹500 (1st) / ₹1,500 repeat (Lane Discipline)",
        "legal_reference": "MV Act Sec 119 & Rules of Road Reg 2 (Keep Right Directive)",
        "required_action": "Mandatory: Pass obstacle or island on the right side as indicated.",
        "mistake_avoidance": "Entering closed construction lane to the left of directional barrier."
    },
    30: {
        "penalty_info": "₹500 (Failure to Sound Horn in Mountain Hazard)",
        "legal_reference": "MV Act Sec 119 & Sec 194F (Sound Horn on Blind Bend)",
        "required_action": "Mandatory: Sound horn before negotiating blind mountain curve or single-lane crest.",
        "mistake_avoidance": "Silent navigation into blind hairpin bend risking head-on collision with heavy truck."
    },
    31: {
        "penalty_info": "₹500 – ₹1,000 (Impeding Fast Highway Flow)",
        "legal_reference": "MV Act Sec 112(2) & Sec 177 (Minimum Speed Enforcement)",
        "required_action": "Mandatory minimum velocity 30 km/h under normal conditions. Do not crawl dangerously.",
        "mistake_avoidance": "Crawling at 15 km/h on active expressway creating rear-end collision hazard."
    },
    32: {
        "penalty_info": "₹1,000 (Encroaching Dedicated Cycle Track)",
        "legal_reference": "MV Act Sec 119 & Sec 177A (Exclusive Cycle Track)",
        "required_action": "Track reserved exclusively for pedal cycles. Motorized vehicles strictly banned.",
        "mistake_avoidance": "Two-wheelers riding on segregated cycle paths to bypass road congestion."
    },
    33: {
        "penalty_info": "₹500 (Pedestrian Crossing on Expressway)",
        "legal_reference": "MV Act Sec 115 & Sec 177 (Pedestrian Access Prohibition)",
        "required_action": "Pedestrians prohibited on high-speed carriageway. Use overbridges or underpasses.",
        "mistake_avoidance": "Jaywalking across 6-lane national expressway median."
    },
    34: {
        "penalty_info": "₹500 (Bicycle on Access-Controlled Highway)",
        "legal_reference": "MV Act Sec 115 & Sec 177 (Slow Vehicle Ban)",
        "required_action": "Pedal bicycles prohibited on high-speed expressway / flyover. Use service road.",
        "mistake_avoidance": "Cycling on high-velocity elevated flyover corridor."
    },
    35: {
        "penalty_info": "₹2,000 – ₹5,000 (Truck Restriction Zone Violation)",
        "legal_reference": "MV Act Sec 115 read with Sec 194 (Heavy Commercial Vehicle Ban)",
        "required_action": "Heavy trucks and commercial goods carriers prohibited during designated hours.",
        "mistake_avoidance": "Trucks entering city ring roads during morning peak hours (08:00–11:00)."
    },
    36: {
        "penalty_info": "₹1,000 – ₹2,000 (Motorized Vehicle Prohibition)",
        "legal_reference": "MV Act Sec 115 & Sec 177A (All Motor Vehicles Banned)",
        "required_action": "All motor vehicles prohibited. Pedestrians, cycles, and emergency vehicles only.",
        "mistake_avoidance": "Riding motorcycle into designated non-motorized shopping precinct."
    },
    37: {
        "penalty_info": "₹500 (Slow Non-Motorized Cart on Highway)",
        "legal_reference": "MV Act Sec 115 & Sec 177 (Bullock Cart Ban)",
        "required_action": "Bullock carts prohibited on arterial roadway. Divert to rural service tracks.",
        "mistake_avoidance": "Entering bypass road with slow draught animal carriage."
    },
    38: {
        "penalty_info": "₹500 (Hand Cart on Arterial Carriageway)",
        "legal_reference": "MV Act Sec 115 & Sec 177 (Hand Cart Ban)",
        "required_action": "Hand-pushed carts prohibited on main carriageway. Use service lane.",
        "mistake_avoidance": "Pushing heavily loaded cart on high-speed flyover."
    },
    39: {
        "penalty_info": "₹500 (Animal Drawn Carriage Ban)",
        "legal_reference": "MV Act Sec 115 & Sec 177 (Tonga Prohibition)",
        "required_action": "Horse-drawn tongas prohibited on arterial road. Access via local lanes.",
        "mistake_avoidance": "Operating horse carriage in dense motorized expressway interchange."
    },
    40: {
        "penalty_info": "₹20,000 (Over-Dimension Height Violation)",
        "legal_reference": "MV Act Sec 113 read with Sec 194(2) (Height Clearance Limit)",
        "required_action": "Vehicles exceeding 3.5m height prohibited. High risk of striking bridge/overhead wire.",
        "mistake_avoidance": "Driving loaded container or double-decker bus under low railway underpass."
    },
    41: {
        "penalty_info": "₹20,000 (Over-Dimension Width Violation)",
        "legal_reference": "MV Act Sec 113 read with Sec 194(2) (Width Envelope Limit)",
        "required_action": "Vehicles wider than 2.0m prohibited. Carriageway or narrow lane width restriction.",
        "mistake_avoidance": "Wide trailer entering old bridge or narrow toll gate lane."
    },
    42: {
        "penalty_info": "₹20,000 (Over-Dimension Length Violation)",
        "legal_reference": "MV Act Sec 113 read with Sec 194(2) (Length Turning Envelope)",
        "required_action": "Vehicles longer than 10.0m prohibited. Mountain curves cannot accommodate turning sweep.",
        "mistake_avoidance": "Multi-axle truck attempting sharp hairpin bend in ghat section."
    },
    43: {
        "penalty_info": "₹20,000 + ₹2,000/extra ton (Overloading)",
        "legal_reference": "MV Act Sec 113 read with Sec 194(1) (Gross Vehicle Weight Limit)",
        "required_action": "Vehicles with total gross weight exceeding 5 tonnes prohibited from bridge / roadway.",
        "mistake_avoidance": "Excess cargo overloading risking catastrophic structural bridge collapse."
    },
    44: {
        "penalty_info": "₹20,000 + ₹2,000/extra ton (Axle Load)",
        "legal_reference": "MV Act Sec 113 read with Sec 194(1) (Axle Weight Limit)",
        "required_action": "Axle weight exceeding 4 tonnes prohibited to prevent pavement & culvert destruction.",
        "mistake_avoidance": "Uneven weight distribution concentrating excessive tonnage on rear tandem axle."
    },
    45: {
        "penalty_info": "No Direct Fine (De-restriction Marker)",
        "legal_reference": "MV Act Schedule I (End of All Speed & Movement Restrictions)",
        "required_action": "Previous speed limits or overtaking prohibitions end. Resume general highway regulations.",
        "mistake_avoidance": "Accelerating wildly beyond statutory national speed limits."
    },
    # ── CAUTIONARY / WARNING SIGNS (46 to 86) ──
    46: {
        "penalty_info": "₹1,000 – ₹5,000 (Dangerous Driving on Curve)",
        "legal_reference": "MV Act Sec 184 & Schedule I (Right Hand Curve Warning)",
        "required_action": "Sharp right curve ahead. Decelerate to 30–40 km/h and stay strictly in your lane.",
        "mistake_avoidance": "Braking mid-corner causing centrifugal lateral skid."
    },
    47: {
        "penalty_info": "₹1,000 – ₹5,000 (Dangerous Driving on Curve)",
        "legal_reference": "MV Act Sec 184 & Schedule I (Left Hand Curve Warning)",
        "required_action": "Sharp left curve ahead. Reduce speed, keep left, and do not cross centerline.",
        "mistake_avoidance": "Drifting into oncoming lane on blind left turn."
    },
    48: {
        "penalty_info": "₹1,000 – ₹5,000 (Reckless Mountain Driving)",
        "legal_reference": "MV Act Sec 184 & Rules of Road Reg 12 (Right Hairpin Bend)",
        "required_action": "Acute 180° hairpin bend to right. Shift to low gear (1st or 2nd) and sound horn.",
        "mistake_avoidance": "Overtaking or speeding on hairpin turn blocking oncoming descending trucks."
    },
    49: {
        "penalty_info": "₹1,000 – ₹5,000 (Reckless Mountain Driving)",
        "legal_reference": "MV Act Sec 184 & Rules of Road Reg 12 (Left Hairpin Bend)",
        "required_action": "Acute 180° hairpin bend to left. Decelerate to 15–20 km/h, maintain lane positioning.",
        "mistake_avoidance": "Cutting across apex into oncoming descending traffic lane."
    },
    50: {
        "penalty_info": "₹1,000 – ₹5,000 (Reckless Driving on S-Curve)",
        "legal_reference": "MV Act Sec 184 & Schedule I (Right Reverse Bend)",
        "required_action": "Double reverse S-curve ahead turning right then left. Maintain steady decelerated pace.",
        "mistake_avoidance": "Accelerating prematurely between the first and second alternating curves."
    },
    51: {
        "penalty_info": "₹1,000 – ₹5,000 (Reckless Driving on S-Curve)",
        "legal_reference": "MV Act Sec 184 & Schedule I (Left Reverse Bend)",
        "required_action": "Double reverse S-curve ahead turning left then right. Do not overtake.",
        "mistake_avoidance": "Centrifugal drift on second bend due to excessive momentum."
    },
    52: {
        "penalty_info": "₹1,000 – ₹3,000 (Ghat Driving Hazard)",
        "legal_reference": "MV Act Sec 184 & Rules of Road Reg 12 (Steep Ascent)",
        "required_action": "Steep hill climb ahead. Shift to lower gear to maintain engine torque without stalling.",
        "mistake_avoidance": "Riding the clutch or stalling on steep grade causing roll-back into rear vehicle."
    },
    53: {
        "penalty_info": "₹1,000 – ₹3,000 (Freewheeling in Neutral Prohibition)",
        "legal_reference": "MV Act Sec 184 & Rules of Road Reg 12 (Steep Descent Hazard)",
        "required_action": "Steep downhill descent. Use engine braking in low gear. Do NOT freewheel in neutral.",
        "mistake_avoidance": "Coasting downhill in neutral causing brake fade and total brake failure."
    },
    54: {
        "penalty_info": "₹1,000 – ₹2,000 (Bottleneck Lane Discipline)",
        "legal_reference": "MV Act Sec 184 & Schedule I (Narrow Road Ahead)",
        "required_action": "Carriageway narrows ahead. Merge smoothly into single lane and yield to oncoming vehicles.",
        "mistake_avoidance": "Racing ahead to cut in front of adjacent vehicles at bottleneck entrance."
    },
    55: {
        "penalty_info": "₹1,000 (Unsafe Lane Weaving)",
        "legal_reference": "MV Act Sec 184 & Schedule I (Road Widening Ahead)",
        "required_action": "Carriageway widens ahead. Check rear-view mirrors before changing to newly opened lane.",
        "mistake_avoidance": "Abrupt lane swerve into blind spot without signaling."
    },
    56: {
        "penalty_info": "₹1,500 – ₹3,000 (Failure to Yield on Narrow Bridge)",
        "legal_reference": "MV Act Sec 119 read with Sec 184 (Narrow Bridge Priority)",
        "required_action": "Single-lane or narrow bridge ahead. Decelerate to 20 km/h; yield if heavy vehicle approaching.",
        "mistake_avoidance": "Entering bridge deck simultaneously with heavy freight vehicle."
    },
    57: {
        "penalty_info": "₹1,000 – ₹2,000 (Speeding on Low-Traction Road)",
        "legal_reference": "MV Act Sec 184 & Schedule I (Slippery Road Warning)",
        "required_action": "Road surface slippery due to rain/oil/mud. Avoid hard braking, sharp turns, or fast acceleration.",
        "mistake_avoidance": "Sudden heavy braking on wet surface triggering wheel lockup and vehicle spin."
    },
    58: {
        "penalty_info": "₹1,000 – ₹2,000 (Loose Gravel Speed Hazard)",
        "legal_reference": "MV Act Sec 184 & Schedule I (Loose Gravel Hazard)",
        "required_action": "Loose stones/gravel on road. Increase following distance to prevent windshield damage.",
        "mistake_avoidance": "Speeding over unpaved shoulder hurling sharp gravel stones into other vehicles."
    },
    59: {
        "penalty_info": "₹1,000 – ₹2,000 (Endangering Cyclists)",
        "legal_reference": "MV Act Sec 184 & Schedule I (Cycle Crossing Warning)",
        "required_action": "Frequent bicycle crossing ahead. Slow down and maintain 1.5m lateral passing clearance.",
        "mistake_avoidance": "Overtaking closely alongside pedal cyclists at high speed."
    },
    60: {
        "penalty_info": "₹1,000 – ₹2,000 (Failure to Yield at Zebra Crossing)",
        "legal_reference": "MV Act Sec 119 & Rules of Road Reg 22 (Pedestrian Right-of-Way)",
        "required_action": "Marked pedestrian crossing ahead. Prepare to halt; yield right-of-way to pedestrians at curb.",
        "mistake_avoidance": "Failing to stop when pedestrian has already stepped onto zebra stripes."
    },
    61: {
        "penalty_info": "₹1,000 – ₹5,000 (Reckless Speeding in School Zone)",
        "legal_reference": "MV Act Sec 112 & Sec 184 (School Safety Zone Enforcement)",
        "required_action": "School zone ahead. Strictly observe 25 km/h limit; watch for children crossing.",
        "mistake_avoidance": "Overtaking or sounding loud horns in school perimeter during opening/closing hours."
    },
    62: {
        "penalty_info": "₹1,000 – ₹5,000 (Junction Overspeeding / Signal Jump)",
        "legal_reference": "MV Act Sec 119 & Sec 184 (Traffic Light Approach)",
        "required_action": "Automated traffic signal ahead. Prepare to decelerate; anticipate amber signal phase.",
        "mistake_avoidance": "Accelerating aggressively to 'beat the yellow light' risking high-speed T-bone crash."
    },
    63: {
        "penalty_info": "₹1,000 (Livestock Collision Hazard)",
        "legal_reference": "MV Act Sec 184 & Schedule I (Cattle Crossing Hazard)",
        "required_action": "Cattle or stray livestock on road. Slow down; do not honk aggressively which startles animals.",
        "mistake_avoidance": "High-speed night cruising in rural agricultural sections where cattle rest on warm tarmac."
    },
    64: {
        "penalty_info": "₹1,000 (Stopping in Active Rockfall Slide Zone)",
        "legal_reference": "MV Act Sec 122 & Sec 184 (Falling Rocks Slide Zone)",
        "required_action": "Active landslide / falling rock face. Maintain vigilance, do not stop vehicle under cliff face.",
        "mistake_avoidance": "Parking under unstable slope during heavy monsoon rain to take photographs."
    },
    65: {
        "penalty_info": "₹1,000 – ₹2,000 (Waterbody Ramp Hazard)",
        "legal_reference": "MV Act Sec 184 & Schedule I (Ferry Approach Warning)",
        "required_action": "Ferry terminal or water ramp ahead. Decelerate to crawling speed; test vehicle brakes.",
        "mistake_avoidance": "Brake failure or loss of traction on slippery wet ferry boarding ramp."
    },
    66: {
        "penalty_info": "₹1,000 – ₹2,000 (Checkpoint Barrier Violation)",
        "legal_reference": "MV Act Sec 119 read with Sec 179 (Toll / Security Barrier)",
        "required_action": "Toll gate, border checkpost, or police barrier ahead. Bring vehicle to a complete halt.",
        "mistake_avoidance": "Crashing through automatic toll boom barrier due to excessive speed."
    },
    67: {
        "penalty_info": "₹1,000 – ₹5,000 (Endangering Road Construction Workers)",
        "legal_reference": "MV Act Sec 184 & Schedule I (Men at Work Safety Zone)",
        "required_action": "Road construction crew on carriageway. Obey temporary detour signs; limit speed to 25 km/h.",
        "mistake_avoidance": "Speeding through narrow work zone lanes lined with concrete barricades."
    },
    68: {
        "penalty_info": "₹1,000 – ₹3,000 (Failure to Yield in Roundabout)",
        "legal_reference": "MV Act Sec 119 & Rules of Road Reg 13 (Roundabout Priority)",
        "required_action": "Roundabout circulatory roadway ahead. Give way to traffic approaching from your right.",
        "mistake_avoidance": "Entering roundabout at high speed without yielding to vehicles already in circulatory ring."
    },
    69: {
        "penalty_info": "₹1,000 (Culvert Bottoming Out / Vehicle Damage)",
        "legal_reference": "MV Act Sec 184 & Schedule I (Dangerous Dip Warning)",
        "required_action": "Sudden road depression or causeway dip ahead. Decelerate to avoid undercarriage impact.",
        "mistake_avoidance": "Hitting dip at high velocity causing airbag deployment or severe bumper bottom-out."
    },
    70: {
        "penalty_info": "₹1,000 (Speed Breaker Impact Hazard)",
        "legal_reference": "MV Act Sec 184 & Schedule I (Speed Breaker Warning)",
        "required_action": "Road hump ahead. Decelerate to 15–20 km/h and cross with both wheels aligned.",
        "mistake_avoidance": "Failing to spot unpainted speed bump at night causing suspension destruction."
    },
    71: {
        "penalty_info": "₹1,000 – ₹2,000 (Median Gap Obstruction)",
        "legal_reference": "MV Act Sec 119 & Sec 177A (Median Opening Approach)",
        "required_action": "Median opening ahead. Watch for turning or crossing vehicles entering your carriageway.",
        "mistake_avoidance": "Blocking opposing lane while waiting for traffic gap."
    },
    72: {
        "penalty_info": "₹1,000 – ₹3,000 (Crossroad Right-of-Way Violation)",
        "legal_reference": "MV Act Sec 119 & Rules of Road Reg 14 (Four-Way Intersection)",
        "required_action": "Major four-way crossroad ahead. Decelerate, scan all quadrants, yield to priority roadway.",
        "mistake_avoidance": "Crossing intersection without checking oncoming traffic in cross-street."
    },
    73: {
        "penalty_info": "₹1,000 – ₹2,000 (Unsafe Merging from Left)",
        "legal_reference": "MV Act Sec 119 & Rules of Road Reg 14 (Side Road Left)",
        "required_action": "Side road joins from left. Watch for emerging vehicles and motorcyclists.",
        "mistake_avoidance": "Failing to check blind spot when vehicles merge from side alley."
    },
    74: {
        "penalty_info": "₹1,000 – ₹2,000 (Unsafe Merging from Right)",
        "legal_reference": "MV Act Sec 119 & Rules of Road Reg 14 (Side Road Right)",
        "required_action": "Side road joins from right. Watch for vehicles executing right turns into your lane.",
        "mistake_avoidance": "Driving at excessive speed in right lane past unmonitored intersection."
    },
    75: {
        "penalty_info": "₹1,000 – ₹2,000 (Staggered Junction Merging)",
        "legal_reference": "MV Act Sec 119 & Rules of Road Reg 14 (Staggered Intersection)",
        "required_action": "Two closely-spaced side junctions on left and right. Anticipate weaving maneuvers.",
        "mistake_avoidance": "Overtaking vehicles that are decelerating to make staggered turns."
    },
    76: {
        "penalty_info": "₹1,000 – ₹3,000 (T-Junction Failure to Yield)",
        "legal_reference": "MV Act Sec 119 & Rules of Road Reg 14 (T-Intersection Dead End)",
        "required_action": "Road ends at T-intersection. You must turn left or right; give way to through traffic.",
        "mistake_avoidance": "Failing to stop at T-junction and overshooting across opposite curb."
    },
    77: {
        "penalty_info": "₹1,000 – ₹2,000 (Y-Junction Fork Indecision)",
        "legal_reference": "MV Act Sec 119 & Schedule I (Y-Intersection Fork)",
        "required_action": "Road forks into two branches. Choose your designated lane early and do not swerve.",
        "mistake_avoidance": "Sudden lane straddling at fork divider nose."
    },
    78: {
        "penalty_info": "₹1,000 – ₹2,000 (Branch Merging Hazard)",
        "legal_reference": "MV Act Sec 119 & Schedule I (Y-Intersection Left Branch)",
        "required_action": "Left road fork diverges. Traffic continuing straight has priority; signal before exiting.",
        "mistake_avoidance": "Exiting fork from right-hand through lane."
    },
    79: {
        "penalty_info": "₹1,000 – ₹2,000 (Branch Merging Hazard)",
        "legal_reference": "MV Act Sec 119 & Schedule I (Y-Intersection Right Branch)",
        "required_action": "Right road fork diverges. Position vehicle in right lane well before the junction.",
        "mistake_avoidance": "Abrupt lane dive across heavy traffic to reach right exit."
    },
    80: {
        "penalty_info": "₹1,000 – ₹3,000 (Entering Priority Highway Without Yielding)",
        "legal_reference": "MV Act Sec 119 & Rules of Road Reg 13 (Major Road Ahead)",
        "required_action": "You are on a minor road approaching major arterial highway. Prepare to stop and yield.",
        "mistake_avoidance": "Entering major multi-lane highway at full speed without stopping."
    },
    81: {
        "penalty_info": "₹2,000 – ₹5,000 & up to 1 yr jail (Railway Gate Barrier Jump)",
        "legal_reference": "Indian Railways Act Sec 160 & MV Act Sec 184 (Guarded Level Crossing)",
        "required_action": "Railway level crossing with barrier gates. Bring vehicle to a complete halt when gate descends.",
        "mistake_avoidance": "Attempting to duck under lowering boom barrier before oncoming high-speed train."
    },
    82: {
        "penalty_info": "₹2,000 – ₹5,000 (Failure to Stop, Look, Listen at Unmanned Crossing)",
        "legal_reference": "MV Act Sec 131 read with Sec 184 (Unguarded Railway Crossing Mandate)",
        "required_action": "Unguarded railway crossing (no gates/signals). You MUST halt, look in both directions, and listen.",
        "mistake_avoidance": "Crossing railway tracks with loud in-cabin music or fog obstructing train vision."
    },
    83: {
        "penalty_info": "₹1,000 (High-Speed Crosswind Stability Violation)",
        "legal_reference": "MV Act Sec 184 & Schedule I (Sudden Crosswind Warning)",
        "required_action": "Exposed bridge / coastal viaduct with sudden lateral gale winds. Firmly grip steering wheel.",
        "mistake_avoidance": "Oversteering when exiting sheltered cutting into open windy viaduct."
    },
    84: {
        "penalty_info": "₹2,000 – ₹20,000 (High-Voltage Overhead Wire Contact Hazard)",
        "legal_reference": "MV Act Sec 113 read with Sec 194(2) (Overhead Electrical Hazard)",
        "required_action": "Low-slung high-voltage overhead transmission cables. Ensure high vehicle cargo does not contact.",
        "mistake_avoidance": "Carrying untethered metal antennas, poles, or high loads near live electric lines."
    },
    85: {
        "penalty_info": "₹1,000 – ₹2,000 (Waterfront Driving Hazard)",
        "legal_reference": "MV Act Sec 184 & Schedule I (Quay Side / Unfenced Riverbank)",
        "required_action": "Unfenced waterfront, canal bank, or harbor quay ahead. Extreme care required in fog/night.",
        "mistake_avoidance": "Reversing towards water edge without banksman guide."
    },
    86: {
        "penalty_info": "₹1,000 – ₹5,000 (Reckless Speeding in Children's Area)",
        "legal_reference": "MV Act Sec 184 & Schedule I (Playground Ahead Hazard)",
        "required_action": "Recreational park or children's playground adjacent to roadway. Crawl speed required.",
        "mistake_avoidance": "Speeding past parked cars where children may chase balls onto road."
    },
    # ── INFORMATORY & FACILITY SIGNS (87 to 107) ──
    87: {
        "penalty_info": "Facility Service (₹500 if blocking emergency access)",
        "legal_reference": "MV Act Schedule I (Public Telephone Service Guidance)",
        "required_action": "Public telephone communication facility available. Park in designated bay.",
        "mistake_avoidance": "Stopping on highway traffic lane to access public booth."
    },
    88: {
        "penalty_info": "Fuel Service (₹500 – ₹1,000 if blocking highway apron)",
        "legal_reference": "MV Act Schedule I (Petrol / Fuel Filling Station)",
        "required_action": "Fuel station ahead on left. Move to deceleration lane before turning.",
        "mistake_avoidance": "Sharp turn across highway lane to enter petrol pump forecourt."
    },
    89: {
        "penalty_info": "Medical Facility (₹1,000 – ₹10,000 if blocking ambulance lane)",
        "legal_reference": "MV Act Sec 194E & Schedule I (Hospital Zone Advisory)",
        "required_action": "Hospital ahead. Keep noise to minimum; give right-of-way unconditionally to ambulances.",
        "mistake_avoidance": "Honking or blocking emergency trauma center entrance."
    },
    90: {
        "penalty_info": "Emergency Care (₹500 if stopping improperly)",
        "legal_reference": "MV Act Schedule I (First Aid Medical Post)",
        "required_action": "Emergency medical first aid center available for highway trauma support.",
        "mistake_avoidance": "Abrupt braking in fast lane upon spotting medical facility."
    },
    91: {
        "penalty_info": "Rest & Dining (₹500 if parked outside service bay)",
        "legal_reference": "MV Act Schedule I (Highway Restaurant / Food Court)",
        "required_action": "Full-service highway dining facility. Use designated service road for parking.",
        "mistake_avoidance": "Leaving vehicle parked on highway paved shoulder while dining."
    },
    92: {
        "penalty_info": "Refreshment Point (₹500 if parked on shoulder)",
        "legal_reference": "MV Act Schedule I (Light Refreshment / Tea Kiosk)",
        "required_action": "Light refreshment / beverage service. Park safely off the main carriageway.",
        "mistake_avoidance": "Double parking on arterial street near roadside tea vendor."
    },
    93: {
        "penalty_info": "Driver Fatigue Relief (Wayfinding Service)",
        "legal_reference": "MV Act Schedule I (Highway Rest Area / Lay-by)",
        "required_action": "Designated rest area for fatigued drivers. Pull in to prevent highway sleep deprivation.",
        "mistake_avoidance": "Sleeping on highway active shoulder instead of driving into rest bay."
    },
    94: {
        "penalty_info": "Sanitation Facility (Wayfinding Service)",
        "legal_reference": "MV Act Schedule I (Public Toilet / Restroom)",
        "required_action": "Public convenience and sanitation facilities ahead. Park in marked stalls.",
        "mistake_avoidance": "Stopping vehicle in blind curve to access restroom."
    },
    95: {
        "penalty_info": "₹500 – ₹1,500 (Stopping in Dedicated Bus Stop Bay)",
        "legal_reference": "MV Act Sec 122 & Sec 177A (Designated Bus Bay)",
        "required_action": "Public transport bus stop. Private vehicles must not park or idle in bus bay.",
        "mistake_avoidance": "Private cars blocking bus bay forcing city buses to board in active traffic lane."
    },
    96: {
        "penalty_info": "Transit Terminal (₹500 if parked in drop-off lane)",
        "legal_reference": "MV Act Schedule I (Railway Station Access Guidance)",
        "required_action": "Railway station access ahead. Follow pick-up/drop-off lane markings.",
        "mistake_avoidance": "Unattended parking in active passenger drop-off lane."
    },
    97: {
        "penalty_info": "Law Enforcement (₹1,000 if obstructing entry)",
        "legal_reference": "MV Act Schedule I (Police Station / Assistance Post)",
        "required_action": "Police station / highway patrol outpost. Assistance and dispute reporting available.",
        "mistake_avoidance": "Parking vehicle obstructing police emergency response vehicles."
    },
    98: {
        "penalty_info": "₹1,000 – ₹10,000 (Obstructing Fire Emergency Vehicles)",
        "legal_reference": "MV Act Sec 194E & Schedule I (Fire Brigade Station)",
        "required_action": "Fire station ahead. Keep yellow hatched box junction outside fire doors clear at all times.",
        "mistake_avoidance": "Stopping in front of fire engine exit bay during traffic gridlock."
    },
    99: {
        "penalty_info": "₹500 (Private Vehicle Parking in Taxi Bay)",
        "legal_reference": "MV Act Sec 122 & Schedule I (Designated Taxi Stand)",
        "required_action": "Authorized commercial taxi rank. Private vehicles prohibited from occupying stalls.",
        "mistake_avoidance": "Private car parking in taxi stand queue."
    },
    100: {
        "penalty_info": "₹500 (Private Vehicle Parking in Auto Bay)",
        "legal_reference": "MV Act Sec 122 & Schedule I (Auto Rickshaw Stand)",
        "required_action": "Designated three-wheeler auto rickshaw stand. Keep access lane clear.",
        "mistake_avoidance": "Parking personal vehicle across auto rickshaw entrance."
    },
    101: {
        "penalty_info": "Free in Marked Bay (₹500 if outside bay line)",
        "legal_reference": "MV Act Sec 122 & Schedule I (Authorized Parking Area)",
        "required_action": "Designated parking area. Park strictly within painted white stall boundaries.",
        "mistake_avoidance": "Straddling two parking bays or parking perpendicular in parallel lot."
    },
    102: {
        "penalty_info": "Free in Marked Bay (₹500 if parked outside lines)",
        "legal_reference": "MV Act Sec 122 & Schedule I (Parking Permitted on Both Sides)",
        "required_action": "Parking authorized on both sides of carriageway within demarcated spaces.",
        "mistake_avoidance": "Double-banking parking next to already parked vehicle."
    },
    103: {
        "penalty_info": "Dedicated Cycle Parking (₹500 if motor vehicle parked)",
        "legal_reference": "MV Act Sec 122 & Schedule I (Bicycle Parking Stand)",
        "required_action": "Stand reserved exclusively for pedal cycles.",
        "mistake_avoidance": "Motorcycle parked inside pedal bicycle rack."
    },
    104: {
        "penalty_info": "Designated 2-Wheeler Lot (₹500 if 4-wheeler parked)",
        "legal_reference": "MV Act Sec 122 & Schedule I (Motorcycle Parking Area)",
        "required_action": "Parking reserved exclusively for two-wheelers and scooters.",
        "mistake_avoidance": "Cars encroaching onto designated motorcycle parking curb."
    },
    105: {
        "penalty_info": "Designated Car Lot (₹500 if parked outside stall)",
        "legal_reference": "MV Act Sec 122 & Schedule I (Car Parking Area)",
        "required_action": "Parking area authorized for 4-wheel passenger cars and SUVs.",
        "mistake_avoidance": "Heavy trucks occupying passenger car parking spaces."
    },
    106: {
        "penalty_info": "Dead End Advisory (No Violation Fine)",
        "legal_reference": "MV Act Schedule I (No Through Road Wayfinding)",
        "required_action": "Dead end / no outlet road ahead. Turn around if looking for throughway.",
        "mistake_avoidance": "Driving at high speed down dead-end street expecting continuous highway outlet."
    },
    107: {
        "penalty_info": "Dead End Advisory (No Violation Fine)",
        "legal_reference": "MV Act Schedule I (No Through Side Road Wayfinding)",
        "required_action": "Side road to the right/left leads to a dead-end cul-de-sac with no thoroughfare.",
        "mistake_avoidance": "Turning heavy goods vehicle into narrow dead-end side lane unable to reverse."
    }
}

# 1. Update SQLite database aerovision.db
