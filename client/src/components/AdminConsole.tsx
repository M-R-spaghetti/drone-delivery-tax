import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, JurisdictionRates, ImportLog, AdminStats, HealthStatus } from '../api/admin';
import { RefreshCw, History, Cpu, ActivitySquare, AlertTriangle, Terminal, Database, UploadCloud } from 'lucide-react';
import { CyberDatePicker } from './CyberDatePicker';
import { AuthGateway } from './AuthGateway';
import { TaxMutationLedger } from './TaxMutationLedger';

// Format Helpers
const formatBytes = (bytes: string | number) => {
    const num = Number(bytes);
    if (num < 1024) return num + ' B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(num) / Math.log(k));
    return parseFloat((num / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
};

const formatShortDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

// ─── BACKGROUND FX ──────────────────────────────────────────────────────────
function CyberpunkBackdrop() {
    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            <div className="absolute inset-0 bg-[#000000]" />
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: 'linear-gradient(#FFD700 1px, transparent 1px), linear-gradient(90deg, #FFD700 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                    backgroundPosition: 'center center'
                }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(255,215,0,0.05)_0%,_transparent_70%)]" />

            {/* Scanline overlay */}
            <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: 'linear-gradient(0deg, transparent 50%, rgba(255, 255, 255, 0.05) 50%)',
                    backgroundSize: '100% 4px',
                }}
            />
        </div>
    );
}

