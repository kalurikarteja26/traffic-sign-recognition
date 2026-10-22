"""
backend/services/geospatial.py

High-precision spherical geospatial calculations for road navigation,
route corridor matching, cross-track corridor rejection, along-track projections,
and vehicle heading alignment for traffic sign alerts.
"""

import math
from typing import List, Tuple, Dict, Any, Optional

EARTH_RADIUS_M = 6371000.0  # Mean radius of Earth in meters


def haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes great-circle distance between two GPS coordinates in meters.
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    return EARTH_RADIUS_M * c


def calculate_bearing_deg(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes initial forward azimuth bearing from (lat1, lon1) to (lat2, lon2)
    in degrees from true North [0.0, 360.0).
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_lambda = math.radians(lon2 - lon1)

    y = math.sin(delta_lambda) * math.cos(phi2)
    x = (math.cos(phi1) * math.sin(phi2) -
         math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda))

    bearing = math.degrees(math.atan2(y, x))
    return (bearing + 360.0) % 360.0


def bearing_difference_deg(bearing1: Optional[float], bearing2: Optional[float]) -> float:
    """
    Calculates minimal angular difference between two azimuth bearings [0.0, 180.0].
    Returns 0.0 if either bearing is None.
    """
    if bearing1 is None or bearing2 is None:
        return 0.0
    diff = abs(bearing1 - bearing2) % 360.0
    return 360.0 - diff if diff > 180.0 else diff


def is_heading_aligned(vehicle_heading: Optional[float], sign_facing_deg: Optional[float], tolerance_deg: float = 65.0) -> bool:
    """
    Determines if vehicle heading matches the sign's facing direction within tolerance.
    If sign_facing_deg is None (omnidirectional sign), returns True.
    If vehicle_heading is None (stationary/unknown), returns True.
    If the vehicle is traveling opposite to the sign (> 90 degrees), returns False.
    """
    if vehicle_heading is None or sign_facing_deg is None:
        return True
    diff = bearing_difference_deg(vehicle_heading, sign_facing_deg)
    return diff <= tolerance_deg


def cross_track_distance_m(
    lat_p: float, lon_p: float,
    lat_start: float, lon_start: float,
    lat_end: float, lon_end: float
) -> float:
    """
    Spherical cross-track distance (perpendicular offset) in meters from point P
    to the great-circle path from start to end.
    Positive/negative indicates right/left of the path.
    """
    d13 = haversine_distance_m(lat_start, lon_start, lat_p, lon_p) / EARTH_RADIUS_M
    theta13 = math.radians(calculate_bearing_deg(lat_start, lon_start, lat_p, lon_p))
    theta12 = math.radians(calculate_bearing_deg(lat_start, lon_start, lat_end, lon_end))

    d_xt = math.asin(math.sin(d13) * math.sin(theta13 - theta12))
    return abs(d_xt * EARTH_RADIUS_M)


def along_track_distance_m(
    lat_p: float, lon_p: float,
    lat_start: float, lon_start: float,
    lat_end: float, lon_end: float
) -> float:
    """
    Spherical along-track distance in meters from start point to the point
    projected on the great-circle path.
    """
    d13 = haversine_distance_m(lat_start, lon_start, lat_p, lon_p) / EARTH_RADIUS_M
    theta13 = math.radians(calculate_bearing_deg(lat_start, lon_start, lat_p, lon_p))
    theta12 = math.radians(calculate_bearing_deg(lat_start, lon_start, lat_end, lon_end))

    d_xt = math.asin(math.sin(d13) * math.sin(theta13 - theta12))
    d_at = math.acos(math.cos(d13) / math.cos(d_xt))
    
    # Check if projection is behind the start point
    if math.cos(theta13 - theta12) < 0:
        return -abs(d_at * EARTH_RADIUS_M)
    return abs(d_at * EARTH_RADIUS_M)


