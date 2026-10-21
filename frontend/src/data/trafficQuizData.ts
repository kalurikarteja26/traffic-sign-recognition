// frontend/src/data/trafficQuizData.ts
// Comprehensive Traffic Rules & Regulations Learning and Quiz Question Bank

export interface TrafficQuizQuestion {
  id: number;
  category: string;
  question: string;
  options: { id: number; text: string }[];
  correct_answer: number;
  legal_reference: string;
  penalty_info: string;
  teaching_tip: string;
  explanation: string;
}

export const TRAFFIC_RULES_QUIZ_BANK: TrafficQuizQuestion[] = [
  {
    "id": 1,
    "category": "Traffic Signs",
    "question": "What is the mandatory action required when encountering an octagonal red 'STOP' sign (IRC:67-M01)?",
    "options": [
      {
        "id": 0,
        "text": "Slow down to 10 km/h and proceed if no traffic is visible"
      },
      {
        "id": 1,
        "text": "Bring the vehicle to a complete 0 km/h halt before the stop line, observe traffic, and proceed only when clear"
      },
      {
        "id": 2,
        "text": "Sound horn continuously and cross without stopping"
      },
      {
        "id": 3,
        "text": "Stop only if an enforcement officer is visible"
      }
    ],
    "correct_answer": 1,
    "legal_reference": "Motor Vehicles Act 1988 \u2014 Section 119 & IRC:67-2012 (Code M01)",
    "penalty_info": "\u20b91,000 to \u20b95,000 for signal jumping / dangerous driving (Section 184)",
    "teaching_tip": "Rule of Law: The Stop sign is the only octagonal sign on Indian roads so it remains unmistakable even when covered in mud or snow. A 'rolling stop' (creeping at 5 km/h) is legally classified as jumping a red signal.",
    "explanation": "Section 119 of the Motor Vehicles Act mandates coming to a full 0 km/h halt behind the stop line. A 'rolling stop' is treated as signal jumping, carrying a penalty of \u20b91,000\u2013\u20b95,000."
  },
  {
    "id": 2,
    "category": "Traffic Signs",
    "question": "What is the legal mandate when encountering a triangular inverted 'GIVE WAY' (Yield) sign (IRC:67-M02)?",
    "options": [
      {
        "id": 0,
        "text": "Vehicles on your subsidiary road have right-of-way over highway traffic"
      },
      {
        "id": 1,
        "text": "Yield priority to all vehicles moving on the major road or circulatory roundabout before entering"
      },
      {
        "id": 2,
        "text": "Accelerate to merge quickly into traffic before oncoming vehicles arrive"
      },
      {
        "id": 3,
        "text": "Vehicles on the major priority road must stop for you"
      }
    ],
    "correct_answer": 1,
    "legal_reference": "Rules of the Road Regulations 1989 \u2014 Regulation 13 & IRC:67 (Code M02)",
    "penalty_info": "\u20b91,000 to \u20b93,000 (Failure to yield right of way)",
    "teaching_tip": "Rule of Law: Inverted triangle is uniquely reserved for Give Way / Yield. You do not always have to come to a dead stop if the major carriageway is entirely clear, but you must decelerate and yield unconditionally to through traffic.",
    "explanation": "The Give Way sign requires drivers on subsidiary roads to yield right-of-way to vehicles on the priority roadway or roundabout before merging (Regulation 13 of Rules of the Road)."
  },
  {
    "id": 3,
    "category": "Traffic Signs",
    "question": "What does a circular sign with a red border containing '50' indicate under Section 112 of the Motor Vehicles Act?",
    "options": [
      {
        "id": 0,
        "text": "Minimum recommended speed is 50 km/h"
      },
      {
        "id": 1,
        "text": "Maximum permissible legal speed limit is 50 km/h under normal road conditions"
      },
      {
        "id": 2,
        "text": "Distance to the next highway junction is 50 kilometers"
      },
      {
        "id": 3,
        "text": "Speed limit applies only to heavy commercial transport vehicles"
      }
    ],
    "correct_answer": 1,
    "legal_reference": "Motor Vehicles Act 1988 \u2014 Section 112 & Section 183",
    "penalty_info": "\u20b91,000\u2013\u20b92,000 (Light Motor Vehicle), \u20b92,000\u2013\u20b94,000 (Commercial/Heavy Vehicle) + DL impoundment",
    "teaching_tip": "Rule of Law: All circular signs with red outer rings are mandatory prohibitory regulations. The number represents the absolute ceiling speed. In wet weather or fog, you must drive significantly below this posted ceiling.",
    "explanation": "Circular signs with red borders are mandatory regulatory signs. '50' denotes the statutory maximum speed limit. Exceeding it triggers automated over-speeding citations under Section 183."
  },
  {
    "id": 4,
    "category": "Traffic Signs",
    "question": "What is the key regulatory difference between a circular blue sign with a white right arrow vs a rectangular blue sign with a right arrow?",
    "options": [
      {
        "id": 0,
        "text": "Circular blue is mandatory (Compulsory Turn Right Ahead), whereas rectangular blue is informatory route guidance"
      },
      {
        "id": 1,
        "text": "Circular blue is a warning, whereas rectangular blue is a speed recommendation"
      },
      {
        "id": 2,
        "text": "Both indicate optional turns with no legal requirement"
      },
      {
        "id": 3,
        "text": "Rectangular blue prohibits turning right under all circumstances"
      }
    ],
    "correct_answer": 0,
    "legal_reference": "IRC:67-2012 Categorization Standards (Mandatory vs Informatory)",
    "penalty_info": "\u20b91,000 under Section 177 for disobeying mandatory directional arrows",
    "teaching_tip": "Rule of Law: Color and Shape Hierarchy \u2014 Circles with blue backgrounds and white symbols represent 'Mandatory Positive Instructions' (you MUST obey). Blue rectangles represent 'Informatory & Wayfinding' advice.",
    "explanation": "IRC:67 dictates that circular blue discs with white symbols are Mandatory Regulatory directives (must obey), whereas rectangular blue signs provide non-mandatory route guidance."
  },
  {
    "id": 5,
    "category": "Traffic Signs",
    "question": "Encountering a circular red disc with a single horizontal white bar indicates:",
    "options": [
      {
        "id": 0,
        "text": "End of speed restriction zone"
      },
      {
        "id": 1,
        "text": "No Entry for all vehicular traffic into the carriageway"
      },
      {
        "id": 2,
        "text": "Parking permitted for two-wheelers only"
      },
      {
        "id": 3,
        "text": "Toll plaza barrier approaching ahead"
      }
    ],
    "correct_answer": 1,
    "legal_reference": "Motor Vehicles Act 1988 \u2014 Section 119 / IRC:67 (Sign Code M03)",
    "penalty_info": "\u20b91,000\u2013\u20b95,000 under Section 184 (Dangerous Driving against traffic stream)",
    "teaching_tip": "Rule of Law: Driving past a No Entry sign enters a one-way contraflow or pedestrian street, multiplying head-on collision risk by over 1200%. Automated ANPR cameras instantly book this as Section 184 dangerous driving.",
    "explanation": "The 'No Entry' sign prohibits all vehicles from proceeding past that point. Driving against it constitutes one-way violation and dangerous driving under Section 184."
  },
  {
    "id": 6,
    "category": "Traffic Signs",
    "question": "What does a circular sign with a red border showing a horn symbol with a diagonal red slash across it mandate?",
    "options": [
      {
        "id": 0,
        "text": "Sound horn continuously to alert pedestrians"
      },
      {
        "id": 1,
        "text": "Horn prohibited (Silence Zone) \u2014 sounding horn is illegal except to avert imminent danger"
      },
      {
        "id": 2,
        "text": "Faulty horn check station ahead"
      },
      {
        "id": 3,
        "text": "Two-stroke vehicles prohibited"
      }
    ],
    "correct_answer": 1,
    "legal_reference": "Motor Vehicles (Amendment) Act 2019 \u2014 Section 194F & Noise Pollution Rules",
    "penalty_info": "\u20b91,000 for 1st offense, \u20b92,000 for subsequent offenses",
    "teaching_tip": "Rule of Law: Silence zones are designated within 100 meters around hospitals, nursing homes, educational institutions, and courts of law. Unnecessary honking causes acute patient distress and acoustic trauma.",
    "explanation": "Section 194F penalizes unwarranted honking and driving with unauthorized multi-tone horns. In designated silence zones, honking is strictly prohibited by law."
  },
  {
    "id": 7,
    "category": "Traffic Signs",
    "question": "What is the meaning of an equilateral triangle with its apex pointing upward and a red border showing a car skidding with wavy tracks?",
    "options": [
      {
        "id": 0,
        "text": "Washing station 500m ahead"
      },
      {
        "id": 1,
        "text": "Slippery road ahead \u2014 reduce velocity, increase following distance, and avoid abrupt steering or braking"
      },
      {
        "id": 2,
        "text": "Motor racing circuit ahead"
      },
      {
        "id": 3,
        "text": "Curved roadway with banking"
      }
    ],
    "correct_answer": 1,
    "legal_reference": "IRC:67-2012 Cautionary Signs (Code W13)",
    "penalty_info": "Advisory sign; failure to decelerate leading to an accident triggers Section 184",
    "teaching_tip": "Rule of Law: Upward-pointing triangles are Cautionary (Warning) signs. They warn of hazards where road friction drops drastically (e.g. wet oil residue, loose gravel, or ice). Decelerate smoothly without stabbing the brakes.",
    "explanation": "Cautionary signs inform drivers of hazardous conditions ahead. Slippery road warnings indicate reduced friction coefficients, demanding early deceleration and extended following gaps."
  },
  {
    "id": 8,
    "category": "Right of Way",
    "question": "When approaching a multi-lane roundabout (rotary) without traffic signal lights, who has legal right of way?",
    "options": [
      {
        "id": 0,
        "text": "Vehicles entering the roundabout have right-of-way over circulating traffic"
      },
      {
        "id": 1,
        "text": "Vehicles already circulating inside the roundabout approaching from your right have priority"
      },
      {
        "id": 2,
        "text": "The largest vehicle or heavy freight bus always has unconditional right-of-way"
      },
      {
        "id": 3,
        "text": "Whoever sounds their horn first gets priority"
      }
    ],
    "correct_answer": 1,
    "legal_reference": "Rules of the Road Regulations 1989 \u2014 Regulation 14 (Roundabout Etiquette)",
    "penalty_info": "\u20b91,000 for failure to yield priority (Section 177)",
    "teaching_tip": "Rule of Law: 'Give Way to the Right' is the foundation of roundabout safety in India. Traffic already inside the rotary is clearing the junction; forcing your way in causes circular gridlock.",
    "explanation": "Under Regulation 14 of the Rules of the Road Regulations, drivers entering a roundabout must yield right-of-way to vehicles already circulating within the roundabout on their right."
  },
  {
    "id": 9,
    "category": "Right of Way",
    "question": "At an uncontrolled 4-way crossroad where vehicles arrive simultaneously without signals or police, what is the right-of-way rule?",
    "options": [
      {
        "id": 0,
        "text": "Faster vehicles have priority over slower vehicles"
      },
      {
        "id": 1,
        "text": "Yield right-of-way to vehicles approaching from your right ('Give Way to the Right' rule)"
      },
      {
        "id": 2,
        "text": "The driver making a right turn has priority over straight-moving traffic"
      },
      {
        "id": 3,
        "text": "Flash high-beam headlights and proceed simultaneously"
      }
    ],
    "correct_answer": 1,
    "legal_reference": "Rules of the Road Regulations 1989 \u2014 Regulation 8 & 12",
    "penalty_info": "\u20b91,000 (Dangerous junction entry)",
    "teaching_tip": "Rule of Law: In left-hand drive countries, if no signals, signs, or cops are present, traffic from your right has statutory priority. Approach at walking speed, look right, look left, look right again.",
    "explanation": "In Indian traffic law (left-hand driving system), at uncontrolled junctions without signs or lights, drivers must give way to traffic approaching from their right."
  },
  {
    "id": 10,
    "category": "Right of Way",
    "question": "When turning right across an opposing lane of oncoming traffic at a junction, who has priority?",
    "options": [
      {
        "id": 0,
        "text": "The vehicle turning right has priority"
      },
      {
        "id": 1,
        "text": "Oncoming straight-through traffic has priority; the right-turning driver must wait until the opposing lane is clear"
      },
      {
        "id": 2,
        "text": "The vehicle with high-beam on has priority"
      },
      {
        "id": 3,
        "text": "Turn right immediately without checking opposing traffic"
      }
    ],
    "correct_answer": 1,
    "legal_reference": "Rules of the Road Regulations 1989 \u2014 Regulation 12 (Turning Traffic)",
    "penalty_info": "\u20b91,000\u2013\u20b95,000 for unsafe lane cut / head-on collision liability",
    "teaching_tip": "Rule of Law: Vehicles continuing straight in their established lane maintain absolute right-of-way. Turning right across opposing flow cuts across oncoming traffic; you must yield until a safe gap exists.",
    "explanation": "Drivers changing direction across oncoming lanes must yield right-of-way to all oncoming vehicles, cyclists, and pedestrians proceeding straight."
  },
  {
    "id": 11,
    "category": "Right of Way",
    "question": "On narrow mountain roads or steep hill gradients where passing is difficult, who has statutory right of way?",
    "options": [
      {
        "id": 0,
        "text": "The vehicle driving downhill has priority because of momentum"
      },
      {
        "id": 1,
        "text": "The vehicle driving uphill has priority; the descending driver must pull over and give way"
      },
      {
        "id": 2,
        "text": "Whoever flashes headlights first has priority"
      },
      {
        "id": 3,
        "text": "Heavier vehicles always have priority regardless of gradient"
      }
    ],
    "correct_answer": 1,
    "legal_reference": "Rules of the Road Regulations 1989 \u2014 Regulation 15 (Hill Roads)",
    "penalty_info": "\u20b91,000\u2013\u20b92,000 (Reckless ghat driving)",
    "teaching_tip": "Rule of Law: Stopping and restarting an uphill vehicle on steep inclines carries severe roll-back risk and clutch burnout. Downhill vehicles have gravity on their side and can halt with less mechanical hazard.",
    "explanation": "Regulation 15 explicitly mandates that vehicles ascending a hill have priority. Descending vehicles must halt or pull into passing lay-bys to permit ascending vehicles safe passage."
  },
  {
    "id": 12,
    "category": "Right of Way",
    "question": "What is the mandatory action when encountering a flashing yellow traffic light at an intersection?",
    "options": [
      {
        "id": 0,
        "text": "Halt completely, turn off engine, and wait for green"
      },
      {
        "id": 1,
        "text": "Slow down significantly, scan in all directions, and proceed through with caution"
      },
      {
        "id": 2,
        "text": "Speed up to clear the intersection quickly"
      },
      {
        "id": 3,
        "text": "Honk continuously and cross at full speed"
      }
    ],
    "correct_answer": 1,
    "legal_reference": "Motor Vehicles Act 1988 \u2014 Section 119 & IRC:SP:12 (Traffic Signal Code)",
    "penalty_info": "\u20b91,000 for speeding through cautionary intersection beacon",
    "teaching_tip": "Rule of Law: Flashing Yellow = 'Caution: Yield to Crossing Hazard'. Flashing Red = 'Complete Halt (equivalent to Stop sign) before proceeding'.",
    "explanation": "Flashing amber/yellow beacons signal an active junction hazard where signals are on night or standby mode. Decelerate, yield to pedestrians and crossing vehicles, and cross with heightened vigilance."
  },
  {
    "id": 13,
    "category": "Right of Way",
    "question": "When entering an expressway or dual-carriageway national highway from an acceleration slip-ramp, who has right of way?",
    "options": [
      {
        "id": 0,
        "text": "Entering vehicles have priority; expressway vehicles must brake to accommodate you"
      },
      {
        "id": 1,
        "text": "Through traffic already cruising on the expressway has unconditional priority; merging vehicles must adjust speed and yield"
      },
      {
        "id": 2,
        "text": "Vehicles in both lanes must stop side-by-side"
      },
      {
        "id": 3,
        "text": "The vehicle with emergency hazard flashers turned on has priority"
      }
    ],
    "correct_answer": 1,
    "legal_reference": "Rules of the Road Regulations 1989 \u2014 Regulation 17 (Expressway Merging)",
    "penalty_info": "\u20b92,000 for dangerous expressway entry cutoff",
    "teaching_tip": "Rule of Law: High-speed expressway mainline vehicles cannot decelerate instantly. Use the full length of the acceleration slip-lane to match mainline cruising speed and merge into an open gap without impeding through traffic.",
    "explanation": "Expressway through traffic has right-of-way. Merging vehicles must use the acceleration lane to match highway speed and merge smoothly without causing existing traffic to brake sharply."
  },
  {
    "id": 14,
    "category": "Pedestrians & Safety",
    "question": "When a pedestrian is waiting at or stepping onto a marked Zebra crossing, what is the driver's statutory duty?",
    "options": [
      {
        "id": 0,
        "text": "Sound horn to instruct pedestrian to wait until your vehicle passes"
      },
      {
        "id": 1,
        "text": "Slow down and bring the vehicle to a complete halt before the stop line to let the pedestrian cross safely"
      },
      {
        "id": 2,
        "text": "Swerve around the pedestrian into the opposite lane"
      },
      {
        "id": 3,
        "text": "Accelerate to clear the crossing before the pedestrian reaches your lane"
      }
    ],
    "correct_answer": 1,
    "legal_reference": "Rules of the Road Regulations 1989 \u2014 Regulation 22 (Pedestrian Crossings)",
    "penalty_info": "\u20b91,000 fine under Section 177 + license demerit penalty points",
    "teaching_tip": "Rule of Law: Marked pedestrian crossings grant pedestrians absolute legal protection. Blocking a zebra crossing or intimidation by honking is a direct violation of statutory human safety rights.",
    "explanation": "Regulation 22 of the Rules of the Road Regulations mandates that pedestrians on marked crossings have absolute right-of-way. Failure to yield attracts a fine of \u20b91,000 and demerit points."
  },
  {
    "id": 15,
    "category": "Pedestrians & Safety",
    "question": "When approaching a stationary school bus with blinking hazard lights or 'School Bus' signage stopped at the roadside:",
    "options": [
      {
        "id": 0,
        "text": "Overtake at full speed while sounding your horn"
      },
      {
        "id": 1,
        "text": "Decelerate to walking pace, prepare to halt instantly, and anticipate children darting across the road"
      },
      {
        "id": 2,
        "text": "Flash high-beam headlights to alert children"
      },
      {
        "id": 3,
        "text": "Force your way around the right side without slowing down"
      }
    ],
    "correct_answer": 1,
    "legal_reference": "Central Motor Vehicles Rules 1989 \u2014 School Bus Safety Mandates",
    "penalty_info": "\u20b92,000 to \u20b95,000 under Section 184 (Endangering child pedestrians)",
    "teaching_tip": "Rule of Law: Children have limited peripheral vision and impaired velocity estimation. They frequently cross in front of or behind school buses where drivers have severe blind spots.",
    "explanation": "Stationary school buses indicate vulnerable children boarding or alighting. Drivers must decelerate to a crawl and be prepared to stop instantly if a child emerges from behind the bus."
  },
  {
    "id": 16,
    "category": "Pedestrians & Safety",
    "question": "What is the minimum safe lateral clearance required when overtaking a bicyclist or two-wheeler rider on an urban or rural carriageway?",
    "options": [
      {
        "id": 0,
        "text": "At least 1.5 meters (5 feet) of lateral clearance"
      },
      {
        "id": 1,
        "text": "10 to 20 centimeters is sufficient"
      },
      {
        "id": 2,
        "text": "No clearance needed if you stay inside the lane markings"
      },
      {
        "id": 3,
        "text": "Just close enough to hear their bell"
      }
    ],
    "correct_answer": 0,
    "legal_reference": "IRC:103 Guidelines for Pedestrian & Non-Motorized Transport Facilities",
    "penalty_info": "\u20b91,000\u2013\u20b95,000 for unsafe overtaking and side-swiping hazard",
    "teaching_tip": "Rule of Law: Bicyclists must steer around potholes, drain grates, and wind gusts. Passing closer than 1.5 meters can cause aerodynamic suction that destabilizes riders into your wheels.",
    "explanation": "Defensive driving and IRC standards require providing at least 1.5 meters of lateral buffer when passing cyclists or two-wheelers to account for wobbles, road surface imperfections, and wind draft."
  },
  {
    "id": 17,
    "category": "Pedestrians & Safety",
    "question": "What is the 'No-Zone' rule regarding commercial freight trucks and multi-axle buses?",
    "options": [
      {
        "id": 0,
        "text": "Areas where commercial vehicles are prohibited from parking"
      },
      {
        "id": 1,
        "text": "Massive blind spots on all four sides of large commercial vehicles where the truck driver CANNOT see your car in their mirrors"
      },
      {
        "id": 2,
        "text": "Special zero-emission zones in city centers"
      },
      {
        "id": 3,
        "text": "The cargo loading bay of a trailer"
      }
    ],
    "correct_answer": 1,
    "legal_reference": "Defensive Driving & Heavy Commercial Vehicle Safety Guidelines",
    "penalty_info": "Severe collision risk; rear-ending or side-crush liability",
    "teaching_tip": "Rule of Law: 'If you cannot see the truck driver's face in their side mirror, they CANNOT see you.' Avoid lingering alongside or tailgating within 10 meters of heavy trucks.",
    "explanation": "The 'No-Zone' refers to the extensive blind spots directly in front, directly behind, and alongside heavy freight vehicles. Cruising in these zones makes your vehicle invisible to the commercial operator."
  },
  {
    "id": 18,
    "category": "Road Markings",
    "question": "What is the legal meaning of a single continuous solid white or yellow line along the center of the road?",
    "options": [
      {
        "id": 0,
        "text": "Overtaking and straddling across the line is strictly prohibited; you must remain entirely within your lane"
      },
      {
        "id": 1,
        "text": "Overtaking is permitted if you flash headlights"
      },
      {
        "id": 2,
        "text": "Line is for aesthetic separation only and has no legal enforcement"
      },
      {
        "id": 3,
        "text": "Parking is allowed directly on top of the line"
      }
    ],
    "correct_answer": 0,
    "legal_reference": "IRC:35-2015 Road Marking Standards & Motor Vehicles Act Section 119",
    "penalty_info": "\u20b91,000\u2013\u20b92,000 for solid line lane cutting (Section 177/184)",
    "teaching_tip": "Rule of Law: Solid lines are painted specifically where road curvature, hill crests, or narrow widths make sight distance too short for safe overtaking. Crossing it is treating incoming blind traffic as nonexistent.",
    "explanation": "Under IRC:35 road marking standards, a continuous solid centerline indicates that crossing or straddling to overtake is strictly forbidden due to limited sight distance or safety hazards."
  },
  {
    "id": 19,
    "category": "Road Markings",
    "question": "Encountering double continuous solid yellow lines in the center of a two-way carriageway means:",
    "options": [
      {
        "id": 0,
        "text": "Both directions are strictly prohibited from crossing or straddling the lines under all circumstances"
      },
      {
        "id": 1,
        "text": "Heavy commercial vehicles only are prohibited from crossing"
      },
      {
        "id": 2,
        "text": "Overtaking is permitted during clear daytime only"
      },
      {
        "id": 3,
        "text": "The road is designated as a VIP corridor"
      }
    ],
    "correct_answer": 0,
    "legal_reference": "IRC:35-2015 Standards for Longitudinal Road Markings",
    "penalty_info": "\u20b95,000 under Section 184 (Dangerous Driving / Head-on collision hazard)",
    "teaching_tip": "Rule of Law: Double solid yellow lines legally represent a physical concrete wall. Crossing them into opposing traffic for any reason other than navigating around a permanent road blockage is an egregious traffic crime.",
    "explanation": "Double solid yellow lines represent a physical barrier equivalent. Crossing them constitutes dangerous driving under Section 184 of the Motor Vehicles Act."
  },
  {
    "id": 20,
    "category": "Road Markings",
    "question": "What is the mandatory rule when approaching an intersection marked with criss-cross yellow lines (Yellow Box Junction)?",
    "options": [
      {
        "id": 0,
        "text": "You may enter and stop inside the box if your signal is green"
      },
      {
        "id": 1,
        "text": "You must NOT enter the yellow box unless your exit road is clear, except when turning right and waiting for oncoming traffic"
      },
      {
        "id": 2,
        "text": "You can park your vehicle inside the yellow box during heavy rainfall"
      },
      {
        "id": 3,
        "text": "Yellow box is a designated overtaking acceleration strip"
      }
    ],
    "correct_answer": 1,
    "legal_reference": "IRC:35 Standards for Yellow Box Junctions & Rules of the Road Reg 20",
    "penalty_info": "\u20b9500 to \u20b91,000 fine for junction gridlock obstruction",
    "teaching_tip": "Rule of Law: Yellow box junctions prevent urban gridlock. Even if the traffic signal is green, if traffic ahead is backed up across the junction, you must stay behind the box entrance until space opens across it.",
    "explanation": "Yellow box junctions prevent intersection gridlock. Vehicles must never enter the box unless their exit is unobstructed. Blocking the box carries a fine of \u20b9500\u2013\u20b91,000."
  },
  {
    "id": 21,
    "category": "Road Markings",
    "question": "Where must a vehicle come to a stop when encountering a red traffic light at an intersection?",
    "options": [
      {
        "id": 0,
        "text": "Directly on top of the pedestrian zebra stripes"
      },
      {
        "id": 1,
        "text": "Behind the transverse solid white Stop Line, leaving the pedestrian zebra crossing completely clear"
      },
      {
        "id": 2,
        "text": "In the middle of the junction past the traffic signal pole"
      },
      {
        "id": 3,
        "text": "Anywhere as long as the front wheels are moving slowly"
      }
    ],
    "correct_answer": 1,
    "legal_reference": "Motor Vehicles Act 1988 \u2014 Section 119 & IRC:35 Transverse Markings",
    "penalty_info": "\u20b91,000 for Stop Line Overreach (captured via ANPR camera)",
    "teaching_tip": "Rule of Law: Modern smart traffic cameras feature laser stop-line tripwires. If your front bumper breaks the plane of the transverse white line on red, an automated e-challan is generated automatically.",
    "explanation": "Stop Line Overreach is captured by automated ANPR cameras and penalized under Section 119/177. The buffer space between the stop line and crossing is reserved for pedestrian safety."
  },
  {
    "id": 22,
    "category": "Road Markings",
    "question": "What do broken (dashed) white longitudinal lines down the center of a carriageway indicate?",
    "options": [
      {
        "id": 0,
        "text": "Overtaking and lane changes are permitted when safe and clear to do so"
      },
      {
        "id": 1,
        "text": "Lane changes are prohibited at all times"
      },
      {
        "id": 2,
        "text": "Road is reserved for government convoys"
      },
      {
        "id": 3,
        "text": "Two-wheelers must ride on the line"
      }
    ],
    "correct_answer": 0,
    "legal_reference": "IRC:35-2015 Centerline Markings",
    "penalty_info": "Permissible marking; failure to signal before changing lanes attracts \u20b9500 fine",
    "teaching_tip": "Rule of Law: Broken white lines indicate adequate forward sight distance. However, you must always perform mirror checks, signal your intent, and ensure the overtaking lane is free of oncoming traffic.",
    "explanation": "Broken longitudinal white lines indicate that drivers are permitted to change lanes or overtake, provided the opposing lane is completely clear and proper turn signals are engaged."
  },
  {
    "id": 23,
    "category": "Road Markings",
    "question": "What is the legal mandate when encountering diagonal painted striped areas surrounded by solid white lines (Chevron Markings / Channelizing Islands)?",
    "options": [
      {
        "id": 0,
        "text": "Vehicles may park inside the striped chevron area"
      },
      {
        "id": 1,
        "text": "Vehicles are strictly prohibited from driving on or stopping within painted chevron islands"
      },
      {
        "id": 2,
        "text": "Area is an emergency overtaking lane"
      },
      {
        "id": 3,
        "text": "Two-wheelers can cut across chevrons to save travel distance"
      }
    ],
    "correct_answer": 1,
    "legal_reference": "IRC:35-2015 Channelization & Island Markings",
    "penalty_info": "\u20b91,000 for improper lane change / driving over physical road dividers",
    "teaching_tip": "Rule of Law: Chevron markings separate bifurcating or merging traffic streams at flyovers and expressway exits. Driving over them risks hitting gore-point crash attenuators and causes high-speed collisions.",
    "explanation": "Chevron hatched markings are designed to channelize traffic flow and separate conflicting movements. Entering, driving across, or stopping on painted islands is strictly prohibited under traffic regulations."
  },
  {
    "id": 24,
    "category": "Emergency Rules",
    "question": "What must a driver do when an emergency vehicle (Ambulance / Fire Tender / Police) approaches with active siren or flashing lights?",
    "options": [
      {
        "id": 0,
        "text": "Maintain your lane and speed so the emergency vehicle can overtake around you"
      },
      {
        "id": 1,
        "text": "Safely steer to the left edge/shoulder of the roadway and stop or slow down to provide clear, unobstructed passage"
      },
      {
        "id": 2,
        "text": "Accelerate rapidly to race ahead of the ambulance"
      },
      {
        "id": 3,
        "text": "Honk repeatedly while maintaining your position in the fast lane"
      }
    ],
    "correct_answer": 1,
    "legal_reference": "Motor Vehicles (Amendment) Act 2019 \u2014 Section 194E",
    "penalty_info": "Up to \u20b910,000 fine and/or imprisonment up to 6 months",
    "teaching_tip": "Rule of Law: Section 194E was introduced in the 2019 amendment specifically to punish drivers obstructing emergency vehicles. Drivers must immediately move to the left curb and bring their car to a halt.",
    "explanation": "Section 194E of the Motor Vehicles (Amendment) Act imposes a mandatory penalty of up to \u20b910,000 fine and/or 6 months imprisonment for failure to give free passage to emergency vehicles."
  },
  {
    "id": 25,
    "category": "Emergency Rules",
    "question": "What is an official 'Green Corridor' in Indian traffic management, and what is the public driver's responsibility?",
    "options": [
      {
        "id": 0,
        "text": "A roadside eco-plantation zone where trees are watered by tankers"
      },
      {
        "id": 1,
        "text": "A synchronized non-stop transit corridor cleared by traffic police for organ transplant ambulances; all public traffic must hold at red signals until it passes"
      },
      {
        "id": 2,
        "text": "A designated parking zone for electric vehicles only"
      },
      {
        "id": 3,
        "text": "A tourist sightseeing expressway"
      }
    ],
    "correct_answer": 1,
    "legal_reference": "National Organ & Tissue Transplant Organization (NOTTO) Traffic Protocols",
    "penalty_info": "Immediate seizure of vehicle and severe prosecution under Section 184 / 194E",
    "teaching_tip": "Rule of Law: Green Corridors transport living donor organs (heart, liver) with a viability window of under 4 hours. Police manually hold all cross-traffic; public drivers must maintain complete clearance.",
    "explanation": "Green Corridors are specially cleared traffic routes established by traffic police to transport harvested human organs between hospitals without delays. All other traffic must strictly hold and yield."
  },
  {
    "id": 26,
    "category": "Emergency Rules",
    "question": "Is it legal to closely follow (draft behind) an ambulance or fire tender that is clearing a path through heavy traffic?",
    "options": [
      {
        "id": 0,
        "text": "Yes, it is recommended to beat traffic congestion"
      },
      {
        "id": 1,
        "text": "Strictly illegal and hazardous; trailing emergency vehicles prevents other cars from re-entering lanes and causes rear-end crashes"
      },
      {
        "id": 2,
        "text": "Permitted if you turn on hazard warning flashers"
      },
      {
        "id": 3,
        "text": "Allowed for commercial taxis only"
      }
    ],
    "correct_answer": 1,
    "legal_reference": "Motor Vehicles Act 1988 \u2014 Section 184 (Reckless & Dangerous Driving)",
    "penalty_info": "\u20b95,000 fine and potential suspension of driving license",
    "teaching_tip": "Rule of Law: Ambulances must make unpredictable emergency maneuvers and sudden stops. Tailgating an active ambulance blocks yielding vehicles from returning to their lanes and risks crushing medical staff inside.",
    "explanation": "Trailing closely behind an active emergency vehicle to exploit the cleared path is illegal, constitutes reckless driving under Section 184, and severely jeopardizes road safety."
  },
  {
    "id": 27,
    "category": "Emergency Rules",
    "question": "What is the 'Move Over' principle when passing a broken-down vehicle or police cruiser stopped on the highway shoulder with hazard lights?",
    "options": [
      {
        "id": 0,
        "text": "Speed up to pass before they re-enter the lane"
      },
      {
        "id": 1,
        "text": "Decelerate, scan for roadside occupants, and if safe, move over one lane to provide an empty buffer lane"
      },
      {
        "id": 2,
        "text": "Honk continuously until the parked vehicle moves away"
      },
      {
        "id": 3,
        "text": "Pull directly behind them on the shoulder"
      }
    ],
    "correct_answer": 1,
    "legal_reference": "National Highway Safety Guidelines & Defensive Driving Standards",
    "penalty_info": "Civil liability / criminal prosecution under Section 304A in event of impact",
    "teaching_tip": "Rule of Law: Stationary highway stops are extremely hazardous. When passing vehicles stranded on the shoulder, shift one lane away to prevent striking tow operators, police officers, or stranded passengers.",
    "explanation": "The Move Over principle instructs drivers to decelerate and shift over by one lane when approaching stationary emergency or stranded vehicles on the shoulder to protect human lives."
  },
  {
    "id": 28,
    "category": "Speed & Overtaking",
    "question": "In India, from which side are you legally required to overtake a vehicle moving in the same direction?",
    "options": [
      {
        "id": 0,
        "text": "Left side under all traffic conditions"
      },
      {
        "id": 1,
        "text": "Right side only, ensuring the road ahead is clear and indicating your intention beforehand"
      },
      {
        "id": 2,
        "text": "Either side depending on road shoulder width"
      },
      {
        "id": 3,
        "text": "Left shoulder of the expressway"
      }
    ],
    "correct_answer": 1,
    "legal_reference": "Rules of the Road Regulations 1989 \u2014 Regulation 9 (Overtaking Protocols)",
    "penalty_info": "\u20b91,000 to \u20b95,000 for illegal undertaking and reckless lane zigzagging",
    "teaching_tip": "Rule of Law: In a left-hand drive country, driver seating is on the right, meaning the right side has maximum visibility. Undertaking on the left blind-sides other operators who do not expect rapid passes on their curb side.",
    "explanation": "Under Regulation 9 of the Rules of the Road, overtaking on the left ('undertaking') is strictly illegal, except when the vehicle in front has clearly indicated and begun turning right."
  },
  {
    "id": 29,
    "category": "Speed & Overtaking",
    "question": "Under the Indian Motor Vehicles Act, overtaking another vehicle is strictly forbidden at which location?",
    "options": [
      {
        "id": 0,
        "text": "On or approaching a pedestrian crossing, bridge, blind curve, crest of a hill, or railway level crossing"
      },
      {
        "id": 1,
        "text": "On a wide 4-lane divided national highway with straight visibility"
      },
      {
        "id": 2,
        "text": "While moving behind a slow tractor in broad daylight"
      },
      {
        "id": 3,
        "text": "On an open tollway with broken white center lines"
      }
    ],
    "correct_answer": 0,
    "legal_reference": "Rules of the Road Regulations 1989 \u2014 Regulation 10",
    "penalty_info": "\u20b95,000 fine and vehicle impoundment under Section 184",
    "teaching_tip": "Rule of Law: Never overtake where road geometry conceals oncoming traffic. Crests of hills and sharp curves hide 100 km/h oncoming vehicles until milliseconds before impact.",
    "explanation": "Overtaking on pedestrian crossings, bridges, crests, and sharp corners is prohibited because oncoming traffic and pedestrians are hidden by physical geometry."
  },
  {
    "id": 30,
    "category": "Speed & Overtaking",
    "question": "What is the recommended following distance ('Two-Second Rule'), and when should it be doubled to 4+ seconds?",
    "options": [
      {
        "id": 0,
        "text": "It gives time to check your mobile phone; increase during clear daytime"
      },
      {
        "id": 1,
        "text": "It provides adequate perception-reaction and braking buffer; double to 4+ seconds during rain, fog, or wet road conditions"
      },
      {
        "id": 2,
        "text": "It is applicable only to heavy freight multi-axle trailers"
      },
      {
        "id": 3,
        "text": "It means waiting 2 seconds before shifting from 1st to 2nd gear"
      }
    ],
    "correct_answer": 1,
    "legal_reference": "Rules of the Road Regulations 1989 \u2014 Regulation 23 (Following Distance)",
    "penalty_info": "Primary cause of multi-car pileups; Section 184 dangerous driving",
    "teaching_tip": "Rule of Law: At 100 km/h, your car travels 28 meters per second! Perception-reaction takes 1.5 seconds (42 meters) before your foot even touches the brake pedal. Wet tarmac doubles braking distance.",
    "explanation": "The Two-Second rule ensures that your distance scales with velocity. Wet or foggy roads double braking distance due to reduced tire friction, necessitating a 4+ second gap."
  },
  {
    "id": 31,
    "category": "Speed & Overtaking",
    "question": "What is the statutory regulation regarding high-beam headlights on illuminated urban city streets or when following another car?",
    "options": [
      {
        "id": 0,
        "text": "High beam should be on at all times for maximum illumination"
      },
      {
        "id": 1,
        "text": "High beam must be dipped to low beam to prevent blinding oncoming drivers and preceding cars via their rear-view mirrors"
      },
      {
        "id": 2,
        "text": "High beam is mandatory on all city flyovers"
      },
      {
        "id": 3,
        "text": "You must flash high beam continuously in residential colonies"
      }
    ],
    "correct_answer": 1,
    "legal_reference": "Central Motor Vehicles Rules 1989 \u2014 Rule 106 (Deflection of Lights)",
    "penalty_info": "\u20b9500 fine under Section 177 for dazzling other road users",
    "teaching_tip": "Rule of Law: High-beam glare causes 'troxler fading' and temporary blindness for oncoming drivers for up to 7 seconds. Within cities and when trailing within 200m of another vehicle, always dip to low beam.",
    "explanation": "Glare from high beams causes temporary visual blindness (photokeratitis) for oncoming drivers and pedestrians. Low beams are required on lit city streets and when following within 200m."
  },
  {
    "id": 32,
    "category": "Speed & Overtaking",
    "question": "What is the correct defensive driving response if your vehicle begins to 'aquaplane' (hydroplane) on standing water on an expressway?",
    "options": [
      {
        "id": 0,
        "text": "Slam on the brakes immediately and yank the steering wheel hard"
      },
      {
        "id": 1,
        "text": "Ease off the accelerator smoothly, keep the steering wheel pointed straight, and do NOT apply panic braking until tires regain contact"
      },
      {
        "id": 2,
        "text": "Engage handbrake at 90 km/h"
      },
      {
        "id": 3,
        "text": "Shift directly into reverse gear"
      }
    ],
    "correct_answer": 1,
    "legal_reference": "Expressway Safety & High-Speed Wet Weather Defensive Protocol",
    "penalty_info": "Loss of control leading to fatal rollovers; tire tread depth mandatory under CMVR",
    "teaching_tip": "Rule of Law: Hydroplaning happens when water accumulates faster under tire sipes than it can be displaced, lifting the car onto a cushion of water. Braking or sharp turning sends the vehicle into an uncontrollable spin.",
    "explanation": "During hydroplaning, braking or sharp steering input induces an instant spin. Gently lift off the accelerator pedal, allow momentum to bleed off, and maintain straight steering until tire sipes grip tarmac."
  },
  {
    "id": 33,
    "category": "Penalties & Laws",
    "question": "Under Section 129 of the Motor Vehicles Act, what are the legal requirements for helmets worn on a two-wheeler?",
    "options": [
      {
        "id": 0,
        "text": "Any construction hardhat or bicycle cap is legally permissible"
      },
      {
        "id": 1,
        "text": "Must be a Bureau of Indian Standards (BIS / ISI marked) certified helmet with the chin strap securely fastened for rider and pillion"
      },
      {
        "id": 2,
        "text": "Helmet is required for the driver only, pillion rider is exempt"
      },
      {
        "id": 3,
        "text": "Helmet is required only on national highways, not within city municipal limits"
      }
    ],
    "correct_answer": 1,
    "legal_reference": "Motor Vehicles (Amendment) Act 2019 \u2014 Section 129",
    "penalty_info": "\u20b91,000 fine and disqualification of driving license for 3 months",
    "teaching_tip": "Rule of Law: The 2019 amendment mandates BIS (IS 4151) helmets with locked chinstraps for all riders above 4 years of age. An unfastened helmet flies off upon initial impact, rendering it useless.",
    "explanation": "Section 129 requires both rider and pillion above 4 years of age to wear protective headgear conforming to BIS standards with fastened straps. Violations carry \u20b91,000 fine and 3-month DL suspension."
  },
  {
    "id": 34,
    "category": "Penalties & Laws",
    "question": "Under Section 194B of the Motor Vehicles Act, what is the statutory law regarding wearing seatbelts in a passenger car?",
    "options": [
      {
        "id": 0,
        "text": "Driver only must wear a seatbelt"
      },
      {
        "id": 1,
        "text": "All occupants, including front-seat passengers and rear-seat passengers, must wear seatbelts at all times while the vehicle is in motion"
      },
      {
        "id": 2,
        "text": "Seatbelts are optional within city limits below 40 km/h"
      },
      {
        "id": 3,
        "text": "Children under 14 are exempt from seatbelt laws"
      }
    ],
    "correct_answer": 1,
    "legal_reference": "Motor Vehicles (Amendment) Act 2019 \u2014 Section 194B & Rule 125(1)",
    "penalty_info": "\u20b91,000 fine per unbelted passenger",
    "teaching_tip": "Rule of Law: An unbelted rear passenger becomes a human projectile in a 50 km/h frontal impact, colliding into front-seat passengers with the force of an elephant. Rear seatbelts are strictly mandatory.",
    "explanation": "Section 194B mandates that whoever drives a motor vehicle without wearing a safety belt, or carries passengers not wearing safety belts, is punishable with a fine of \u20b91,000."
  },
  {
    "id": 35,
    "category": "Penalties & Laws",
    "question": "What does Section 185 of the Motor Vehicles Act prescribe regarding driving under the influence of alcohol or drugs?",
    "options": [
      {
        "id": 0,
        "text": "Any driver with Blood Alcohol Content (BAC) exceeding 30 mg per 100 ml of blood is punishable by law"
      },
      {
        "id": 1,
        "text": "Drivers may drink as long as they stay under 50 km/h"
      },
      {
        "id": 2,
        "text": "Alcohol is tested only after an accident has occurred"
      },
      {
        "id": 3,
        "text": "Alcohol consumption is permitted for experienced commercial drivers"
      }
    ],
    "correct_answer": 0,
    "legal_reference": "Motor Vehicles (Amendment) Act 2019 \u2014 Section 185 (Drunk Driving)",
    "penalty_info": "Up to \u20b910,000 fine and/or 6 months imprisonment for 1st offense; \u20b915,000 and 2 years jail for repeat",
    "teaching_tip": "Rule of Law: Blood Alcohol Concentration (BAC) above 30 mg per 100 ml measured via breath analyzer is an arrestable offense. Alcohol degrades peripheral vision, slows neural reaction times, and induces false confidence.",
    "explanation": "Section 185 sets the statutory breath analyzer limit at 30 mg per 100 ml of blood. Driving above this threshold attracts up to \u20b910,000 fine, 6 months imprisonment, and license suspension."
  },
  {
    "id": 36,
    "category": "Penalties & Laws",
    "question": "What does Section 184(c) of the Motor Vehicles Act state regarding mobile phone usage while operating a motor vehicle?",
    "options": [
      {
        "id": 0,
        "text": "Texting is prohibited, but handheld phone calls are permitted"
      },
      {
        "id": 1,
        "text": "Using any handheld communications device while driving is an offence of dangerous driving, attracting a fine of \u20b91,000\u2013\u20b95,000"
      },
      {
        "id": 2,
        "text": "Mobile phone calls are allowed if you drive below 30 km/h"
      },
      {
        "id": 3,
        "text": "Only social media browsing is penalized"
      }
    ],
    "correct_answer": 1,
    "legal_reference": "Motor Vehicles (Amendment) Act 2019 \u2014 Section 184(c)",
    "penalty_info": "\u20b91,000 to \u20b95,000 fine and/or up to 1 year imprisonment + DL suspension",
    "teaching_tip": "Rule of Law: Cognitive distraction from mobile phone usage impairs hazard perception identically to blood alcohol intoxication. Looking at a phone for 4 seconds at 60 km/h means driving 67 meters completely blind.",
    "explanation": "Handheld phone usage diverts visual, manual, and cognitive attention. Section 184 penalizes it as dangerous driving with penalties up to \u20b95,000 and possible vehicle seizure."
  },
  {
    "id": 37,
    "category": "Penalties & Laws",
    "question": "What is the statutory restriction on using the hard shoulder (leftmost continuous edge lane) on Expressways and National Highways?",
    "options": [
      {
        "id": 0,
        "text": "The shoulder is an express overtaking lane for high-speed cars during traffic jams"
      },
      {
        "id": 1,
        "text": "The shoulder is strictly reserved for emergency stopping, vehicle breakdowns, or ambulances; routine driving or parking is prohibited"
      },
      {
        "id": 2,
        "text": "Two-wheelers and auto-rickshaws must drive on the shoulder"
      },
      {
        "id": 3,
        "text": "You can park on the shoulder to rest or picnic"
      }
    ],
    "correct_answer": 1,
    "legal_reference": "Motor Vehicles Act 1988 \u2014 Section 119 & NHAI Expressway Regulations",
    "penalty_info": "\u20b91,000\u2013\u20b92,000 under Section 177 / 184 (Illegal shoulder driving)",
    "teaching_tip": "Rule of Law: Driving on the shoulder causes horrific rear-end collisions with stalled trucks. If forced to stop due to breakdown, activate hazard flashers and deploy reflective triangle 50m behind.",
    "explanation": "Shoulder driving or stopping without hazard flashers and triangle cones causes fatal rear-end collisions. It is strictly reserved for emergency breakdowns and police/ambulance operations."
  },
  {
    "id": 38,
    "category": "Penalties & Laws",
    "question": "Under Section 134A of the Motor Vehicles Act, what protections are provided to a 'Good Samaritan' who assists a road crash victim?",
    "options": [
      {
        "id": 0,
        "text": "The helper must pay the hospital admission deposit"
      },
      {
        "id": 1,
        "text": "The Good Samaritan is immune from civil or criminal liability and cannot be forced to disclose identity or become a witness"
      },
      {
        "id": 2,
        "text": "The helper is liable for vehicle damage of the victim"
      },
      {
        "id": 3,
        "text": "The helper must report to the police station daily"
      }
    ],
    "correct_answer": 1,
    "legal_reference": "Motor Vehicles (Amendment) Act 2019 \u2014 Section 134A (Protection of Good Samaritans)",
    "penalty_info": "Statutory protection; police or hospitals harassing helpers face severe disciplinary action",
    "teaching_tip": "Rule of Law: The 'Golden Hour' is the first 60 minutes after trauma where medical care saves 50% of accident victims. Section 134A ensures you can administer first aid and take victims to hospital with zero police harassment.",
    "explanation": "Section 134A guarantees that any person who renders emergency medical or non-medical assistance to a crash victim shall not be liable for any civil or criminal action, nor compelled to reveal personal details."
  }
];

export interface QuizCategoryItem {
  id: string;
  label: string;
  match?: string;
  icon: string;
}

export const QUIZ_CATEGORIES: QuizCategoryItem[] = [
  { id: "all", label: "All Rules & Regulations", icon: "auto_stories" },
  { id: "signs", label: "Traffic Signs (IRC:67)", match: "Traffic Signs", icon: "traffic" },
  { id: "right-of-way", label: "Right of Way & Roundabouts", match: "Right of Way", icon: "alt_route" },
  { id: "pedestrians", label: "Pedestrians & Vulnerable Users", match: "Pedestrians", icon: "elderly" },
  { id: "markings", label: "Road Markings (IRC:35)", match: "Road Markings", icon: "edit_road" },
  { id: "emergency", label: "Emergency Priority Corridors", match: "Emergency", icon: "e911_emergency" },
  { id: "speed-overtaking", label: "Speed & Safe Overtaking", match: "Speed & Overtaking", icon: "speed" },
  { id: "penalties", label: "Penalties, Laws & Safety Gears", match: "Penalties", icon: "gavel" },
];