// ─── ADMIN DASHBOARD STATS ──────────────────────────────────────────────────
function AdminStatsCard() {
    const { data: stats, isLoading } = useQuery<AdminStats>({ queryKey: ['adminStats'], queryFn: adminApi.getStats });
    const { data: health } = useQuery<HealthStatus>({ queryKey: ['adminHealth'], queryFn: adminApi.getHealth, refetchInterval: 10000 });
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true) }, []);

    if (isLoading || !stats) return <div className="h-40 bg-[#09090B] animate-pulse border border-[#71717A] relative z-10" />;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-0 border border-[#71717A] bg-[#000000] mb-10 relative z-10 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
            <div className="p-4 lg:p-6 xl:p-8 border-b sm:border-r xl:border-b-0 border-[#71717A] bg-[#09090B]/90 backdrop-blur-sm relative overflow-hidden group hover:bg-[#000000] transition-colors duration-500 flex flex-col">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[radial-gradient(circle_at_top_right,_rgba(255,215,0,0.1)_0%,_transparent_70%)] pointer-events-none" />
                <p className="text-xs font-mono tracking-[0.3em] text-[#71717A] uppercase mb-4 flex items-center gap-2 group-hover:text-white transition-colors">
                    <Database className="w-4 h-4 text-[#FFD700]" /> DB_ALLOCATION
                </p>
                <div className="text-2xl lg:text-3xl xl:text-4xl font-mono text-white tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                    {formatBytes(stats.db_size_bytes)}
                </div>
                <div className="flex gap-1.5 mt-6">
                    {[...Array(10)].map((_, i) => (
                        <div key={i}
                            className={`h-2 flex-1 transition-all duration-1000 ${mounted && i < 3 ? 'bg-[#FFD700] shadow-[0_0_8px_rgba(255,215,0,0.8)]' : 'bg-[#71717A]/30'}`}
                            style={{ transitionDelay: `${i * 100}ms` }}
                        />
                    ))}
                </div>
                <div className="mt-auto text-xs font-mono text-[#71717A] flex justify-between tracking-widest pt-4">
                    <span>CAPACITY</span>
                    <span className="text-[#FFD700] drop-shadow-[0_0_5px_rgba(255,215,0,0.4)]">{Number(stats.total_orders).toLocaleString()} RECS</span>
                </div>
            </div>

            <div className="p-4 lg:p-6 xl:p-8 border-b sm:border-r-0 xl:border-r xl:border-b-0 border-[#71717A] bg-black/80 backdrop-blur-sm relative group hover:bg-[#09090B] transition-colors duration-500 flex flex-col">
                <p className="text-xs font-mono tracking-[0.3em] text-[#71717A] uppercase mb-4 flex items-center gap-2 group-hover:text-white transition-colors">
                    <ActivitySquare className="w-4 h-4 text-[#FFD700]" /> SYS_STATUS
                </p>
                <div className="text-xl font-mono text-[#71717A] mt-4 flex items-center gap-3">
                    SYS_HEALTH:
                    <span className={`px-2 py-1 border border-transparent ${health ? "text-[#FFD700] border-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.2)_inset]" : "text-white"}`}>
                        [ {health ? 'NOMINAL' : 'PENDING'} ]
                    </span>
                </div>
                <div className="mt-auto text-xs font-mono text-[#71717A] flex items-center justify-between border-t border-[#71717A]/30 pt-4 tracking-widest">
                    <span className="flex items-center gap-2"><Cpu className="w-4 h-4 text-[#FFD700]" /> LATENCY</span>
                    <span className="text-white text-sm bg-[#71717A]/10 px-2 py-1">{health?.ping_ms || 0}MS</span>
                </div>
            </div>

            <div className="p-4 lg:p-6 xl:p-8 border-b sm:border-r sm:border-b-0 xl:border-r border-[#71717A] bg-[#09090B]/90 backdrop-blur-sm relative group hover:bg-[#000000] transition-colors duration-500 flex flex-col">
                <p className="text-xs font-mono tracking-[0.3em] text-[#71717A] uppercase mb-4 flex items-center gap-2 group-hover:text-white transition-colors">
                    <UploadCloud className="w-4 h-4 text-[#FFD700]" /> LAST_INGEST
                </p>
                <div className="text-xl font-mono text-white mt-4 truncate tracking-wider drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
                    {stats.last_import_date ? formatDate(stats.last_import_date).toUpperCase() : 'NULL'}
                </div>
                <div className="mt-auto text-xs font-mono text-[#71717A] flex items-center justify-between border-t border-[#71717A]/30 pt-4 tracking-widest">
                    <span className="flex items-center gap-2 text-[#71717A]">BATCHES</span>
                    <span className="text-[#FFD700] text-sm bg-[#FFD700]/10 border border-[#FFD700]/30 px-2 py-1">{stats.total_imports}</span>
                </div>
            </div>

            <div className="p-4 lg:p-6 xl:p-8 bg-black/80 backdrop-blur-sm relative group hover:bg-[#09090B] transition-colors duration-500 flex flex-col">
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-[radial-gradient(circle_at_bottom_right,_rgba(255,215,0,0.05)_0%,_transparent_70%)] pointer-events-none" />
                <p className="text-xs font-mono tracking-[0.3em] text-[#71717A] uppercase mb-4 flex items-center gap-2 group-hover:text-white transition-colors">
                    <AlertTriangle className="w-4 h-4 text-[#FFD700]" /> JURISDICTIONS
                </p>
                <div className="text-3xl lg:text-4xl xl:text-5xl font-mono text-[#FFD700] mt-2 tracking-tighter drop-shadow-[0_0_15px_rgba(255,215,0,0.4)]">
                    {stats.total_jurisdictions}
                </div>
                <div className="mt-auto text-xs font-mono text-[#71717A] flex justify-between border-t border-[#71717A]/30 pt-4 tracking-widest">
                    <span>ACTIVE_RATES</span>
                    <span className="text-white text-sm bg-[#71717A]/20 px-2 py-1 border border-[#71717A]/50">{stats.total_tax_rates}</span>
                </div>
            </div>
        </div>
    );
}

