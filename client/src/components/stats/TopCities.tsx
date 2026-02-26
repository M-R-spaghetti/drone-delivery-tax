import { motion } from 'framer-motion';

interface TopCitiesProps {
    cities: Array<{ city: string; orders: number; revenue: number }>;
}

export default function TopCities({ cities }: TopCitiesProps) {
    if (!cities || cities.length === 0) return null;

    const maxOrders = Math.max(...cities.map(c => c.orders));

    return (
        <motion.div
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            className="bg-[#0c0c0e] border border-white/[0.05] rounded-2xl p-6 relative overflow-hidden"
        >
            <h3 className="text-lg font-semibold text-white mb-6 tracking-tight">Top Active Cities</h3>

            <div className="space-y-5">
                {cities.map((item, index) => {
                    const percentage = (item.orders / maxOrders) * 100;
                    return (
                        <div key={item.city || index} className="relative">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-sm font-medium text-zinc-200">{item.city || 'Unknown'}</span>
                                <div className="text-right">
                                    <span className="text-sm font-bold text-white block">{item.orders.toLocaleString()} <span className="text-zinc-500 font-normal text-xs">orders</span></span>
                                    <span className="text-xs text-emerald-400 font-medium">${item.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>

                            {/* Progress bar background */}
                            <div className="h-2 w-full bg-white/[0.03] rounded-full overflow-hidden">
                                {/* Animated solid fill */}
                                <motion.div
                                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full relative"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    transition={{ duration: 1, delay: index * 0.1, ease: 'easeOut' }}
                                >
                                    {/* Shimmer effect over the bar */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-progress" />
                                </motion.div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
        </motion.div>
    );
}
