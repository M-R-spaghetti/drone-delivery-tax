import React from 'react';
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    ZAxis,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { motion } from 'framer-motion';
import { OrderTaxData } from '../types';

interface NYGeoScatterProps {
    data: OrderTaxData[];
    delay?: number;
}

export const NYGeoScatter: React.FC<NYGeoScatterProps> = ({ data, delay = 0.4 }) => {
    // Mapping longitude to X and latitude to Y
    const chartData = data.map(item => ({
        x: item.longitude,
        y: item.latitude,
        z: item.total_amount,
        id: item.id
    }));

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
            className="bg-zinc-950/50 backdrop-blur-xl border border-zinc-900 p-6 h-[400px] w-full"
        >
            <div className="mb-8">
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono mb-1">
                    Geographic Distribution
                </h3>
                <p className="text-xl font-mono text-white">NY.DRONE_DELIVERY.GRID</p>
            </div>

            <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <XAxis
                        type="number"
                        dataKey="x"
                        hide
                        domain={[-79.0, -71.9]}
                    />
                    <YAxis
                        type="number"
                        dataKey="y"
                        hide
                        domain={[40.5, 45.0]}
                    />
                    <ZAxis type="number" dataKey="z" range={[20, 200]} />
                    <Tooltip
                        cursor={{ strokeDasharray: '3 3', stroke: '#27272A' }}
                        contentStyle={{
                            backgroundColor: '#000000',
                            border: '1px solid #27272A',
                            borderRadius: '0px',
                            fontFamily: 'Space Mono'
                        }}
                        itemStyle={{ fontSize: '10px', textTransform: 'uppercase' }}
                    />
                    <Scatter name="Deliveries" data={chartData} fill="#52525B">
                        {chartData.map((_entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={index % 10 === 0 ? '#E50000' : (index % 3 === 0 ? '#FFFFFF' : '#3F3F46')}
                            />
                        ))}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>

            <div className="absolute top-6 right-6 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-pure-red animate-pulse" />
                <span className="text-[8px] font-mono text-zinc-400 uppercase tracking-[0.2em]">LIVE_FEED_ACTIVE</span>
            </div>
        </motion.div>
    );
};
