"""
src/generate_rto_dataset.py

Official Indian RTO Traffic Signs Dataset Generator.
Extracts and renders vector geometries & photorealistic augmented datasets
for all official RTO Traffic Signs directly from the Official Reference Chart:

1. Mandatory & Regulatory Signs (Red Circles, Blue Circles, Octagons, Inverted Triangles)
2. Cautionary & Warning Signs (Red/Yellow Equilateral Triangles)
3. Informational & Facility Signs (Blue Rectangles/Squares)

Generates datasets under dataset/Train/<class_id> and dataset/Test/<class_id>
and writes comprehensive metadata to dataset/signnames_rto.csv and training data/labels.csv.
"""

import os
import math
import cv2
import numpy as np
import pandas as pd
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

CANVAS_SIZE = 128

# Define Complete Catalog of RTO Traffic Signs
RTO_SIGN_CATALOG = [
    # ── MANDATORY & REGULATORY SIGNS ──────────────────────────────────────────
    {"id": 0, "name": "Stop Sign", "cat": "Mandatory", "tier": "CRITICAL", "action": "Mandatory complete stop before intersection stop line. Look in all directions and yield.", "tts": "Stop immediately. Complete stop required."},
    {"id": 1, "name": "Give Way", "cat": "Mandatory", "tier": "CRITICAL", "action": "Yield right-of-way to main road traffic. Slow down and stop if vehicles are approaching.", "tts": "Give way. Yield right-of-way."},
    {"id": 2, "name": "No Entry", "cat": "Mandatory", "tier": "CRITICAL", "action": "Entry prohibited for all vehicles. One-way or closed roadway.", "tts": "Warning: No entry. Roadway closed to incoming traffic."},
    {"id": 3, "name": "Vehicles Prohibited in Both Directions", "cat": "Mandatory", "tier": "CRITICAL", "action": "All motor vehicles banned in both directions. Pedestrianized or secure zone.", "tts": "Vehicles prohibited in both directions."},
    {"id": 4, "name": "One Way Left", "cat": "Mandatory", "tier": "WARNING", "action": "One-way traffic to the left only. Incoming traffic from right is prohibited.", "tts": "One way traffic left only."},
    {"id": 5, "name": "One Way Right", "cat": "Mandatory", "tier": "WARNING", "action": "One-way traffic to the right only. Incoming traffic from left is prohibited.", "tts": "One way traffic right only."},
    {"id": 6, "name": "Left Turn Prohibited", "cat": "Mandatory", "tier": "CRITICAL", "action": "Turning left is strictly prohibited. Proceed straight or turn right.", "tts": "Left turn prohibited."},
    {"id": 7, "name": "Right Turn Prohibited", "cat": "Mandatory", "tier": "CRITICAL", "action": "Turning right is strictly prohibited. Proceed straight or turn left.", "tts": "Right turn prohibited."},
    {"id": 8, "name": "No U-Turn", "cat": "Mandatory", "tier": "CRITICAL", "action": "U-turn strictly prohibited. Continue to next legal turnaround or roundabout.", "tts": "No U-turn allowed."},
    {"id": 9, "name": "No Overtaking", "cat": "Mandatory", "tier": "CRITICAL", "action": "Overtaking prohibited. Remain in lane behind vehicle in front.", "tts": "Overtaking prohibited on this road."},
    {"id": 10, "name": "Horn Prohibited", "cat": "Mandatory", "tier": "WARNING", "action": "Silence zone. Do not sound vehicle horn near hospital or school.", "tts": "Horn prohibited zone."},
    {"id": 11, "name": "No Parking", "cat": "Mandatory", "tier": "WARNING", "action": "Parking prohibited. Brief stopping for passenger boarding only.", "tts": "No parking allowed."},
    {"id": 12, "name": "No Stopping or Standing", "cat": "Mandatory", "tier": "CRITICAL", "action": "Stopping or parking is strictly banned. Keep moving at all times.", "tts": "No stopping or standing allowed."},
    {"id": 13, "name": "Speed Limit 30", "cat": "Mandatory", "tier": "WARNING", "limit": 30, "action": "Maximum speed limit 30 km/h. Protect pedestrians and school children.", "tts": "Speed limit thirty kilometers per hour."},
    {"id": 14, "name": "Speed Limit 40", "cat": "Mandatory", "tier": "WARNING", "limit": 40, "action": "Maximum speed limit 40 km/h. Urban distributor road.", "tts": "Speed limit forty kilometers per hour."},
    {"id": 15, "name": "Speed Limit 50", "cat": "Mandatory", "tier": "WARNING", "limit": 50, "action": "Maximum speed limit 50 km/h. Maintain safe following distance.", "tts": "Speed limit fifty kilometers per hour."},
    {"id": 16, "name": "Speed Limit 60", "cat": "Mandatory", "tier": "WARNING", "limit": 60, "action": "Maximum speed limit 60 km/h on sub-arterial corridor.", "tts": "Speed limit sixty kilometers per hour."},
    {"id": 17, "name": "Speed Limit 70", "cat": "Mandatory", "tier": "WARNING", "limit": 70, "action": "Maximum speed limit 70 km/h on suburban expressway.", "tts": "Speed limit seventy kilometers per hour."},
    {"id": 18, "name": "Speed Limit 80", "cat": "Mandatory", "tier": "WARNING", "limit": 80, "action": "Maximum speed limit 80 km/h. Highway corridor.", "tts": "Speed limit eighty kilometers per hour."},
    {"id": 19, "name": "Speed Limit 90", "cat": "Mandatory", "tier": "WARNING", "limit": 90, "action": "Maximum speed limit 90 km/h. Express highway.", "tts": "Speed limit ninety kilometers per hour."},
    {"id": 20, "name": "Speed Limit 100", "cat": "Mandatory", "tier": "WARNING", "limit": 100, "action": "Maximum speed limit 100 km/h on national expressway.", "tts": "Speed limit one hundred kilometers per hour."},
    {"id": 21, "name": "Speed Limit 110", "cat": "Mandatory", "tier": "WARNING", "limit": 110, "action": "Maximum speed limit 110 km/h. Controlled-access highway.", "tts": "Speed limit one hundred ten kilometers per hour."},
    {"id": 22, "name": "Speed Limit 120", "cat": "Mandatory", "tier": "WARNING", "limit": 120, "action": "Maximum speed limit 120 km/h for passenger cars on expressways.", "tts": "Speed limit one hundred twenty kilometers per hour."},
    {"id": 23, "name": "Compulsory Ahead Only", "cat": "Mandatory", "tier": "INFORMATIONAL", "action": "Mandatory: Proceed straight ahead only. Turning left or right is illegal.", "tts": "Compulsory go straight ahead only."},
    {"id": 24, "name": "Compulsory Turn Left", "cat": "Mandatory", "tier": "INFORMATIONAL", "action": "Mandatory left turn ahead. Straight and right paths closed.", "tts": "Compulsory left turn ahead."},
    {"id": 25, "name": "Compulsory Turn Right", "cat": "Mandatory", "tier": "INFORMATIONAL", "action": "Mandatory right turn ahead. Follow lane path.", "tts": "Compulsory right turn ahead."},
    {"id": 26, "name": "Compulsory Ahead or Turn Left", "cat": "Mandatory", "tier": "INFORMATIONAL", "action": "Mandatory: Proceed straight or turn left at junction.", "tts": "Compulsory go straight or turn left."},
    {"id": 27, "name": "Compulsory Ahead or Turn Right", "cat": "Mandatory", "tier": "INFORMATIONAL", "action": "Mandatory: Proceed straight or turn right at junction.", "tts": "Compulsory go straight or turn right."},
    {"id": 28, "name": "Compulsory Keep Left", "cat": "Mandatory", "tier": "INFORMATIONAL", "action": "Keep to the left side of divider, obstacle, or traffic island.", "tts": "Keep to the left side of the road."},
    {"id": 29, "name": "Compulsory Keep Right", "cat": "Mandatory", "tier": "INFORMATIONAL", "action": "Keep to the right side of divider or obstacle.", "tts": "Keep to the right side of the road."},
    {"id": 30, "name": "Compulsory Sound Horn", "cat": "Mandatory", "tier": "WARNING", "action": "Blow horn to alert oncoming traffic on blind curve or mountain pass.", "tts": "Honk horn before proceeding."},
    {"id": 31, "name": "Compulsory Minimum Speed 30", "cat": "Mandatory", "tier": "INFORMATIONAL", "limit": 30, "action": "Maintain speed of at least 30 km/h to prevent expressway bottleneck.", "tts": "Compulsory minimum speed thirty kilometers per hour."},
    {"id": 32, "name": "Compulsory Cycle Track", "cat": "Mandatory", "tier": "INFORMATIONAL", "action": "Dedicated cycle track. Bicycles mandatory, motor vehicles barred.", "tts": "Dedicated bicycle track."},
    {"id": 33, "name": "Pedestrians Prohibited", "cat": "Mandatory", "tier": "CRITICAL", "action": "Pedestrians prohibited from walking on elevated highway or tunnel.", "tts": "Pedestrians prohibited on roadway."},
    {"id": 34, "name": "Bicycles Prohibited", "cat": "Mandatory", "tier": "CRITICAL", "action": "Pedal bicycles prohibited on high-speed expressway.", "tts": "Bicycles prohibited on this road."},
    {"id": 35, "name": "Trucks Prohibited", "cat": "Mandatory", "tier": "CRITICAL", "action": "Heavy commercial vehicles (trucks) prohibited in narrow or residential zone.", "tts": "Trucks prohibited."},
    {"id": 36, "name": "All Motor Vehicles Prohibited", "cat": "Mandatory", "tier": "CRITICAL", "action": "Strict prohibition of all motor-driven vehicles (cars, bikes, trucks).", "tts": "All motor vehicles prohibited."},
    {"id": 37, "name": "Bullock Carts Prohibited", "cat": "Mandatory", "tier": "CRITICAL", "action": "Slow-moving animal-drawn bullock carts prohibited on highway.", "tts": "Bullock carts prohibited."},
    {"id": 38, "name": "Hand Carts Prohibited", "cat": "Mandatory", "tier": "CRITICAL", "action": "Hand cart pullers prohibited to prevent traffic congestion.", "tts": "Hand carts prohibited."},
    {"id": 39, "name": "Tonga Prohibited", "cat": "Mandatory", "tier": "CRITICAL", "action": "Horse-drawn carriages (tongas) prohibited on modern roadway.", "tts": "Horse drawn carriages prohibited."},
    {"id": 40, "name": "Height Limit 3.5m", "cat": "Mandatory", "tier": "CRITICAL", "action": "Vehicles taller than 3.5 meters prohibited. Low bridge / underpass ahead.", "tts": "Height limit three point five meters."},
    {"id": 41, "name": "Width Limit 2m", "cat": "Mandatory", "tier": "CRITICAL", "action": "Vehicles wider than 2 meters prohibited. Narrow alley or bridge ahead.", "tts": "Width limit two meters."},
    {"id": 42, "name": "Length Limit 10m", "cat": "Mandatory", "tier": "CRITICAL", "action": "Vehicles exceeding 10 meters in length prohibited.", "tts": "Length limit ten meters."},
    {"id": 43, "name": "Load Limit 5t", "cat": "Mandatory", "tier": "CRITICAL", "action": "Gross vehicle weight exceeding 5 tonnes prohibited on bridge/flyover.", "tts": "Load limit five tonnes."},
    {"id": 44, "name": "Axle Load Limit 4t", "cat": "Mandatory", "tier": "CRITICAL", "action": "Axle load exceeding 4 tonnes prohibited to protect road asphalt.", "tts": "Axle load limit four tonnes."},
    {"id": 45, "name": "Restriction Ends Sign", "cat": "Mandatory", "tier": "INFORMATIONAL", "action": "All previous speed limits and mandatory restrictions have ended.", "tts": "All mandatory restrictions have ended."},

    # ── CAUTIONARY & WARNING SIGNS ────────────────────────────────────────────
    {"id": 46, "name": "Right Hand Curve", "cat": "Cautionary", "tier": "WARNING", "action": "Sharp curve to the right ahead. Slow down and maintain lane.", "tts": "Caution: Right hand curve ahead."},
    {"id": 47, "name": "Left Hand Curve", "cat": "Cautionary", "tier": "WARNING", "action": "Sharp curve to the left ahead. Slow down and stay left.", "tts": "Caution: Left hand curve ahead."},
    {"id": 48, "name": "Right Hair Pin Bend", "cat": "Cautionary", "tier": "WARNING", "action": "Steep hairpin U-turn curve to the right. Shift to lower gear.", "tts": "Warning: Sharp right hairpin bend ahead."},
    {"id": 49, "name": "Left Hair Pin Bend", "cat": "Cautionary", "tier": "WARNING", "action": "Sharp hairpin U-turn curve to the left. Take turn with high caution.", "tts": "Warning: Sharp left hairpin bend ahead."},
    {"id": 50, "name": "Right Reverse Bend", "cat": "Cautionary", "tier": "WARNING", "action": "Double curve ahead, first right then left. Reduce speed.", "tts": "Right reverse bend ahead."},
    {"id": 51, "name": "Left Reverse Bend", "cat": "Cautionary", "tier": "WARNING", "action": "Double curve ahead, first left then right. Reduce speed.", "tts": "Left reverse bend ahead."},
    {"id": 52, "name": "Steep Ascent", "cat": "Cautionary", "tier": "WARNING", "action": "Steep hill climb (10%). Shift to lower gear to maintain engine power.", "tts": "Caution: Steep hill climb ahead."},
    {"id": 53, "name": "Steep Descent", "cat": "Cautionary", "tier": "WARNING", "action": "Steep downhill descent (10%). Engage engine braking to avoid brake overheating.", "tts": "Caution: Steep downhill slope ahead."},
    {"id": 54, "name": "Narrow Road Ahead", "cat": "Cautionary", "tier": "WARNING", "action": "Road width decreases ahead. Coordinate passing with oncoming vehicles.", "tts": "Road narrows ahead."},
    {"id": 55, "name": "Road Wideness Ahead", "cat": "Cautionary", "tier": "INFORMATIONAL", "action": "Road width increases ahead. Traffic lanes expanding.", "tts": "Road widens ahead."},
    {"id": 56, "name": "Narrow Bridge", "cat": "Cautionary", "tier": "CRITICAL", "action": "Bridge width is narrower than road. Overtaking strictly prohibited.", "tts": "Narrow bridge ahead. Overtaking prohibited."},
    {"id": 57, "name": "Slippery Road", "cat": "Cautionary", "tier": "CRITICAL", "action": "Slippery driving conditions due to water, ice, or oil. Drive slowly.", "tts": "Warning: Slippery road conditions ahead."},
    {"id": 58, "name": "Loose Gravel", "cat": "Cautionary", "tier": "WARNING", "action": "Loose pebbles/gravel on road surface. Reduce speed to prevent tire slippage.", "tts": "Loose gravel ahead. Drive slowly."},
    {"id": 59, "name": "Cycle Crossing", "cat": "Cautionary", "tier": "WARNING", "action": "Bicycle crossing zone ahead. Check mirrors and blind spots.", "tts": "Bicycle crossing ahead."},
    {"id": 60, "name": "Pedestrian Crossing", "cat": "Cautionary", "tier": "CRITICAL", "action": "Pedestrian zebra crossing ahead. Yield to pedestrians crossing roadway.", "tts": "Pedestrian crossing ahead. Yield to pedestrians."},
    {"id": 61, "name": "School Ahead", "cat": "Cautionary", "tier": "CRITICAL", "action": "School zone nearby. Reduce speed to 25 km/h and watch for children.", "tts": "School zone ahead. Slow down."},
    {"id": 62, "name": "Traffic Signal Ahead", "cat": "Cautionary", "tier": "WARNING", "action": "Intersection regulated by traffic lights. Prepare to stop if light turns red.", "tts": "Traffic signal ahead."},
    {"id": 63, "name": "Cattle Crossing", "cat": "Cautionary", "tier": "WARNING", "action": "Stray cattle or farm animals crossing highway. Exercise vigilance.", "tts": "Cattle crossing zone ahead."},
    {"id": 64, "name": "Falling Rocks", "cat": "Cautionary", "tier": "CRITICAL", "action": "Risk of landslides and falling rocks on mountain slope. Do not stop.", "tts": "Warning: Falling rocks risk ahead."},
    {"id": 65, "name": "Ferry Ahead", "cat": "Cautionary", "tier": "INFORMATIONAL", "action": "Road connects to a ferry river transport service. Prepare to stop.", "tts": "Ferry crossing service ahead."},
    {"id": 66, "name": "Barrier Ahead", "cat": "Cautionary", "tier": "WARNING", "action": "Toll barrier or security checkpoint gate ahead. Prepare to halt.", "tts": "Toll barrier checkpoint ahead."},
    {"id": 67, "name": "Men at Work", "cat": "Cautionary", "tier": "WARNING", "action": "Road construction or repair workers ahead. Follow lane diversions.", "tts": "Road work in progress ahead."},
    {"id": 68, "name": "Roundabout", "cat": "Cautionary", "tier": "WARNING", "action": "Circular roundabout junction ahead. Yield to traffic on your right.", "tts": "Roundabout ahead. Yield to circulating traffic."},
    {"id": 69, "name": "Dangerous Dip", "cat": "Cautionary", "tier": "WARNING", "action": "Sharp depression/dip in road surface. Slow down to avoid suspension impact.", "tts": "Dangerous road dip ahead."},
    {"id": 70, "name": "Speed Breaker", "cat": "Cautionary", "tier": "WARNING", "action": "Speed bump / hump ahead. Reduce speed to 15 km/h immediately.", "tts": "Speed breaker ahead. Slow down."},
    {"id": 71, "name": "Gap in Median", "cat": "Cautionary", "tier": "WARNING", "action": "Break in road divider ahead. Watch for turning or merging vehicles.", "tts": "Gap in median ahead."},
    {"id": 72, "name": "Cross Road", "cat": "Cautionary", "tier": "WARNING", "action": "Four-way intersection ahead where paths cross. Slow down and check lanes.", "tts": "Crossroad intersection ahead."},
    {"id": 73, "name": "Side Road Left", "cat": "Cautionary", "tier": "WARNING", "action": "Side road joins main road on the left side. Watch for entering traffic.", "tts": "Side road enters from left."},
    {"id": 74, "name": "Side Road Right", "cat": "Cautionary", "tier": "WARNING", "action": "Side road joins main road on the right side. Watch for merging vehicles.", "tts": "Side road enters from right."},
    {"id": 75, "name": "Staggered Intersection", "cat": "Cautionary", "tier": "WARNING", "action": "Staggered side roads join ahead (left then right). Slow down.", "tts": "Staggered intersection ahead."},
    {"id": 76, "name": "T-Intersections", "cat": "Cautionary", "tier": "WARNING", "action": "Road ends in T-junction ahead. You must turn left or right.", "tts": "T-junction ahead. Prepare to turn."},
    {"id": 77, "name": "Y-Intersection", "cat": "Cautionary", "tier": "WARNING", "action": "Fork in the road ahead splitting into a Y shape.", "tts": "Y-intersection ahead."},
    {"id": 78, "name": "Y-Intersection Left Branch", "cat": "Cautionary", "tier": "WARNING", "action": "Upcoming road division with a major branch going to the left.", "tts": "Y-intersection with left branch ahead."},
    {"id": 79, "name": "Y-Intersection Right Branch", "cat": "Cautionary", "tier": "WARNING", "action": "Upcoming road division with a major branch leading off to the right.", "tts": "Y-intersection with right branch ahead."},
    {"id": 80, "name": "Major Road Ahead", "cat": "Cautionary", "tier": "WARNING", "action": "Approaching primary intersection. Must yield to mainline traffic.", "tts": "Major road intersection ahead. Yield to main traffic."},
    {"id": 81, "name": "Guarded Railway Crossing", "cat": "Cautionary", "tier": "CRITICAL", "action": "Railway crossing with gates ahead. Stop if barrier is closed or closing.", "tts": "Guarded railway crossing ahead."},
    {"id": 82, "name": "Unguarded Railway Crossing", "cat": "Cautionary", "tier": "CRITICAL", "action": "Railway level crossing without gates. Stop, look both ways, and listen.", "tts": "Warning: Unguarded railway crossing ahead."},
    {"id": 83, "name": "Sudden Side Wind", "cat": "Cautionary", "tier": "WARNING", "action": "Strong crosswinds ahead that can destabilize vehicles. Grip steering firmly.", "tts": "Caution: Strong crosswinds ahead."},
    {"id": 84, "name": "Overhead Cable", "cat": "Cautionary", "tier": "WARNING", "action": "High-voltage overhead electrical cables hanging low across the road.", "tts": "High voltage overhead cables ahead."},
    {"id": 85, "name": "Quay Side or River Bank", "cat": "Cautionary", "tier": "CRITICAL", "action": "Road ends or runs along an unprotected water bank or river shore.", "tts": "Warning: Road runs along open river bank."},
    {"id": 86, "name": "Playground Ahead", "cat": "Cautionary", "tier": "CRITICAL", "action": "Playground or park nearby where children play. Reduce speed.", "tts": "Playground ahead. Watch for children."},

    # ── INFORMATIONAL & FACILITY SIGNS ────────────────────────────────────────
    {"id": 87, "name": "Public Telephone", "cat": "Informational", "tier": "INFORMATIONAL", "action": "Public telephone booth facility located nearby.", "tts": "Public telephone booth ahead."},
    {"id": 88, "name": "Petrol Pump", "cat": "Informational", "tier": "INFORMATIONAL", "action": "Fuel station refilling service located nearby.", "tts": "Petrol pump fuel station ahead."},
    {"id": 89, "name": "Hospital", "cat": "Informational", "tier": "INFORMATIONAL", "action": "Hospital facility nearby. Drive quietly and avoid unnecessary honking.", "tts": "Hospital facility nearby. Drive quietly."},
    {"id": 90, "name": "First Aid Post", "cat": "Informational", "tier": "INFORMATIONAL", "action": "Emergency medical first aid kit assistance booth nearby.", "tts": "First aid medical post ahead."},
    {"id": 91, "name": "Eating Place", "cat": "Informational", "tier": "INFORMATIONAL", "action": "Restaurant or hot food eating services available nearby.", "tts": "Restaurant and eating place ahead."},
    {"id": 92, "name": "Light Refreshments", "cat": "Informational", "tier": "INFORMATIONAL", "action": "Tea, coffee, and snack cafeteria stalls located near roadway.", "tts": "Light refreshments stall ahead."},
    {"id": 93, "name": "Resting Place", "cat": "Informational", "tier": "INFORMATIONAL", "action": "Motel / Rest house / Hotel guest room facilities present next to highway.", "tts": "Rest house and motel ahead."},
    {"id": 94, "name": "Restroom / Public Toilet", "cat": "Informational", "tier": "INFORMATIONAL", "action": "Public washroom toilet facilities available alongside road.", "tts": "Public restroom facilities ahead."},
    {"id": 95, "name": "Bus Stop", "cat": "Informational", "tier": "INFORMATIONAL", "action": "Passenger pick-up and drop-off shelter for public transit buses.", "tts": "Bus stop ahead."},
    {"id": 96, "name": "Railway Station", "cat": "Informational", "tier": "INFORMATIONAL", "action": "Railway commuter passenger train station located nearby.", "tts": "Railway passenger station ahead."},
    {"id": 97, "name": "Police Station", "cat": "Informational", "tier": "INFORMATIONAL", "action": "Police station / law enforcement office nearby to report accidents.", "tts": "Police station ahead."},
    {"id": 98, "name": "Fire Station", "cat": "Informational", "tier": "INFORMATIONAL", "action": "Fire brigade rescue service station facility nearby.", "tts": "Fire station facility nearby."},
    {"id": 99, "name": "Taxi Stand", "cat": "Informational", "tier": "INFORMATIONAL", "action": "Designated boarding bay for commercial passenger taxis.", "tts": "Taxi stand ahead."},
    {"id": 100, "name": "Auto Rickshaw Stand", "cat": "Informational", "tier": "INFORMATIONAL", "action": "Designated passenger parking terminal for public auto-rickshaws.", "tts": "Auto rickshaw stand ahead."},
    {"id": 101, "name": "Parking Area", "cat": "Informational", "tier": "INFORMATIONAL", "action": "Authorized public vehicle parking zone.", "tts": "Public parking area ahead."},
    {"id": 102, "name": "Parking Both Sides", "cat": "Informational", "tier": "INFORMATIONAL", "action": "Dedicated vehicle parking permitted on both sides of roadway.", "tts": "Parking permitted on both sides."},
    {"id": 103, "name": "Parking Cycle", "cat": "Informational", "tier": "INFORMATIONAL", "action": "Dedicated parking slots for bicycles only.", "tts": "Bicycle parking area."},
    {"id": 104, "name": "Motorcycle Parking Area", "cat": "Informational", "tier": "INFORMATIONAL", "action": "Designated parking space reserved exclusively for two-wheelers.", "tts": "Motorcycle parking area."},
    {"id": 105, "name": "Car Parking Area", "cat": "Informational", "tier": "INFORMATIONAL", "action": "Designated parking space reserved exclusively for four-wheel passenger cars.", "tts": "Car parking area."},
    {"id": 106, "name": "No Through Road", "cat": "Informational", "tier": "INFORMATIONAL", "action": "Dead end / No exit road ahead. No outlet available.", "tts": "Dead end street. No through road."},
    {"id": 107, "name": "No Through Side Road", "cat": "Informational", "tier": "INFORMATIONAL", "action": "Turning into the side street leads to a dead-end road.", "tts": "Side road is a dead end."}
]


