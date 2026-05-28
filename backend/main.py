import os
import asyncio
from typing import Optional, List
from enum import Enum
from fastapi import FastAPI, HTTPException
from services.weather_service import get_live_temperature
from fastapi.middleware.cors import CORSMiddleware
import math
from pydantic import BaseModel, Field
import google.generativeai as genai
from motor.motor_asyncio import AsyncIOMotorClient

app = FastAPI(title="Actoryx Intelligent Building Energy Engine API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from dotenv import load_dotenv
load_dotenv()

genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
db_client = AsyncIOMotorClient(MONGO_URI)
db = db_client["actoryx_bems_db"]

class LightingType(str, Enum):
    LED = "LED"
    FLUORESCENT = "Fluorescent"
    INCANDESCENT = "Incandescent"

class WindowGlazing(str, Enum):
    SINGLE_PANE = "Single Pane"
    DOUBLE_PANE = "Double Pane"

class WindowItem(BaseModel):
    qty: int
    length: float
    width: float

class ApplianceItem(BaseModel):
    qty: int
    watt: float

class RoomTelemetryIn(BaseModel):
    length: float
    width: float
    height: float = 10.0
    north_wall_exposed: bool = True
    south_wall_exposed: bool = True
    roof_exposed: bool = False
    window_glazing: WindowGlazing = WindowGlazing.DOUBLE_PANE
    has_blinds: bool = True
    occupants: int
    north_windows: List[WindowItem] = []
    south_windows: List[WindowItem] = []
    equipment_list: List[ApplianceItem] = []
    lighting_list: List[ApplianceItem] = []
    lighting_type: LightingType = LightingType.LED

BTU_PER_SQFT_ROOM = 31.25
BTU_PER_OCCUPANT = 440.0
BTU_PER_WATT_EQUIPMENT = 3.5058
BTU_PER_WATT_LIGHTING = 4.2461
KW_PER_TON = 3.5185

@app.post("/api/calculate")
async def calculate_thermal_load(data: RoomTelemetryIn):
    floor_area = data.length * data.width
    room_btu = floor_area * BTU_PER_SQFT_ROOM
    
    n_window_area = sum(w.qty * (w.length * w.width) for w in data.north_windows)
    s_window_area = sum(w.qty * (w.length * w.width) for w in data.south_windows)
    
    if data.has_blinds:
        current_north_multiplier, current_south_multiplier = 15.25, 80.729
    else:
        current_north_multiplier, current_south_multiplier = 22.888, 121.095

    north_window_btu = n_window_area * current_north_multiplier
    south_window_btu = s_window_area * current_south_multiplier
    windows_total_btu = north_window_btu + south_window_btu

    total_equipment_watt = sum(e.qty * e.watt for e in data.equipment_list)
    total_lighting_watt = sum(l.qty * l.watt for l in data.lighting_list)

    occupant_btu = data.occupants * BTU_PER_OCCUPANT
    equipment_btu = total_equipment_watt * BTU_PER_WATT_EQUIPMENT
    lighting_btu = total_lighting_watt * BTU_PER_WATT_LIGHTING

    total_heat_load = room_btu + windows_total_btu + south_window_btu + occupant_btu + equipment_btu + lighting_btu
    total_cooling_required_btu = total_heat_load

    required_ac_ton = round(total_cooling_required_btu / 12000.0, 2)
    required_ac_kw = round(required_ac_ton * KW_PER_TON, 2)

    # --- NEW: AC Sizing Recommendation Logic ---
    standard_tonnage_options = [0.8, 1.0, 1.2, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0]
    if required_ac_ton <= 5.0:
        recommended_unit = min(standard_tonnage_options, key=lambda x: abs(x - required_ac_ton))
        recommended_qty = 1
    else:
        # For large loads (e.g., 12.77 Tons), determine how many 5-Ton units are needed
        import math
        recommended_unit = 5.0
        recommended_qty = math.ceil(required_ac_ton / 5.0)

    output_payload = {
        "room_btu": int(round(room_btu, 0)),
        "north_window_btu": int(round(north_window_btu, 0)),
        "south_window_btu": int(round(south_window_btu, 0)),
        "windows_total_btu": int(round(windows_total_btu, 0)),
        "occupant_btu": int(round(occupant_btu, 0)),
        "equipment_btu": int(round(equipment_btu, 0)),
        "lighting_btu": int(round(lighting_btu, 0)),
        "total_heat_load_btu": int(round(total_heat_load, 0)),
        "total_cooling_required_btu": int(round(total_cooling_required_btu, 0)),
        "required_ac_ton": required_ac_ton,
        "required_ac_kw": required_ac_kw,
        "recommended_standard_unit": recommended_unit, # New field
        "recommended_unit_qty": recommended_qty
    }
    try:
        await db.audit_logs.insert_one(output_payload.copy())
    except Exception:
        pass

    return output_payload

class AiOptimizeIn(BaseModel):
    class Config:
        extra = 'allow'

@app.post("/api/ai-optimize")
async def ai_optimize_grid_interaction(metrics: AiOptimizeIn):
    data = metrics.dict()
    load = data.get("total_heat_load_btu", "N/A")
    tons = data.get("required_ac_ton", "N/A")
    unit = data.get("recommended_standard_unit", "N/A")

    prompt = f"""
    Act as a BEMS Engineer. Provide 3 concise optimization strategies for a load of {load} BTU/hr requiring {tons} Tons.
    The system suggests a standard unit of {unit} Tons.
    RULES: No markdown, no bolding, plain text only.
    """
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        return {"insight": response.text.replace("*", "").replace("#", "").strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)