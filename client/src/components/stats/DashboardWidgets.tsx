import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';

const THEME = {
    bg: '#000000',
    gold: '#FFD700',
    amber: '#FFB000',
    darkGrey: '#27272A',
    textMuted: '#71717A',
    white: '#FFFFFF'
};

// ── Shared SVG glow filter (hardware-accelerated) ─────────────
// Inject once per chart; apply via filter="url(#glowGold)" on the <Area> stroke.
const GlowDefs = () => (
    <defs>
        <filter id="glowGold" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
        <filter id="glowWhite" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
    </defs>
);

// Formatters
const fmtDist = (val: number) => `${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
const fmtShort = (val: number) => `${(val / 1000).toFixed(1)}K $`;

// ============================================================================
// WIDGET 1: TAX BREAKDOWN DONUT — accepts pre-computed values
// ============================================================================
export interface TaxBreakdownData {
    state: number;
    county: number;
    city: number;
    special: number;
}

export const TaxBreakdownDonut = ({ data }: { data: TaxBreakdownData }) => {
    const chartData = useMemo(() => {
        return [
            { name: 'State', value: data.state, color: THEME.gold },
            { name: 'County', value: data.county, color: THEME.amber },
            { name: 'City', value: data.city, color: THEME.white },
            { name: 'Special', value: data.special, color: '#8B6508' }
        ].filter(v => v.value > 0);
    }, [data]);

    return (
        <div className="w-full h-full bg-[#050505] border border-zinc-800 p-5 flex flex-col relative overflow-hidden">
            <h3 className="text-base font-mono text-[#71717A] tracking-[0.2em] uppercase mb-4 border-b border-zinc-900 pb-2 font-bold shrink-0">Tax Breakdown</h3>
            <div className="relative flex-1 w-full min-h-[220px] flex items-center justify-center">
                <div className="absolute inset-0">
                    <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                            <Pie
                                data={chartData}
                                cx="50%" cy="50%"
                                innerRadius="70%" outerRadius="85%"
                                stroke="none"
                                paddingAngle={2}
                                dataKey="value"
                                isAnimationActive={true}
                                animationBegin={0}
                                animationDuration={500}
                                animationEasing="ease-out"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: THEME.bg, border: `1px solid ${THEME.gold}`, borderLeft: `3px solid ${THEME.gold}`, borderRadius: 0, fontFamily: '"Space Mono", monospace', fontSize: '15px', color: THEME.white, fontWeight: 'bold', boxShadow: '0 0 10px rgba(252,225,0,0.2)' }}
                                itemStyle={{ color: THEME.gold }}
                                formatter={(value: any) => fmtDist(value)}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                {/* Center text directly layered on top, centered perfectly within the container */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 px-2 text-center mx-auto" style={{ maxWidth: '65%' }}>
                    <span className="text-[10px] xl:text-xs font-mono text-zinc-500 uppercase tracking-widest font-bold mb-0.5 sm:mb-1">Total Tax</span>
                    <span className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-[26px] font-mono text-white font-bold leading-tight flex flex-wrap justify-center items-center gap-1">
                        <span>{fmtDist(chartData.reduce((a, b) => a + b.value, 0)).replace(' $', '')}</span>
                        <span className="text-[#FFD700]">$</span>
                    </span>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 2xl:grid-cols-4 gap-3 shrink-0">
                {chartData.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className="w-3 h-3 shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-sm font-mono text-zinc-400 font-bold truncate">{d.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ============================================================================
// WIDGET 2: REVENUE VS TAX DUAL CHART — accepts pre-computed revenueByDay
// ============================================================================
export interface RevenueByDayItem {
    date: string;
    revenue: number;
    tax: number;
}

export const RevenueVsTaxChart = ({ data, dateRange }: { data: RevenueByDayItem[], dateRange?: { start: Date | null, end: Date | null } }) => {
    const formattedData = useMemo(() => {
        if (!data || data.length === 0) return [];

        // Build a lookup from server data
        const grouped: Record<string, { date: string; revenue: number; tax: number }> = {};
        data.forEach(d => { grouped[d.date] = d; });

        const dataDates = data.map(d => new Date(d.date + 'T12:00:00Z').getTime());
        const minDataTime = Math.min(...dataDates);
        const maxDataTime = Math.max(...dataDates);

        let startStr = dateRange?.start ? dateRange.start.toISOString().split('T')[0] : new Date(minDataTime).toISOString().split('T')[0];
        let endStr = dateRange?.end ? dateRange.end.toISOString().split('T')[0] : new Date(maxDataTime).toISOString().split('T')[0];

        const todayStr = new Date().toISOString().split('T')[0];
        if (endStr > todayStr) endStr = todayStr;
        if (startStr > endStr && dataDates.length > 0) startStr = new Date(minDataTime).toISOString().split('T')[0];

        const tempDate = new Date(startStr + 'T12:00:00Z');
        const tempEnd = new Date(endStr + 'T12:00:00Z');

        const result: RevenueByDayItem[] = [];
        const seen = new Set<string>();

        if (tempEnd.getTime() - tempDate.getTime() <= 5 * 365 * 24 * 60 * 60 * 1000) {
            while (tempDate <= tempEnd) {
                const dStr = tempDate.toISOString().split('T')[0];
                if (!seen.has(dStr)) {
                    seen.add(dStr);
                    result.push(grouped[dStr] || { date: dStr, revenue: 0, tax: 0 });
                }
                tempDate.setUTCDate(tempDate.getUTCDate() + 1);
            }
        }

        Object.keys(grouped).forEach(k => {
            if (!seen.has(k)) { result.push(grouped[k]); seen.add(k); }
        });

        return result.sort((a, b) => a.date.localeCompare(b.date));
    }, [data, dateRange]);

    return (
        <div className="w-full h-full bg-[#050505] border border-zinc-800 p-5 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#FFD700]/50" />
            <h3 className="text-base font-mono text-[#71717A] tracking-[0.2em] uppercase mb-4 border-b border-zinc-900 pb-2 font-bold">Revenue vs Tax Velocity</h3>
            <div className="overflow-hidden h-[280px] lg:h-[350px] xl:h-[430px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                    <AreaChart data={formattedData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <GlowDefs />
                        <defs>
                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={THEME.white} stopOpacity={0.1} />
                                <stop offset="95%" stopColor={THEME.white} stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorTax" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={THEME.gold} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={THEME.gold} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 2" stroke="#18181B" vertical={false} />
                        <XAxis dataKey="date" stroke="#52525B" fontSize={13} fontFamily='"Space Mono", monospace' fontWeight="bold" tickLine={false} axisLine={false} dy={10} minTickGap={30} />
                        <YAxis stroke="#52525B" fontSize={13} fontFamily='"Space Mono", monospace' fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={fmtShort} />
                        <Tooltip
                            contentStyle={{ backgroundColor: THEME.bg, border: `1px solid ${THEME.gold}`, borderLeft: `3px solid ${THEME.gold}`, borderRadius: 0, fontFamily: '"Space Mono", monospace', fontSize: '15px', color: THEME.white, boxShadow: '0 0 10px rgba(252,225,0,0.2)' }}
                            itemStyle={{ fontWeight: 700 }}
                            formatter={(value: any, name: any) => [fmtDist(value), String(name).toUpperCase()]}
                            labelStyle={{ color: THEME.textMuted, marginBottom: '8px', fontWeight: 'bold' }}
                        />
                        <Area type="step" dataKey="revenue" stroke={THEME.white} strokeWidth={1} fillOpacity={1} fill="url(#colorRev)" filter="url(#glowWhite)" isAnimationActive={true} animationBegin={0} animationDuration={700} animationEasing="ease-out" />
                        <Area type="step" dataKey="tax" stroke={THEME.gold} strokeWidth={1.5} fillOpacity={1} fill="url(#colorTax)" filter="url(#glowGold)" isAnimationActive={true} animationBegin={100} animationDuration={700} animationEasing="ease-out" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            <div className="absolute top-5 right-5 flex gap-4">
                <div className="flex items-center gap-2"><div className="w-2 h-[2px] bg-white" /> <span className="text-sm font-mono text-zinc-500 uppercase font-bold">Gross</span></div>
                <div className="flex items-center gap-2"><div className="w-2 h-[2px] bg-[#FFD700]" /> <span className="text-sm font-mono text-zinc-500 uppercase font-bold">Tax</span></div>
            </div>
        </div>
    );
};

// ============================================================================
// WIDGET 3: DAILY ORDERS HEATMAP — accepts pre-computed dailyHeatmap
// ============================================================================
export interface HeatmapDayItem {
    date: string;
    count: number;
}

export const DailyOrdersHeatmap = ({ data }: { data: HeatmapDayItem[] }) => {
    const heatmap = useMemo(() => {
        if (!data.length) return { matrix: [] as number[][], maxVal: 0, minVal: 0 };

        const maxTime = Math.max(...data.map(d => new Date(d.date + 'T12:00:00Z').getTime()));
        const lastDate = new Date(maxTime);

        const dayOfWeek = lastDate.getDay();
        const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;

        const endDate = new Date(lastDate.getTime() + daysToSunday * 24 * 60 * 60 * 1000);
        endDate.setHours(23, 59, 59, 999);

        const startDate = new Date(endDate.getTime());
        startDate.setDate(endDate.getDate() - 27);
        startDate.setHours(0, 0, 0, 0);

        const matrix: number[][] = Array.from({ length: 4 }, () => Array(7).fill(0));
        let maxVal = 0;

        // Build date-lookup
        const dateLookup: Record<string, number> = {};
        data.forEach(d => { dateLookup[d.date] = d.count; });

        // Fill matrix from the 28-day window
        for (let dayIdx = 0; dayIdx < 28; dayIdx++) {
            const d = new Date(startDate.getTime() + dayIdx * 24 * 60 * 60 * 1000);
            const dStr = d.toISOString().split('T')[0];
            const count = dateLookup[dStr] || 0;
            const rowIdx = Math.floor(dayIdx / 7);
            const colIdx = (d.getDay() + 6) % 7; // Monday=0
            if (rowIdx >= 0 && rowIdx < 4 && colIdx >= 0 && colIdx < 7) {
                matrix[rowIdx][colIdx] = count;
                if (count > maxVal) maxVal = count;
            }
        }

        let minVal = Infinity;
        matrix.forEach(row => {
            row.forEach(val => {
                if (val > 0 && val < minVal) minVal = val;
            });
        });
        if (minVal === Infinity) minVal = 0;

        return { matrix, maxVal, minVal };
    }, [data]);

    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    const weeks = ['W-4', 'W-3', 'W-2', 'W-1'];

    return (
        <div className="w-full h-full bg-[#050505] border border-zinc-800 p-5 flex flex-col relative group">
            <h3 className="text-base font-mono text-[#71717A] tracking-[0.2em] uppercase mb-3 border-b border-zinc-900 pb-2 font-bold">Order Matrix / 28D</h3>
            {/* Day headers — edge to edge */}
            <div className="grid gap-[3px] w-full mb-[3px]" style={{ gridTemplateColumns: 'clamp(32px, 10%, 48px) repeat(7, 1fr)' }}>
                <div /> {/* spacer */}
                {days.map(d => (
                    <span key={d} className="text-center text-xs lg:text-sm font-mono text-zinc-500 font-bold">{d}</span>
                ))}
            </div>
            {/* Grid rows — stretch to fill */}
            <div className="flex-1 flex flex-col gap-[3px] w-full">
                {heatmap.matrix.map((row, rIdx) => (
                    <div key={rIdx} className="grid gap-[3px] w-full flex-1" style={{ gridTemplateColumns: 'clamp(32px, 10%, 48px) repeat(7, 1fr)' }}>
                        <span className="text-xs lg:text-sm font-mono text-zinc-500 text-right pr-1 lg:pr-2 self-center font-bold truncate">{weeks[rIdx]}</span>
                        {row.map((val, cIdx) => {
                            const range = heatmap.maxVal - heatmap.minVal;
                            const normalized = range > 0 ? (val - heatmap.minVal) / range : (val > 0 ? 1 : 0);
                            const h = 25 + normalized * 35;
                            const s = 100;
                            const l = 30 + normalized * 55;
                            const bg = val === 0 ? '#0a0a0a' : `hsl(${h}, ${s}%, ${l}%)`;
                            const textColor = l > 50 ? '#000000' : '#e4e4e7';

                            return (
                                <div
                                    key={cIdx}
                                    className="border flex items-center justify-center transition-colors duration-300"
                                    style={{
                                        backgroundColor: bg,
                                        borderColor: val === 0 ? '#1a1a1a' : 'transparent',
                                        boxShadow: normalized > 0.8 && val > 0 ? `0 0 8px hsla(${h}, ${s}%, ${l}%, 0.5)` : 'none',
                                    }}
                                    title={`${val} orders`}
                                >
                                    {val > 0 && <span className="text-sm font-mono font-bold" style={{ color: textColor }}>{val}</span>}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
            <div className="mt-4 flex justify-between items-center text-sm font-mono text-zinc-500 uppercase font-bold">
                <span>Low {heatmap.minVal > 0 ? `(${heatmap.minVal})` : ''}</span>
                <div className="flex gap-1 items-center">
                    {[0, 0.25, 0.5, 0.75, 1.0].map((v, i) => {
                        const h = 25 + v * 35;
                        const l = 30 + v * 55;
                        return (
                            <div
                                key={i}
                                className="w-4 h-4 rounded-sm"
                                style={{
                                    backgroundColor: `hsl(${h}, 100%, ${l}%)`,
                                    boxShadow: v > 0.8 ? `0 0 4px hsla(${h}, 100%, ${l}%, 0.5)` : 'none'
                                }}
                            />
                        )
                    })}
                </div>
                <span>High {heatmap.maxVal > 0 ? `(${heatmap.maxVal})` : ''}</span>
            </div>
        </div>
    );
};

// ============================================================================
// WIDGET 4: EFFECTIVE TAX RATE GAUGE (circular) — no data change needed
// ============================================================================
export const EffectiveRateGauge = ({ rate }: { rate: number }) => {
    const percentage = Math.min(Math.max((rate / 0.12) * 100, 0), 100);

    return (
        <div className="w-full h-full bg-[#050505] border border-zinc-800 p-5 flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-mono text-[#71717A] tracking-[0.2em] uppercase">Effective Rate</span>
                <span className="text-xs font-mono text-zinc-600 tracking-widest">GAUGE</span>
            </div>
            {/* Gauge centered */}
            <div className="flex-1 flex items-center justify-center relative">
                <svg viewBox="0 0 36 36" className="w-[180px] h-[180px] transform -rotate-90">
                    <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none" stroke="#18181B" strokeWidth="2.5"
                    />
                    <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none" stroke="#FFD700" strokeWidth="2.5"
                        strokeDasharray={`${percentage}, 100`}
                        strokeLinecap="butt"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col" style={{ background: 'radial-gradient(circle, rgba(252,225,0,0.1) 0%, transparent 60%)' }}>
                    <span className="text-3xl font-mono text-white font-bold" style={{ textShadow: '0 0 15px rgba(255,255,255,0.6)' }}>{(rate * 100).toFixed(2)}%</span>
                    <span className="text-xs font-mono text-zinc-500 mt-2 tracking-widest uppercase">of 12% scale</span>
                </div>
            </div>
            <div className="flex justify-between items-center mt-2">
                <span className="text-xs font-mono text-zinc-500">NYS Ref: <span className="text-[#FFD700]">8.8%</span></span>
                <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">Nominal</span>
            </div>
        </div>
    );
};

// ============================================================================
// WIDGET 5: AVG ORDER VALUE TREND — accepts pre-computed aovByDay
// ============================================================================
export interface AovByDayItem {
    date: string;
    aov: number;
}

export const AvgOrderValueTrend = ({ data, dateRange }: { data: AovByDayItem[], dateRange?: { start: Date | null, end: Date | null } }) => {
    const trendData = useMemo(() => {
        if (!data.length) return [];

        const grouped: Record<string, AovByDayItem> = {};
        data.forEach(d => { grouped[d.date] = d; });

        const dataDates = data.map(d => new Date(d.date + 'T12:00:00Z').getTime());
        const minDataTime = Math.min(...dataDates);
        const maxDataTime = Math.max(...dataDates);

        let startStr = dateRange?.start ? dateRange.start.toISOString().split('T')[0] : new Date(minDataTime).toISOString().split('T')[0];
        let endStr = dateRange?.end ? dateRange.end.toISOString().split('T')[0] : new Date(maxDataTime).toISOString().split('T')[0];

        const todayStr = new Date().toISOString().split('T')[0];
        if (endStr > todayStr) endStr = todayStr;
        if (startStr > endStr && dataDates.length > 0) startStr = new Date(minDataTime).toISOString().split('T')[0];

        const tempDate = new Date(startStr + 'T12:00:00Z');
        const tempEnd = new Date(endStr + 'T12:00:00Z');

        const result: { date: string; aov: number | null; label: string; isEmpty: boolean }[] = [];
        const seen = new Set<string>();

        if (tempEnd.getTime() - tempDate.getTime() <= 5 * 365 * 24 * 60 * 60 * 1000) {
            while (tempDate <= tempEnd) {
                const dStr = tempDate.toISOString().split('T')[0];
                if (!seen.has(dStr)) {
                    seen.add(dStr);
                    if (grouped[dStr]) {
                        result.push({
                            date: dStr,
                            aov: Math.round(grouped[dStr].aov * 100) / 100,
                            label: new Date(dStr + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                            isEmpty: false,
                        });
                    } else {
                        result.push({
                            date: dStr,
                            aov: null,
                            label: new Date(dStr + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                            isEmpty: true,
                        });
                    }
                }
                tempDate.setUTCDate(tempDate.getUTCDate() + 1);
            }
        }

        Object.keys(grouped).forEach(dStr => {
            if (!seen.has(dStr)) {
                result.push({
                    date: dStr,
                    aov: Math.round(grouped[dStr].aov * 100) / 100,
                    label: new Date(dStr + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    isEmpty: false,
                });
                seen.add(dStr);
            }
        });

        return result.sort((a, b) => a.date.localeCompare(b.date));
    }, [data, dateRange]);

    const activeNodes = useMemo(() => trendData.filter(d => !d.isEmpty && d.aov !== null), [trendData]);
    const currentAOV = activeNodes.length > 0 ? (activeNodes[activeNodes.length - 1].aov as number) : 0;
    const prevAOV = activeNodes.length > 1 ? (activeNodes[activeNodes.length - 2].aov as number) : 0;
    const diff = currentAOV - prevAOV;

    const stats = useMemo(() => {
        if (!activeNodes.length) return { min: 0, max: 0, avg: 0 };
        const vals = activeNodes.map(d => d.aov as number);
        return {
            min: Math.min(...vals),
            max: Math.max(...vals),
            avg: vals.reduce((a, b) => a + b, 0) / vals.length,
        };
    }, [activeNodes]);

    return (
        <div className="w-full h-full bg-[#050505] border border-zinc-800 p-5 flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-start mb-2 gap-2">
                <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-[10px] sm:text-base font-mono text-[#71717A] tracking-[0.1em] sm:tracking-[0.2em] uppercase font-bold truncate">Avg Order Value · Trend</span>
                    <span className="text-[10px] sm:text-sm font-mono text-zinc-500 tracking-wider font-bold truncate">{trendData.length} data points</span>
                </div>
                <span className={`text-xs sm:text-base font-mono font-bold mt-1 shrink-0 whitespace-nowrap ${diff >= 0 ? 'text-[#FFD700]' : 'text-[#71717A]'}`}>{diff >= 0 ? '▲' : '▼'} ${Math.abs(diff).toFixed(2)}</span>
            </div>
            <div className="text-2xl sm:text-3xl md:text-4xl font-mono text-white font-bold mb-3 w-full whitespace-nowrap overflow-hidden text-ellipsis leading-normal sm:leading-tight py-1">{fmtDist(currentAOV)}</div>
            <div className="flex-1 overflow-hidden" style={{ minHeight: '180px' }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                    <AreaChart data={trendData} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
                        <GlowDefs />
                        <defs>
                            <linearGradient id="aovGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#FFD700" stopOpacity={0.25} />
                                <stop offset="100%" stopColor="#FFD700" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#18181B" vertical={false} />
                        <XAxis
                            dataKey="label"
                            tick={{ fill: '#52525B', fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold' }}
                            axisLine={{ stroke: '#27272A' }}
                            tickLine={false}
                            ticks={trendData.length > 0 ? Array.from(new Set([trendData[0].label, trendData[trendData.length - 1].label])) : undefined}
                            dy={10}
                        />
                        <YAxis
                            tick={{ fill: '#52525B', fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v: number) => `${v.toFixed(0)} $`}
                            dx={-5}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: THEME.bg,
                                border: `1px solid ${THEME.gold}`,
                                borderLeft: `3px solid ${THEME.gold}`,
                                borderRadius: 0,
                                fontFamily: '"Space Mono", monospace',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                color: '#FFFFFF',
                                boxShadow: '0 0 10px rgba(252,225,0,0.2)'
                            }}
                            labelStyle={{ color: '#71717A', fontSize: '11px', marginBottom: '6px', fontWeight: 'bold' }}
                            formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(2)} $`, 'AOV']}
                            cursor={{ stroke: '#FFD700', strokeWidth: 1, strokeDasharray: '3 3' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="aov"
                            stroke={THEME.gold}
                            strokeWidth={1.5}
                            fill="url(#aovGradient)"
                            dot={false}
                            isAnimationActive={true}
                            animationBegin={0}
                            animationDuration={600}
                            animationEasing="ease-out"
                            connectNulls={true}
                            filter="url(#glowGold)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            {/* Summary stats */}
            <div className="flex flex-wrap sm:flex-nowrap justify-between items-end sm:items-center mt-3 pt-3 border-t border-zinc-900 gap-3">
                <div className="flex gap-3 sm:gap-6 w-full sm:w-auto justify-between sm:justify-start">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] sm:text-xs font-mono text-zinc-600 uppercase tracking-wider font-bold">Min</span>
                        <span className="text-xs sm:text-sm font-mono text-zinc-400 font-bold whitespace-nowrap">{stats.min.toFixed(2)} $</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] sm:text-xs font-mono text-[#FFD700]/70 uppercase tracking-wider font-bold">Avg</span>
                        <span className="text-sm sm:text-base font-bold font-mono text-[#FFD700] whitespace-nowrap">{stats.avg.toFixed(2)} $</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] sm:text-xs font-mono text-zinc-600 uppercase tracking-wider font-bold">Max</span>
                        <span className="text-xs sm:text-sm font-mono text-zinc-400 font-bold whitespace-nowrap">{stats.max.toFixed(2)} $</span>
                    </div>
                </div>
                <span className="text-[10px] sm:text-sm font-mono text-zinc-600 tracking-[0.2em] uppercase font-bold hidden sm:block">Daily AOV</span>
            </div>
        </div>
    );
};