def render_rto_sign_template(item):
    """Renders high-quality vector traffic sign template on a 128x128 canvas."""
    img = Image.new('RGB', (CANVAS_SIZE, CANVAS_SIZE), color='white')
    draw = ImageDraw.Draw(img)
    name = item['name']
    cat = item['cat']
    cid = item['id']

    cx, cy = CANVAS_SIZE // 2, CANVAS_SIZE // 2
    r = int(CANVAS_SIZE * 0.44)

    # 1. Mandatory Circular Signs (Red Ring or Blue Fill)
    if cat == "Mandatory":
        if "Compulsory" in name:
            # Blue Circle with white symbols
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill='#0984e3', outline='#0984e3')
            draw.ellipse([cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3], outline='white', width=3)

            if "Ahead Only" in name:
                draw.line([cx, cy + 28, cx, cy - 22], fill='white', width=10)
                draw.polygon([(cx - 16, cy - 16), (cx + 16, cy - 16), (cx, cy - 35)], fill='white')
            elif "Turn Left" in name and "Ahead" not in name:
                draw.line([cx + 25, cy, cx - 18, cy], fill='white', width=10)
                draw.polygon([(cx - 14, cy - 16), (cx - 14, cy + 16), (cx - 32, cy)], fill='white')
            elif "Turn Right" in name and "Ahead" not in name:
                draw.line([cx - 25, cy, cx + 18, cy], fill='white', width=10)
                draw.polygon([(cx + 14, cy - 16), (cx + 14, cy + 16), (cx + 32, cy)], fill='white')
            elif "Keep Left" in name:
                draw.line([cx + 18, cy - 20, cx - 14, cy + 16], fill='white', width=10)
                draw.polygon([(cx - 24, cy + 5), (cx - 5, cy + 24), (cx - 28, cy + 28)], fill='white')
            elif "Keep Right" in name:
                draw.line([cx - 18, cy - 20, cx + 14, cy + 16], fill='white', width=10)
                draw.polygon([(cx + 24, cy + 5), (cx + 5, cy + 24), (cx + 28, cy + 28)], fill='white')
            elif "Minimum Speed" in name:
                cv_img = np.array(img)
                cv2.putText(cv_img, "30", (cx - 26, cy + 15), cv2.FONT_HERSHEY_DUPLEX, 1.1, (255, 255, 255), 3, cv2.LINE_AA)
                return Image.fromarray(cv_img)
            elif "Cycle Track" in name:
                draw.ellipse([cx - 28, cy + 5, cx - 10, cy + 23], outline='white', width=3)
                draw.ellipse([cx + 10, cy + 5, cx + 28, cy + 23], outline='white', width=3)
                draw.line([cx - 19, cy + 14, cx - 4, cy + 2], fill='white', width=3)
                draw.line([cx - 4, cy + 2, cx + 19, cy + 14], fill='white', width=3)
                draw.line([cx - 4, cy + 2, cx - 4, cy - 10], fill='white', width=3)
            elif "Sound Horn" in name:
                draw.polygon([(cx - 22, cy - 6), (cx - 6, cy - 14), (cx - 6, cy + 14), (cx - 22, cy + 6)], fill='white')
                draw.rectangle([cx - 6, cy - 5, cx + 16, cy + 5], fill='white')
                draw.arc([cx + 14, cy - 16, cx + 26, cy + 16], start=-60, end=60, fill='white', width=4)
            else:
                draw.line([cx, cy + 25, cx, cy - 15], fill='white', width=8)
                draw.polygon([(cx - 12, cy - 10), (cx + 12, cy - 10), (cx, cy - 28)], fill='white')
                draw.line([cx, cy + 5, cx - 18, cy + 5], fill='white', width=8)
                draw.polygon([(cx - 14, cy - 4), (cx - 14, cy + 14), (cx - 26, cy + 5)], fill='white')

        elif name == "Stop Sign":
            pts = [
                (cx - int(r*0.42), cy - r), (cx + int(r*0.42), cy - r),
                (cx + r, cy - int(r*0.42)), (cx + r, cy + int(r*0.42)),
                (cx + int(r*0.42), cy + r), (cx - int(r*0.42), cy + r),
                (cx - r, cy + int(r*0.42)), (cx - r, cy - int(r*0.42))
            ]
            draw.polygon(pts, fill='#d63031', outline='white')
            draw.polygon(pts, outline='#d63031', width=3)
            cv_img = np.array(img)
            cv2.putText(cv_img, "STOP", (cx - 36, cy + 12), cv2.FONT_HERSHEY_DUPLEX, 0.95, (255, 255, 255), 3, cv2.LINE_AA)
            return Image.fromarray(cv_img)

        elif name == "Give Way":
            pts = [(cx - r, cy - int(r*0.75)), (cx + r, cy - int(r*0.75)), (cx, cy + r)]
            draw.polygon(pts, fill='#d63031')
            pts_inner = [(cx - int(r*0.68), cy - int(r*0.58)), (cx + int(r*0.68), cy - int(r*0.58)), (cx, cy + int(r*0.72))]
            draw.polygon(pts_inner, fill='white')

        elif name == "No Parking":
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill='#0984e3', outline='#d63031', width=14)
            draw.line([cx - 12, cy - 24, cx - 12, cy + 24], fill='white', width=9)
            draw.arc([cx - 12, cy - 24, cx + 18, cy + 4], start=270, end=90, fill='white', width=8)
            draw.line([cx - int(r*0.7), cy - int(r*0.7), cx + int(r*0.7), cy + int(r*0.7)], fill='#d63031', width=12)

        elif name == "No Stopping or Standing":
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill='#0984e3', outline='#d63031', width=14)
            draw.line([cx - int(r*0.7), cy - int(r*0.7), cx + int(r*0.7), cy + int(r*0.7)], fill='#d63031', width=12)
            draw.line([cx - int(r*0.7), cy + int(r*0.7), cx + int(r*0.7), cy - int(r*0.7)], fill='#d63031', width=12)

        elif name == "No Entry":
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill='#d63031')
            draw.rectangle([cx - int(r*0.75), cy - 11, cx + int(r*0.75), cy + 11], fill='white')

        elif "Speed Limit" in name:
            limit_val = str(item.get("limit", 50))
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill='white', outline='#d63031', width=14)
            cv_img = np.array(img)
            font_scale = 0.85 if len(limit_val) >= 3 else 1.15
            dx = 38 if len(limit_val) >= 3 else (28 if len(limit_val) == 2 else 15)
            cv2.putText(cv_img, limit_val, (cx - dx, cy + 14), cv2.FONT_HERSHEY_DUPLEX, font_scale, (20, 20, 20), 3, cv2.LINE_AA)
            return Image.fromarray(cv_img)

        elif name == "Restriction Ends Sign":
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill='white', outline='#2d3436', width=4)
            for offset in [-12, -4, 4, 12]:
                draw.line([cx - int(r*0.7) + offset, cy + int(r*0.7), cx + int(r*0.7) + offset, cy - int(r*0.7)], fill='#2d3436', width=3)

        else:
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill='white', outline='#d63031', width=13)
            draw.line([cx - int(r*0.68), cy - int(r*0.68), cx + int(r*0.68), cy + int(r*0.68)], fill='#d63031', width=11)

            if "U-Turn" in name:
                draw.line([cx + 12, cy - 12, cx + 12, cy + 16], fill='black', width=7)
                draw.arc([cx - 14, cy - 2, cx + 12, cy + 24], start=0, end=180, fill='black', width=7)
                draw.line([cx - 14, cy - 6, cx - 14, cy + 12], fill='black', width=7)
            elif "Left Turn" in name:
                draw.line([cx + 10, cy + 18, cx + 10, cy - 4], fill='black', width=7)
                draw.line([cx + 10, cy - 4, cx - 16, cy - 4], fill='black', width=7)
                draw.polygon([(cx - 12, cy - 12), (cx - 12, cy + 4), (cx - 24, cy - 4)], fill='black')
            elif "Right Turn" in name:
                draw.line([cx - 10, cy + 18, cx - 10, cy - 4], fill='black', width=7)
                draw.line([cx - 10, cy - 4, cx + 16, cy - 4], fill='black', width=7)
                draw.polygon([(cx + 12, cy - 12), (cx + 12, cy + 4), (cx + 24, cy - 4)], fill='black')
            elif "Overtaking" in name:
                draw.rectangle([cx - 24, cy - 8, cx - 4, cy + 14], fill='#d63031')
                draw.rectangle([cx + 4, cy - 8, cx + 24, cy + 14], fill='black')
            elif "Horn" in name:
                draw.polygon([(cx - 18, cy - 5), (cx - 4, cy - 12), (cx - 4, cy + 12), (cx - 18, cy + 5)], fill='black')
                draw.rectangle([cx - 4, cy - 4, cx + 14, cy + 4], fill='black')
            elif "Trucks" in name:
                draw.rectangle([cx - 22, cy - 8, cx + 10, cy + 10], fill='black')
                draw.rectangle([cx + 10, cy - 2, cx + 20, cy + 10], fill='black')
            elif "Pedestrian" in name:
                draw.ellipse([cx - 5, cy - 26, cx + 5, cy - 16], fill='black')
                draw.line([cx, cy - 16, cx, cy + 5], fill='black', width=5)
                draw.line([cx, cy + 5, cx - 12, cy + 24], fill='black', width=4)
                draw.line([cx, cy + 5, cx + 12, cy + 24], fill='black', width=4)
            elif "Limit" in name or "Load" in name:
                cv_img = np.array(img)
                txt = "5T" if "5t" in name else ("4T" if "4t" in name else ("3.5m" if "3.5" in name else "2m"))
                cv2.putText(cv_img, txt, (cx - 24, cy + 8), cv2.FONT_HERSHEY_DUPLEX, 0.75, (20, 20, 20), 2, cv2.LINE_AA)
                return Image.fromarray(cv_img)

    # 2. Cautionary & Warning Signs (Equilateral Red Triangle)
    elif cat == "Cautionary":
        pts = [(cx, cy - r), (cx + int(r * 1.15), cy + int(r * 0.9)), (cx - int(r * 1.15), cy + int(r * 0.9))]
        draw.polygon(pts, fill='#d63031')
        inner_pts = [(cx, cy - int(r*0.62)), (cx + int(r * 0.85), cy + int(r * 0.72)), (cx - int(r * 0.85), cy + int(r * 0.72))]
        draw.polygon(inner_pts, fill='white')

        if "Curve" in name:
            direction = 1 if "Right" in name else -1
            draw.arc([cx - 24, cy - 12, cx + 24, cy + 28], start=180 if direction==1 else 0, end=360 if direction==1 else 180, fill='black', width=6)
        elif "Hair Pin" in name:
            direction = 1 if "Right" in name else -1
            draw.line([cx - 10*direction, cy + 22, cx - 10*direction, cy - 6], fill='black', width=6)
            draw.arc([cx - 22, cy - 16, cx + 22, cy + 6], start=180 if direction==1 else 0, end=360 if direction==1 else 180, fill='black', width=6)
            draw.line([cx + 10*direction, cy - 6, cx + 10*direction, cy + 22], fill='black', width=6)
        elif "Speed Breaker" in name or "Hump" in name or "Rough" in name:
            draw.arc([cx - 28, cy - 6, cx + 28, cy + 28], start=180, end=360, fill='black', width=8)
        elif "Pedestrian Crossing" in name:
            draw.ellipse([cx - 4, cy - 18, cx + 4, cy - 10], fill='black')
            draw.line([cx, cy - 10, cx, cy + 8], fill='black', width=4)
            draw.line([cx, cy + 8, cx - 10, cy + 24], fill='black', width=4)
            draw.line([cx, cy + 8, cx + 10, cy + 24], fill='black', width=4)
        elif "School Ahead" in name or "Playground" in name:
            draw.ellipse([cx - 12, cy - 16, cx - 6, cy - 10], fill='black')
            draw.line([cx - 9, cy - 10, cx - 9, cy + 10], fill='black', width=4)
            draw.ellipse([cx + 6, cy - 12, cx + 12, cy - 6], fill='black')
            draw.line([cx + 9, cy - 6, cx + 9, cy + 14], fill='black', width=3)
        elif "Traffic Signal" in name:
            draw.rectangle([cx - 8, cy - 16, cx + 8, cy + 18], fill='#2d3436')
            draw.ellipse([cx - 5, cy - 13, cx + 5, cy - 3], fill='#d63031')
            draw.ellipse([cx - 5, cy - 2, cx + 5, cy + 6], fill='#fdcb6e')
            draw.ellipse([cx - 5, cy + 7, cx + 5, cy + 17], fill='#00b894')
        elif "Cross Road" in name or "Intersection" in name or "Major Road" in name:
            draw.line([cx, cy - 14, cx, cy + 24], fill='black', width=8)
            draw.line([cx - 20, cy + 5, cx + 20, cy + 5], fill='black', width=6)
        elif "Roundabout" in name:
            draw.ellipse([cx - 16, cy - 6, cx + 16, cy + 24], outline='black', width=5)
        elif "Railway" in name:
            draw.line([cx - 18, cy + 8, cx + 18, cy + 8], fill='black', width=4)
            draw.line([cx - 18, cy + 18, cx + 18, cy + 18], fill='black', width=4)
            for x_pos in range(cx - 15, cx + 16, 8):
                draw.line([x_pos, cy + 4, x_pos, cy + 22], fill='black', width=3)
        elif "Slippery" in name:
            draw.rectangle([cx - 14, cy - 8, cx + 14, cy + 8], fill='black')
            draw.arc([cx - 20, cy + 8, cx, cy + 24], start=0, end=180, fill='black', width=3)
            draw.arc([cx, cy + 8, cx + 20, cy + 24], start=180, end=360, fill='black', width=3)
        elif "Falling Rocks" in name:
            draw.polygon([(cx - 20, cy + 24), (cx - 20, cy - 8), (cx - 6, cy + 8)], fill='black')
            draw.ellipse([cx + 4, cy - 4, cx + 10, cy + 2], fill='black')
            draw.ellipse([cx + 8, cy + 8, cx + 16, cy + 16], fill='black')
        elif "Narrow" in name:
            draw.line([cx - 18, cy + 24, cx - 8, cy - 12], fill='black', width=6)
            draw.line([cx + 18, cy + 24, cx + 8, cy - 12], fill='black', width=6)
        elif "Cattle" in name:
            draw.ellipse([cx - 16, cy - 4, cx + 14, cy + 12], fill='black')
            draw.line([cx - 12, cy + 12, cx - 12, cy + 24], fill='black', width=3)
            draw.line([cx + 8, cy + 12, cx + 8, cy + 24], fill='black', width=3)
        else:
            draw.line([cx, cy - 12, cx, cy + 10], fill='black', width=6)
            draw.ellipse([cx - 3, cy + 16, cx + 3, cy + 22], fill='black')

    # 3. Informational & Facility Signs (Blue Rectangles / Squares)
    else:
        draw.rectangle([cx - r, cy - r, cx + r, cy + r], fill='#0984e3', outline='#0984e3')
        draw.rectangle([cx - r + 4, cy - r + 4, cx + r - 4, cy + r - 4], outline='white', width=2)

        if "Parking" in name:
            draw.line([cx - 12, cy - 24, cx - 12, cy + 24], fill='white', width=10)
            draw.arc([cx - 12, cy - 24, cx + 18, cy + 4], start=270, end=90, fill='white', width=9)
            if "Cycle" in name:
                draw.ellipse([cx - 15, cy + 16, cx - 5, cy + 26], fill='white')
                draw.ellipse([cx + 5, cy + 16, cx + 15, cy + 26], fill='white')
            elif "Both Sides" in name:
                draw.line([cx - 24, cy + 30, cx + 24, cy + 30], fill='white', width=4)
        elif "Hospital" in name:
            draw.line([cx - 16, cy - 22, cx - 16, cy + 22], fill='white', width=9)
            draw.line([cx + 16, cy - 22, cx + 16, cy + 22], fill='white', width=9)
            draw.line([cx - 16, cy, cx + 16, cy], fill='white', width=9)
        elif "First Aid" in name:
            draw.rectangle([cx - 24, cy - 24, cx + 24, cy + 24], fill='white')
            draw.rectangle([cx - 6, cy - 18, cx + 6, cy + 18], fill='#d63031')
            draw.rectangle([cx - 18, cy - 6, cx + 18, cy + 6], fill='#d63031')
        elif "Petrol Pump" in name:
            draw.rectangle([cx - 16, cy - 18, cx + 12, cy + 22], fill='white')
            draw.rectangle([cx - 10, cy - 12, cx + 6, cy - 2], fill='#0984e3')
            draw.line([cx + 12, cy - 8, cx + 20, cy + 8], fill='white', width=4)
        elif "Eating Place" in name:
            draw.line([cx - 10, cy - 20, cx - 10, cy + 22], fill='white', width=4)
            draw.line([cx + 10, cy - 20, cx + 10, cy + 22], fill='white', width=4)
            draw.line([cx - 16, cy - 20, cx - 4, cy - 20], fill='white', width=3)
        elif "Light Refreshments" in name:
            draw.rectangle([cx - 14, cy - 8, cx + 14, cy + 12], fill='white')
            draw.line([cx - 20, cy + 16, cx + 20, cy + 16], fill='white', width=4)
            draw.arc([cx + 10, cy - 4, cx + 22, cy + 8], start=270, end=90, fill='white', width=3)
        elif "Restroom" in name or "Toilet" in name:
            cv_img = np.array(img)
            cv2.putText(cv_img, "WC", (cx - 26, cy + 12), cv2.FONT_HERSHEY_DUPLEX, 0.95, (255, 255, 255), 3, cv2.LINE_AA)
            return Image.fromarray(cv_img)
        elif "Telephone" in name:
            draw.arc([cx - 18, cy - 20, cx + 18, cy - 4], start=0, end=180, fill='white', width=6)
            draw.rectangle([cx - 6, cy - 10, cx + 6, cy + 18], fill='white')
        elif "Bus" in name:
            draw.rectangle([cx - 18, cy - 16, cx + 18, cy + 16], fill='white')
            draw.rectangle([cx - 14, cy - 12, cx + 14, cy - 2], fill='#0984e3')
            draw.ellipse([cx - 12, cy + 12, cx - 6, cy + 20], fill='black')
            draw.ellipse([cx + 6, cy + 12, cx + 12, cy + 20], fill='black')
        elif "Railway" in name:
            draw.rectangle([cx - 16, cy - 16, cx + 16, cy + 14], fill='white')
            draw.ellipse([cx - 5, cy - 8, cx + 5, cy + 2], fill='#0984e3')
            draw.rectangle([cx - 20, cy + 14, cx + 20, cy + 18], fill='white')
        elif "No Through" in name:
            draw.line([cx, cy + 24, cx, cy - 12], fill='white', width=10)
            draw.line([cx - 18, cy - 12, cx + 18, cy - 12], fill='#d63031', width=10)
        else:
            cv_img = np.array(img)
            initial = name[:3].upper()
            cv2.putText(cv_img, initial, (cx - 26, cy + 12), cv2.FONT_HERSHEY_DUPLEX, 0.85, (255, 255, 255), 2, cv2.LINE_AA)
            return Image.fromarray(cv_img)

    return img


