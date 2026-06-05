import React, { useState, useEffect } from 'react';
import { generateReport } from './utils/pdfGenerator';
import ThermalLoadChart from './components/ThermalLoadChart';
import { Shield, LayoutGrid, Sun, Moon, Users, Zap, Cpu, Compass, Sliders, ChevronRight, Calculator, Activity, Plus, Trash2, Lightbulb, AlertTriangle, Factory, X, ExternalLink, Snowflake, Wind } from 'lucide-react';

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Input Matrix States
  const [length, setLength] = useState(15);
  const [width, setWidth] = useState(20);
  const [height, setHeight] = useState(10);
  
  const [northWallExposed, setNorthWallExposed] = useState(true);
  const [southWallExposed, setSouthWallExposed] = useState(true);
  const [roofExposed, setRoofExposed] = useState(false);

  const [occupants, setOccupants] = useState(4);
  const [hasBlinds, setHasBlinds] = useState(true);
  const [windowGlazing, setWindowGlazing] = useState("Double Pane");
  
  const [northWinQty, setNorthWinQty] = useState(1);
  const [southWinQty, setSouthWinQty] = useState(1);
  const [eastWinQty, setEastWinQty] = useState(0);
  const [westWinQty, setWestWinQty] = useState(0);
  
  const [equipmentList, setEquipmentList] = useState([{ id: 1, qty: 1, watt: 85 }]);
  const [lightingList, setLightingList] = useState([{ id: 1, qty: 1, watt: 65 }]);
  const [lightingType, setLightingType] = useState("LED");

  // Output & Process States
  const [results, setResults] = useState(null);
  const [isCalculated, setIsCalculated] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  
  const [acModels, setAcModels] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  
  const [aiInsight, setAiInsight] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);

  const [activeModal, setActiveModal] = useState(null);

  // --- Dynamic List Handlers ---
  const handleEquipmentChange = (index, field, value) => {
    const newList = [...equipmentList];
    newList[index][field] = value === '' ? '' : Number(value);
    setEquipmentList(newList);
  };
  const addEquipment = () => setEquipmentList([...equipmentList, { id: Date.now(), qty: 1, watt: 0 }]);
  const removeEquipment = (index) => setEquipmentList(equipmentList.filter((_, i) => i !== index));

  const handleLightingChange = (index, field, value) => {
    const newList = [...lightingList];
    newList[index][field] = value === '' ? '' : Number(value);
    setLightingList(newList);
  };
  const addLighting = () => setLightingList([...lightingList, { id: Date.now(), qty: 1, watt: 0 }]);
  const removeLighting = (index) => setLightingList(lightingList.filter((_, i) => i !== index));

  // --- True API / MCP Fetch Logic ---
  useEffect(() => {
    if (results?.recommended_standard_unit) {
      fetchMarketModels(results.recommended_standard_unit);
    }
  }, [results]);

  const fetchMarketModels = async (tonnage) => {
    setIsLoadingModels(true);
    try {
      const res = await fetch('http://localhost:8000/api/mcp/ac-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tonnage })
      });
      const data = await res.json();
      setAcModels(data.models || []);
    } catch (err) {
      console.error("MCP Fetch Error:", err);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleCalculate = async (e) => {
    e.preventDefault(); 
    setIsCalculating(true);
    
    const payload = {
      length: Number(length) || 0, 
      width: Number(width) || 0, 
      height: Number(height) || 0,
      north_wall_exposed: northWallExposed,
      south_wall_exposed: southWallExposed,
      roof_exposed: roofExposed,
      occupants: Number(occupants) || 0, 
      has_blinds: hasBlinds,
      window_glazing: windowGlazing,
      north_window_qty: Number(northWinQty) || 0, 
      south_window_qty: Number(southWinQty) || 0,
      east_window_qty: Number(eastWinQty) || 0,   
      west_window_qty: Number(westWinQty) || 0,   
      equipment_list: equipmentList.map(({ qty, watt }) => ({ qty: Number(qty) || 0, watt: Number(watt) || 0 })),
      lighting_list: lightingList.map(({ qty, watt }) => ({ qty: Number(qty) || 0, watt: Number(watt) || 0 })),
      lighting_type: lightingType
    };

    try {
      const response = await fetch('http://localhost:8000/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      setResults(data);
      setIsCalculated(true);
      setAiInsight(""); 
    } catch (err) {
      console.error("Core calculation connection error:", err);
      alert("Failed to connect to the backend engine. Please check your FastAPI server.");
    } finally {
      setIsCalculating(false);
    }
  };

  const generateAiStrategy = async () => {
    setLoadingAi(true);
    setAiInsight("");
    try {
      const response = await fetch('http://localhost:8000/api/ai-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...results, length: Number(length) || 0, width: Number(width) || 0 })
      });
      const data = await response.json();
      setAiInsight(data.insight);
    } catch (err) {
      setAiInsight("Failed to compile strategic BEMS microgrid optimization profile.");
    }
    setLoadingAi(false);
  };

  const getPrimaryHeatSource = () => {
    if (!results) return null;
    const sources = [
      { name: 'Structural Conduction', value: results.room_btu, tip: 'Consider upgrading wall insulation or roof reflectivity coatings.' },
      { name: 'Solar Radiant Gain', value: results.windows_total_btu, tip: 'Consider installing tinted glazing, low-E films, or exterior shading.' },
      { name: 'Internal Appliances', value: results.equipment_btu + results.lighting_btu, tip: 'Consider migrating to higher efficiency IT infrastructure or LED arrays.' },
      { name: 'Occupant Load', value: results.occupant_btu, tip: 'High human density detected. Ensure adequate ventilation and fresh air intake.' }
    ];
    sources.sort((a, b) => b.value - a.value);
    return sources[0]; 
  };
  
  const primarySource = getPrimaryHeatSource();

  const modalContent = {
    thermal: {
      title: "Primary Thermal Leak",
      icon: Lightbulb,
      color: "text-amber-500",
      bgClass: "bg-amber-500/10",
      description: "A thermal leak represents the physical pathway allowing the most heat to infiltrate the building envelope. Identifying this primary source is the first step in Capital Expenditure (CapEx) planning.",
      bulletPoints: [
        "Structural (Conduction): Heat moving through solid walls. Fix via insulation upgrades.",
        "Solar (Radiant): Sun energy bypassing walls through glass. Fix via exterior shading or low-E window films.",
        "Internal (Appliance): Heat generated inside the space. Fix via high-efficiency LED upgrades or liquid-cooled IT racks."
      ]
    },
    hardware: {
      title: "Hardware Procurement",
      icon: AlertTriangle,
      color: "text-rose-500",
      bgClass: "bg-rose-500/10",
      description: "HVAC capacities are measured in 'Tons of Refrigeration' (1 Ton = 12,000 BTU/hr). Selecting the exact required tonnage is critical for both machine lifespan and human comfort.",
      bulletPoints: [
        "Undersizing: The unit runs 24/7 trying to reach the setpoint, leading to massive electrical waste and early compressor failure.",
        "Oversizing: The unit cools the air too fast and shuts off ('short-cycling'). It fails to run long enough to remove humidity, resulting in a cold, clammy, and uncomfortable room."
      ]
    },
    grid: {
      title: "Grid Base-Load Impact",
      icon: Factory,
      color: "text-indigo-500",
      bgClass: "bg-indigo-500/10",
      description: "This metric translates raw thermal heat into electrical power draw (Kilowatts). It is the primary vector used by smart grids to predict energy demands.",
      bulletPoints: [
        "Peak Shaving: Knowing this kW draw allows software to pre-cool the building before expensive Time-of-Use (ToU) utility rates apply.",
        "Microgrid Sizing: If powering this building via solar, this exact kW number determines the size of the required solar inverter and battery storage array."
      ]
    }
  };

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-900 antialiased transition-colors duration-300 relative">
        
        {/* --- MODAL OVERLAY PORTAL --- */}
        {activeModal && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => setActiveModal(null)} 
          >
            <div 
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 max-w-lg w-full shadow-2xl relative transform transition-all"
              onClick={e => e.stopPropagation()} 
            >
              <button 
                onClick={() => setActiveModal(null)} 
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {(() => {
                const content = modalContent[activeModal];
                const Icon = content.icon;
                return (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-2.5 rounded-xl ${content.bgClass}`}>
                        <Icon className={`w-6 h-6 ${content.color}`} />
                      </div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{content.title}</h2>
                    </div>
                    
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                      {content.description}
                    </p>

                    <div className="bg-slate-50 dark:bg-slate-950/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800/80">
                      <h4 className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-widest mb-3">Engineering Principles</h4>
                      <ul className="space-y-3">
                        {content.bulletPoints.map((point, idx) => {
                          const splitPoint = point.split(":");
                          return (
                            <li key={idx} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 flex-shrink-0"></div>
                              <p>
                                <strong className="text-slate-800 dark:text-slate-200">{splitPoint[0]}:</strong> 
                                {splitPoint[1]}
                              </p>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        <header className="border-b border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-50 px-8 py-4 flex justify-between items-center transition-colors duration-300 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="bg-cyan-500/10 dark:bg-cyan-500/20 p-2 rounded-lg text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Snowflake className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Actoryx Smart AC Calculator
              </h1>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">THERMAL LOAD & HVAC SIZING ENGINE</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-md text-xs font-mono text-emerald-700 dark:text-emerald-400">
              <Shield className="w-3.5 h-3.5" /> API Connection Secure
            </div>
            
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
              aria-label="Toggle Theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <main className="max-w-[1400px] mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <section className="lg:col-span-4">
            <form onSubmit={handleCalculate} className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl p-6 shadow-sm transition-colors duration-300 flex flex-col h-full">
              
              <div className="flex items-center gap-2 border-b border-slate-300 dark:border-slate-800 pb-4 mb-6">
                <Sliders className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <h2 className="font-semibold text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200">Room Parameters</h2>
              </div>

              <div className="space-y-6 flex-grow">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex justify-between font-mono">
                    <span>Room Footprint</span>
                    <span className="text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/30 px-2 py-0.5 rounded">{(Number(length) || 0) * (Number(width) || 0)} SQ. FT</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono block mb-1">WIDTH (FT)</span>
                      <input type="number" min="0" value={length} onChange={(e)=>setLength(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-slate-900 dark:text-slate-200 font-mono text-sm focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono block mb-1">LENGTH (FT)</span>
                      <input type="number" min="0" value={width} onChange={(e)=>setWidth(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-slate-900 dark:text-slate-200 font-mono text-sm focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono block mb-1">CEILING (FT)</span>
                      <input type="number" min="0" value={height} onChange={(e)=>setHeight(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-slate-900 dark:text-slate-200 font-mono text-sm focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] text-slate-500 font-bold font-mono block uppercase">Exterior Sun Exposures</span>
                  <div className="grid grid-cols-3 gap-3">
                    <button type="button" onClick={()=>setNorthWallExposed(!northWallExposed)} className={`py-2 rounded-md text-[11px] font-mono border transition-all ${northWallExposed ? 'bg-slate-800 dark:bg-slate-800 border-slate-800 text-white shadow-sm' : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-500 hover:border-slate-400 dark:hover:border-slate-700'}`}>North Wall</button>
                    <button type="button" onClick={()=>setSouthWallExposed(!southWallExposed)} className={`py-2 rounded-md text-[11px] font-mono border transition-all ${southWallExposed ? 'bg-slate-800 dark:bg-slate-800 border-slate-800 text-white shadow-sm' : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-500 hover:border-slate-400 dark:hover:border-slate-700'}`}>South Wall</button>
                    <button type="button" onClick={()=>setRoofExposed(!roofExposed)} className={`py-2 rounded-md text-[11px] font-mono border transition-all ${roofExposed ? 'bg-slate-800 dark:bg-slate-800 border-slate-800 text-white shadow-sm' : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-500 hover:border-slate-400 dark:hover:border-slate-700'}`}>Roof</button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-bold uppercase flex items-center gap-1.5 mb-2">
                      <Users className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" /> People in Room
                    </label>
                    <input type="number" min="0" value={occupants} onChange={(e)=>setOccupants(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-slate-900 dark:text-slate-200 font-mono text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none" />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-bold uppercase flex items-center gap-1.5 mb-2">
                      <Sun className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" /> Window Blinds
                    </label>
                    <div className="flex bg-slate-100 dark:bg-slate-950 rounded-md p-1 border border-slate-300 dark:border-slate-800">
                      <button type="button" onClick={()=>setHasBlinds(true)} className={`flex-1 py-1.5 text-[11px] font-mono rounded transition-all ${hasBlinds ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Deployed</button>
                      <button type="button" onClick={()=>setHasBlinds(false)} className={`flex-1 py-1.5 text-[11px] font-mono rounded transition-all ${!hasBlinds ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>None</button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-300 dark:border-slate-800 border-dashed">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-mono mb-4">
                    <Compass className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" /> Windows Count
                  </label>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono block mb-1">NORTH</span>
                      <input type="number" min="0" value={northWinQty} onChange={(e)=>setNorthWinQty(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-slate-900 dark:text-slate-200 font-mono text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono block mb-1">SOUTH</span>
                      <input type="number" min="0" value={southWinQty} onChange={(e)=>setSouthWinQty(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-slate-900 dark:text-slate-200 font-mono text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono block mb-1">EAST</span>
                      <input type="number" min="0" value={eastWinQty} onChange={(e)=>setEastWinQty(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-slate-900 dark:text-slate-200 font-mono text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono block mb-1">WEST</span>
                      <input type="number" min="0" value={westWinQty} onChange={(e)=>setWestWinQty(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-slate-900 dark:text-slate-200 font-mono text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none" />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-500 font-mono block mb-1">GLAZING SPECIFICATION</span>
                    <select value={windowGlazing} onChange={(e)=>setWindowGlazing(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 font-mono text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-cyan-500/50 outline-none">
                      <option value="Double Pane">Double Pane Insulated</option>
                      <option value="Single Pane">Single Pane Standard</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-300 dark:border-slate-800 border-dashed">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-mono mb-4">
                    <Zap className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> Heat Producing Items
                  </label>
                  
                  <div className="space-y-5">
                    <div className="bg-slate-50 dark:bg-slate-950/50 rounded-lg p-3 border border-slate-300 dark:border-slate-800">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-bold">COMPUTERS / APPLIANCES</span>
                        <button type="button" onClick={addEquipment} className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 flex items-center gap-1 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors">
                          <Plus className="w-3 h-3" /> ADD ROW
                        </button>
                      </div>
                      <div className="space-y-2">
                        {equipmentList.map((item, index) => (
                          <div key={item.id} className="flex gap-2 items-center">
                            <div className="flex-1 relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400">QTY</span>
                              <input type="number" min="0" value={item.qty} onChange={(e) => handleEquipmentChange(index, 'qty', e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-200 font-mono text-sm py-1.5 pl-10 pr-2 focus:ring-1 focus:ring-cyan-500 outline-none" />
                            </div>
                            <div className="flex-[2] relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400">WATTS/UNIT</span>
                              <input type="number" min="0" value={item.watt} onChange={(e) => handleEquipmentChange(index, 'watt', e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-200 font-mono text-sm py-1.5 pl-24 pr-2 focus:ring-1 focus:ring-cyan-500 outline-none" />
                            </div>
                            <button type="button" onClick={() => removeEquipment(index)} disabled={equipmentList.length === 1} className="p-1.5 text-slate-400 hover:text-rose-500 disabled:opacity-30 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950/50 rounded-lg p-3 border border-slate-300 dark:border-slate-800">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-bold">LIGHT BULBS</span>
                        <button type="button" onClick={addLighting} className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 flex items-center gap-1 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors">
                          <Plus className="w-3 h-3" /> ADD ROW
                        </button>
                      </div>
                      <div className="space-y-2">
                        {lightingList.map((item, index) => (
                          <div key={item.id} className="flex gap-2 items-center">
                            <div className="flex-1 relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400">QTY</span>
                              <input type="number" min="0" value={item.qty} onChange={(e) => handleLightingChange(index, 'qty', e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-200 font-mono text-sm py-1.5 pl-10 pr-2 focus:ring-1 focus:ring-cyan-500 outline-none" />
                            </div>
                            <div className="flex-[2] relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400">WATTS/UNIT</span>
                              <input type="number" min="0" value={item.watt} onChange={(e) => handleLightingChange(index, 'watt', e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-200 font-mono text-sm py-1.5 pl-24 pr-2 focus:ring-1 focus:ring-cyan-500 outline-none" />
                            </div>
                            <button type="button" onClick={() => removeLighting(index)} disabled={lightingList.length === 1} className="p-1.5 text-slate-400 hover:text-rose-500 disabled:opacity-30 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-300 dark:border-slate-800/60">
                        <span className="text-[10px] text-slate-500 font-mono block mb-1">LIGHTING TYPE</span>
                        <select value={lightingType} onChange={(e)=>setLightingType(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 font-mono text-sm text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-cyan-500 outline-none">
                          <option value="LED">LED Arrays</option>
                          <option value="Fluorescent">Fluorescent Tubes</option>
                          <option value="Incandescent">Incandescent Bulbs</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-8 mt-4 border-t border-slate-300 dark:border-slate-800">
                <button 
                  type="submit" 
                  disabled={isCalculating}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-3.5 rounded-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                >
                  {isCalculating ? (
                    <>
                      <Activity className="w-5 h-5 animate-pulse" /> Calculating Tonnage...
                    </>
                  ) : (
                    <>
                      <Calculator className="w-5 h-5" /> Calculate Required AC
                    </>
                  )}
                </button>
              </div>

            </form>
          </section>

          <section className="lg:col-span-8 flex flex-col gap-6">
            
            {!isCalculated ? (
              <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/50 text-center p-12 min-h-[600px]">
                <div className="w-20 h-20 bg-cyan-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 border border-cyan-100 dark:border-slate-700">
                  <Snowflake className="w-10 h-10 text-cyan-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">AC Capacity Calculator</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-3 max-w-md leading-relaxed text-sm">
                  Enter your room dimensions, windows, and heat-producing appliances on the left to determine the exact Air Conditioning tonnage required for optimal cooling.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl p-6 shadow-sm transition-colors duration-300">
                  <div className="flex items-center gap-2 border-b border-slate-300 dark:border-slate-800 pb-4 mb-6">
                    <Activity className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                    <h2 className="font-semibold text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200">HVAC Sizing Results</h2>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-lg border border-slate-300 dark:border-slate-800/60 text-left relative overflow-hidden">
                        <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wide">Total Heat Load</p>
                        <p className="text-2xl font-mono font-bold text-slate-900 dark:text-slate-100 mt-1">{results.total_heat_load_btu.toLocaleString()} <span className="text-xs text-slate-500 font-sans">BTU/h</span></p>
                        <div className="absolute top-0 bottom-0 left-0 w-1 bg-slate-400 dark:bg-slate-700"></div>
                      </div>
                      
                      <div className="bg-cyan-50 dark:bg-cyan-900/20 p-5 rounded-lg border border-cyan-200 dark:border-cyan-800/50 text-left relative overflow-hidden shadow-sm">
                        <p className="text-[10px] font-mono font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wide flex items-center gap-1.5"><Snowflake className="w-3 h-3"/> Required AC Tonnage</p>
                        <p className="text-3xl font-bold text-cyan-700 dark:text-cyan-300 mt-1">{results.required_ac_ton} <span className="text-sm font-semibold">Tons</span></p>
                        <div className="absolute top-0 bottom-0 left-0 w-1 bg-cyan-500"></div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-lg border border-slate-300 dark:border-slate-800/60 text-left relative overflow-hidden">
                        <p className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-500 uppercase tracking-wide">Grid Power Demand</p>
                        <p className="text-3xl font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{results.required_ac_kw} <span className="text-xs font-sans text-indigo-700 dark:text-indigo-600 font-bold">kW</span></p>
                        <div className="absolute top-0 bottom-0 left-0 w-1 bg-indigo-500"></div>
                      </div>
                    </div>

                    <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Wind className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Recommended AC Units</h3>
                        </div>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded font-mono">
                          {results.recommended_unit_qty}x {results.recommended_standard_unit} Ton
                        </span>
                      </div>
                      
                      {isLoadingModels ? (
                        <div className="text-center py-6 text-sm text-slate-500 animate-pulse">Querying MCP Hardware Registry...</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {acModels.map((ac, idx) => (
                            <div key={idx} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col justify-between hover:border-cyan-400 transition-colors group cursor-pointer shadow-sm">
                              <div>
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className="font-bold text-slate-900 dark:text-white text-base">{ac.brand}</h4>
                                  <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{ac.rating}</span>
                                </div>
                                <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mb-1">Model: {ac.model}</p>
                                <p className="text-xs text-slate-600 dark:text-slate-300">{ac.type}</p>
                              </div>
                              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wide">ISEER Rating</span>
                                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{ac.iseer}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                    </div>

                    <div id="thermal-chart-container" className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl p-6 shadow-sm mt-6">
                      <div className="flex items-center gap-2 border-b border-slate-300 dark:border-slate-800 pb-4 mb-6">
                        <Activity className="w-4 h-4 text-cyan-500" />
                        <h2 className="font-semibold text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          Heat Source Breakdown
                        </h2>
                      </div>
                      <ThermalLoadChart results={results} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                      <div onClick={() => setActiveModal('thermal')} className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-lg border border-slate-300 dark:border-slate-800 cursor-pointer hover:border-amber-400 transition-all group">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500" /><h3 className="text-xs font-bold font-mono uppercase">Primary Thermal Leak</h3></div>
                          <ChevronRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100" />
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">Largest source: {primarySource?.name || 'Loading'} ({primarySource?.value?.toLocaleString() || 0} BTU).</p>
                        <p className="text-[11px] text-amber-600 italic font-medium">Click to learn why &rarr;</p>
                      </div>
                      <div onClick={() => setActiveModal('hardware')} className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-lg border border-slate-300 dark:border-slate-800 cursor-pointer hover:border-rose-400 transition-all group">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-rose-500" /><h3 className="text-xs font-bold font-mono uppercase">AC Sizing Science</h3></div>
                          <ChevronRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100" />
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">Why exact sizing matters over larger units.</p>
                        <p className="text-[11px] text-rose-600 italic font-medium">Click to learn why &rarr;</p>
                      </div>
                      <div onClick={() => setActiveModal('grid')} className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-lg border border-slate-300 dark:border-slate-800 cursor-pointer hover:border-indigo-400 transition-all group">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2"><Factory className="w-4 h-4 text-indigo-500" /><h3 className="text-xs font-bold font-mono uppercase">Power Consumption</h3></div>
                          <ChevronRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100" />
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">Translating cooling needs to electrical load.</p>
                        <p className="text-[11px] text-indigo-600 italic font-medium">Click to learn why &rarr;</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                  <div className="flex justify-between items-center border-b border-slate-300 dark:border-slate-800 pb-4 mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400"></div>
                      <h2 className="font-semibold text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200">AI Optimization Strategy</h2>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={generateAiStrategy} disabled={loadingAi || !results} className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs px-4 py-2 rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-50">
                        {loadingAi ? "Analyzing..." : "Synthesize Profile"} <ChevronRight className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => generateReport(results, 'thermal-chart-container', aiInsight)} 
                        className="bg-cyan-50 dark:bg-cyan-900/30 hover:bg-cyan-100 dark:hover:bg-cyan-800 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800 font-medium text-xs px-4 py-2 rounded-md transition-colors"
                      >
                        Download PDF
                      </button>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-300 dark:border-slate-800 p-5 min-h-[160px]">
                    {aiInsight ? (
                      <div className="text-sm text-slate-700 dark:text-slate-300 font-mono leading-relaxed space-y-2 whitespace-pre-wrap">{aiInsight}</div>
                    ) : (
                      <div className="text-slate-500 text-sm italic flex flex-col items-center justify-center h-full gap-2 py-8 text-center">
                        <span className="font-mono text-xs uppercase tracking-widest text-slate-400">Agent Standby</span>
                        <span className="max-w-sm mt-1">Request synthesis to generate load-balancing methodologies based on current telemetry.</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 transition-colors duration-300">
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">Need Further Details?</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Contact Actoryx for advanced optimization configurations and implementation support.
                    </p>
                  </div>
                  <a 
                    href="https://actoryx.ai/contact.html" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-medium text-xs px-6 py-3 rounded-md flex items-center gap-2 transition-all shadow-sm whitespace-nowrap"
                  >
                    Contact Actoryx <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}