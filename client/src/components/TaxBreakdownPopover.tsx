import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Order } from '../api/orders';
import { Receipt, Network } from 'lucide-react';

interface Props {
    breakdown: Order['breakdown'];
    jurisdictions: Order['jurisdictions_applied'];
}

export default function TaxBreakdownPopover({ breakdown, jurisdictions }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Recalculate position whenever it opens or window scrolls/resizes
    useEffect(() => {
        if (!isOpen) return;

        const reposition = () => {
            if (!buttonRef.current) return;
            const rect = buttonRef.current.getBoundingClientRect();
            const popoverWidth = 320;
            const left = Math.min(rect.right - popoverWidth, window.innerWidth - popoverWidth - 8);
            setPos({ top: rect.bottom + 8, left: Math.max(8, left) });
        };

        reposition();
        window.addEventListener('scroll', reposition, true);
        window.addEventListener('resize', reposition);
        return () => {
            window.removeEventListener('scroll', reposition, true);
            window.removeEventListener('resize', reposition);
        };
    }, [isOpen]);

    // Click outside to close
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent) => {
            if (
                popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
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
        <div className="relative inline-block">
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(v => !v)}
                className={`p-1.5 rounded-none transition-all duration-200 outline-none border ${isOpen
                    ? 'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700] shadow-[0_0_10px_rgba(255,215,0,0.3)]'
                    : 'bg-black text-zinc-500 border-zinc-700 hover:bg-[#FFD700]/5 hover:border-[#FFD700]/50 hover:text-[#FFD700]'
                    } [clip-path:polygon(0_0,calc(100%-4px)_0,100%_4px,100%_100%,4px_100%,0_calc(100%-4px))]`}
                title="View Receipt"
            >
                <Receipt className={`w-4 h-4 ${isOpen ? 'animate-pulse' : ''}`} />
            </button>

            {isOpen && createPortal(
                <div
                    ref={popoverRef}
                    style={{ position: 'fixed', top: pos.top, left: pos.left, width: 320, zIndex: 9999 }}
                    className="bg-black border border-zinc-800 border-t-[#FFD700] p-5 shadow-[0_30px_60px_rgba(0,0,0,0.95)] animate-fade-in-up font-mono text-left [clip-path:polygon(0_0,100%_0,100%_calc(100%-12px),calc(100%-12px)_100%,0_100%)] cursor-default"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Glowing Accent */}
                    <div className="absolute top-0 right-0 w-8 h-[2px] bg-[#FFD700] shadow-[0_0_10px_rgba(255,215,0,0.8)]" />

                    {/* Receipt Header */}
                    <div className="pb-3 border-b border-dashed border-zinc-800 mb-4 flex items-center justify-between">
                        <div>
                            <h4 className="text-[12px] font-bold text-[#FFD700] uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-[#FFD700] animate-pulse" />
                                TAX_APPORTIONMENT
                            </h4>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">SYS.AUDIT_TRAIL</p>
                        </div>
                        <Receipt className="w-6 h-6 text-zinc-700" />
                    </div>

                    {/* Rates list */}
                    <div className="space-y-3 mb-5">
                        {items.map((item) => (
                            <div key={item.label} className="flex items-end justify-between text-[11px] group/item">
                                <span className="text-zinc-400 tracking-wide font-medium group-hover/item:text-[#FFD700] transition-colors">{item.label}</span>
                                <div className="flex-1 border-b border-dashed border-zinc-800 mx-2 mb-1 group-hover/item:border-[#FFD700]/30 transition-colors" />
                                <span className={`font-medium tabular-nums ${item.rate && parseFloat(item.rate) > 0 ? 'text-white drop-shadow-[0_0_3px_rgba(255,255,255,0.4)]' : 'text-zinc-600'}`}>
                                    {formatRate(item.rate)}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Applied Jurisdictions */}
                    {jurisdictions && jurisdictions.length > 0 && (
                        <div className="pt-4 border-t border-dashed border-zinc-800 bg-transparent">
                            <h5 className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Network className="w-3 h-3" />
                                ACTIVE_GEOFENCES
                            </h5>
                            <div className="space-y-1.5 border border-zinc-800 bg-[#030303] p-3 rounded-none [clip-path:polygon(0_0,calc(100%-6px)_0,100%_6px,100%_100%,0_100%)]">
                                {jurisdictions.map((j, idx) => (
                                    <div key={idx} className="text-[10px] text-zinc-400 flex items-start group/geo hover:bg-[#FFD700]/5 hover:text-white px-1 py-0.5 transition-colors">
                                        <span className="text-[#FFD700] mr-2 mt-[1.5px] text-[8px] animate-pulse">■</span>
                                        <span className="tracking-wide uppercase leading-tight">{j.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
}
