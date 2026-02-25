import React, { useState, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { importCsv } from '../api/orders';
import { UploadCloud, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CsvUpload() {
    const queryClient = useQueryClient();
    const [isDragOver, setIsDragOver] = useState(false);
    const [result, setResult] = useState<{ imported: number; errors: number } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const mutation = useMutation({
        mutationFn: importCsv,
        onSuccess: (data) => {
            setResult({ imported: data.imported, errors: data.errors });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        },
    });

    const handleFile = useCallback(
        (file: File) => {
            setResult(null);
            mutation.mutate(file);
        },
        [mutation]
    );

    const onDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragOver(false);
            if (mutation.isPending) return;
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
        },
        [handleFile, mutation.isPending]
    );

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (!mutation.isPending) setIsDragOver(true);
    }, [mutation.isPending]);

    const onDragLeave = useCallback(() => {
        setIsDragOver(false);
    }, []);

    const onFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
        },
        [handleFile]
    );

    return (
        <div className="animate-fade-in-up h-full flex flex-col items-center justify-center -mt-10">
            {/* Context Header */}
            <div className="text-center mb-10 max-w-lg">
                <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-2xl bg-white/[0.04] border border-white/10 mb-5 shadow-2xl">
                    <UploadCloud className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight text-white mb-2">Ingest Ledger Data</h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                    Upload geospatial tax records in bulk. Our PostGIS engine will automatically calculate precision composite rates bounded by NYS regions.
                </p>
            </div>

            {/* Cinematic Drop Zone */}
            <div className="w-full max-w-2xl relative group">
                {/* Glow Behind */}
                <div className={`absolute -inset-1 blur-xl opacity-0 transition-opacity duration-500 rounded-3xl z-0 ${isDragOver && !mutation.isPending ? 'opacity-100 bg-blue-500/20' : ''}`} />

                <div
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onClick={() => !mutation.isPending && fileRef.current?.click()}
                    className={`relative z-10 w-full rounded-2xl p-12 text-center transition-all duration-300 ease-out cursor-pointer overflow-hidden backdrop-blur-xl ${mutation.isPending
                        ? 'border border-white/5 bg-white/[0.01] cursor-not-allowed'
                        : isDragOver
                            ? 'border border-blue-500/50 bg-blue-500/[0.05] shadow-[0_0_30px_rgba(59,130,246,0.1)] scale-[1.02]'
                            : 'border border-dashed border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20'
                        }`}
                >
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={onFileChange}
                        disabled={mutation.isPending}
                    />

                    {mutation.isPending ? (
                        <div className="flex flex-col items-center py-6 animate-pulse-glow">
                            <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden mb-6 relative">
                                <div className="absolute top-0 bottom-0 w-1/2 bg-blue-500 rounded-full animate-progress" />
                            </div>
                            <p className="text-blue-400 font-medium tracking-tight">Geolocating records...</p>
                            <p className="text-xs text-zinc-500 mt-2 font-mono uppercase tracking-widest">Executing PostGIS boundaries</p>
                        </div>
                    ) : (
                        <div className="py-6 flex flex-col items-center">
                            <div className={`p-4 rounded-full transition-colors duration-300 mb-4 ${isDragOver ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-zinc-400 group-hover:bg-white/10 group-hover:text-zinc-300'}`}>
                                <UploadCloud className="w-6 h-6" />
                            </div>
                            <p className="text-sm font-medium text-white mb-1">
                                Drag & drop CSV payload, or <span className="text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-4 pointer-events-auto">browse files</span>
                            </p>
                            <p className="text-xs text-zinc-500 font-mono tracking-wide mt-2">
                                lat, lon, subtotal, timestamp
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Results Toast */}
            {result && (
                <div className="mt-8 animate-fade-in-up">
                    <div className="px-6 py-4 rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-xl flex items-center gap-4 shadow-xl">
                        {result.errors > 0 ? (
                            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                        ) : (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        )}
                        <div className="flex-1">
                            <h3 className={`text-sm font-medium ${result.errors > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                Processing Executed
                            </h3>
                            <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono mt-1">
                                <span>Parsed: <strong className="text-white bg-white/10 px-1 py-0.5 rounded">{result.imported}</strong></span>
                                {result.errors > 0 && (
                                    <span>Failed: <strong className="text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/20">{result.errors}</strong></span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Toast */}
            {mutation.isError && (
                <div className="mt-8 animate-fade-in-up max-w-lg w-full">
                    <div className="rounded-xl p-4 bg-red-500/10 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)] flex items-start gap-3 backdrop-blur-md">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-semibold text-red-500 tracking-tight">System Exception</h3>
                            <p className="text-xs text-red-400/80 mt-1 font-mono break-all leading-relaxed">
                                {(mutation.error as Error).message}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
