import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { importCsv } from '../api/orders';

const DataCoreIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="1" />
        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="1" />
        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="1" />
        <path d="M12 22V12" stroke="currentColor" strokeWidth="1" />
    </svg>
);

function RandomString() {
    const [str, setStr] = useState('');
    useEffect(() => {
        const interval = setInterval(() => {
            const chars = '0123456789ABCDEF!@#$%^&*()_+';
            let result = '';
            for (let i = 0; i < 48; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
            setStr(result);
        }, 50);
        return () => clearInterval(interval);
    }, []);
    return <span>{str}</span>;
}

function ProgressSimulation() {
    const [progress, setProgress] = useState(0);
    useEffect(() => {
        const start = Date.now();
        const duration = 4000;
        const interval = setInterval(() => {
            const elapsed = Date.now() - start;
            let current = (elapsed / duration) * 100;
            if (current > 99) current = 99;
            setProgress(Math.floor(current));
        }, 100);
        return () => clearInterval(interval);
    }, []);

    const blocks = Array.from({ length: 20 }).map((_, i) => {
        const active = i < Math.floor(progress / 5);
        return (
            <div key={i} className={`h-full w-full ${active ? 'bg-[#FFD700]' : 'bg-[#09090B]'}`} />
        );
    });

    return (
        <div className="flex flex-col gap-5 text-left w-full max-w-2xl mx-auto mt-8">
            <div className="flex justify-between font-mono text-base uppercase tracking-[0.1em] font-medium text-zinc-300">
                <span>PROCESSING_DATAGRAMS...</span>
                <span className="text-[#FFD700]">[ {progress.toString().padStart(2, '0')}% ]</span>
            </div>
            <div className="h-6 flex gap-1.5 p-1.5 bg-[#09090B] border border-zinc-800 w-full shadow-[0_0_20px_rgba(255,215,0,0.05)]">
                {blocks}
            </div>
            <div className="font-mono text-[10px] sm:text-xs md:text-sm text-zinc-500 truncate mt-3 tracking-[0.2em]">
                <span className="text-[#FFD700]/70">{`> `}</span><RandomString />
            </div>
        </div>
    );
}

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

    const isDragOverCls = isDragOver && !mutation.isPending
        ? 'border-[#FFD700] border-solid bg-[#FFD700] bg-opacity-[0.03] shadow-[inset_0_0_50px_rgba(255,215,0,0.05)]'
        : 'border-zinc-800 border-dashed bg-transparent hover:bg-zinc-900/30 hover:border-[#FFD700]/30';

    return (
        <div className="h-full w-full bg-[#050505] flex flex-col relative overflow-hidden font-mono text-white rounded-none">
            {/* Background Grid */}
            <div
                className="absolute inset-0 z-0 pointer-events-none opacity-20"
                style={{
                    backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}
            />

            {/* Top Telemetry Strip */}
            <div className="w-full flex flex-col sm:flex-row justify-between items-center px-4 sm:px-6 py-2 sm:py-2.5 border-b border-zinc-800/80 text-[10px] sm:text-[11px] text-zinc-500 tracking-[0.1em] sm:tracking-[0.2em] font-medium uppercase bg-[#09090B] z-10 shrink-0 select-none gap-2 sm:gap-0">
                <div className="flex gap-4 sm:gap-8">
                    <span className={mutation.isPending ? "text-[#FFD700] font-bold" : "text-zinc-500"}>
                        <span className={mutation.isPending ? "animate-pulse mr-2" : "hidden"}>●</span>
                        [ UPLINK_NODE: {mutation.isPending ? 'ACTIVE' : 'OFFLINE'} ]
                    </span>
                    <span className="hidden md:inline text-zinc-600">//[ ENCRYPTION: AES-256 SECURE ]</span>
                </div>
                <span className="text-zinc-600">//[ PROTOCOL: NYS_DRONE_TAX_V2 ]</span>
            </div>

            {/* Corner Greebling */}
            <div className="absolute top-16 left-6 w-8 h-8 border-l border-t border-zinc-800 z-0" />
            <div className="absolute top-16 right-6 w-8 h-8 border-r border-t border-zinc-800 z-0" />
            <div className="absolute bottom-6 left-6 w-8 h-8 border-l border-b border-zinc-800 z-0" />
            <div className="absolute bottom-6 right-6 w-8 h-8 border-r border-b border-zinc-800 z-0" />

            <div className="flex-1 flex flex-col items-center p-4 sm:p-6 md:p-8 lg:p-12 xl:p-16 z-10 w-full mx-auto min-h-0 overflow-y-auto custom-scrollbar">

                <div className="w-full flex flex-col items-center my-auto py-4 sm:py-8 min-h-min">
                    <div className="mb-6 sm:mb-10 lg:mb-14 text-center shrink-0">
                        <h2 className="text-xl sm:text-3xl md:text-5xl lg:text-[3.5rem] leading-tight text-white mb-2 sm:mb-4 tracking-[0.02em] uppercase font-bold text-shadow-sm break-words">
                            {`> AWAITING_PAYLOAD_UPLINK`}
                        </h2>
                        <p className="text-zinc-500 tracking-[0.1em] sm:tracking-[0.25em] text-xs sm:text-sm font-medium uppercase mt-2 sm:mt-4">
                            Secure Ingestion Node {`//`} Standby
                        </p>
                    </div>

                    {/* Dropzone */}
                    <div
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onClick={() => !mutation.isPending && fileRef.current?.click()}
                        className={`w-full p-6 sm:p-12 md:p-16 lg:p-24 border-[2px] transition-all duration-300 flex flex-col items-center justify-center relative bg-black/40 backdrop-blur-sm cursor-crosshair group min-h-[300px] shrink-0 ${isDragOverCls}`}
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
                            <ProgressSimulation />
                        ) : (
                            <div className="flex flex-col items-center justify-center w-full h-full">
                                <DataCoreIcon className={`w-12 h-12 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 mb-4 sm:mb-8 transition-all duration-300 ${isDragOver ? 'text-[#FFD700] drop-shadow-[0_0_30px_rgba(255,215,0,0.3)] scale-105' : 'text-zinc-700 group-hover:text-zinc-500'}`} />

                                <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold tracking-[0.05em] sm:tracking-[0.1em] uppercase mb-4 sm:mb-6 text-center text-zinc-300">
                                    DRAG AND DROP ENCRYPTED CSV ARCHIVE HERE
                                </p>

                                <div className="bg-black border border-zinc-800 px-3 sm:px-6 md:px-8 py-2 sm:py-4 mb-6 sm:mb-10 text-[10px] sm:text-xs md:text-[14px] lg:text-[15px] tracking-[0.05em] sm:tracking-[0.15em] w-full max-w-2xl text-center font-medium shadow-inner flex flex-wrap justify-center items-center gap-1 sm:gap-2 lg:gap-x-0">
                                    <span className="text-zinc-600">REQUIRED_SCHEMA:</span>
                                    <span className="text-zinc-400 font-normal">{` [ `}</span>
                                    <span className="text-[#FFD700]">lat</span><span className="text-zinc-600 lg:hidden px-0.5">{`,`}</span><span className="text-zinc-600 hidden lg:inline">{`, `}</span>
                                    <span className="text-[#FFD700]">lon</span><span className="text-zinc-600 lg:hidden px-0.5">{`,`}</span><span className="text-zinc-600 hidden lg:inline">{`, `}</span>
                                    <span className="text-[#FFD700]">subtotal</span><span className="text-zinc-600 lg:hidden px-0.5">{`,`}</span><span className="text-zinc-600 hidden lg:inline">{`, `}</span>
                                    <span className="text-[#FFD700]">timestamp</span>
                                    <span className="text-zinc-400 font-normal">{` ]`}</span>
                                </div>

                                <button
                                    onClick={(e) => { e.stopPropagation(); !mutation.isPending && fileRef.current?.click(); }}
                                    className="bg-[#09090B] border border-zinc-700 text-[#FFD700]/90 font-bold text-xs sm:text-sm md:text-base px-6 sm:px-12 md:px-16 py-3 sm:py-4 uppercase tracking-[0.1em] sm:tracking-[0.15em] transition-all hover:bg-[#FFD700] hover:text-black hover:border-[#FFD700] focus:outline-none focus:ring-1 focus:ring-[#FFD700] focus:ring-offset-2 focus:ring-offset-black mt-auto sm:mt-0"
                                    style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
                                >
                                    [ INIT_LOCAL_BROWSE ]
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Results Section */}
                    {result && !mutation.isPending && (
                        <div className="mt-6 sm:mt-10 w-full bg-black border border-zinc-800 border-l-[#FFD700] border-l-4 p-4 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-[0_10px_40px_-10px_rgba(255,215,0,0.05)] shrink-0">
                            <div className="flex items-center gap-4 mb-4 sm:mb-0">
                                {result.errors > 0 ? (
                                    <div className="w-4 h-4 bg-zinc-600 animate-pulse" />
                                ) : (
                                    <div className="w-4 h-4 bg-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.4)]" />
                                )}
                                <h3 className={`text-lg uppercase tracking-[0.15em] font-bold ${result.errors > 0 ? 'text-zinc-400' : 'text-[#FFD700]'}`}>
                                    UPLINK_TERMINATED : {result.errors > 0 ? 'PARTIAL_SUCCESS' : 'SUCCESS'}
                                </h3>
                            </div>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-12 text-[15px] font-medium uppercase tracking-[0.1em]">
                                <span className="text-zinc-500">
                                    <span className="text-zinc-300">PARSED_OK:</span> {result.imported.toLocaleString()}
                                </span>
                                {result.errors > 0 && (
                                    <span className="text-zinc-500">
                                        <span className="text-zinc-300">FAILED:</span> {result.errors.toLocaleString()}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Error Section */}
                    {mutation.isError && !mutation.isPending && (
                        <div className="mt-6 sm:mt-10 w-full bg-[#050505] border border-red-900/50 p-4 sm:p-8 flex flex-col gap-4 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-4 h-4 bg-red-600 animate-pulse" />
                                <h3 className="text-lg uppercase tracking-[0.15em] font-bold text-red-500">
                                    SYSTEM_EXCEPTION
                                </h3>
                            </div>
                            <p className="text-[15px] text-red-400/80 font-mono tracking-[0.05em] break-all bg-red-950/20 p-6 border border-red-900/30 font-medium leading-relaxed">
                                {`> ERROR: `}{(mutation.error as Error).message}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
