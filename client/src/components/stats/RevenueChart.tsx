import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface RevenueChartProps {
    data: Array<{ date: string; revenue: number }>;
}

export default function RevenueChart({ data }: RevenueChartProps) {
    if (!data || data.length === 0) return null;

    // Custom tooltip to match the dark theme
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#121214] border border-white/10 rounded-lg p-3 shadow-xl backdrop-blur-xl">
                    <p className="text-zinc-400 text-xs mb-1">{label}</p>
                    <p className="text-emerald-400 font-bold text-sm">
                        ${payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <motion.div
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            className="bg-[#0c0c0e] border border-white/[0.05] rounded-2xl p-6 h-full min-h-[400px] relative overflow-hidden flex flex-col"
        >
            <div className="mb-6 relative z-10">
                <h3 className="text-lg font-semibold text-white tracking-tight">Revenue Dynamics</h3>
                <p className="text-xs text-zinc-500 mt-1">Daily gross revenue over the selected period</p>
            </div>

            <div className="flex-1 w-full h-full relative z-10 -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                        <XAxis
                            dataKey="date"
                            stroke="#52525b"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => {
                                const date = new Date(val);
                                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            }}
                        />
                        <YAxis
                            stroke="#52525b"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `$${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorRevenue)"
                            activeDot={{ r: 6, fill: '#3b82f6', stroke: '#0c0c0e', strokeWidth: 2 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
        </motion.div>
    );
}