def apply_rto_augmentations(base_pil, count=120):
    """
    Applies photorealistic real-world augmentations to simulate webcam/highway conditions:
    Perspective, rotation, lighting, shadows, atmospheric blur, sensor noise, weather conditions.
    """
    augmented = []
    base_np = np.array(base_pil)

    for _ in range(count):
        img_cv = base_np.copy()

        # 1. Random Rotation (-14 to +14 degrees)
        angle = np.random.uniform(-14, 14)
        M_rot = cv2.getRotationMatrix2D((CANVAS_SIZE // 2, CANVAS_SIZE // 2), angle, 1.0)
        img_cv = cv2.warpAffine(img_cv, M_rot, (CANVAS_SIZE, CANVAS_SIZE), borderMode=cv2.BORDER_REFLECT)

        # 2. Perspective warp (camera viewing angle)
        pts1 = np.float32([[0, 0], [CANVAS_SIZE, 0], [0, CANVAS_SIZE], [CANVAS_SIZE, CANVAS_SIZE]])
        dx = np.random.uniform(-9, 9, 4)
        dy = np.random.uniform(-9, 9, 4)
        pts2 = np.float32([
            [0 + dx[0], 0 + dy[0]],
            [CANVAS_SIZE + dx[1], 0 + dy[1]],
            [0 + dx[2], CANVAS_SIZE + dy[2]],
            [CANVAS_SIZE + dx[3], CANVAS_SIZE + dy[3]]
        ])
        M_persp = cv2.getPerspectiveTransform(pts1, pts2)
        img_cv = cv2.warpPerspective(img_cv, M_persp, (CANVAS_SIZE, CANVAS_SIZE), borderMode=cv2.BORDER_REFLECT)

        # 3. Random Lighting / Contrast / Shadows
        alpha = np.random.uniform(0.60, 1.40)
        beta = np.random.randint(-40, 40)
        img_cv = cv2.convertScaleAbs(img_cv, alpha=alpha, beta=beta)

        # 4. Atmospheric blur / lens motion
        if np.random.rand() > 0.45:
            k = np.random.choice([3, 5])
            img_cv = cv2.GaussianBlur(img_cv, (k, k), 0)

        # 5. Sensor noise
        if np.random.rand() > 0.35:
            noise = np.random.normal(0, np.random.uniform(4, 16), img_cv.shape).astype(np.int16)
            img_cv = np.clip(img_cv.astype(np.int16) + noise, 0, 255).astype(np.uint8)

        # 6. Random resolution degradation (simulate camera distance)
        res_down = np.random.randint(28, 110)
        small = cv2.resize(img_cv, (res_down, res_down), interpolation=cv2.INTER_AREA)
        img_cv = cv2.resize(small, (CANVAS_SIZE, CANVAS_SIZE), interpolation=cv2.INTER_CUBIC)

        augmented.append(Image.fromarray(img_cv))

    return augmented


def build_rto_dataset(dataset_dir="dataset"):
    """Builds complete RTO Traffic Signs Dataset and saves metadata."""
    dataset_path = Path(dataset_dir)
    train_dir = dataset_path / "Train"
    test_dir = dataset_path / "Test"

    train_dir.mkdir(parents=True, exist_ok=True)
    test_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print(f"  BUILDING OFFICIAL INDIAN RTO TRAFFIC SIGNS DATASET ({len(RTO_SIGN_CATALOG)} CLASSES)")
    print("=" * 70)

    records = []

    for item in RTO_SIGN_CATALOG:
        cid = item["id"]
        c_train_dir = train_dir / str(cid)
        c_test_dir = test_dir / str(cid)
        c_train_dir.mkdir(parents=True, exist_ok=True)
        c_test_dir.mkdir(parents=True, exist_ok=True)

        template = render_rto_sign_template(item)
        template.save(c_train_dir / "00000_base.png")
        template.save(c_test_dir / "00000_base.png")

        # Generate 120 Train images and 25 Test images per class
        train_samples = apply_rto_augmentations(template, count=120)
        test_samples = apply_rto_augmentations(template, count=25)

        for i, s in enumerate(train_samples):
            s.save(c_train_dir / f"{i+1:05d}.png")

        for i, s in enumerate(test_samples):
            s.save(c_test_dir / f"{i+1:05d}.png")

        records.append({
            "ClassId": cid,
            "Name": item["name"],
            "Category": item["cat"],
            "RiskLevel": item["tier"],
            "SpeedLimit": item.get("limit", ""),
            "RequiredAction": item["action"],
            "TTSPrompt": item["tts"]
        })

        if cid % 20 == 0 or cid == len(RTO_SIGN_CATALOG) - 1:
            print(f"  [PROCESSED] Class #{cid:03d}: {item['name']:<35} ({item['cat']}) -> {len(train_samples)+1} Train / {len(test_samples)+1} Test samples")

    df_meta = pd.DataFrame(records)
    df_meta.to_csv(dataset_path / "signnames_rto.csv", index=False)
    Path("training data").mkdir(parents=True, exist_ok=True)
    df_meta.to_csv(Path("training data") / "labels.csv", index=False)
    print("=" * 70)
    print(f"[COMPLETE] Built {len(RTO_SIGN_CATALOG)} RTO Classes with total {(len(train_samples)+1)*len(RTO_SIGN_CATALOG)} training samples!")
    print(f"Saved Metadata to: {dataset_path / 'signnames_rto.csv'} and training data/labels.csv")
    print("=" * 70)


if __name__ == "__main__":
    build_rto_dataset()