// ============================================================================
// WIDGET 6: TAX LIABILITY SUMMARY — accepts pre-computed breakdown
// ============================================================================
export const TaxLiabilitySummary = ({ data }: { data: TaxBreakdownData }) => {
    const liabs = useMemo(() => {
        const aggs: Record<string, number> = {
            'STATE': data.state,
            'COUNTY': data.county,
            'CITY': data.city,
            'SPECIAL': data.special,
        };
        const totalTax = Object.values(aggs).reduce((a, b) => a + b, 0);
        const arr = Object.entries(aggs)
            .filter(([_, val]) => val > 0)
            .map(([name, val]) => ({ name, val, pct: totalTax > 0 ? (val / totalTax * 100) : 0 }))
            .sort((a, b) => b.val - a.val);
        const max = Math.max(...arr.map(a => a.val), 1);
        return { arr, max, totalTax };
    }, [data]);

    return (
        <div className="w-full h-full bg-[#050505] border border-zinc-800 p-5 flex flex-col relative">
            <div className="flex justify-between items-center mb-4 border-b border-zinc-900 pb-2">
                <h3 className="text-base font-mono text-[#71717A] tracking-[0.2em] uppercase font-bold">Liability Vectors</h3>
                <span className="text-base font-mono font-bold text-zinc-400">{fmtDist(liabs.totalTax)}</span>
            </div>
            <div className="flex-1 flex flex-col justify-around">
                {liabs.arr.map((item, idx) => (
                    <div key={idx} className="w-full">
                        <div className="flex justify-between text-xs sm:text-base font-mono uppercase mb-1">
                            <span className="text-zinc-300 truncate pr-2 font-bold">{item.name}</span>
                            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                                <span className="text-zinc-500 text-[10px] sm:text-sm font-bold">{item.pct.toFixed(1)}%</span>
                                <span className="text-[#FFD700] font-bold whitespace-nowrap">{fmtDist(item.val)}</span>
                            </div>
                        </div>
                        <div className="w-full h-[2px] bg-zinc-900">
                            <div className="h-full bg-[#FFD700]" style={{ width: `${(item.val / liabs.max) * 100}%` }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ============================================================================
// WIDGET 7: PERIOD COMPARISON CARD — accepts pre-computed revenueByDay
// ============================================================================
const COMPARE_MODES = [
    { key: 'PREV', label: 'vs PREV PERIOD', desc: 'Same window, prior' },
    { key: 'MOM', label: 'vs PREV MONTH', desc: 'Month-over-Month' },
    { key: 'QOQ', label: 'vs PREV QUARTER', desc: 'Quarter-over-Quarter' },
    { key: 'YOY', label: 'vs PREV YEAR', desc: 'Year-over-Year' },
    { key: 'SPLIT', label: 'vs 1ST HALF', desc: 'Chronological split' },
] as const;

interface PeriodItem {
    date: string;
    revenue: number;
    tax: number;
    count?: number;
}

export const PeriodComparisonCard = ({ data }: { data: RevenueByDayItem[] }) => {
    const [compareMode, setCompareMode] = useState<string>('PREV');

    const metrics = useMemo(() => {
        if (data.length < 2) return { items: [], modeDesc: '' };

        // Data is already sorted by date from server
        const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
        const lastDate = new Date(sorted[sorted.length - 1].date + 'T12:00:00Z');

        let p1: PeriodItem[] = [], p2: PeriodItem[] = [];
        let modeDesc = '';

        switch (compareMode) {
            case 'PREV': {
                const half = Math.floor(sorted.length / 2);
                p1 = sorted.slice(0, half);
                p2 = sorted.slice(half);
                modeDesc = `${p1.length} vs ${p2.length} days`;
                break;
            }
            case 'MOM': {
                const thisMonth = `${lastDate.getUTCFullYear()}-${String(lastDate.getUTCMonth() + 1).padStart(2, '0')}`;
                const prevDate = new Date(Date.UTC(lastDate.getUTCFullYear(), lastDate.getUTCMonth() - 1, 1));
                const prevMonth = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, '0')}`;
                p2 = sorted.filter(d => d.date.startsWith(thisMonth));
                p1 = sorted.filter(d => d.date.startsWith(prevMonth));
                modeDesc = `${prevMonth} → ${thisMonth}`;
                break;
            }
            case 'QOQ': {
                const qMonth = Math.floor(lastDate.getUTCMonth() / 3) * 3;
                const thisQStart = `${lastDate.getUTCFullYear()}-${String(qMonth + 1).padStart(2, '0')}`;
                const prevQDate = new Date(Date.UTC(lastDate.getUTCFullYear(), qMonth - 3, 1));
                const prevQStart = `${prevQDate.getUTCFullYear()}-${String(prevQDate.getUTCMonth() + 1).padStart(2, '0')}`;
                p2 = sorted.filter(d => d.date >= thisQStart);
                p1 = sorted.filter(d => d.date >= prevQStart && d.date < thisQStart);
                modeDesc = `Q${Math.floor(qMonth / 3)} → Q${Math.floor(qMonth / 3) + 1}`;
                break;
            }
            case 'YOY': {
                const thisYear = String(lastDate.getUTCFullYear());
                const prevYear = String(lastDate.getUTCFullYear() - 1);
                p2 = sorted.filter(d => d.date.startsWith(thisYear));
                p1 = sorted.filter(d => d.date.startsWith(prevYear));
                modeDesc = `FY${prevYear} → FY${thisYear}`;
                break;
            }
            case 'SPLIT': {
                const half = Math.floor(sorted.length / 2);
                p1 = sorted.slice(0, half);
                p2 = sorted.slice(half);
                modeDesc = 'Chronological 50/50 split';
                break;
            }
        }

        if (p1.length === 0 && p2.length === 0) return { items: [], modeDesc };

        const r1 = p1.reduce((a, d) => a + d.revenue, 0);
        const r2 = p2.reduce((a, d) => a + d.revenue, 0);
        const t1 = p1.reduce((a, d) => a + d.tax, 0);
        const t2 = p2.reduce((a, d) => a + d.tax, 0);
        const aov1 = r1 / (p1.length || 1);
        const aov2 = r2 / (p2.length || 1);

        const pctDelta = (curr: number, prev: number) => prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;

        return {
            items: [
                { label: 'REVENUE', value: fmtShort(r2), delta: pctDelta(r2, r1) },
                { label: 'TAX YIELD', value: fmtShort(t2), delta: pctDelta(t2, t1) },
                { label: 'DAYS', value: p2.length.toLocaleString(), delta: pctDelta(p2.length, p1.length) },
                { label: 'AVG/DAY', value: fmtDist(aov2), delta: pctDelta(aov2, aov1) },
            ],
            modeDesc,
        };
    }, [data, compareMode]);

    const segClip = 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)';

    return (
        <div className="w-full h-full bg-[#050505] border border-zinc-800 p-5 flex flex-col relative"
            style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))' }}
        >
            {/* Header */}
            <div className="flex justify-between items-center mb-3 border-b border-zinc-900 pb-2.5">
                <span className="text-sm font-mono text-[#71717A] tracking-[0.2em] uppercase font-bold">Period Δ</span>
                <div className="flex gap-px flex-wrap">
                    {COMPARE_MODES.map((mode, i) => (
                        <button
                            key={mode.key}
                            onClick={() => setCompareMode(mode.key)}
                            className={`px-1.5 lg:px-2 xl:px-3 py-1 lg:py-1.5 text-[10px] lg:text-xs xl:text-sm font-mono tracking-wider transition-colors ${compareMode === mode.key
                                ? 'bg-[#FFD700] text-black font-bold'
                                : 'bg-[#0A0A0A] text-zinc-600 hover:bg-zinc-800 hover:text-zinc-400 border-b border-[#FFD700]/10 font-bold'
                                }`}
                            style={{ clipPath: i === 0 ? 'polygon(0 0, 100% 0, calc(100% - 4px) 100%, 0 100%)' : segClip }}
                            title={mode.desc}
                        >
                            {mode.key}
                        </button>
                    ))}
                </div>
            </div>

            {/* Comparison context */}
            <div className="flex items-center gap-3 mb-4">
                <span className="text-sm font-mono text-zinc-500 tracking-[0.15em] uppercase font-bold">
                    {COMPARE_MODES.find(m => m.key === compareMode)?.label}
                </span>
                <span className="text-xs font-mono text-zinc-700">·</span>
                <span className="text-sm font-mono text-zinc-600 tracking-wider font-bold">{metrics.modeDesc}</span>
            </div>

            {/* Metric rows */}
            <div className="flex-1 flex flex-col justify-around gap-1">
                {metrics.items.map((m, i) => (
                    <div key={i} className="flex items-center gap-4">
                        <span className="text-[10px] sm:text-sm font-mono text-zinc-500 w-16 sm:w-24 shrink-0 tracking-wider font-bold truncate">{m.label}</span>
                        <div className="flex-1 h-[3px] bg-zinc-900 relative">
                            <div
                                className={`h-full ${m.delta >= 0 ? 'bg-[#FFD700]' : 'bg-[#71717A]'}`}
                                style={{ width: `${Math.min(Math.abs(m.delta) * 1.5, 100)}%` }}
                            />
                        </div>
                        <span className="text-xs sm:text-base font-mono text-zinc-400 min-w-[4rem] sm:min-w-[6rem] md:min-w-[7rem] text-right shrink-0 font-bold whitespace-nowrap">{m.value}</span>
                        <span className={`text-xs sm:text-base font-mono font-bold min-w-[3.5rem] sm:min-w-[4rem] text-right shrink-0 whitespace-nowrap ${m.delta >= 0 ? 'text-[#FFD700]' : 'text-[#71717A]'}`} style={m.delta >= 0 ? { textShadow: '0 0 10px rgba(252,225,0,0.5)' } : {}}>
                            {m.delta >= 0 ? '+' : ''}{m.delta.toFixed(1)}%
                        </span>
                    </div>
                ))}
            </div>
            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#FFD700]/50 m-1" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#FFD700]/50 m-1" />
        </div>
    );
};

// ============================================================================
// WIDGET 8: QUICK EXPORT PANEL — accepts summary data (no raw data)
// ============================================================================
export interface ExportSummaryData {
    kpis: { totalRev: number; totalTax: number; avgRate: number; orders: number };
    taxBreakdown: TaxBreakdownData;
}

export const QuickExportPanel = ({ data }: { data: ExportSummaryData }) => {
    const [exportFormat, setExportFormat] = useState<'CSV' | 'STUB'>('CSV');
    const [isExporting, setIsExporting] = useState(false);

    const generateIRSStub = () => {
        const content = [
            'IRS TAX SUMMARY REPORT',
            `Generated: ${new Date().toISOString()}`,
            '',
            `Total Transactions: ${data.kpis.orders}`,
            `Gross Revenue: ${data.kpis.totalRev.toFixed(2)} $`,
            `Total Tax Collected: ${data.kpis.totalTax.toFixed(2)} $`,
            `Effective Tax Rate: ${(data.kpis.avgRate * 100).toFixed(3)}%`,
            '',
            'BREAKDOWN:',
            `  State Tax: ${data.taxBreakdown.state.toFixed(2)} $`,
            `  County Tax: ${data.taxBreakdown.county.toFixed(2)} $`,
            `  City Tax: ${data.taxBreakdown.city.toFixed(2)} $`,
            `  Special District: ${data.taxBreakdown.special.toFixed(2)} $`,
        ].join('\n');

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `IRS_summary_${new Date().toISOString().split('T')[0]}.txt`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const downloadCSV = () => {
        // Trigger server-side CSV export
        window.open('/api/orders/export', '_blank');
    };

    const handleExport = () => {
        setIsExporting(true);
        if (exportFormat === 'CSV') {
            downloadCSV();
        } else {
            generateIRSStub();
        }
        setTimeout(() => setIsExporting(false), 300);
    };

    return (
        <div className="w-full min-h-[56px] h-auto bg-[#000000] border-b border-zinc-800 flex flex-wrap items-center justify-between px-3 lg:px-6 py-2 gap-3 font-mono relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#FFD700]/10 to-transparent"></div>

            {/* Left Side: System Status */}
            <div className="flex items-center gap-4">
                <div className="relative">
                    <div className="w-3 h-3 bg-[#FFD700] border border-black z-10 relative"></div>
                    <div className="absolute inset-0 bg-[#FFD700] blur-[4px] opacity-60 animate-pulse"></div>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] lg:text-[11px] text-[#FFD700]/70 tracking-[0.3em] uppercase leading-none mb-1">DATA EGRESS CONSOLE</span>
                    <span className="text-[12px] lg:text-[13px] text-white tracking-[0.2em] font-bold flex items-center gap-2">
                        SYS.CORE // READY_FOR_EGRESS
                        <span className="w-2 h-4 bg-[#FFD700] animate-[blink_1.2s_step-end_infinite]"></span>
                    </span>
                </div>
            </div>

            {/* Right Side: Interaction */}
            <div className="flex items-center gap-2 lg:gap-4 xl:gap-6 h-full py-1.5">
                {/* Format Selector */}
                <div className="flex items-center gap-1 bg-black p-1 border border-zinc-800">
                    <button
                        onClick={() => setExportFormat('CSV')}
                        className={`px-4 py-1.5 text-xs font-mono font-bold tracking-widest uppercase transition-all duration-200 ${exportFormat === 'CSV'
                            ? 'bg-[#FFD700] text-black shadow-[0_0_10px_rgba(255,215,0,0.3)]'
                            : 'bg-transparent text-zinc-500 hover:text-zinc-300'
                            }`}
                        style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                    >
                        [ CSV ]
                    </button>
                    <button
                        onClick={() => setExportFormat('STUB')}
                        className={`px-4 py-1.5 text-xs font-mono font-bold tracking-widest uppercase transition-all duration-200 ${exportFormat === 'STUB'
                            ? 'bg-[#FFD700] text-black shadow-[0_0_10px_rgba(255,215,0,0.3)]'
                            : 'bg-transparent text-zinc-500 hover:text-zinc-300'
                            }`}
                        style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                    >
                        [ IRS_STUB ]
                    </button>
                </div>

                {/* Execution Trigger */}
                <button
                    onClick={handleExport}
                    className="h-full px-6 flex items-center justify-center gap-3 bg-[#FFD700] text-black border border-[#FFD700] hover:bg-white hover:border-white transition-all group/btn overflow-hidden relative shadow-[0_0_15px_rgba(255,215,0,0.15)] hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                    style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
                >
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1s_infinite]"></span>
                    <Download className={`w-4 h-4 transition-transform shrink-0 ${isExporting ? 'translate-y-1 opacity-50' : 'group-hover/btn:-translate-y-0.5'}`} strokeWidth={2.5} />
                    <span className="text-[11px] lg:text-[13px] font-bold tracking-[0.15em] lg:tracking-[0.2em] relative z-10 uppercase transition-opacity">
                        {isExporting ? 'ENCRYPTING...' : <><span className="hidden sm:inline">&gt; </span>INITIATE_TRANSFER</>}
                    </span>
                </button>
            </div>
        </div>
    );
};
