import { motion } from 'framer-motion';
import { Hexagon } from 'lucide-react';

interface TopTransactionsProps {
    transactions: Array<{ order_id: string; amount: number; city: string; timestamp: string }>;
}

export default function TopTransactions({ transactions }: TopTransactionsProps) {
    if (!transactions || transactions.length === 0) return null;

    return (
        <motion.div
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            className="bg-[#0c0c0e] border border-white/[0.05] rounded-2xl p-6 h-full relative overflow-hidden"
        >
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white tracking-tight">Largest Orders</h3>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Live</span>
                </div>
            </div>

            <div className="space-y-4">
                {transactions.map((t, index) => (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        key={t.order_id}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.02] hover:bg-white/[0.04] transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center flex-shrink-0 group-hover:border-zinc-700 transition-colors">
                                <Hexagon className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
                            </div>
                            <div>
                                <div className="text-sm font-medium text-zinc-200">Order #{t.order_id}</div>
                                <div className="text-xs text-zinc-500 flex items-center gap-1.5 mt-0.5">
                                    <span>{t.city}</span>
                                    <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                                    <span>Delivered</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-bold text-emerald-400">
                                ${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Ambient Background Glow */}
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
        </motion.div>
    );
}
