import React, { useState } from 'react';
import { Shield, LayoutGrid, Sun, Moon, Users, Zap, Cpu, Compass, Sliders, ChevronRight, Calculator, Activity, Plus, Trash2, Lightbulb, AlertTriangle, Factory, X } from 'lucide-react';

export default function App() {
  // Theme State
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
  
  // Dynamic List States
  const [equipmentList, setEquipmentList] = useState([{ id: 1, qty: 1, watt: 85 }]);
  const [lightingList, setLightingList] = useState([{ id: 1, qty: 1, watt: 65 }]);
  const [lightingType, setLightingType] = useState("LED");

  // Output & Process States
  const [results, setResults] = useState(null);
  const [isCalculated, setIsCalculated] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  
  const [aiInsight, setAiInsight] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);

  // --- Modal State Management ---
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

  // --- Core Calculation Execution ---
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

  // --- Dynamic Diagnostic Logic ---
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

  // --- Modal Content Dictionary ---
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
      <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-900 antialiased transition-colors duration-300 relative">
        
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

        {/* Structural Header Ribbon */}
        <header className="border-b border-slate-300 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md sticky top-0 z-50 px-8 py-4 flex justify-between items-center transition-colors duration-300 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="bg-slate-900 dark:bg-slate-800 p-2 rounded-lg text-white shadow-sm border border-slate-700">
              <Cpu className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Actoryx BEMS Engine
              </h1>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">POWER SYSTEMS & THERMAL MODELER</p>
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

        <main className="max-w-[1400px] mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* SIDEBAR INPUT TELEMETRY COMPONENT */}
          <section className="lg:col-span-5">
            <form onSubmit={handleCalculate} className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl p-6 shadow-sm transition-colors duration-300 flex flex-col h-full">
              
              <div className="flex items-center gap-2 border-b border-slate-300 dark:border-slate-800 pb-4 mb-6">
                <Sliders className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <h2 className="font-semibold text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200">Environmental Parameters</h2>
              </div>

              <div className="space-y-6 flex-grow">
                {/* Volumetric Dimensions */}
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

                {/* Exposures */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-500 font-bold font-mono block uppercase">Exterior Exposures</span>
                  <div className="grid grid-cols-3 gap-3">
                    <button type="button" onClick={()=>setNorthWallExposed(!northWallExposed)} className={`py-2 rounded-md text-[11px] font-mono border transition-all ${northWallExposed ? 'bg-slate-800 dark:bg-slate-800 border-slate-800 text-white shadow-sm' : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-500 hover:border-slate-400 dark:hover:border-slate-700'}`}>North Wall</button>
                    <button type="button" onClick={()=>setSouthWallExposed(!southWallExposed)} className={`py-2 rounded-md text-[11px] font-mono border transition-all ${southWallExposed ? 'bg-slate-800 dark:bg-slate-800 border-slate-800 text-white shadow-sm' : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-500 hover:border-slate-400 dark:hover:border-slate-700'}`}>South Wall</button>
                    <button type="button" onClick={()=>setRoofExposed(!roofExposed)} className={`py-2 rounded-md text-[11px] font-mono border transition-all ${roofExposed ? 'bg-slate-800 dark:bg-slate-800 border-slate-800 text-white shadow-sm' : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-500 hover:border-slate-400 dark:hover:border-slate-700'}`}>Roof Surface</button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-bold uppercase flex items-center gap-1.5 mb-2">
                      <Users className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" /> Occupancy Load
                    </label>
                    <input type="number" min="0" value={occupants} onChange={(e)=>setOccupants(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-slate-900 dark:text-slate-200 font-mono text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none" />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-bold uppercase flex items-center gap-1.5 mb-2">
                      <Sun className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" /> Attenuation Blinds
                    </label>
                    <div className="flex bg-slate-100 dark:bg-slate-950 rounded-md p-1 border border-slate-300 dark:border-slate-800">
                      <button type="button" onClick={()=>setHasBlinds(true)} className={`flex-1 py-1.5 text-[11px] font-mono rounded transition-all ${hasBlinds ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Deployed</button>
                      <button type="button" onClick={()=>setHasBlinds(false)} className={`flex-1 py-1.5 text-[11px] font-mono rounded transition-all ${!hasBlinds ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Unshaded</button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-300 dark:border-slate-800 border-dashed">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-mono mb-4">
                    <Compass className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" /> Fenestration Layout
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono block mb-1">NORTH WINDOW QTY</span>
                      <input type="number" min="0" value={northWinQty} onChange={(e)=>setNorthWinQty(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-slate-900 dark:text-slate-200 font-mono text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono block mb-1">SOUTH WINDOW QTY</span>
                      <input type="number" min="0" value={southWinQty} onChange={(e)=>setSouthWinQty(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-slate-900 dark:text-slate-200 font-mono text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none" />
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-500 font-mono block mb-1">GLAZING SPECIFICATION</span>
                      <select value={windowGlazing} onChange={(e)=>setWindowGlazing(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 font-mono text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-cyan-500/50 outline-none">
                        <option value="Double Pane">Double Pane Insulated (U=0.57)</option>
                        <option value="Single Pane">Single Pane Standard (U=1.04)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-300 dark:border-slate-800 border-dashed">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-mono mb-4">
                    <Zap className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> Internal Power Loads
                  </label>
                  
                  <div className="space-y-5">
                    
                    {/* Dynamic Equipment List */}
                    <div className="bg-slate-50 dark:bg-slate-950/50 rounded-lg p-3 border border-slate-300 dark:border-slate-800">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-bold">ELECTRICAL EQUIPMENT</span>
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

                    {/* Dynamic Lighting List */}
                    <div className="bg-slate-50 dark:bg-slate-950/50 rounded-lg p-3 border border-slate-300 dark:border-slate-800">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-bold">LUMINAIRES & LIGHTING</span>
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
                        <span className="text-[10px] text-slate-500 font-mono block mb-1">EMISSION DRIVER MULTIPLIER</span>
                        <select value={lightingType} onChange={(e)=>setLightingType(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 font-mono text-sm text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-cyan-500 outline-none">
                          <option value="LED">Solid State LED Arrays</option>
                          <option value="Fluorescent">Fluorescent Inductive Ballast</option>
                          <option value="Incandescent">Incandescent Thermal Filament</option>
                        </select>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-8 mt-4 border-t border-slate-300 dark:border-slate-800">
                <button 
                  type="submit" 
                  disabled={isCalculating}
                  className="w-full bg-slate-900 dark:bg-cyan-600 hover:bg-slate-800 dark:hover:bg-cyan-500 text-white font-semibold py-3.5 rounded-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                >
                  {isCalculating ? (
                    <>
                      <Activity className="w-5 h-5 animate-pulse" /> Processing Telemetry...
                    </>
                  ) : (
                    <>
                      <Calculator className="w-5 h-5" /> Execute Thermal Simulation
                    </>
                  )}
                </button>
              </div>

            </form>
          </section>

          {/* ANALYTICAL METRICS BLOCK */}
          <section className="lg:col-span-7 flex flex-col gap-6">
            
            {!isCalculated ? (
              // EMPTY STATE 
              <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/20 text-center p-12 min-h-[500px]">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <LayoutGrid className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Awaiting Telemetry Configuration</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm">
                  Configure the environmental variables, structural components, and electrical loads on the left panel, then execute the simulation to generate real-time thermodynamic profiles.
                </p>
              </div>
            ) : (
              // POPULATED STATE
              <>
                <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl p-6 shadow-sm transition-colors duration-300">
                  <div className="flex items-center gap-2 border-b border-slate-300 dark:border-slate-800 pb-4 mb-6">
                    <Activity className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                    <h2 className="font-semibold text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200">Diagnostic Results</h2>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-lg border border-slate-300 dark:border-slate-800/60 text-left relative overflow-hidden">
                        <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wide">Total Heat Load</p>
                        <p className="text-2xl font-mono font-bold text-slate-900 dark:text-slate-100 mt-1">{results.total_heat_load_btu.toLocaleString()} <span className="text-xs text-slate-500 font-sans">BTU/h</span></p>
                        <div className="absolute top-0 bottom-0 left-0 w-1 bg-slate-300 dark:bg-slate-700"></div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-lg border border-slate-300 dark:border-slate-800/60 text-left relative overflow-hidden">
                        <p className="text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-500 uppercase tracking-wide">Required Capacity</p>
                        <p className="text-3xl font-mono font-bold text-cyan-600 dark:text-cyan-400 mt-0.5">{results.required_ac_ton} <span className="text-xs font-sans text-cyan-700 dark:text-cyan-600 font-bold">Tons</span></p>
                        <div className="absolute top-0 bottom-0 left-0 w-1 bg-cyan-500"></div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-lg border border-slate-300 dark:border-slate-800/60 text-left relative overflow-hidden">
                        <p className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-500 uppercase tracking-wide">Grid Power Demand</p>
                        <p className="text-3xl font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{results.required_ac_kw} <span className="text-xs font-sans text-indigo-700 dark:text-indigo-600 font-bold">kW_t</span></p>
                        <div className="absolute top-0 bottom-0 left-0 w-1 bg-indigo-500"></div>
                      </div>
                    </div>

                    {/* --- HOVER TOOLTIPS INJECTED HERE --- */}
                    <div className="bg-slate-50 dark:bg-slate-950 rounded-lg p-5 border border-slate-300 dark:border-slate-800 text-sm space-y-3 font-mono">
                      
                      <div className="relative group flex justify-between items-center text-slate-600 dark:text-slate-400 border-b border-slate-300 dark:border-slate-900 pb-3 cursor-help">
                        <span className="font-medium decoration-slate-400 decoration-dotted underline-offset-4 group-hover:underline">🏢 Structural Envelope Conduction (CLTD):</span> 
                        <span className="text-slate-900 dark:text-slate-200 font-bold">{results.room_btu.toLocaleString()} BTU/hr</span>
                        <div className="absolute bottom-full left-4 mb-2 w-64 p-2.5 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 text-[11px] font-sans leading-relaxed rounded-lg shadow-xl z-50 pointer-events-none invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200">
                          Heat transferring through solid walls, roof, and floor due to the temperature difference between inside and outside.
                        </div>
                      </div>

                      <div className="relative group flex justify-between items-center text-slate-600 dark:text-slate-400 border-b border-slate-300 dark:border-slate-900 pb-3 cursor-help">
                        <span className="font-medium decoration-slate-400 decoration-dotted underline-offset-4 group-hover:underline">☀️ Solar Radiant Aperture Transmittance:</span> 
                        <span className="text-slate-900 dark:text-slate-200 font-bold">{results.windows_total_btu.toLocaleString()} BTU/hr</span>
                        <div className="absolute bottom-full left-4 mb-2 w-64 p-2.5 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 text-[11px] font-sans leading-relaxed rounded-lg shadow-xl z-50 pointer-events-none invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200">
                          Heat generated by direct sunlight passing through the glass windows into the room.
                        </div>
                      </div>

                      <div className="relative group flex justify-between items-center text-slate-600 dark:text-slate-400 border-b border-slate-300 dark:border-slate-900 pb-3 cursor-help">
                        <span className="font-medium decoration-slate-400 decoration-dotted underline-offset-4 group-hover:underline">👥 Human Metabolic Core Dissipation:</span> 
                        <span className="text-slate-900 dark:text-slate-200 font-bold">{results.occupant_btu.toLocaleString()} BTU/hr</span>
                        <div className="absolute bottom-full left-4 mb-2 w-64 p-2.5 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 text-[11px] font-sans leading-relaxed rounded-lg shadow-xl z-50 pointer-events-none invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200">
                          The natural body heat and moisture emitted by the people occupying the space.
                        </div>
                      </div>

                      <div className="relative group flex justify-between items-center text-slate-600 dark:text-slate-400 pt-1 cursor-help">
                        <span className="font-medium decoration-slate-400 decoration-dotted underline-offset-4 group-hover:underline">🔌 Internal Appliance & Luminaire Loss:</span> 
                        <span className="text-slate-900 dark:text-slate-200 font-bold">{(results.equipment_btu + results.lighting_btu).toLocaleString()} BTU/hr</span>
                        <div className="absolute bottom-full left-4 mb-2 w-64 p-2.5 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 text-[11px] font-sans leading-relaxed rounded-lg shadow-xl z-50 pointer-events-none invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200">
                          The thermal energy (waste heat) produced by computers, machinery, and lighting fixtures running inside the room.
                        </div>
                      </div>

                    </div>

                    {/* --- CLICKABLE ENGINEERING INSIGHTS --- */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                      
                      {/* Insight 1 */}
                      <div 
                        onClick={() => setActiveModal('thermal')}
                        className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-lg border border-slate-300 dark:border-slate-800 cursor-pointer hover:border-amber-400 dark:hover:border-amber-500/50 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                            <h3 className="text-xs font-bold font-mono uppercase text-slate-800 dark:text-slate-200">Primary Thermal Leak</h3>
                          </div>
                          <ChevronRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                          The largest source of heat is <strong className="text-slate-900 dark:text-slate-100">{primarySource.name}</strong> ({primarySource.value.toLocaleString()} BTU).
                        </p>
                        <p className="text-[11px] text-amber-600 dark:text-amber-500/80 italic font-medium">Click to learn why &rarr;</p>
                      </div>

                      {/* Insight 2 */}
                      <div 
                        onClick={() => setActiveModal('hardware')}
                        className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-lg border border-slate-300 dark:border-slate-800 cursor-pointer hover:border-rose-400 dark:hover:border-rose-500/50 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
                            <h3 className="text-xs font-bold font-mono uppercase text-slate-800 dark:text-slate-200">Hardware Procurement</h3>
                          </div>
                          <ChevronRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                          Procure a unit matching exactly <strong className="text-slate-900 dark:text-slate-100">{results.required_ac_ton} Tons</strong>.
                        </p>
                        <p className="text-[11px] text-rose-600 dark:text-rose-500/80 italic font-medium">Click to learn why &rarr;</p>
                      </div>

                      {/* Insight 3 */}
                      <div 
                        onClick={() => setActiveModal('grid')}
                        className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-lg border border-slate-300 dark:border-slate-800 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500/50 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Factory className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
                            <h3 className="text-xs font-bold font-mono uppercase text-slate-800 dark:text-slate-200">Grid Base-Load Impact</h3>
                          </div>
                          <ChevronRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                          This zone will demand <strong className="text-slate-900 dark:text-slate-100">{results.required_ac_kw} kW</strong> at peak operation.
                        </p>
                        <p className="text-[11px] text-indigo-600 dark:text-indigo-500/80 italic font-medium">Click to learn why &rarr;</p>
                      </div>

                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                  <div className="flex justify-between items-center border-b border-slate-300 dark:border-slate-800 pb-4 mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400"></div>
                      <h2 className="font-semibold text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200">AI Grid Optimization Strategy</h2>
                    </div>
                    <button onClick={generateAiStrategy} disabled={loadingAi || !results} className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs px-4 py-2 rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-50">
                      {loadingAi ? "Analyzing..." : "Synthesize Profile"} <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-300 dark:border-slate-800 p-5 min-h-[160px]">
                    {aiInsight ? (
                      <div className="text-sm text-slate-700 dark:text-slate-300 font-mono leading-relaxed space-y-2 whitespace-pre-wrap">
                        {aiInsight}
                      </div>
                    ) : (
                      <div className="text-slate-500 text-sm italic flex flex-col items-center justify-center h-full gap-2 py-8 text-center">
                        <span className="font-mono text-xs uppercase tracking-widest text-slate-400">Agent Standby</span>
                        <span className="max-w-sm mt-1">Request synthesis to generate load-balancing methodologies based on current telemetry.</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
