import { useState, useRef, useEffect } from 'react';
import type { Order } from '../api/orders';
import { Receipt } from 'lucide-react';

interface Props {
    breakdown: Order['breakdown'];
    jurisdictions: Order['jurisdictions_applied'];
}

export default function TaxBreakdownPopover({ breakdown, jurisdictions }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const formatRate = (rate: string | null) => {
        if (!rate) return '0.0000%';
        return `${(parseFloat(rate) * 100).toFixed(4)}%`;
    };

    const items = [
        { label: 'State Level', rate: breakdown.state_rate },
        { label: 'County Level', rate: breakdown.county_rate },
        { label: 'City Level', rate: breakdown.city_rate },
        { label: 'MCTD Surcharge', rate: breakdown.special_rate },
    ];

    return (
        <div className="relative inline-block" ref={popoverRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-1.5 rounded-md transition-all duration-200 outline-none ${isOpen
                    ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/50'
                    : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300'
                    }`}
                title="View Receipt"
            >
                <Receipt className="w-4 h-4" />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-10 z-50 w-[300px] bg-[#121214] border border-white/10 rounded-2xl p-5 shadow-[0_30px_60px_rgba(0,0,0,0.8)] animate-fade-in-up font-mono text-left backdrop-blur-3xl">
                    {/* Glowing Accent */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-white/0 via-white/20 to-white/0" />

                    {/* Receipt Header */}
                    <div className="text-center pb-4 border-b border-white/10 mb-4">
                        <div className="mx-auto w-8 h-8 rounded-full bg-black border border-white/10 flex items-center justify-center mb-2 shadow-inner">
                            <Receipt className="w-3.5 h-3.5 text-zinc-400" />
                        </div>
                        <h4 className="text-[11px] font-semibold text-white uppercase tracking-[0.2em]">Tax Apportionment</h4>
                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1">Audit Trail</p>
                    </div>

                    {/* Rates list */}
                    <div className="space-y-3 mb-5">
                        {items.map((item) => (
                            <div key={item.label} className="flex items-end justify-between text-[11px]">
                                <span className="text-zinc-400 tracking-wide font-medium">{item.label}</span>
                                <div className="flex-1 border-b border-dashed border-zinc-700/50 mx-2 mb-1" />
                                <span className={`font-medium tabular-nums ${item.rate && parseFloat(item.rate) > 0 ? 'text-zinc-100' : 'text-zinc-600'}`}>
                                    {formatRate(item.rate)}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Applied Jurisdictions */}
                    {jurisdictions && jurisdictions.length > 0 && (
                        <div className="pt-4 border-t border-white/10 bg-transparent">
                            <h5 className="text-[9px] text-zinc-500 uppercase tracking-widest mb-2.5">
                                Active Geofences
                            </h5>
                            <div className="space-y-1.5 border border-white/5 bg-black/50 p-3 rounded-lg">
                                {jurisdictions.map((j, idx) => (
                                    <div key={idx} className="text-[10px] text-zinc-400 leading-tight flex items-start">
                                        <span className="text-blue-500 mr-2 mt-[1px] text-[8px]">●</span>
                                        <span className="tracking-wide">{j.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
