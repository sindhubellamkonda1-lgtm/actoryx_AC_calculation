import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#06b6d4', '#f59e0b', '#8b5cf6', '#ef4444'];

const ThermalLoadChart = ({ results }) => {
  const data = [
    { name: 'Structural', value: results.room_btu },
    { name: 'Solar', value: results.windows_total_btu },
    { name: 'Occupants', value: results.occupant_btu },
    { name: 'Equip/Light', value: results.equipment_btu + results.lighting_btu }
  ];

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ThermalLoadChart;