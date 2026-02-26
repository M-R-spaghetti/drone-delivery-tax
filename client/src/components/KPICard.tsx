import React from 'react';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface KPICardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: {
        value: string;
        isPositive: boolean;
    };
    className?: string;
    delay?: number;
}

export const KPICard: React.FC<KPICardProps> = ({
    title,
    value,
    subtitle,
    trend,
    className,
    delay = 0
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
                "relative overflow-hidden group",
                "bg-zinc-950/50 backdrop-blur-xl",
                "border border-zinc-900",
                "p-6 rounded-none",
                "flex flex-col gap-2",
                className
            )}
        >
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono">
                {title}
            </span>

            <div className="flex items-baseline gap-2">
                <h2 className="text-3xl font-mono font-bold tracking-tight text-white tabular-nums">
                    {value}
                </h2>
                {trend && (
                    <span className={cn(
                        "text-[10px] font-mono px-1.5 py-0.5 rounded-none border",
                        trend.isPositive ? "text-white border-zinc-800 bg-zinc-900" : "text-pure-red border-pure-red/20 bg-pure-red/5"
                    )}>
                        {trend.value}
                    </span>
                )}
            </div>

            {subtitle && (
                <p className="text-xs text-zinc-400 mt-1 uppercase tracking-wider">
                    {subtitle}
                </p>
            )}

            <div className="absolute bottom-1 right-2 opacity-10 pointer-events-none">
                <span className="text-[8px] font-mono uppercase tracking-tighter">SEC_TYPE_ALPHA</span>
            </div>
        </motion.div>
    );
};
