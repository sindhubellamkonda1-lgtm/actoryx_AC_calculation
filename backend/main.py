import os
import asyncio
import math
from typing import Optional, List, Dict, Any
from enum import Enum
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Import FastMCP for the combined server
from mcp.server.fastmcp import FastMCP

load_dotenv()

# ==========================================
# 1. Core Domain Logic (Single Source of Truth)
# ==========================================
def get_ac_models(tonnage: float) -> Dict[str, Any]:
    """Pure function to fetch market models. Used by both REST and MCP."""
    market_db = {
        "1.0": [
            {"brand": "Daikin", "model": "MTKM35", "type": "Inverter Split", "rating": "5 Star", "iseer": "5.2"},
            {"brand": "Blue Star", "model": "IC512VNU", "type": "Inverter Split", "rating": "5 Star", "iseer": "5.0"},
            {"brand": "LG", "model": "PS-Q13", "type": "Dual Inverter", "rating": "5 Star", "iseer": "5.1"}
        ],
        "1.5": [
            {"brand": "Daikin", "model": "MTKM50U", "type": "Inverter Split", "rating": "5 Star", "iseer": "5.2"},
            {"brand": "LG", "model": "PS-Q19YNZE", "type": "AI Dual Inverter", "rating": "5 Star", "iseer": "5.1"},
            {"brand": "Voltas", "model": "185V Vectra", "type": "Inverter Split", "rating": "5 Star", "iseer": "5.0"}
        ],
        "2.0": [
            {"brand": "Voltas", "model": "243V Vectra", "type": "Inverter Split", "rating": "3 Star", "iseer": "3.8"},
            {"brand": "Panasonic", "model": "CS/CU-NU24", "type": "Twin Cool", "rating": "5 Star", "iseer": "4.7"},
            {"brand": "Samsung", "model": "AR24CYLZ", "type": "WindFree", "rating": "4 Star", "iseer": "4.3"}
        ]
    }
    
    ton_key = f"{tonnage:.1f}"
    results = market_db.get(ton_key, market_db["1.5"])
    
    return {
        "status": "success",
        "source": "Actoryx_Hardware_Registry",
        "tonnage_queried": tonnage,
        "models": results
    }


# ==========================================
# 2. FastMCP Server Setup
# ==========================================
mcp = FastMCP(name="actoryx-bems-mcp", json_response=True)

@mcp.tool(
    description="Fetch recommended AC unit models and their ISEER ratings based on a specific tonnage requirement."
)
def mcp_fetch_ac_models(tonnage: float) -> str:
    """
    Args:
        tonnage: The required cooling capacity in Tons (e.g., 1.0, 1.5, 2.0).
    """
    # Delegate to the pure function
    return str(get_ac_models(tonnage))

# Build the MCP ASGI sub-app
_mcp_app = mcp.streamable_http_app()


# ==========================================
# 3. FastAPI Setup with MCP Lifespan
# ==========================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    # This starts the FastMCP session manager before FastAPI accepts requests
    async with _mcp_app.router.lifespan_context(app):
        yield

fastapi_app = FastAPI(
    title="Actoryx Intelligent Building Energy Engine API",
    lifespan=lifespan
)

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["mcp-session-id", "mcp-protocol-version"], # Required for MCP
)

genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
db_client = AsyncIOMotorClient(MONGO_URI)
db = db_client["actoryx_bems_db"]


# --- Data Models ---
class LightingType(str, Enum):
    LED = "LED"
    FLUORESCENT = "Fluorescent"
    INCANDESCENT = "Incandescent"

class WindowGlazing(str, Enum):
    SINGLE_PANE = "Single Pane"
    DOUBLE_PANE = "Double Pane"

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
    
    north_window_qty: int = 0
    south_window_qty: int = 0
    east_window_qty: int = 0
    west_window_qty: int = 0
    
    equipment_list: List[ApplianceItem] = []
    lighting_list: List[ApplianceItem] = []
    lighting_type: LightingType = LightingType.LED

class MCPQueryIn(BaseModel):
    tonnage: float

class AiOptimizeIn(BaseModel):
    class Config:
        extra = 'allow'

# --- Engineering Constants ---
BTU_PER_SQFT_ROOM = 31.25
BTU_PER_OCCUPANT = 440.0
BTU_PER_WATT_EQUIPMENT = 3.5058
BTU_PER_WATT_LIGHTING = 4.2461
KW_PER_TON = 3.5185
STANDARD_WINDOW_SQFT = 15.0  


