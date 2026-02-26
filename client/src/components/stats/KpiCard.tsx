import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface KpiCardProps {
    title: string;
    value: number;
    prefix?: string;
    icon: React.ReactNode;
    trend: string;
    trendUp: boolean;
    color: 'emerald' | 'blue' | 'purple' | 'pink';
}

export default function KpiCard({ title, value, prefix = '', icon, trend, trendUp, color }: KpiCardProps) {
    const [displayValue, setDisplayValue] = useState(0);

    // Simple number counter animation
    useEffect(() => {
        let start = 0;
        const end = value;
        if (start === end) return;

        const totalDuration = 1000;
        const incrementTime = 16; // ~60fps
        const steps = totalDuration / incrementTime;
        const increment = end / steps;

        const timer = setInterval(() => {
            start += increment;
            if (start >= end) {
                setDisplayValue(end);
                clearInterval(timer);
            } else {
                setDisplayValue(start);
            }
        }, incrementTime);

        return () => clearInterval(timer);
    }, [value]);

    const formattedValue = displayValue.toLocaleString(undefined, {
        minimumFractionDigits: value % 1 !== 0 ? 2 : 0,
        maximumFractionDigits: 2
    });

    const glowColors = {
        emerald: 'shadow-[0_0_15px_rgba(52,211,153,0.15)] border-emerald-500/20',
        blue: 'shadow-[0_0_15px_rgba(59,130,246,0.15)] border-blue-500/20',
        purple: 'shadow-[0_0_15px_rgba(168,85,247,0.15)] border-purple-500/20',
        pink: 'shadow-[0_0_15px_rgba(236,72,153,0.15)] border-pink-500/20',
    };

    const iconBgColors = {
        emerald: 'bg-emerald-500/10',
        blue: 'bg-blue-500/10',
        purple: 'bg-purple-500/10',
        pink: 'bg-pink-500/10',
    };

    return (
        <motion.div
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className={`bg-[#0c0c0e] border ${glowColors[color]} rounded-2xl p-5 relative overflow-hidden group`}
        >
            <div className="flex justify-between items-start mb-4 relative z-10">
                <h3 className="text-zinc-400 text-sm font-medium tracking-wide">{title}</h3>
                <div className={`p-2 rounded-lg ${iconBgColors[color]} flex items-center justify-center`}>
                    {icon}
                </div>
            </div>

            <div className="relative z-10">
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white tracking-tight">
                        {prefix}{formattedValue}
                    </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${trendUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {trend}
                    </span>
                    <span className="text-xs text-zinc-500">vs last month</span>
                </div>
            </div>

            {/* Background Glow Effect */}
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/5 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-700 ease-out" />
        </motion.div>
    );
}
