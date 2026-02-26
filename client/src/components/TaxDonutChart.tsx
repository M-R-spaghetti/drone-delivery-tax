import React from 'react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip
} from 'recharts';
import { motion } from 'framer-motion';
import { OrderTaxData } from '../types';

interface TaxDonutChartProps {
    data: OrderTaxData[];
    delay?: number;
}

export const TaxDonutChart: React.FC<TaxDonutChartProps> = ({ data, delay = 0.3 }) => {
    // Aggregate breakdown from all orders
    const totals = data.reduce((acc, curr) => {
        acc.state += curr.breakdown.state_rate;
        acc.county += curr.breakdown.county_rate;
        acc.city += curr.breakdown.city_rate;
        acc.special += curr.breakdown.special_rates;
        return acc;
    }, { state: 0, county: 0, city: 0, special: 0 });

    const chartData = [
        { name: 'STATE RATE', value: totals.state },
        { name: 'COUNTY RATE', value: totals.county },
        { name: 'CITY RATE', value: totals.city },
        { name: 'SPECIAL RATE', value: totals.special },
    ].sort((a, b) => b.value - a.value);

    const COLORS = ['#E50000', '#FFFFFF', '#A1A1AA', '#52525B'];

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
            className="bg-zinc-950/50 backdrop-blur-xl border border-zinc-900 p-6 h-[400px] w-full"
        >
            <div className="mb-4">
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono mb-1">
                    Tax Distribution
                </h3>
                <p className="text-xl font-mono text-white">JURISDICTIONAL BREAKDOWN</p>
            </div>

            <ResponsiveContainer width="100%" height="70%">
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                    >
                        {chartData.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#000000',
                            border: '1px solid #27272A',
                            borderRadius: '0px',
                            fontFamily: 'Space Mono'
                        }}
                        itemStyle={{ fontSize: '10px', textTransform: 'uppercase' }}
                    />
                </PieChart>
            </ResponsiveContainer>

            <div className="grid grid-cols-2 gap-4 mt-4">
                {chartData.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider">{item.name}</span>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};