# ==========================================
# 4. REST Endpoints
# ==========================================
@fastapi_app.post("/api/calculate")
async def calculate_thermal_load(data: RoomTelemetryIn):
    floor_area = data.length * data.width
    room_btu = floor_area * BTU_PER_SQFT_ROOM
    
    n_window_area = data.north_window_qty * STANDARD_WINDOW_SQFT
    s_window_area = data.south_window_qty * STANDARD_WINDOW_SQFT
    e_window_area = data.east_window_qty * STANDARD_WINDOW_SQFT
    w_window_area = data.west_window_qty * STANDARD_WINDOW_SQFT
    
    if data.has_blinds:
        n_mult, s_mult, e_mult, w_mult = 15.25, 80.729, 65.5, 85.0
    else:
        n_mult, s_mult, e_mult, w_mult = 22.888, 121.095, 95.0, 125.0

    north_window_btu = n_window_area * n_mult
    south_window_btu = s_window_area * s_mult
    east_window_btu = e_window_area * e_mult
    west_window_btu = w_window_area * w_mult
    windows_total_btu = north_window_btu + south_window_btu + east_window_btu + west_window_btu

    total_equipment_watt = sum(e.qty * e.watt for e in data.equipment_list)
    total_lighting_watt = sum(l.qty * l.watt for l in data.lighting_list)

    occupant_btu = data.occupants * BTU_PER_OCCUPANT
    equipment_btu = total_equipment_watt * BTU_PER_WATT_EQUIPMENT
    lighting_btu = total_lighting_watt * BTU_PER_WATT_LIGHTING

    total_heat_load = room_btu + windows_total_btu + occupant_btu + equipment_btu + lighting_btu
    total_cooling_required_btu = total_heat_load

    required_ac_ton = round(total_cooling_required_btu / 12000.0, 2)
    required_ac_kw = round(required_ac_ton * KW_PER_TON, 2)

    standard_tonnage_options = [0.8, 1.0, 1.2, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0]
    if required_ac_ton <= 5.0:
        recommended_unit = min(standard_tonnage_options, key=lambda x: abs(x - required_ac_ton))
        recommended_qty = 1
    else:
        recommended_unit = 5.0
        recommended_qty = math.ceil(required_ac_ton / 5.0)

    output_payload = {
        "room_btu": int(round(room_btu, 0)),
        "north_window_btu": int(round(north_window_btu, 0)),
        "south_window_btu": int(round(south_window_btu, 0)),
        "east_window_btu": int(round(east_window_btu, 0)),
        "west_window_btu": int(round(west_window_btu, 0)),
        "windows_total_btu": int(round(windows_total_btu, 0)),
        "occupant_btu": int(round(occupant_btu, 0)),
        "equipment_btu": int(round(equipment_btu, 0)),
        "lighting_btu": int(round(lighting_btu, 0)),
        "total_heat_load_btu": int(round(total_heat_load, 0)),
        "total_cooling_required_btu": int(round(total_cooling_required_btu, 0)),
        "required_ac_ton": required_ac_ton,
        "required_ac_kw": required_ac_kw,
        "recommended_standard_unit": recommended_unit,
        "recommended_unit_qty": recommended_qty
    }
    
    try:
        await db.audit_logs.insert_one(output_payload.copy())
    except Exception:
        pass

    return output_payload

# Legacy REST endpoint preserved for the React Frontend
@fastapi_app.post("/api/mcp/ac-models")
async def fetch_ac_models_rest(query: MCPQueryIn) -> Dict[str, Any]:
    # Delegates to the same single source of truth as the MCP tool
    return get_ac_models(query.tonnage)

@fastapi_app.post("/api/ai-optimize")
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


# ==========================================
# 5. ASGI Dispatcher
# ==========================================
class CombinedApp:
    def __init__(self, rest_app, mcp_asgi_app):
        self._rest = rest_app
        self._mcp  = mcp_asgi_app

    async def __call__(self, scope, receive, send):
        path = scope.get("path", "")
        # Route explicit /mcp traffic to FastMCP, everything else to FastAPI
        if path == "/mcp" or path.startswith("/mcp/"):
            await self._mcp(scope, receive, send)
        else:
            await self._rest(scope, receive, send)

# This is what Uvicorn will actually run
app = CombinedApp(fastapi_app, _mcp_app)

if __name__ == "__main__":
    import uvicorn
    print("Actoryx Engine starting...")
    print("  REST API → http://localhost:8000/docs")
    print("  MCP Tool → http://localhost:8000/mcp")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)