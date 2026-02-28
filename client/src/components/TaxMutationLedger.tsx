import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Database, History, RotateCcw } from 'lucide-react';

interface TaxLedgerEntry {
    rate_id: string;
    jurisdiction_name: string;
    type: string;
    rate: string;
    previous_rate?: string | null;
    valid_from: string;
    valid_to: string | null;
}

export function TaxMutationLedger() {
    const queryClient = useQueryClient();

    // We'll fetch all historical rates using a new endpoint `getTaxLedger` 
    // For now we'll query `/tax-ledger`
    const { data: ledger, isLoading } = useQuery<TaxLedgerEntry[]>({
        queryKey: ['taxLedger'],
        queryFn: async () => {
            const res = await fetch('http://localhost:3000/api/admin/tax-ledger');
            if (!res.ok) throw new Error('Failed to fetch ledger');
            return res.json();
        }
    });

    const [revertingId, setRevertingId] = useState<string | null>(null);

    const revertMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`http://localhost:3000/api/admin/tax-ledger/${id}/revert`, { method: 'DELETE' });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to revert');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['taxLedger'] });
            queryClient.invalidateQueries({ queryKey: ['taxRates'] });
        },
        onSettled: () => setRevertingId(null)
    });

    if (isLoading) return <div className="h-80 bg-[#09090B] animate-pulse border border-[#71717A] relative z-10" />;

    return (
        <div className="bg-[#000000]/80 backdrop-blur-md border border-[#71717A] overflow-hidden rounded-none shadow-[0_0_40px_rgba(0,0,0,0.8)] relative z-10 flex flex-col group mt-10">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#71717A] group-hover:bg-[#FFD700] transition-colors duration-500" />
            <div className="p-6 border-b border-[#71717A] bg-[#09090B] flex justify-between items-center pl-8">
                <h3 className="flex items-center gap-3 text-base font-bold tracking-[0.2em] text-[#FFD700] font-mono uppercase drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]">
                    <History className="w-5 h-5" /> {'>'} SYSTEM_MUTATION_LOG // AUDIT_TRAIL
                </h3>
                <span className="text-xs font-mono text-[#71717A] uppercase tracking-[0.3em] bg-[#71717A]/10 px-3 py-1 border border-[#71717A]/30 flex items-center gap-2">
                    <Database className="w-3 h-3" /> IMMUTABLE_LEDGER
                </span>
            </div>
            <div className="overflow-x-auto h-[400px] scrollbar-thin scrollbar-thumb-[#71717A] scrollbar-track-black">
                <table className="w-full text-left border-collapse">
                    <thead className="text-[10px] uppercase text-[#71717A] font-mono tracking-[0.2em] bg-[#09090B] sticky top-0 border-b border-[#71717A]/50 z-10 shadow-md">
                        <tr>
                            <th className="px-6 py-4 font-normal pl-8">HASH</th>
                            <th className="px-6 py-4 font-normal">JURISDICTION</th>
                            <th className="px-6 py-4 font-normal">DELTA</th>
                            <th className="px-6 py-4 font-normal">TIMESTAMP</th>
                            <th className="px-6 py-4 font-normal text-right">ACTION</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#71717A]/20">
                        {ledger?.map((entry) => {
                            const hash = Array.from(entry.rate_id).map(c => c.charCodeAt(0).toString(16)).join('').substring(0, 10);
                            const isActive = entry.valid_to === null;
                            const rateVal = (parseFloat(entry.rate) * 100).toFixed(3);
                            const prevRateVal = entry.previous_rate ? (parseFloat(entry.previous_rate) * 100).toFixed(3) : '0.000';

                            return (
                                <tr key={entry.rate_id} className="hover:bg-[#FFD700]/5 hover:shadow-[inset_4px_0_0_0_#FFD700] transition-all group/row">
                                    <td className="px-6 py-4 pl-8">
                                        <div className="text-xs text-[#71717A] font-mono tracking-widest">
                                            0x{hash}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-mono text-white text-sm whitespace-nowrap tracking-wider uppercase">
                                            {entry.jurisdiction_name}
                                        </div>
                                        <div className="text-[10px] text-[#71717A] font-mono mt-1 tracking-[0.2em] uppercase">
                                            [{entry.type}]
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-sm tracking-widest whitespace-nowrap">
                                        <span className="text-[#71717A]">{prevRateVal}%</span>
                                        <span className="text-[#FFD700] mx-2 animate-pulse">-&gt;</span>
                                        <span className={isActive ? "text-white" : "text-[#71717A]"}>{rateVal}%</span>
                                        {isActive && (
                                            <span className="ml-3 text-[9px] text-black bg-[#FFD700] px-1.5 py-0.5 font-bold uppercase tracking-widest">
                                                HEAD
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-[11px] text-[#71717A] font-mono whitespace-nowrap uppercase tracking-widest">
                                        {new Date(entry.valid_from).toISOString().replace('T', ' ').substring(0, 19)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {isActive ? (
                                            <button
                                                onClick={() => {
                                                    if (confirm(`INITIATE REVERT ON 0x${hash}? THIS WILL RESTORE PREVIOUS TAX RATE.`)) {
                                                        setRevertingId(entry.rate_id);
                                                        revertMutation.mutate(entry.rate_id);
                                                    }
                                                }}
                                                disabled={revertingId === entry.rate_id}
                                                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-transparent text-[#71717A] border border-dashed border-[#71717A] hover:bg-[#FFD700] hover:text-black hover:border-[#FFD700] hover:shadow-[0_0_15px_rgba(255,215,0,0.5)] font-mono text-[10px] uppercase font-bold transition-all disabled:opacity-50 rounded-none cursor-pointer tracking-widest"
                                            >
                                                {revertingId === entry.rate_id ? <History className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                                                [ REVERT_COMMIT ]
                                            </button>
                                        ) : (
                                            <span className="text-[10px] text-[#71717A] font-mono uppercase tracking-widest opacity-50">
                                                OVERWRITTEN
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {ledger?.length === 0 && (
                            <tr><td colSpan={5} className="px-6 py-12 text-center text-[#71717A] font-mono text-xs uppercase tracking-[0.5em] bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.02)_10px,rgba(255,255,255,0.02)_20px)]">NO_MUTATIONS_FOUND</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
