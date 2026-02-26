import React from 'react';
import { motion } from 'framer-motion';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { OrderTaxData } from '../types';

interface DashboardChartProps {
    data: OrderTaxData[];
}

export default function DashboardChart({ data }: DashboardChartProps) {
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => setMounted(true), []);

    const formattedData = React.useMemo(() => {
        if (!data || data.length === 0) return [];

        const timestamps = data.map(d => new Date(d.timestamp).getTime());
        const minDate = Math.min(...timestamps);
        const maxDate = Math.max(...timestamps);
        const spanDays = (maxDate - minDate) / (1000 * 60 * 60 * 24);

        const grouped = data.reduce((acc, order) => {
            const dateObj = new Date(order.timestamp);
            let dateKey = '';
            let displayDate = '';

            if (spanDays > 60) {
                // Group by Week
                dateObj.setDate(dateObj.getDate() - dateObj.getDay());
                dateKey = dateObj.toISOString().split('T')[0];
                displayDate = dateObj.toLocaleDateString('en-US', { year: '2-digit', month: 'short', day: 'numeric' });
            } else if (spanDays > 2) {
                // Group by Day
                dateKey = dateObj.toISOString().split('T')[0];
                displayDate = dateObj.toLocaleDateString('en-US', { year: '2-digit', month: 'short', day: 'numeric' });
            } else {
                // Group by Hour
                dateObj.setMinutes(0, 0, 0);
                dateKey = dateObj.toISOString();
                displayDate = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
            }

            if (!acc[dateKey]) {
                acc[dateKey] = { dateKey, displayDate, total: 0 };
            }
            acc[dateKey].total += order.total_amount;
            return acc;
        }, {} as Record<string, { dateKey: string, displayDate: string, total: number }>);

        return Object.values(grouped)
            .sort((a, b) => new Date(a.dateKey).getTime() - new Date(b.dateKey).getTime())
            .map(item => ({ date: item.displayDate, total: parseFloat(item.total.toFixed(2)) }));
    }, [data]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="bg-[#09090B]/80 border border-zinc-900 rounded-sm p-6 w-full h-full flex flex-col backdrop-blur-xl"
        >
            <h3 className="text-[#A1A1AA] font-sans text-xs tracking-widest uppercase mb-6">Revenue Trajectory</h3>
            <div className="flex-1 w-full min-h-[300px]">
                {mounted && (
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                        <AreaChart data={formattedData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#18181B" vertical={false} />
                            <XAxis
                                dataKey="date"
                                stroke="#52525B"
                                fontSize={10}
                                fontFamily='"Space Mono", monospace'
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                                minTickGap={60}
                            />
                            <YAxis
                                stroke="#52525B"
                                fontSize={10}
                                fontFamily='"Space Mono", monospace'
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `$${value}`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#000000',
                                    border: '1px solid #27272A',
                                    borderRadius: '2px',
                                    fontFamily: '"Space Mono", monospace',
                                    fontSize: '12px',
                                    color: '#FFFFFF',
                                }}
                                itemStyle={{ color: '#FFFFFF', fontWeight: 700 }}
                                labelStyle={{ color: '#A1A1AA', marginBottom: '8px' }}
                                cursor={{ stroke: '#27272A', strokeWidth: 1, strokeDasharray: '4 4' }}
                                formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Revenue']}
                            />
                            <Area
                                type="basis"
                                dataKey="total"
                                stroke="#FFFFFF"
                                strokeWidth={1.5}
                                fillOpacity={1}
                                fill="url(#colorTotal)"
                                activeDot={{ r: 4, fill: '#E50000', stroke: '#000000', strokeWidth: 2, style: { filter: 'drop-shadow(0 0 4px rgba(229, 0, 0, 0.5))' } }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </motion.div>
    );
}
