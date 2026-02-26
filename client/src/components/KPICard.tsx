import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { ReactNode } from 'react';

interface KPICardProps {
    title: string;
    value: ReactNode;
    subtitle?: string;
    trend?: string;
    trendUp?: boolean;
    delay?: number;
    className?: string;
    highlight?: boolean;
}

export default function KPICard({ title, value, subtitle, trend, trendUp, delay = 0, className, highlight }: KPICardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
                "bg-[#09090B]/80 border backdrop-blur-xl rounded-sm p-6 flex flex-col justify-between transition-colors duration-500",
                highlight ? "border-[#E50000]/50 shadow-[0_0_15px_rgba(229,0,0,0.1)]" : "border-zinc-900",
                className
            )}
        >
            <div className="flex justify-between items-start">
                <h3 className="text-[#A1A1AA] font-sans text-xs tracking-widest uppercase">{title}</h3>
                {trend && (
                    <span className={cn(
                        "font-mono text-[10px] px-2 py-0.5 border",
                        trendUp ? "text-zinc-300 border-zinc-800 bg-zinc-900/50" : "text-[#E50000] border-[#E50000]/30 bg-[#E50000]/10"
                    )}>
                        {trend}
                    </span>
                )}
            </div>
            <div className="mt-8">
                <div className={cn("text-3xl font-mono tracking-tight", highlight ? "text-[#E50000]" : "text-[#FFFFFF]")}>
                    {value}
                </div>
                {subtitle && <p className="text-zinc-500 font-mono text-[10px] mt-2 uppercase">{subtitle}</p>}
            </div>
        </motion.div>
    );
}
