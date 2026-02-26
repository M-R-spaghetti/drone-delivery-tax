import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { motion } from 'framer-motion';
import { OrderTaxData } from '../types';

interface DashboardChartProps {
    data: OrderTaxData[];
    delay?: number;
}

export const DashboardChart: React.FC<DashboardChartProps> = ({ data, delay = 0.2 }) => {
    const chartData = data.map(item => ({
        time: new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        amount: item.total_amount,
        tax: item.tax_amount
    }));

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
            className="bg-zinc-950/50 backdrop-blur-xl border border-zinc-900 p-6 h-[400px] w-full"
        >
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h3 className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono mb-1">
                        Revenue Analytics
                    </h3>
                    <p className="text-xl font-mono text-white">30D PERFORMANCE</p>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-none bg-white" />
                        <span className="text-[10px] font-mono text-zinc-400">TOTAL</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-none bg-pure-red" />
                        <span className="text-[10px] font-mono text-zinc-400">TAX</span>
                    </div>
                </div>
            </div>

            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 50 }}>
                    <defs>
                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorTax" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#E50000" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#E50000" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#18181B" strokeDasharray="3 3" />
                    <XAxis
                        dataKey="time"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#52525B', fontSize: 10, fontFamily: 'Space Mono' }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#52525B', fontSize: 10, fontFamily: 'Space Mono' }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#000000',
                            border: '1px solid #27272A',
                            borderRadius: '0px',
                            fontFamily: 'Space Mono'
                        }}
                        itemStyle={{ fontSize: '10px', textTransform: 'uppercase' }}
                        cursor={{ stroke: '#52525B', strokeWidth: 1 }}
                    />
                    <Area
                        type="monotone"
                        dataKey="amount"
                        stroke="#FFFFFF"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorAmount)"
                        activeDot={{ r: 4, fill: '#E50000', strokeWidth: 0 }}
                    />
                    <Area
                        type="monotone"
                        dataKey="tax"
                        stroke="#E50000"
                        strokeWidth={1}
                        fillOpacity={1}
                        fill="url(#colorTax)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </motion.div>
    );
};
