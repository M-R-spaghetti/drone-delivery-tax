import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Log {
    id: string;
    txHash: string;
    amount: number;
    target: string;
    status: 'PENDING' | 'SETTLED' | 'VERIFIED';
}

const TARGETS = [
    'NYS_Treasury_Contract',
    'Kings_County_Reserve',
    'Erie_District_Fund',
    'Monroe_Auto_Clearing',
    'Queens_Municipal_Vault',
];

const SmartContractTerminal = () => {
    const [logs, setLogs] = useState<Log[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Generate initial logs
        const initial: Log[] = Array.from({ length: 5 }).map(() => ({
            id: Math.random().toString(36).substr(2, 9),
            txHash: `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 4)}`,
            amount: Math.floor(Math.random() * 5000) / 100,
            target: TARGETS[Math.floor(Math.random() * TARGETS.length)],
            status: 'VERIFIED'
        }));
        setLogs(initial);

        // Stream new logs
        const interval = setInterval(() => {
            const newLog: Log = {
                id: Math.random().toString(36).substr(2, 9),
                txHash: `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 4)}`,
                amount: Math.floor(Math.random() * 5000) / 100,
                target: TARGETS[Math.floor(Math.random() * TARGETS.length)],
                status: Math.random() > 0.8 ? 'PENDING' : 'SETTLED'
            };

            setLogs(prev => [...prev, newLog].slice(-15)); // Keep last 15
        }, 1800);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="bg-[#09090B]/90 border border-zinc-900 rounded-sm p-4 w-full h-full flex flex-col backdrop-blur-xl shrink-0 shadow-[inset_0_0_20px_rgba(0,255,0,0.02)]"
        >
            <div className="flex justify-between items-center mb-4 border-b border-zinc-900 pb-2">
                <h3 className="text-[#A1A1AA] font-sans text-[10px] tracking-widest uppercase flex items-center gap-2">
                    <span className="text-emerald-500">▶</span> Auto-Settlement Node Logs
                </h3>
                <span className="text-zinc-600 font-mono text-[9px] uppercase tracking-widest">
                    Block: {Math.floor(Math.random() * 1000000 + 15000000)}
                </span>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-hidden font-mono text-[10px] flex flex-col gap-1 tracking-tight"
            >
                <AnimatePresence initial={false}>
                    {logs.map((log) => (
                        <motion.div
                            key={log.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3 py-0.5"
                        >
                            <span className="text-zinc-600">[{new Date().toISOString().split('T')[1].slice(0, 8)}]</span>
                            <span className="text-emerald-500/80 w-16 whitespace-nowrap overflow-hidden text-ellipsis">{log.txHash}</span>
                            <span className="text-zinc-400 font-bold w-12 text-right">${log.amount.toFixed(2)}</span>
                            <span className="text-zinc-500">→</span>
                            <span className="text-zinc-300 w-32 whitespace-nowrap overflow-hidden text-ellipsis">{log.target}</span>
                            <span className={`ml-auto border px-1 ${log.status === 'VERIFIED' ? 'border-zinc-800 text-zinc-500 bg-zinc-900' :
                                log.status === 'SETTLED' ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10' :
                                    'border-amber-500/30 text-amber-500 bg-amber-500/10'
                                }`}>
                                {log.status}
                            </span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default React.memo(SmartContractTerminal);
