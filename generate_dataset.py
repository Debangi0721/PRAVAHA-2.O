import os
import csv
import math
import random
from datetime import datetime, timedelta

# Create output directories
os.makedirs("data", exist_ok=True)
os.makedirs("public/data", exist_ok=True)

csv_path = os.path.join("data", "flood_dataset.csv")
public_csv_path = os.path.join("public", "data", "flood_dataset.csv")

# Set random seed for reproducibility
random.seed(42)

headers = [
    "timestamp",
    "rainfall_mm",
    "rainfall_intensity_mm_hr",
    "rainfall_duration_hr",
    "water_level_m",
    "water_level_rise_rate_m_hr",
    "water_level_acceleration_m_hr2",
    "soil_moisture_percent",
    "saturation_index",
    "elevation_m",
    "distance_from_river_m",
    "vulnerability_level",
    "flood_type",
    "risk_level"
]

flood_types = ["Slow Saturation", "Cloudburst", "Rapid-Rise", "Sudden Upstream"]
vulnerability_levels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

rows = []
base_time = datetime(2026, 7, 1, 0, 0, 0)
total_rows = 5000

for i in range(total_rows):
    current_time = base_time + timedelta(hours=i * 0.5)
    timestamp_str = current_time.strftime("%Y-%m-%d %H:%M:%S")

    # Select flood type with realistic cluster distribution
    # 4 distinct types + normal baseline sequences
    ft_index = (i // 1250) % 4
    flood_type = flood_types[ft_index]

    # Cyclical / event progression factor within each block
    phase = (i % 1250) / 1250.0  # 0.0 to 1.0
    # Simulate rising event wave (build up, peak, recession)
    intensity_curve = math.sin(phase * math.pi) ** 1.5

    # Base noise
    noise = random.uniform(-0.08, 0.08)

    if flood_type == "Cloudburst":
        # Intense, violent downpour over shorter duration
        duration_hr = round(random.uniform(1.0, 4.5) + intensity_curve * 1.5, 1)
        intensity_mm_hr = round(max(5.0, 15.0 + intensity_curve * 110.0 + random.uniform(-8.0, 12.0)), 1)
        rainfall_mm = round(intensity_mm_hr * (duration_hr * random.uniform(0.65, 0.95)), 1)
        
        # Rapid hydrological response
        water_level_rise_rate = round(max(0.02, 0.15 + intensity_curve * 1.85 + random.uniform(-0.1, 0.15)), 2)
        water_level_accel = round(max(-0.4, (intensity_curve - 0.4) * 1.4 + random.uniform(-0.15, 0.2)), 2)
        water_level_m = round(max(1.2, 1.6 + intensity_curve * 4.8 + random.uniform(-0.2, 0.25)), 2)
        soil_moisture = round(min(98.5, max(30.0, 38.0 + intensity_curve * 54.0 + random.uniform(-3.0, 4.0))), 1)

    elif flood_type == "Slow Saturation":
        # Prolonged steady soaking rain
        duration_hr = round(random.uniform(16.0, 68.0) + intensity_curve * 12.0, 1)
        intensity_mm_hr = round(max(3.0, 10.0 + intensity_curve * 28.0 + random.uniform(-3.0, 4.0)), 1)
        rainfall_mm = round(max(25.0, 80.0 + intensity_curve * 380.0 + random.uniform(-15.0, 20.0)), 1)
        
        # Water rises gradually but relentlessly
        water_level_rise_rate = round(max(0.01, 0.08 + intensity_curve * 0.48 + random.uniform(-0.04, 0.05)), 2)
        water_level_accel = round(max(-0.15, (intensity_curve - 0.3) * 0.2 + random.uniform(-0.05, 0.05)), 2)
        water_level_m = round(max(1.3, 1.7 + intensity_curve * 3.9 + random.uniform(-0.15, 0.15)), 2)
        # High soil moisture saturation
        soil_moisture = round(min(99.6, max(45.0, 52.0 + intensity_curve * 46.0 + random.uniform(-2.0, 2.0))), 1)

    elif flood_type == "Rapid-Rise":
        # Steep valley flash flooding
        duration_hr = round(random.uniform(3.0, 12.0) + intensity_curve * 3.0, 1)
        intensity_mm_hr = round(max(4.0, 20.0 + intensity_curve * 65.0 + random.uniform(-6.0, 8.0)), 1)
        rainfall_mm = round(intensity_mm_hr * (duration_hr * random.uniform(0.5, 0.8)), 1)
        
        water_level_rise_rate = round(max(0.04, 0.20 + intensity_curve * 1.55 + random.uniform(-0.08, 0.12)), 2)
        water_level_accel = round(max(-0.35, (intensity_curve - 0.35) * 0.9 + random.uniform(-0.1, 0.1)), 2)
        water_level_m = round(max(1.25, 1.65 + intensity_curve * 4.4 + random.uniform(-0.2, 0.2)), 2)
        soil_moisture = round(min(96.0, max(35.0, 42.0 + intensity_curve * 50.0 + random.uniform(-3.0, 3.0))), 1)

    else: # Sudden Upstream
        # Catchment inflow / dam release; localized rain can be lower
        duration_hr = round(random.uniform(2.0, 14.0) + intensity_curve * 2.0, 1)
        intensity_mm_hr = round(max(2.0, 8.0 + intensity_curve * 24.0 + random.uniform(-3.0, 5.0)), 1)
        rainfall_mm = round(intensity_mm_hr * (duration_hr * 0.45) + random.uniform(5.0, 25.0), 1)
        
        # High surge rate driven by upstream catchment
        water_level_rise_rate = round(max(0.05, 0.25 + intensity_curve * 1.90 + random.uniform(-0.1, 0.15)), 2)
        water_level_accel = round(max(-0.5, (intensity_curve - 0.3) * 1.25 + random.uniform(-0.15, 0.15)), 2)
        water_level_m = round(max(1.3, 1.8 + intensity_curve * 5.2 + random.uniform(-0.25, 0.25)), 2)
        soil_moisture = round(min(88.0, max(28.0, 32.0 + intensity_curve * 42.0 + random.uniform(-3.0, 4.0))), 1)

    # Saturation Index (ratio 0.0 - 1.0 correlated with soil moisture and rain)
    saturation_index = round(min(1.0, max(0.15, (soil_moisture / 100.0) * 0.75 + (min(rainfall_mm, 350.0) / 350.0) * 0.25 + noise * 0.2)), 3)

    # Physical topography parameters
    # Topography varies across stations / monitoring points
    elevation_m = round(random.uniform(12.0, 185.0), 1)
    # Distance from river inversely correlated with low elevation flood plain
    if elevation_m < 35.0:
        distance_from_river_m = round(random.uniform(15.0, 220.0), 1)
    elif elevation_m < 80.0:
        distance_from_river_m = round(random.uniform(120.0, 550.0), 1)
    else:
        distance_from_river_m = round(random.uniform(350.0, 1100.0), 1)

    # Vulnerability Level based on topography and proximity
    vuln_score = (1.0 - min(elevation_m, 120.0) / 120.0) * 0.55 + (1.0 - min(distance_from_river_m, 600.0) / 600.0) * 0.45
    if vuln_score > 0.72:
        vulnerability_level = "CRITICAL"
    elif vuln_score > 0.50:
        vulnerability_level = "HIGH"
    elif vuln_score > 0.30:
        vulnerability_level = "MEDIUM"
    else:
        vulnerability_level = "LOW"

    # Hydrological composite risk score:
    # water level, rise rate, soil saturation, and local vulnerability
    vuln_mult = {"LOW": 0.15, "MEDIUM": 0.40, "HIGH": 0.75, "CRITICAL": 1.0}[vulnerability_level]
    risk_score = (
        (water_level_m / 6.5) * 45.0 +
        (min(water_level_rise_rate, 2.0) / 2.0) * 25.0 +
        (saturation_index) * 18.0 +
        (vuln_mult) * 12.0
    )

    if risk_score >= 68.0 or water_level_m >= 5.0:
        risk_level = "CRITICAL"
    elif risk_score >= 48.0 or water_level_m >= 3.6:
        risk_level = "HIGH"
    elif risk_score >= 32.0 or water_level_m >= 2.6:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    row = [
        timestamp_str,
        rainfall_mm,
        intensity_mm_hr,
        duration_hr,
        water_level_m,
        water_level_rise_rate,
        water_level_accel,
        soil_moisture,
        saturation_index,
        elevation_m,
        distance_from_river_m,
        vulnerability_level,
        flood_type,
        risk_level
    ]
    rows.append(row)

# Write to data/flood_dataset.csv
with open(csv_path, mode="w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(headers)
    writer.writerows(rows)

# Also write to public/data/flood_dataset.csv for browser fetch
with open(public_csv_path, mode="w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(headers)
    writer.writerows(rows)

print(f"Successfully generated {len(rows)} rows in {csv_path} and {public_csv_path}")