def project_point_onto_polyline(
    lat_p: float, lon_p: float,
    waypoints: List[Tuple[float, float]]
) -> Dict[str, Any]:
    """
    Projects point P onto a polyline of (lat, lon) coordinates.
    Finds:
      - closest_segment_index: index of start waypoint
      - min_distance_m: shortest perpendicular or endpoint distance to polyline
      - cumulative_distance_m: distance from start of polyline to projection
      - segment_bearing_deg: bearing of the matching polyline segment
    """
    if not waypoints or len(waypoints) < 2:
        return {
            "closest_segment_index": 0,
            "min_distance_m": float("inf"),
            "cumulative_distance_m": 0.0,
            "segment_bearing_deg": 0.0
        }

    min_dist = float("inf")
    best_segment_idx = 0
    best_segment_bearing = 0.0
    best_cumulative = 0.0
    accumulated_route_length = 0.0

    for i in range(len(waypoints) - 1):
        lat_a, lon_a = waypoints[i]
        lat_b, lon_b = waypoints[i + 1]

        seg_len = haversine_distance_m(lat_a, lon_a, lat_b, lon_b)
        if seg_len < 0.5:
            continue

        seg_bearing = calculate_bearing_deg(lat_a, lon_a, lat_b, lon_b)
        at_dist = along_track_distance_m(lat_p, lon_p, lat_a, lon_a, lat_b, lon_b)

        if at_dist <= 0:
            # Clamped to point A
            d = haversine_distance_m(lat_p, lon_p, lat_a, lon_a)
            proj_cum = accumulated_route_length
        elif at_dist >= seg_len:
            # Clamped to point B
            d = haversine_distance_m(lat_p, lon_p, lat_b, lon_b)
            proj_cum = accumulated_route_length + seg_len
        else:
            # Perpendicularly inside segment
            d = cross_track_distance_m(lat_p, lon_p, lat_a, lon_a, lat_b, lon_b)
            proj_cum = accumulated_route_length + at_dist

        if d < min_dist:
            min_dist = d
            best_segment_idx = i
            best_segment_bearing = seg_bearing
            best_cumulative = proj_cum

        accumulated_route_length += seg_len

    return {
        "closest_segment_index": best_segment_idx,
        "min_distance_m": min_dist,
        "cumulative_distance_m": best_cumulative,
        "segment_bearing_deg": best_segment_bearing,
        "total_route_length_m": accumulated_route_length
    }


