import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import { OrderTaxData } from '../types';

interface TransactionsTableProps {
    data: OrderTaxData[];
}

// Scrambler component for matrix effect
const ScrambledText = React.memo(({ text }: { text: string }) => {
    const [displayText, setDisplayText] = useState('');

    useEffect(() => {
        let iterations = 0;
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*';
        setDisplayText(text.replace(/./g, () => chars[Math.floor(Math.random() * chars.length)]));

        const interval = setInterval(() => {
            setDisplayText(prev =>
                prev.split('').map((_char, index) => {
                    if (index < iterations) return text[index];
                    return chars[Math.floor(Math.random() * chars.length)];
                }).join('')
            );

            if (iterations >= text.length) clearInterval(interval);
            iterations += 1 / 3;
        }, 20);

        return () => clearInterval(interval);
    }, [text]);

    return <span>{displayText}</span>;
});

const TransactionsTable = ({ data }: TransactionsTableProps) => {
    // Take initial top 6
    const [orders, setOrders] = useState<OrderTaxData[]>(data.slice(0, 6));

    // Simulate WebSocket streaming new orders
    useEffect(() => {
        const interval = setInterval(() => {
            const lat = 40.5 + Math.random() * 4.5;
            const lng = -79.0 + Math.random() * 7.1;
            const subtotal = Math.floor(Math.random() * 50000) / 100 + 10;

            const state_rate = 0.04;
            const county_rate = Math.random() > 0.5 ? 0.04 : 0.03;
            const city_rate = Math.random() > 0.7 ? 0.00875 : 0;
            const special_rates = Math.random() > 0.8 ? 0.00375 : 0;

            const composite = state_rate + county_rate + city_rate + special_rates;
            const tax = parseFloat((subtotal * composite).toFixed(2));

            const newOrder: OrderTaxData = {
                id: `TRX-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
                latitude: lat,
                longitude: lng,
                subtotal,
                timestamp: new Date().toISOString(),
                composite_tax_rate: parseFloat(composite.toFixed(5)),
                tax_amount: tax,
                total_amount: parseFloat((subtotal + tax).toFixed(2)),
                breakdown: { state_rate, county_rate, city_rate, special_rates },
                jurisdictions: ['New York State']
            };

            setOrders(prev => [newOrder, ...prev].slice(0, 6));
        }, 2500); // New order every 2.5s

        return () => clearInterval(interval);
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="bg-[#09090B]/80 border border-zinc-900 rounded-sm p-6 w-full h-full flex flex-col backdrop-blur-xl shrink-0 border-t-[#E50000]/20"
        >
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-[#A1A1AA] font-sans text-xs tracking-widest uppercase">Ledger Stream</h3>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#E50000] animate-pulse-glow" />
                    <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest">Live Sync wss://</span>
                </div>
            </div>

            <div className="overflow-hidden flex-1 min-h-0 relative">
                <table className="w-full text-left border-collapse whitespace-nowrap table-fixed">
                    <thead>
                        <tr className="border-b border-zinc-800 text-zinc-500 font-sans text-[10px] uppercase tracking-widest">
                            <th className="py-3 px-2 md:px-4 font-normal">Txn Hash</th>
                            <th className="py-3 px-2 md:px-4 font-normal">Timestamp</th>
                            <th className="py-3 px-2 md:px-4 font-normal text-right">Rate</th>
                            <th className="py-3 px-2 md:px-4 font-normal text-right">Tax Yield</th>
                            <th className="py-3 px-2 md:px-4 font-normal text-right">Cleared</th>
                        </tr>
                    </thead>
                    <tbody className="font-mono text-[11px] relative">
                        <AnimatePresence initial={false} mode="popLayout">
                            {orders.map((order) => (
                                <motion.tr
                                    layout
                                    key={order.id}
                                    initial={{ opacity: 0, y: -20, backgroundColor: '#18181B' }}
                                    animate={{ opacity: 1, y: 0, backgroundColor: 'transparent' }}
                                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                                    transition={{ duration: 0.4, ease: "easeOut" }}
                                    className="border-b border-zinc-900/50 hover:bg-zinc-900/30 transition-colors"
                                >
                                    <td className="py-3 px-2 md:px-4 text-zinc-400">
                                        <ScrambledText text={order.id} />
                                    </td>
                                    <td className="py-3 px-2 md:px-4 text-zinc-500">
                                        {new Date(order.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </td>
                                    <td className="py-3 px-2 md:px-4 text-right">
                                        <span className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded-sm inline-block">
                                            {(order.composite_tax_rate * 100).toFixed(3)}%
                                        </span>
                                    </td>
                                    <td className="py-3 px-2 md:px-4 text-right text-zinc-400">
                                        ${order.tax_amount.toFixed(2)}
                                    </td>
                                    <td className="py-3 px-2 md:px-4 text-right text-[#FFFFFF] font-bold">
                                        ${order.total_amount.toFixed(2)}
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>
        </motion.div>
    );
};

export default React.memo(TransactionsTable);
