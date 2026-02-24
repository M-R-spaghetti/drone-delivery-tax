import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createOrder } from '../api/orders';
import { X, MapPin, DollarSign, Calendar, Loader2 } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function ManualOrderModal({ isOpen, onClose }: Props) {
    const queryClient = useQueryClient();
    const [lat, setLat] = useState('40.7831');
    const [lon, setLon] = useState('-73.9712');
    const [subtotal, setSubtotal] = useState('100.00');
    const [timestamp, setTimestamp] = useState(
        new Date().toISOString().slice(0, 16)
    );

    const mutation = useMutation({
        mutationFn: createOrder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            onClose();
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({
            lat: parseFloat(lat),
            lon: parseFloat(lon),
            subtotal: parseFloat(subtotal),
            timestamp: new Date(timestamp).toISOString(),
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Dark blur backdrop */}
            <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Modal Panel */}
            <div className="relative bg-[#121214] border border-white/10 rounded-2xl w-full max-w-[420px] shadow-2xl shadow-black/80 animate-fade-in-up overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-white/[0.08]">
                    <h2 className="text-sm font-semibold text-white tracking-tight">Manual Transaction</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-md text-zinc-500 hover:bg-white/10 hover:text-white transition-colors focus:outline-none"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5 relative group">
                            <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest pl-1">
                                Latitude
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-600">
                                    <MapPin className="w-3.5 h-3.5" />
                                </div>
                                <input
                                    type="number"
                                    step="any"
                                    value={lat}
                                    onChange={(e) => setLat(e.target.value)}
                                    required
                                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-black border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-inner"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5 relative group">
                            <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest pl-1">
                                Longitude
                            </label>
                            <input
                                type="number"
                                step="any"
                                value={lon}
                                onChange={(e) => setLon(e.target.value)}
                                required
                                className="w-full px-3 py-2.5 rounded-lg bg-black border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-inner"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5 align-middle">
                        <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest pl-1">
                            Gross Subtotal
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-600">
                                <DollarSign className="w-3.5 h-3.5" />
                            </div>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={subtotal}
                                onChange={(e) => setSubtotal(e.target.value)}
                                required
                                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-black border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-inner"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest pl-1">
                            Timestamp
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-600">
                                <Calendar className="w-3.5 h-3.5" />
                            </div>
                            <input
                                type="datetime-local"
                                value={timestamp}
                                onChange={(e) => setTimestamp(e.target.value)}
                                required
                                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-black border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-inner [&::-webkit-calendar-picker-indicator]:invert-[1] [&::-webkit-calendar-picker-indicator]:opacity-50"
                            />
                        </div>
                    </div>

                    {/* Error display inline */}
                    {mutation.isError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <p className="text-xs text-red-500 font-mono tracking-tight leading-relaxed">
                                {(mutation.error as Error).message}
                            </p>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="pt-4 flex gap-3 border-t border-white/[0.08]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-[0.4] py-2.5 rounded-lg bg-white/5 border border-white/5 text-zinc-300 text-sm font-medium hover:bg-white/10 hover:text-white transition-all active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="flex-1 py-2.5 rounded-lg bg-white text-black text-sm font-bold hover:bg-zinc-200 transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {mutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />
                                    <span>Posting...</span>
                                </>
                            ) : (
                                'Initiate Calculation'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