def compute_route_distance_to_sign(
    user_lat: float, user_lon: float,
    user_heading_deg: Optional[float],
    sign_lat: float, sign_lon: float,
    sign_direction_deg: Optional[float],
    route_waypoints: List[Tuple[float, float]],
    corridor_tolerance_m: float = 35.0,
    heading_tolerance_deg: float = 65.0
) -> Dict[str, Any]:
    """
    Evaluates whether a sign is eligible along the active route and computes
    accurate along-route distance from vehicle to the sign.

    Returns:
      eligible (bool): whether the sign is applicable to current travel direction & route
      distance_m (float): along-route distance in meters from vehicle to sign
      direct_distance_m (float): Euclidean Haversine distance
      cross_track_m (float): offset distance from route centerline
      reason (str): rejection reason or confirmation
    """
    direct_dist = haversine_distance_m(user_lat, user_lon, sign_lat, sign_lon)

    if not route_waypoints or len(route_waypoints) < 2:
        # Fallback to direct distance if route is absent
        heading_ok = is_heading_aligned(user_heading_deg, sign_direction_deg, heading_tolerance_deg)
        return {
            "eligible": heading_ok,
            "distance_m": direct_dist,
            "direct_distance_m": direct_dist,
            "cross_track_m": 0.0,
            "bearing_diff_deg": bearing_difference_deg(user_heading_deg, sign_direction_deg) if user_heading_deg else 0.0,
            "reason": "Direct tracking without polyline" if heading_ok else "Sign direction mismatch"
        }

    # 1. Project user onto route
    user_proj = project_point_onto_polyline(user_lat, user_lon, route_waypoints)
    # 2. Project sign onto route
    sign_proj = project_point_onto_polyline(sign_lat, sign_lon, route_waypoints)

    # Corrdior verification: Sign must be within corridor width of route centerline
    if sign_proj["min_distance_m"] > corridor_tolerance_m:
        return {
            "eligible": False,
            "distance_m": direct_dist,
            "direct_distance_m": direct_dist,
            "cross_track_m": sign_proj["min_distance_m"],
            "bearing_diff_deg": 0.0,
            "reason": f"Sign is {sign_proj['min_distance_m']:.1f}m off route corridor (limit {corridor_tolerance_m}m — parallel road rejection)"
        }

    # Direction verification: Sign must face the route or vehicle travel direction
    effective_heading = user_heading_deg if user_heading_deg is not None else sign_proj["segment_bearing_deg"]
    if sign_direction_deg is not None:
        bearing_diff = bearing_difference_deg(effective_heading, sign_direction_deg)
        if bearing_diff > heading_tolerance_deg:
            return {
                "eligible": False,
                "distance_m": direct_dist,
                "direct_distance_m": direct_dist,
                "cross_track_m": sign_proj["min_distance_m"],
                "bearing_diff_deg": bearing_diff,
                "reason": f"Sign direction ({sign_direction_deg:.0f}°) does not match route heading ({effective_heading:.0f}°, diff {bearing_diff:.0f}° > {heading_tolerance_deg}° — opposite carriageway rejection)"
            }
    else:
        bearing_diff = 0.0

    # Check if user is off-route (e.g. driving/walking in live handheld device GPS mode)
    if user_proj["min_distance_m"] > 100.0:
        # Evaluate direct forward proximity to sign
        bearing_to_sign = calculate_bearing_deg(user_lat, user_lon, sign_lat, sign_lon)
        forward_angle = bearing_difference_deg(user_heading_deg, bearing_to_sign) if user_heading_deg is not None else 0.0

        if forward_angle > 75.0:
            return {
                "eligible": False,
                "distance_m": direct_dist,
                "direct_distance_m": direct_dist,
                "cross_track_m": user_proj["min_distance_m"],
                "bearing_diff_deg": forward_angle,
                "reason": "Sign is behind or perpendicular to user's travel direction"
            }

        if sign_direction_deg is not None and user_heading_deg is not None:
            facing_diff = bearing_difference_deg(user_heading_deg, sign_direction_deg)
            if facing_diff > heading_tolerance_deg:
                return {
                    "eligible": False,
                    "distance_m": direct_dist,
                    "direct_distance_m": direct_dist,
                    "cross_track_m": user_proj["min_distance_m"],
                    "bearing_diff_deg": facing_diff,
                    "reason": f"Sign direction ({sign_direction_deg:.0f}°) does not match vehicle heading ({user_heading_deg:.0f}°)"
                }
        else:
            facing_diff = 0.0

        return {
            "eligible": True,
            "distance_m": direct_dist,
            "direct_distance_m": direct_dist,
            "cross_track_m": user_proj["min_distance_m"],
            "bearing_diff_deg": forward_angle,
            "reason": "Sign is ahead of vehicle (live handheld GPS mode)"
        }

    # Along-track distance: Sign must be ahead of user along route
    along_route_dist = sign_proj["cumulative_distance_m"] - user_proj["cumulative_distance_m"]

    if along_route_dist < -20.0:  # Allow 20m tolerance for GPS jitter when just passing
        return {
            "eligible": False,
            "distance_m": along_route_dist,
            "direct_distance_m": direct_dist,
            "cross_track_m": sign_proj["min_distance_m"],
            "bearing_diff_deg": bearing_diff,
            "reason": "Vehicle has already passed this sign"
        }

    return {
        "eligible": True,
        "distance_m": max(0.0, along_route_dist),
        "direct_distance_m": direct_dist,
        "cross_track_m": sign_proj["min_distance_m"],
        "bearing_diff_deg": bearing_diff,
        "reason": "Sign is active and verified ahead on active route corridor"
    }


def calculate_adaptive_warning_thresholds(speed_kmh: float, base_thresholds: Optional[List[int]] = None) -> List[int]:
    """
    Computes speed-adaptive advance warning distances [early, primary, immediate].
    At high expressway speeds (e.g. 80-100 km/h), stopping/reaction distances increase.
    """
    if base_thresholds is None or len(base_thresholds) != 3:
        base_thresholds = [500, 200, 100]

    early, primary, immediate = base_thresholds

    if speed_kmh > 80.0:
        # High-speed Expressway mode (+150m early, +80m primary, +40m immediate)
        return [early + 150, primary + 80, immediate + 40]
    elif speed_kmh > 50.0:
        # Arterial roadway mode (+50m early, +30m primary, +15m immediate)
        return [early + 50, primary + 30, immediate + 15]
    elif speed_kmh < 25.0:
        # Slow urban/residential mode (tighter thresholds)
        return [max(300, early - 100), max(150, primary - 50), max(60, immediate - 30)]

    return [early, primary, immediate]