// ─── IMPORT LOGS & ROLLBACK ─────────────────────────────────────────────────
function ImportLogsPanel() {
    const queryClient = useQueryClient();
    const { data: logs, isLoading } = useQuery<ImportLog[]>({ queryKey: ['adminImports'], queryFn: adminApi.getImports });
    const [rollingBackId, setRollingBackId] = useState<string | null>(null);

    const rollbackMutation = useMutation({
        mutationFn: adminApi.rollbackImport,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminImports'] });
            queryClient.invalidateQueries({ queryKey: ['adminStats'] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            alert("SYS_REVERT SUCCESS. TEMPORAL DATA PURGED.");
        },
        onSettled: () => setRollingBackId(null),
    });

    if (isLoading) return <div className="h-80 bg-[#09090B] animate-pulse border border-[#71717A] relative z-10" />;

    return (
        <div className="bg-[#000000]/80 backdrop-blur-md border border-[#71717A] overflow-hidden rounded-none shadow-[0_0_40px_rgba(0,0,0,0.8)] relative z-10 flex flex-col group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#71717A] group-hover:bg-[#FFD700] transition-colors duration-500" />
            <div className="p-6 border-b border-[#71717A] bg-[#09090B] flex justify-between items-center pl-8">
                <h3 className="flex items-center gap-3 text-base font-bold tracking-[0.2em] text-[#FFD700] font-mono uppercase drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]">
                    <Terminal className="w-5 h-5" /> [ UPLINK_HISTORY ]
                </h3>
                <span className="text-xs font-mono text-[#71717A] uppercase tracking-[0.3em] bg-[#71717A]/10 px-3 py-1 border border-[#71717A]/30">SHA-256 VERIFIED</span>
            </div>
            <div className="overflow-x-auto h-[400px] scrollbar-thin scrollbar-thumb-[#71717A] scrollbar-track-black">
                <table className="w-full text-left border-collapse">
                    <thead className="text-xs uppercase text-[#71717A] font-mono tracking-[0.2em] bg-[#09090B] sticky top-0 border-b border-[#71717A]/50 z-10 shadow-md">
                        <tr>
                            <th className="px-6 py-4 font-normal pl-8">NODE_ID</th>
                            <th className="px-6 py-4 font-normal">TIMESTAMP</th>
                            <th className="px-6 py-4 font-normal text-right">VOLUME</th>
                            <th className="px-6 py-4 font-normal text-right">LATENCY</th>
                            <th className="px-6 py-4 font-normal text-right">EXEC</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#71717A]/20">
                        {logs?.map((log: ImportLog) => (
                            <tr key={log.id} className="hover:bg-[#FFD700]/5 hover:shadow-[inset_4px_0_0_0_#FFD700] transition-all group/row">
                                <td className="px-6 py-4 pl-8">
                                    <div className="font-mono text-white text-sm whitespace-nowrap group-hover/row:text-[#FFD700] transition-colors">{log.filename.toUpperCase()}</div>
                                    <div className="text-xs text-[#71717A] font-mono mt-2 tracking-wider">HASH: <span className="text-[#FFD700]/70">{log.file_hash.substring(0, 16)}</span></div>
                                </td>
                                <td className="px-6 py-4 text-xs text-[#71717A] font-mono whitespace-nowrap uppercase tracking-widest">{formatDate(log.created_at)}</td>
                                <td className="px-6 py-4 text-right font-mono text-sm text-white tracking-widest">
                                    {log.rows_imported}
                                    {log.rows_failed > 0 && <span className="text-[#FFD700] ml-3 font-mono bg-[#FFD700]/10 px-2 py-1 border border-[#FFD700]/20">({log.rows_failed} ERR)</span>}
                                </td>
                                <td className="px-6 py-4 text-right text-xs font-mono text-[#71717A] tracking-wider">
                                    {log.processing_time_ms}MS
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => {
                                            if (confirm(`INITIATE REVERT ON [${log.filename}]? THIS WILL PURGE ${log.rows_imported} RECORDS.`)) {
                                                setRollingBackId(log.id);
                                                rollbackMutation.mutate(log.id);
                                            }
                                        }}
                                        disabled={rollingBackId === log.id}
                                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-transparent text-[#71717A] border border-[#71717A] hover:bg-[#71717A]/20 hover:text-white hover:border-white hover:shadow-[0_0_10px_rgba(255,255,255,0.2)] font-mono text-xs uppercase transition-all disabled:opacity-50 rounded-none cursor-pointer tracking-widest group-hover/row:border-[#FFD700]/50 group-hover/row:text-[#FFD700]"
                                    >
                                        {rollingBackId === log.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                                        REVERT
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {logs?.length === 0 && (
                            <tr><td colSpan={5} className="px-6 py-12 text-center text-[#71717A] font-mono text-xs uppercase tracking-[0.5em] bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.02)_10px,rgba(255,255,255,0.02)_20px)]">NO_RECORDS_FOUND</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── TAX RATE MANAGER ───────────────────────────────────────────────────────
function TaxRateInlineRow({ j, refetch }: { j: JurisdictionRates, refetch: () => void }) {
    const [isEditing, setIsEditing] = useState(false);
    const [newRate, setNewRate] = useState('');
    const [effectiveDate, setEffectiveDate] = useState('');
    const [showHistory, setShowHistory] = useState(false);

    const sortedRates = [...j.rates].sort((a, b) => new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime());
    const activeRate = sortedRates.find(r => r.valid_to === null) || sortedRates[0];

    const mutation = useMutation({
        mutationFn: () => adminApi.updateTaxRate(j.jurisdiction_id, parseFloat(newRate) / 100, effectiveDate),
        onSuccess: () => {
            setIsEditing(false);
            setNewRate('');
            setEffectiveDate('');
            refetch();
        },
        onError: (e: any) => alert(e.message)
    });

    const handleSave = () => {
        if (!newRate || !effectiveDate) return alert("Fill both rate and date");
        if (isNaN(parseFloat(newRate))) return alert("Invalid rate");
        mutation.mutate();
    };

    return (
        <>
            <tr className="border-b border-[#71717A]/20 hover:bg-[#FFD700]/5 hover:shadow-[inset_4px_0_0_0_#FFD700] transition-all relative group/row">
                <td className="px-6 py-5 pl-8">
                    <div className="font-mono text-white text-sm tracking-wider">{j.name.toUpperCase()}</div>
                    <div className="text-xs font-mono tracking-widest text-[#71717A] mt-2 flex gap-4">
                        <span className="bg-[#71717A]/10 px-2 py-0.5 border border-[#71717A]/30 text-[#FFD700] drop-shadow-[0_0_5px_rgba(255,215,0,0.2)]">[{j.type}]</span>
                        {sortedRates.length > 1 && (
                            <button onClick={() => setShowHistory(!showHistory)} className="text-[#FFD700]/70 hover:text-[#FFD700] flex items-center gap-1.5 uppercase transition-colors hover:shadow-[0_0_10px_rgba(255,215,0,0.3)]">
                                <History className="w-4 h-4" /> {sortedRates.length} VERSIONS
                            </button>
                        )}
                    </div>
                </td>
                <td className="px-6 py-5 text-right">
                    {isEditing ? (
                        <div className="flex items-center justify-end gap-3 font-mono">
                            <span className="text-xs text-[#71717A] tracking-widest bg-[#71717A]/20 px-2 py-2 border border-[#71717A]/50">%</span>
                            <input
                                type="number" step="0.001"
                                className="w-24 bg-black border border-[#FFD700] focus:shadow-[0_0_15px_rgba(255,215,0,0.3)] px-3 py-2 text-sm font-mono text-white outline-none rounded-none transition-all placeholder:text-[#71717A]"
                                placeholder="8.875"
                                value={newRate} onChange={e => setNewRate(e.target.value)}
                            />
                        </div>
                    ) : (
                        <span className="font-mono text-[#FFD700] drop-shadow-[0_0_8px_rgba(255,215,0,0.6)] border border-[#FFD700]/40 bg-[#FFD700]/5 px-3 py-1.5 text-base outline-none rounded-none inline-block tracking-widest">
                            {activeRate ? (parseFloat(activeRate.rate) * 100).toFixed(3) : 0}%
                        </span>
                    )}
                </td>
                <td className="px-6 py-5 text-right">
                    {isEditing ? (
                        <div className="flex justify-end relative">
                            <CyberDatePicker
                                value={effectiveDate}
                                onChange={setEffectiveDate}
                                className="w-44 z-50"
                                align="right"
                            />
                        </div>
                    ) : (
                        <span className="text-sm font-mono text-[#71717A] tracking-widest">
                            {activeRate ? formatShortDate(activeRate.valid_from).toUpperCase() : 'N/A'}
                        </span>
                    )}
                </td>
                <td className="px-6 py-5 text-right w-40">
                    {isEditing ? (
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setIsEditing(false)} className="px-3 py-2 text-xs font-mono text-[#71717A] hover:text-white hover:bg-[#71717A]/20 border border-transparent hover:border-white uppercase cursor-pointer tracking-widest transition-all shadow-[inset_0_0_0_1px_rgba(113,113,122,0.3)]">CANCEL</button>
                            <button onClick={handleSave} disabled={mutation.isPending} className="px-4 py-2 text-xs font-mono bg-[#FFD700] text-black disabled:opacity-50 flex items-center gap-2 uppercase font-black hover:bg-white hover:shadow-[0_0_15px_rgba(255,255,255,0.6)] transition-all cursor-pointer rounded-none tracking-widest">
                                {mutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : null} SAVE
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="px-2 lg:px-4 py-1.5 lg:py-2 text-[10px] lg:text-xs font-mono text-[#71717A] border border-[#71717A] hover:bg-[#FFD700] hover:border-[#FFD700] hover:text-black hover:shadow-[0_0_15px_rgba(255,215,0,0.5)] transition-all uppercase cursor-pointer rounded-none tracking-widest group-hover/row:border-[#FFD700]/50 group-hover/row:text-[#FFD700] whitespace-nowrap">
                            MUTATE
                        </button>
                    )}
                </td>
            </tr>
            {showHistory && sortedRates.map((r, i) => (
                <tr key={r.rate_id} className="bg-[#050505] border-b border-[#71717A]/10 shadow-[inset_0_4px_10px_rgba(0,0,0,0.5)]">
                    <td className="px-6 py-3 pl-10 flex items-center gap-3 border-l border-l-transparent">
                        <div className="w-1.5 h-1.5 bg-[#71717A]" />
                        <span className="text-xs text-[#71717A] font-mono tracking-widest uppercase">HISTORIC_RECORD</span>
                        {i === 0 && <span className="border border-[#FFD700] bg-[#FFD700]/10 text-[#FFD700] text-xs px-2 py-0.5 ml-3 font-mono tracking-widest shadow-[0_0_8px_rgba(255,215,0,0.3)]">ACTIVE_NODE</span>}
                    </td>
                    <td className="px-6 py-3 text-right">
                        <span className="font-mono text-[#71717A] text-sm tracking-widest">{(parseFloat(r.rate) * 100).toFixed(3)}%</span>
                    </td>
                    <td className="px-6 py-3 text-right" colSpan={2}>
                        <span className="text-xs font-mono text-[#71717A] tracking-wider">
                            {formatShortDate(r.valid_from).toUpperCase()} // {r.valid_to ? formatShortDate(r.valid_to).toUpperCase() : 'PRESENT'}
                        </span>
                    </td>
                </tr>
            ))}
        </>
    );
}

function TaxRateManager() {
    const { data, isLoading, refetch } = useQuery<JurisdictionRates[]>({ queryKey: ['taxRates'], queryFn: adminApi.getTaxRates });
    const [search, setSearch] = useState('');

    if (isLoading) return <div className="h-[700px] bg-[#09090B] animate-pulse border border-[#71717A] relative z-10" />;

    const filtered = data?.filter(j => j.name.toLowerCase().includes(search.toLowerCase()) || j.type.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="bg-[#09090B]/90 backdrop-blur-md border border-[#71717A] h-[500px] lg:h-[600px] xl:h-[750px] flex flex-col rounded-none shadow-[0_0_40px_rgba(0,0,0,0.8)] relative z-10 group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#71717A] group-hover:bg-[#FFD700] transition-colors duration-500" />
            <div className="p-6 border-b border-[#71717A] bg-black flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6 shrink-0 pl-8 relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[linear-gradient(90deg,transparent,rgba(255,215,0,0.05))] pointer-events-none" />
                <div>
                    <h3 className="text-base font-bold tracking-[0.2em] text-[#FFD700] uppercase font-mono drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]">
                        {'>'} ACTIVE_TAX_MUTATION_PROTOCOLS
                    </h3>
                    <p className="text-xs text-[#71717A] font-mono mt-2 tracking-widest">SCD TYPE-2 RECORDING ENGAGED.</p>
                </div>
                <div className="relative group/search flex items-end">
                    <div className="flex items-center gap-3 border-b-2 border-[#71717A] focus-within:border-[#FFD700] focus-within:shadow-[0_2px_10px_rgba(255,215,0,0.2)] transition-all pb-2 px-2">
                        <span className="text-[#FFD700] font-mono text-xs whitespace-nowrap tracking-[0.2em]">{'>'} QUERY_JURISDICTION:</span>
                        <input
                            type="text"
                            className="bg-transparent border-none text-sm font-mono text-white placeholder-[#71717A] focus:ring-0 focus:outline-none w-56 uppercase tracking-[0.2em] pl-1"
                            value={search} onChange={e => setSearch(e.target.value)}
                        />
                        {!search && <span className="w-2 h-5 bg-[#FFD700] animate-[pulse_1s_ease-in-out_infinite] shadow-[0_0_8px_rgba(255,215,0,0.8)] absolute right-2"></span>}
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-auto bg-black/60 scrollbar-thin scrollbar-thumb-[#71717A] scrollbar-track-black">
                <table className="w-full text-left border-collapse">
                    <thead className="text-xs uppercase text-[#71717A] font-mono tracking-[0.2em] bg-[#09090B] sticky top-0 z-10 border-b border-[#71717A]/50 shadow-md">
                        <tr>
                            <th className="px-6 py-4 font-normal pl-8">NODE_ID</th>
                            <th className="px-6 py-4 font-normal text-right">FACTOR</th>
                            <th className="px-6 py-4 font-normal text-right">TIMESTAMP</th>
                            <th className="px-6 py-4 font-normal text-right w-40">CMD</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-transparent">
                        {filtered?.map((j: JurisdictionRates) => (
                            <TaxRateInlineRow key={j.jurisdiction_id} j={j} refetch={refetch} />
                        ))}
                        {filtered?.length === 0 && (
                            <tr><td colSpan={4} className="px-6 py-12 text-center text-[#71717A] font-mono text-sm uppercase tracking-[0.4em] bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.02)_10px,rgba(255,255,255,0.02)_20px)]">NO_NODES_FOUND</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="p-3 border-t border-[#71717A] bg-[#09090B] shrink-0 text-right">
                <span className="text-xs text-[#71717A] font-mono uppercase tracking-[0.3em]">
                    DISPLAYING [{filtered?.length}/{data?.length}] // FILTER_ACTIVE: {search ? 'TRUE' : 'FALSE'}
                </span>
            </div>
        </div>
    );
}

// ─── DATA PURGE PANEL ───────────────────────────────────────────────────────
function DataPurgePanel() {
    const queryClient = useQueryClient();
    const [purgeText, setPurgeText] = useState('');
    const [isPurging, setIsPurging] = useState(false);

    const handlePurgeAll = async () => {
        if (purgeText !== 'AUTH_OVERRIDE_CASCADE') return;
        setIsPurging(true);
        try {
            await adminApi.purgeAll();
            setPurgeText('');
            queryClient.invalidateQueries();
            alert('SYS.ADMIN_CORE: CASCADING TRUNCATE SUCCESSFUL. LEDGER PURGED.');
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsPurging(false);
        }
    };

    return (
        <div className="border border-[#FFD700] bg-[#09090B]/90 backdrop-blur-md relative overflow-hidden min-h-[300px] shadow-[0_0_50px_rgba(200,150,0,0.15)] flex flex-col z-10 group mt-8">
            <div
                className="absolute inset-x-0 bottom-0 h-full pointer-events-none transition-opacity duration-1000 opacity-5 group-hover:opacity-10"
                style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, #09090B 0, #09090B 20px, #FFD700 20px, #FFD700 40px)'
                }}
            />
            {/* Animated border glow */}
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_30px_rgba(255,215,0,0.1)] group-hover:shadow-[inset_0_0_50px_rgba(255,215,0,0.2)] transition-shadow duration-700" />

            <div className="p-6 border-b border-[#FFD700]/30 bg-[#000000] relative z-10 flex items-center justify-between">
                <h3 className="flex items-center gap-3 text-base font-bold tracking-[0.3em] text-[#FFD700] uppercase font-mono drop-shadow-[0_0_10px_rgba(255,215,0,0.6)]">
                    <AlertTriangle className="w-5 h-5 text-[#FFD700] animate-pulse" /> [ LETHAL_ACTION // TRUNCATE_CASCADE ]
                </h3>
                <span className="text-[#FFD700] font-mono text-xs tracking-widest px-3 py-1 border border-[#FFD700] bg-[#FFD700]/10 animate-pulse">AUTHORIZATION REQ</span>
            </div>

            <div className="p-8 relative z-10 flex flex-col flex-1 justify-between gap-8 bg-black/40">
                <p className="text-sm font-mono text-white leading-loose max-w-3xl uppercase tracking-widest drop-shadow-md">
                    WARNING: THIS ACTION EXECUTES <span className="text-[#FFD700] bg-[#FFD700]/10 px-2 py-1 border border-[#FFD700]/50 font-bold mx-1 drop-shadow-[0_0_5px_rgba(255,215,0,0.5)]">TRUNCATE orders CASCADE</span>. ALL TRANSACTION HISTORY, TAX CALCULATED AMOUNTS, AND IMPORT LOGS WILL BE PERMANENTLY DESTROYED. <span className="text-[#71717A]">TAX RATES AND JURISDICTIONS ARE PRESERVED.</span>
                </p>

                <div className="flex flex-col xl:flex-row gap-6 mt-auto">
                    <div className="flex-1 relative group/input">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[#FFD700] font-mono text-lg font-bold drop-shadow-[0_0_5px_rgba(255,215,0,0.8)]">{'>'}</div>
                        <input
                            type="text"
                            placeholder="AWAITING AUTH_OVERRIDE_CASCADE..."
                            className="w-full bg-[#000000] border-2 border-[#71717A] focus:border-[#FFD700] focus:shadow-[0_0_20px_rgba(255,215,0,0.3)] focus:outline-none pl-12 pr-6 py-5 text-base font-mono text-white placeholder-[#71717A] transition-all uppercase rounded-none tracking-[0.2em]"
                            value={purgeText} onChange={(e) => setPurgeText(e.target.value)}
                        />
                        <div className={`absolute right-6 top-1/2 -translate-y-1/2 w-3 h-6 bg-[#FFD700] shadow-[0_0_10px_rgba(255,215,0,0.8)] ${purgeText === 'AUTH_OVERRIDE_CASCADE' ? 'opacity-0' : 'animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]'}`} style={{ pointerEvents: 'none' }} />
                    </div>
                    <button
                        onClick={handlePurgeAll}
                        disabled={purgeText !== 'AUTH_OVERRIDE_CASCADE' || isPurging}
                        style={{ clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)' }}
                        className="px-12 py-5 bg-[#FFD700] text-black font-black font-mono tracking-[0.3em] text-base hover:bg-white hover:shadow-[0_0_30px_rgba(255,255,255,0.8)] transition-all duration-300 disabled:opacity-20 disabled:hover:bg-[#FFD700] disabled:hover:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-3 shrink-0 rounded-none uppercase xl:min-w-[300px]"
                    >
                        {isPurging ? <RefreshCw className="w-5 h-5 animate-spin" /> : null}
                        {'>'} EXECUTE_PURGE
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── MAIN ADMIN PAGE EXPORT ─────────────────────────────────────────────────
export default function AdminConsole() {
    return (
        <AuthGateway>
            <div className="h-full flex flex-col p-4 lg:p-8 animate-fade-in-up bg-transparent text-white min-h-screen font-mono rounded-none relative">
                <CyberpunkBackdrop />

                <div className="mb-10 border-b border-[#71717A]/40 pb-6 relative z-10 flex justify-between items-end">
                    <div>
                        <h2 className="text-xl lg:text-2xl xl:text-4xl font-black text-white tracking-[0.1em] lg:tracking-[0.15em] uppercase font-sans mb-2 lg:mb-4 flex items-center gap-2 lg:gap-4 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] pt-4">
                            <span className="w-2 lg:w-3 h-6 lg:h-10 bg-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.6)] shrink-0" />
                            <span className="truncate">[ SYS.ADMIN_CORE <span className="hidden xl:inline">// GOVERNANCE_OVERRIDE</span> ]</span>
                        </h2>
                        <p className="text-sm text-[#71717A] font-mono uppercase tracking-[0.3em]">
                            SECURE MAINFRAME // <span className="text-[#FFD700]/80">B2B DATA GOVERNANCE & TEMPORAL TAX MUTATION</span>
                        </p>
                    </div>
                    <div className="text-right hidden sm:block">
                        <p className="text-[#FFD700] text-xs font-mono tracking-[0.4em] mb-2 animate-pulse">UPLINK_SECURE</p>
                        <div className="flex gap-1 justify-end">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="w-1.5 h-1.5 bg-[#FFD700] rounded-full shadow-[0_0_5px_rgba(255,215,0,0.8)]" style={{ animationDelay: `${i * 150}ms` }} />
                            ))}
                        </div>
                    </div>
                </div>

                <AdminStatsCard />

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 mb-10 relative z-10">
                    <TaxRateManager />
                    <div className="flex flex-col gap-10">
                        <ImportLogsPanel />
                        <DataPurgePanel />
                    </div>
                </div>

                <TaxMutationLedger />
            </div>
        </AuthGateway>
    );
}
