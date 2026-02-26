import { motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { OrderTaxData } from '../types';

interface NYGeoScatterProps {
    data: OrderTaxData[];
}

const DroneTelemetryOverlay = () => {
    const [drones, setDrones] = useState<{ id: number, x1: number, y1: number, x2: number, y2: number, duration: number }[]>([]);

    useEffect(() => {
        const interval = setInterval(() => {
            // Very low frequency of new drones for minimalism
            if (Math.random() > 0.7) {
                setDrones(prev => [
                    ...prev.slice(-1), // Keep at most 2 active drones on screen
                    {
                        id: Date.now(),
                        x1: 20 + Math.random() * 60,
                        y1: 20 + Math.random() * 60,
                        x2: 20 + Math.random() * 60,
                        y2: 20 + Math.random() * 60,
                        duration: 4 + Math.random() * 4 // Slower, calmer movement
                    }
                ]);
            }
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
            {drones.map(drone => (
                <g key={drone.id}>
                    <motion.line
                        x1={`${drone.x1}%`} y1={`${drone.y1}%`}
                        x2={`${drone.x2}%`} y2={`${drone.y2}%`}
                        stroke="#E50000" strokeWidth="1" strokeDasharray="2 4"
                        initial={{ opacity: 0, pathLength: 0 }}
                        animate={{ opacity: [0, 0.3, 0], pathLength: 1 }}
                        transition={{ duration: drone.duration, ease: "linear" }}
                    />
                    <motion.circle
                        r="3" fill="#FFFFFF"
                        style={{ filter: 'drop-shadow(0 0 6px rgba(255, 255, 255, 1))' }}
                        initial={{ cx: `${drone.x1}%`, cy: `${drone.y1}%`, opacity: 0 }}
                        animate={{ cx: `${drone.x2}%`, cy: `${drone.y2}%`, opacity: [0, 1, 1, 0] }}
                        transition={{ duration: drone.duration, ease: "linear" }}
                    />
                </g>
            ))}
        </svg>
    );
};

const NYGeoScatter = ({ data }: NYGeoScatterProps) => {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    // Smart sampling: Limit SVG points to a maximum of 150 to prevent DOM lag
    const sampledData = React.useMemo(() => {
        if (data.length <= 150) return data;

        // Always include top 50 highest value orders to maintain the "red hot" nodes
        const sorted = [...data].sort((a, b) => b.total_amount - a.total_amount);
        const top50 = sorted.slice(0, 50);

        // Randomly sample 100 from the rest to represent density
        const rest = sorted.slice(50);
        const shuffled = rest.sort(() => 0.5 - Math.random());
        const sample100 = shuffled.slice(0, 100);

        return [...top50, ...sample100];
    }, [data]);

    const sortedByAmt = [...sampledData].sort((a, b) => b.total_amount - a.total_amount);
    const threshold = sortedByAmt[Math.floor(sampledData.length * 0.1)]?.total_amount || 0; // Top 10% get hot color

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="bg-[#09090B]/80 border border-zinc-900 rounded-sm p-6 w-full h-full flex flex-col backdrop-blur-xl relative overflow-hidden"
        >
            <div className="flex justify-between items-center mb-6 relative z-10 w-full">
                <h3 className="text-[#A1A1AA] font-sans text-xs tracking-widest uppercase">Geo-Spatial Tax Map // NYS</h3>
                <div className="flex items-center gap-2">
                    <span className="text-[#E50000] font-mono text-[9px] uppercase tracking-widest animate-pulse">Telemetry Active</span>
                </div>
            </div>

            {/* Map background effect (Zoomed to hide edges) */}
            <div className="absolute inset-0 bg-[url('/images/New-York-Map.jpg')] bg-[length:250%] bg-[center_10%] opacity-20 pointer-events-none saturate-0" />

            {/* Grid background effect */}
            <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none mix-blend-overlay">
                <div className="w-full h-full border-[1px] border-[#FFFFFF]/10 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
            </div>

            <div className="flex-1 w-full min-h-[300px] relative z-10">
                {/* Drone Telemetry SVG Overlay */}
                <DroneTelemetryOverlay />

                {mounted && (
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                        <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                            {/* NY bounds: long: -79.0 to -71.9, lat: 40.5 to 45.0 */}
                            <XAxis
                                type="number"
                                dataKey="longitude"
                                domain={['dataMin - 0.5', 'dataMax + 0.5']}
                                hide
                            />
                            <YAxis
                                type="number"
                                dataKey="latitude"
                                domain={['dataMin - 0.5', 'dataMax + 0.5']}
                                hide
                            />
                            <Tooltip
                                cursor={{ strokeDasharray: '3 3', stroke: '#27272A', strokeWidth: 1 }}
                                contentStyle={{
                                    backgroundColor: '#000000',
                                    border: '1px solid #27272A',
                                    borderRadius: '2px',
                                    fontFamily: '"Space Mono", monospace',
                                    fontSize: '12px',
                                    color: '#FFFFFF'
                                }}
                                itemStyle={{ color: '#FFFFFF', fontWeight: 700 }}
                                labelStyle={{ display: 'none' }}
                                formatter={(value, name) => {
                                    if (name === 'latitude' || name === 'longitude') return [parseFloat(Number(value).toString()).toFixed(4), name === 'latitude' ? 'Lat' : 'Lng'];
                                    return [value as unknown as string, name as unknown as string];
                                }}
                            />
                            <Scatter name="Deliveries" data={sampledData} fill="#71717A">
                                {sampledData.map((entry, index) => {
                                    const isHighValue = entry.total_amount >= threshold && threshold > 0;
                                    const isRecent = new Date().getTime() - new Date(entry.timestamp).getTime() < 5 * 24 * 60 * 60 * 1000;

                                    let fill = '#52525B';
                                    if (isHighValue) fill = '#E50000';
                                    else if (isRecent) fill = '#FFFFFF';

                                    return (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={fill}
                                            r={isHighValue ? 6 : (isRecent ? 4 : 3)}
                                            opacity={isHighValue ? 1 : 0.8}
                                            style={isHighValue ? { filter: 'drop-shadow(0 0 6px rgba(229, 0, 0, 0.8))' } : (isRecent ? { filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.5))' } : {})}
                                        />
                                    );
                                })}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                )}
            </div>
        </motion.div>
    );
};

export default React.memo(NYGeoScatter);
