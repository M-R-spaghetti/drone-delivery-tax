import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createOrder } from '../api/orders';
import { Loader2 } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function ManualOrderModal({ isOpen, onClose }: Props) {
    const queryClient = useQueryClient();
    const [lat, setLat] = useState('40.7831');
    const [lon, setLon] = useState('-73.9712');
    const [subtotal, setSubtotal] = useState('100.00');

    // Format current time exactly as YYYY-MM-DD HH:MM:SS
    const formatCurrentTime = () => {
        const d = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    const [timestamp, setTimestamp] = useState(formatCurrentTime());

    // Refresh timestamp each time the modal opens
    useEffect(() => {
        if (isOpen) {
            setTimestamp(formatCurrentTime());
        }
    }, [isOpen]);

    const mutation = useMutation({
        mutationFn: createOrder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            onClose();
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Parse the raw timestamp
        // Replace space with T for valid ISO parsing if needed, but standard Date constructor usually handles 'YYYY-MM-DD HH:MM:SS'
        const parsedDate = new Date(timestamp.replace(' ', 'T'));

        mutation.mutate({
            lat: parseFloat(lat),
            lon: parseFloat(lon),
            subtotal: parseFloat(subtotal),
            timestamp: parsedDate.toISOString(),
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Dark blur backdrop with CRT scanline effect */}
            <div
                className="fixed inset-0 bg-[#000000]/90 backdrop-blur-md transition-opacity duration-300"
                onClick={onClose}
                style={{
                    backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                }}
            />

            {/* Modal Panel - The Override Interface */}
            <div className="relative bg-[#000000] border border-[#FFD700] rounded-none w-full max-w-[600px] mx-4 shadow-[0_0_30px_rgba(255,215,0,0.1)] animate-fade-in-up overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-[#FFD700]/30 bg-[#09090B]">
                    <div className="flex items-center gap-3">
                        <span className="w-2 h-4 bg-[#FFD700] animate-[pulse_2s_infinite] shadow-[0_0_8px_rgba(255,215,0,0.6)]"></span>
                        <h2 className="text-[13px] font-mono font-bold text-[#FFD700] tracking-[0.2em] uppercase drop-shadow-[0_0_5px_rgba(255,215,0,0.4)]">
                            [ SYS.OVERRIDE // MANUAL_DATA_ENTRY ]
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-[10px] font-mono text-[#71717A] tracking-widest hover:text-white transition-colors uppercase cursor-pointer"
                    >
                        [ ESC_ABORT ]
                    </button>
                </div>

                {/* Form Body automatically enforces tight brutalism */}
                <form onSubmit={handleSubmit} className="p-5 lg:p-8 space-y-5 lg:space-y-8 bg-gradient-to-b from-[#050505] to-[#000000] overflow-y-auto custom-scrollbar">
                    {/* Amount Section */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-mono text-[#71717A] tracking-[0.2em] block">
                            {'>'} PARAMETER: GROSS_SUBTOTAL
                        </label>
                        <div className="relative bg-[#050505] border border-zinc-800 transition-all focus-within:border-[#FFD700] focus-within:shadow-[0_0_15px_rgba(255,215,0,0.15),inset_0_0_10px_rgba(255,215,0,0.05)]">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#71717A] font-mono text-xl pointer-events-none select-none">
                                $
                            </div>
                            <input
                                type="number"
                                step="any"
                                min="0"
                                value={subtotal}
                                onChange={(e) => setSubtotal(e.target.value)}
                                required
                                className="w-full pl-10 pr-4 py-4 bg-transparent border-none text-white font-mono text-3xl focus:outline-none rounded-none tracking-wider placeholder:text-zinc-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Location Section */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-mono text-[#71717A] tracking-[0.2em] block">
                                {'>'} PARAMETER: SPATIAL_COORDS
                            </label>
                            <div className="space-y-3">
                                <div className="relative bg-[#050505] border border-zinc-800 transition-all focus-within:border-[#FFD700] focus-within:shadow-[0_0_15px_rgba(255,215,0,0.15),inset_0_0_10px_rgba(255,215,0,0.05)]">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A] font-mono text-[11px] pointer-events-none select-none tracking-widest">
                                        LAT:
                                    </div>
                                    <input
                                        type="number"
                                        step="any"
                                        value={lat}
                                        onChange={(e) => setLat(e.target.value)}
                                        required
                                        className="w-full pl-12 pr-3 py-3 bg-transparent border-none text-white font-mono text-sm focus:outline-none rounded-none tracking-wider [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                </div>
                                <div className="relative bg-[#050505] border border-zinc-800 transition-all focus-within:border-[#FFD700] focus-within:shadow-[0_0_15px_rgba(255,215,0,0.15),inset_0_0_10px_rgba(255,215,0,0.05)]">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A] font-mono text-[11px] pointer-events-none select-none tracking-widest">
                                        LNG:
                                    </div>
                                    <input
                                        type="number"
                                        step="any"
                                        value={lon}
                                        onChange={(e) => setLon(e.target.value)}
                                        required
                                        className="w-full pl-12 pr-3 py-3 bg-transparent border-none text-white font-mono text-sm focus:outline-none rounded-none tracking-wider [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Time Section */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-mono text-[#71717A] tracking-[0.2em] block">
                                {'>'} PARAMETER: TEMPORAL_STAMP
                            </label>
                            <div className="h-full">
                                <div className="relative bg-[#050505] border border-zinc-800 transition-all focus-within:border-[#FFD700] focus-within:shadow-[0_0_15px_rgba(255,215,0,0.15),inset_0_0_10px_rgba(255,215,0,0.05)] h-[116px] flex items-center justify-center p-4">
                                    <input
                                        type="text"
                                        value={timestamp}
                                        onChange={(e) => setTimestamp(e.target.value)}
                                        required
                                        className="w-full bg-transparent border-none text-white font-mono text-lg focus:outline-none rounded-none tracking-widest text-center"
                                        placeholder="YYYY-MM-DD HH:MM:SS"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Error display inline */}
                    {mutation.isError && (
                        <div className="p-3 bg-red-950/30 border border-red-900/50">
                            <p className="text-[11px] text-red-500 font-mono tracking-widest uppercase">
                                [ ERR ] :: {(mutation.error as Error).message}
                            </p>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="pt-8 border-t border-zinc-800 flex flex-col-reverse sm:flex-row gap-4 sm:justify-between items-center">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full sm:w-auto px-6 py-3 bg-transparent border border-dashed border-[#71717A] text-[#71717A] font-mono text-[11px] uppercase tracking-[0.2em] hover:text-white hover:border-white transition-colors focus:outline-none rounded-none cursor-pointer"
                        >
                            {'<'} ABORT_SEQUENCE {'>'}
                        </button>
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="w-full sm:w-auto px-8 py-3 bg-[#FFD700] text-black font-mono font-bold text-[12px] uppercase tracking-[0.2em] hover:brightness-110 transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed group rounded-none"
                            style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
                        >
                            <span className="flex items-center justify-center gap-2">
                                {mutation.isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                                        <span>PROCESSING</span>
                                    </>
                                ) : (
                                    <>
                                        {'>'} EXECUTE_INJECTION
                                    </>
                                )}
                            </span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
