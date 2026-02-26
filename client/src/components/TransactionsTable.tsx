import React from 'react';
import { motion } from 'framer-motion';
import { OrderTaxData } from '../types';

interface TransactionsTableProps {
    data: OrderTaxData[];
    delay?: number;
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({ data, delay = 0.5 }) => {
    const recentData = [...data].reverse().slice(0, 8);

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
            className="bg-zinc-950/50 backdrop-blur-xl border border-zinc-900 p-6 w-full"
        >
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h3 className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono mb-1">
                        Transaction Log
                    </h3>
                    <p className="text-xl font-mono text-white">RECENT_DEBITS.STREAM</p>
                </div>
                <div className="text-[8px] font-mono text-zinc-600 mb-1">
                    TOTAL_RECORDS: {data.length}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-zinc-900">
                            <th className="py-3 px-2 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">ID</th>
                            <th className="py-3 px-2 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Jurisdiction</th>
                            <th className="py-3 px-2 text-[10px] font-mono text-zinc-500 uppercase tracking-wider text-right">Tax (%)</th>
                            <th className="py-3 px-2 text-[10px] font-mono text-zinc-500 uppercase tracking-wider text-right">Tax Amt</th>
                            <th className="py-3 px-2 text-[10px] font-mono text-zinc-500 uppercase tracking-wider text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/50">
                        {recentData.map((order) => (
                            <tr key={order.id} className="group hover:bg-zinc-900/40 transition-colors">
                                <td className="py-4 px-2">
                                    <span className="text-xs font-mono text-white tracking-tighter">{order.id}</span>
                                </td>
                                <td className="py-4 px-2">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-zinc-300 uppercase tracking-tight">{order.jurisdictions[0]}</span>
                                        <span className="text-[8px] text-zinc-600 uppercase">{new Date(order.timestamp).toLocaleString()}</span>
                                    </div>
                                </td>
                                <td className="py-4 px-2 text-right">
                                    <span className="text-xs font-mono text-zinc-400">{(order.composite_tax_rate * 100).toFixed(3)}%</span>
                                </td>
                                <td className="py-4 px-2 text-right">
                                    <span className="text-xs font-mono text-pure-red">${order.tax_amount.toFixed(2)}</span>
                                </td>
                                <td className="py-4 px-2 text-right">
                                    <span className="text-xs font-mono text-white font-bold">${order.total_amount.toFixed(2)}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-6 flex justify-center">
                <button className="text-[10px] font-mono text-zinc-500 hover:text-white transition-colors border border-zinc-900 px-4 py-1.5 uppercase tracking-widest">
                    ACCESS_FULL_ARCHIVE
                </button>
            </div>
        </motion.div>
    );
};
