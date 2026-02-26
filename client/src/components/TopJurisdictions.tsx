import { motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import { OrderTaxData } from '../types';

interface TopJurisdictionsProps {
    data: OrderTaxData[];
}

const TopJurisdictions = ({ data }: TopJurisdictionsProps) => {
    const countyNames = ["New York County", "Kings County", "Erie County", "Monroe County", "Queens County", "Albany County", "Westchester County"];

    // Aggregate initial data to seed state
    const initialJurisdictions: Record<string, number> = {};
    data.forEach((order, index) => {
        const county = countyNames[index % countyNames.length];
        initialJurisdictions[county] = (initialJurisdictions[county] || 0) + order.tax_amount;
    });

    // State to simulate dynamic growth matching the streaming ledger
    const [jurisdictions, setJurisdictions] = useState(initialJurisdictions);

    // Simulated High Water Marks (Set slightly above current max so they get breached eventually)
    const [highWaterMarks] = useState(() => {
        const marks: Record<string, number> = {};
        Object.entries(initialJurisdictions).forEach(([name, value]) => {
            marks[name] = value * (1.05 + Math.random() * 0.1); // 5% to 15% above start
        });
        return marks;
    });

    useEffect(() => {
        // Simulate streaming increases
        const interval = setInterval(() => {
            setJurisdictions(prev => {
                const next = { ...prev };
                const randomCounty = countyNames[Math.floor(Math.random() * countyNames.length)];
                next[randomCounty] += (Math.random() * 50); // Add amounts
                return next;
            });
        }, 2500);
        return () => clearInterval(interval);
    }, [countyNames]);

    const chartData = Object.entries(jurisdictions)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    const maxVal = Math.max(...chartData.map(d => Math.max(d.value, highWaterMarks[d.name])));

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="bg-[#09090B]/80 border border-zinc-900 rounded-sm p-6 w-full h-full flex flex-col backdrop-blur-xl shrink-0"
        >
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-[#A1A1AA] font-sans text-xs tracking-widest uppercase">Top Jurisdictions</h3>
                <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest flex items-center gap-1">
                    <span className="w-px h-3 bg-zinc-400 inline-block" /> HWM
                </span>
            </div>

            <div className="flex-1 w-full flex flex-col justify-around gap-4 mt-2 h-full">
                {chartData.map((item, i) => {
                    const hwm = highWaterMarks[item.name];
                    const percentage = (item.value / maxVal) * 100;
                    const hwmPercentage = (hwm / maxVal) * 100;
                    const isTop = i === 0;
                    const breachedRecord = item.value >= hwm;

                    return (
                        <div key={item.name} className="flex flex-col gap-1 w-full relative">
                            <div className="flex justify-between font-mono text-xs uppercase mb-1">
                                <span className={isTop ? "text-[#E50000]" : "text-zinc-300"}>
                                    {item.name} {breachedRecord && <span className="text-[#E50000] ml-1 text-[9px] animate-pulse">ATH</span>}
                                </span>
                                <span className="text-[#FFFFFF]">${item.value.toFixed(2)}</span>
                            </div>
                            <div className="h-1.5 w-full bg-zinc-900 border border-zinc-900 relative">
                                {/* Simulated HWM Line */}
                                <div
                                    className="absolute top-[-3px] bottom-[-3px] w-px bg-zinc-400 z-10"
                                    style={{ left: `${hwmPercentage}%` }}
                                />

                                <motion.div
                                    initial={{ width: `${percentage}%` }}
                                    animate={{ width: `${percentage}%` }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                    className={`absolute top-0 left-0 h-full ${breachedRecord ? 'bg-[#E50000]' : (isTop ? 'bg-zinc-300' : 'bg-zinc-600')}`}
                                    style={breachedRecord ? { filter: 'drop-shadow(0 0 8px rgba(229, 0, 0, 0.8))' } : (isTop ? { filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.3))' } : {})}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
};

export default React.memo(TopJurisdictions);
