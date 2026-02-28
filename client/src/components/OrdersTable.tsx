import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchOrders, fetchSummary, type OrdersParams, type Order } from '../api/orders';
import TaxBreakdownPopover from './TaxBreakdownPopover';
import { Calendar as CalendarIcon, Loader2, AlertOctagon, Download, ChevronDown } from 'lucide-react';
import SmartOmniSearch from './SmartOmniSearch';
import { type ParsedIntent } from '../lib/searchParser';
import { useCallback } from 'react';


// DIGIT_SLOTS: indices within "YYYY-MM-DD" that are digit positions
const DIGIT_SLOTS = [0, 1, 2, 3, 5, 6, 8, 9];
const DASH_POSITIONS = new Set([4, 7]);
const EMPTY_MASK = '____-__-__';

// Normalise any stored value into a 10-char masked string
function toMask(v: string): string {
    if (!v) return EMPTY_MASK;
    // If it already looks like a mask (has underscores or is 10-char with dashes), keep it
    if (v.length === 10 && v[4] === '-' && v[7] === '-') return v;
    // Otherwise rebuild from digits only (initial typing)
    const digits = v.replace(/\D/g, '');
    const arr = EMPTY_MASK.split('');
    for (let i = 0; i < digits.length && i < 8; i++) {
        arr[DIGIT_SLOTS[i]] = digits[i];
    }
    return arr.join('');
}


function MaskedDateInput({ value, onChange, onComplete, placeholder, inputRef, className }: {
    value: string;
    onChange: (v: string) => void;
    onComplete?: (v: string) => void;
    placeholder?: string;
    inputRef?: React.Ref<HTMLInputElement>;
    className?: string;
}) {
    const mask = toMask(value);
    // Show the mask if user has started typing, otherwise show empty (for placeholder)
    const hasContent = mask !== EMPTY_MASK;
    const displayVal = hasContent ? mask : '';

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const input = e.currentTarget;
        let pos = input.selectionStart ?? 0;
        // Always work on the full 10-char mask
        const arr = mask.split('');

        if (e.key === 'Backspace') {
            e.preventDefault();
            // Find digit slot to clear (go backward, skip dashes)
            let clearPos = pos - 1;
            while (clearPos >= 0 && DASH_POSITIONS.has(clearPos)) clearPos--;
            if (clearPos >= 0) {
                arr[clearPos] = '_';
                const allEmpty = DIGIT_SLOTS.every(s => arr[s] === '_');
                onChange(allEmpty ? '' : arr.join(''));
                requestAnimationFrame(() => input.setSelectionRange(clearPos, clearPos));
            }
            return;
        }

        if (e.key === 'Delete') {
            e.preventDefault();
            let clearPos = pos;
            while (clearPos < 10 && DASH_POSITIONS.has(clearPos)) clearPos++;
            if (clearPos < 10) {
                arr[clearPos] = '_';
                const allEmpty = DIGIT_SLOTS.every(s => arr[s] === '_');
                onChange(allEmpty ? '' : arr.join(''));
                requestAnimationFrame(() => input.setSelectionRange(clearPos, clearPos));
            }
            return;
        }

        if (/^\d$/.test(e.key)) {
            e.preventDefault();
            // If input is empty, start fresh
            if (!hasContent) {
                const fresh = EMPTY_MASK.split('');
                fresh[0] = e.key;
                onChange(fresh.join(''));
                requestAnimationFrame(() => input.setSelectionRange(1, 1));
                return;
            }
            // Skip over dashes
            while (pos < 10 && DASH_POSITIONS.has(pos)) pos++;
            if (pos < 10) {
                arr[pos] = e.key;
                const newVal = arr.join('');
                onChange(newVal);
                // Advance cursor past next dash
                let next = pos + 1;
                while (next < 10 && DASH_POSITIONS.has(next)) next++;
                requestAnimationFrame(() => input.setSelectionRange(next, next));
                // Check completion
                const full = DIGIT_SLOTS.every(s => /\d/.test(arr[s]));
                if (full && onComplete) {
                    onComplete(newVal);
                }
            }
            return;
        }

        // Allow navigation keys
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Home', 'End'].includes(e.key)) {
            return;
        }

        // Block everything else
        e.preventDefault();
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text');
        const digits = pasted.replace(/\D/g, '').slice(0, 8);
        if (!digits) return;
        const fresh = EMPTY_MASK.split('');
        for (let i = 0; i < digits.length && i < 8; i++) {
            fresh[DIGIT_SLOTS[i]] = digits[i];
        }
        const newVal = fresh.join('');
        onChange(newVal);
        // Check completion
        const full = DIGIT_SLOTS.every(s => /\d/.test(fresh[s]));
        if (full && onComplete) {
            onComplete(newVal);
        }
    };

    return (
        <input
            ref={inputRef}
            type="text"
            value={displayVal}
            onChange={() => { }} // fully controlled via onKeyDown + onPaste
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            className={className}
        />
    );
}

function PageInput({ currentPage, totalPages, onPageChange }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (p: number) => void;
}) {
    const [val, setVal] = useState(String(currentPage));

    useEffect(() => {
        setVal(String(currentPage));
    }, [currentPage]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const parsed = parseInt(val, 10);
            if (!isNaN(parsed)) {
                const next = Math.max(1, Math.min(parsed, totalPages));
                onPageChange(next);
                setVal(String(next));
                e.currentTarget.blur();
            } else {
                setVal(String(currentPage));
            }
        } else if (e.key === 'Escape') {
            setVal(String(currentPage));
            e.currentTarget.blur();
        }
    };

    const handleBlur = () => {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed)) {
            const next = Math.max(1, Math.min(parsed, totalPages));
            if (next !== currentPage) {
                onPageChange(next);
            }
            setVal(String(next));
        } else {
            setVal(String(currentPage));
        }
    };

    return (
        <div className="flex items-center bg-[#FFD700]/10 border border-[#FFD700]/20 px-1 py-0.5 focus-within:border-[#FFD700]/60 focus-within:shadow-[0_0_8px_rgba(255,215,0,0.15)] transition-all">
            <input
                type="text"
                value={val}
                onChange={(e) => setVal(e.target.value.replace(/\D/g, ''))}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                className="w-8 lg:w-10 bg-transparent text-center text-[#FFD700] hover:bg-[#FFD700]/10 focus:bg-[#FFD700]/20 focus:outline-none font-bold transition-colors"
                title="Enter page number"
            />
            <span className="text-white px-1 mr-1">
                / {totalPages}
            </span>
        </div>
    );
}

export default function OrdersTable() {
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [searchFilters, setSearchFilters] = useState<ParsedIntent['filters']>({});

    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);
    const dateToRef = useRef<HTMLInputElement>(null);

    // Click outside listener for export menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setIsExportMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isValidDate = (s: string) => {
        if (!s || s.includes('_')) return false;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
        const [y, m, d] = s.split('-').map(Number);
        if (m < 1 || m > 12 || d < 1 || d > 31) return false;
        const date = new Date(y, m - 1, d);
        return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
    };

    // Auto-swap if dates are inverted
    const effectiveDateFrom = isValidDate(dateFrom) ? dateFrom : undefined;
    const effectiveDateTo = isValidDate(dateTo) ? dateTo : undefined;
    let finalFrom = effectiveDateFrom;
    let finalTo = effectiveDateTo;
    if (finalFrom && finalTo && finalFrom > finalTo) {
        [finalFrom, finalTo] = [finalTo, finalFrom];
    }

    const params: OrdersParams = {
        page,
        limit,
        dateFrom: finalFrom || searchFilters.dateFrom || undefined,
        dateTo: finalTo || searchFilters.dateTo || undefined,
        searchText: searchFilters.text,
        taxVal: searchFilters.tax?.value,
        taxOp: searchFilters.tax?.operator,
        amountVal: searchFilters.amount?.value,
        amountOp: searchFilters.amount?.operator,
        amountVal2: (searchFilters as any).amountMax,
        taxVal2: (searchFilters as any).taxMax,
        sourceFilter: (searchFilters as any).source,
        idSearch: (searchFilters as any).idSearch,
    };

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['orders', params],
        queryFn: () => fetchOrders(params),
    });

    const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
        queryKey: ['orders-summary', params],
        queryFn: () => fetchSummary(params),
    });

    const handleSearch = useCallback((filters: ParsedIntent['filters']) => {
        setSearchFilters(filters);
        setPage(1); // reset page on search
    }, []);

    const handleExport = () => {
        const searchParams = new URLSearchParams();
        // Use validated and auto-swapped dates (not raw state values which may contain underscores)
        const exportDateFrom = finalFrom || searchFilters.dateFrom;
        const exportDateTo = finalTo || searchFilters.dateTo;
        if (exportDateFrom) searchParams.set('dateFrom', exportDateFrom);
        if (exportDateTo) searchParams.set('dateTo', exportDateTo);
        // Pass all active OmniSearch filters to ensure export matches displayed data
        if (searchFilters.text) searchParams.set('searchText', searchFilters.text);
        if (searchFilters.tax?.value !== undefined) searchParams.set('taxVal', String(searchFilters.tax.value));
        if (searchFilters.tax?.operator) searchParams.set('taxOp', searchFilters.tax.operator);
        if (searchFilters.amount?.value !== undefined) searchParams.set('amountVal', String(searchFilters.amount.value));
        if (searchFilters.amount?.operator) searchParams.set('amountOp', searchFilters.amount.operator);
        if ((searchFilters as any).amountMax !== undefined) searchParams.set('amountVal2', String((searchFilters as any).amountMax));
        if ((searchFilters as any).taxMax !== undefined) searchParams.set('taxVal2', String((searchFilters as any).taxMax));
        if ((searchFilters as any).source) searchParams.set('sourceFilter', (searchFilters as any).source);
        if ((searchFilters as any).idSearch) searchParams.set('idSearch', (searchFilters as any).idSearch);
        window.location.href = `/api/orders/export?${searchParams.toString()}`;
        setIsExportMenuOpen(false);
    };

    const handleIRSStubExport = () => {
        if (!summaryData) return;

        const content = [
            'IRS TAX SUMMARY REPORT // LEDGER EXPORT',
            `Generated: ${new Date().toISOString()}`,
            `Period: ${finalFrom || 'ALL'} to ${finalTo || 'ALL'}`,
            '',
            `Total Transactions: ${summaryData.processed_orders}`,
            `Gross Revenue: ${Number(summaryData.total_sales || 0).toFixed(2)} $`,
            `Total Tax Collected: ${Number(summaryData.total_tax || 0).toFixed(2)} $`,
            '',
            'CERTIFIED_BY: NYS_DRONE_NET'
        ].join('\n');

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `IRS_summary_${new Date().toISOString().split('T')[0]}.txt`;
        link.click();
        URL.revokeObjectURL(url);
        setIsExportMenuOpen(false);
    };

    const formatDate = (ts: string) => {
        return new Date(ts).toLocaleString('en-US', {
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatMoney = (val: string) => {
        const num = Number(val);
        return isNaN(num) ? '0.00 $' : `${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
    };

    const formatRate = (val: string) => {
        const num = Number(val);
        return isNaN(num) ? '0.0000%' : `${(num * 100).toFixed(4)}%`;
    };

    if (isError) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] p-8 bg-[#030303] border border-red-900/60 shadow-2xl shadow-red-900/40"
                style={{ clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))' }}>
                <div className="max-w-lg w-full text-center flex flex-col items-center">
                    <AlertOctagon className="w-14 h-14 text-red-600 mb-6" />
                    <p className="font-mono text-red-500 text-[22px] font-bold tracking-[0.3em] mb-6 uppercase">System Exception</p>
                    <div className="text-red-500/70 font-mono text-[14px] tracking-wider border-l-2 border-red-800 pl-4 py-2 mb-6 w-full text-left break-all">
                        ERR_CODE: {(error as any)?.message || 'UNKNOWN_SYS_FAULT'}
                    </div>
                    <button onClick={() => window.location.reload()} className="bg-red-600 text-white px-8 py-3 font-mono tracking-[0.2em] uppercase font-bold hover:bg-red-500 transition-colors">
                        Re-Initialize System
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col items-stretch font-mono">
            {/* Header with filters */}
            <div className="bg-[#050505] border border-zinc-800 p-3 lg:p-6 mb-0 relative overflow-hidden [clip-path:polygon(0_0,calc(100%-14px)_0,100%_14px,100%_100%,0_100%)] shadow-2xl shadow-black/50">
                <div className="absolute -top-4 -left-4 w-8 h-8 border-t-2 border-l-2 border-[#FFD700]/30 hidden sm:block"></div>

                <div className="flex flex-col gap-3 border-b border-[#FFD700]/30 pb-3 lg:pb-4 relative">
                    <div className="flex flex-col gap-1">
                        <div className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">SYS.CORE // NODE_808 // ENCRYPTED_STREAM</div>
                        <h2 className="text-[16px] lg:text-[24px] font-mono text-white tracking-[0.2em] lg:tracking-[0.3em] font-bold uppercase flex items-center gap-2 lg:gap-3">
                            <span className="w-2 h-5 lg:w-3 lg:h-6 bg-[#FFD700] flex-shrink-0 animate-[pulse_1.5s_ease-in-out_infinite]" style={{ boxShadow: '0 0 10px rgba(255, 215, 0, 0.4)' }}></span>
                            LEDGER_STREAM_
                            <span className="text-[9px] lg:text-[10px] text-[#FFD700]/50 tracking-[0.1em] border border-[#FFD700]/20 px-1.5 py-0.5 ml-1 font-normal animate-pulse hidden lg:inline">
                                [ 08_DATA_CHANNELS ]
                            </span>
                        </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:gap-4">
                        {/* Custom Date Filters - Brutalist */}
                        <div className="flex items-center gap-2">
                            <div className="relative group/date">
                                <label className="absolute -top-2 left-2 bg-[#050505] px-1 text-[9px] font-mono text-[#FFD700] font-bold tracking-widest z-10 transition-colors group-focus-within/date:text-white">DATE_START</label>
                                <div className={`flex items-center bg-black border ${effectiveDateFrom ? 'border-[#FFD700] shadow-[0_0_12px_rgba(255,215,0,0.15)]' : 'border-zinc-700'} [clip-path:polygon(0_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%)] px-3 py-2 cursor-text group-focus-within/date:border-[#FFD700] group-focus-within/date:shadow-[0_0_15px_rgba(255,215,0,0.2)] transition-all min-h-[44px]`}>
                                    <CalendarIcon className="w-4 h-4 text-zinc-500 mr-2 group-focus-within/date:text-[#FFD700] transition-colors" />
                                    <MaskedDateInput
                                        value={dateFrom}
                                        onChange={setDateFrom}
                                        onComplete={(v) => {
                                            if (isValidDate(v)) {
                                                setPage(1);
                                                setTimeout(() => dateToRef.current?.focus(), 50);
                                            }
                                        }}
                                        placeholder="YYYY-MM-DD"
                                        className="bg-transparent text-[14px] text-white font-mono focus:outline-none w-[110px] placeholder:text-zinc-800 transition-colors"
                                    />
                                </div>
                            </div>

                            <span className="text-zinc-600 font-bold px-1 select-none">/</span>

                            <div className="relative group/date">
                                <label className="absolute -top-2 left-2 bg-[#050505] px-1 text-[9px] font-mono text-[#FFD700] font-bold tracking-widest z-10 transition-colors group-focus-within/date:text-white">DATE_END</label>
                                <div className={`flex items-center bg-black border ${effectiveDateTo ? 'border-[#FFD700] shadow-[0_0_12px_rgba(255,215,0,0.15)]' : 'border-zinc-700'} [clip-path:polygon(0_0,calc(100%-8px)_0,100%_8px,100%_100%,0_100%)] px-3 py-2 cursor-text group-focus-within/date:border-[#FFD700] group-focus-within/date:shadow-[0_0_15px_rgba(255,215,0,0.2)] transition-all min-h-[44px]`}>
                                    <CalendarIcon className="w-4 h-4 text-zinc-500 mr-2 group-focus-within/date:text-[#FFD700] transition-colors" />
                                    <MaskedDateInput
                                        inputRef={dateToRef}
                                        value={dateTo}
                                        onChange={setDateTo}
                                        onComplete={(v) => {
                                            if (isValidDate(v)) setPage(1);
                                        }}
                                        placeholder="YYYY-MM-DD"
                                        className="bg-transparent text-[14px] text-white font-mono focus:outline-none w-[110px] placeholder:text-zinc-800 transition-colors"
                                    />
                                </div>
                            </div>
                        </div>
                        {(dateFrom || dateTo) && (
                            <>
                                {(finalFrom || finalTo) && data && (
                                    <span className="text-[11px] font-mono font-bold text-[#FFD700] tracking-widest animate-[pulse_2s_ease-in-out_infinite] bg-[#FFD700]/10 border border-[#FFD700]/30 px-3 py-1.5">
                                        MATCHED: {data.total.toLocaleString()}
                                    </span>
                                )}
                                <button
                                    onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }}
                                    className="px-4 py-2 text-[12px] font-bold text-zinc-400 hover:text-red-500 hover:border-red-500 hover:bg-red-500/10 transition-all bg-[#050505] border border-zinc-700 [clip-path:polygon(0_0,calc(100%-8px)_0,100%_8px,100%_100%,8px_100%,0_calc(100%-8px))] uppercase tracking-widest active:scale-95 shadow-[0_0_10px_rgba(255,0,0,0)] hover:shadow-[0_0_15px_rgba(255,0,0,0.2)]"
                                    title="RESET_FILTERS"
                                >
                                    RST
                                </button>
                            </>
                        )}

                        {/* Tactical Dropdown Menu Container — pushed to end */}
                        <div className="relative ml-auto" ref={exportMenuRef}>
                            <button
                                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                                className="flex items-center justify-center gap-2 lg:gap-3 px-4 lg:px-8 text-[12px] lg:text-[15px] min-h-[38px] lg:min-h-[44px] font-bold text-black bg-[#FFD700] hover:bg-white hover:shadow-[0_0_25px_rgba(255,215,0,0.6)] transition-all [clip-path:polygon(0_0,calc(100%-16px)_0,100%_16px,100%_100%,16px_100%,0_calc(100%-16px))] uppercase tracking-[0.15em] lg:tracking-[0.2em] active:scale-95 group relative overflow-hidden"
                                style={{ textShadow: '0 0 10px rgba(0,0,0,0.3)' }}
                            >
                                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></span>
                                <Download className="w-4 h-4 lg:w-5 lg:h-5 group-hover:-translate-y-0.5 transition-transform duration-300" />
                                DATA_EXPORT
                                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExportMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown Menu */}
                            {isExportMenuOpen && (
                                <div className="absolute top-full right-0 mt-2 w-[220px] bg-[#050505] border border-[#FFD700] rounded-none shadow-[0_0_15px_rgba(0,0,0,0.8)] z-50 flex flex-col font-mono animate-[fadeIn_0.1s_ease-out]">
                                    <button
                                        onClick={handleExport}
                                        className="w-full text-left px-4 py-3 text-[13px] tracking-widest uppercase bg-transparent text-white hover:bg-[#FFD700] hover:text-black font-normal hover:font-bold transition-colors border-b border-zinc-800 hover:border-transparent"
                                    >
                                        [ .CSV_DUMP ]
                                    </button>
                                    <button
                                        onClick={handleIRSStubExport}
                                        disabled={isSummaryLoading || !summaryData}
                                        className="w-full text-left px-4 py-3 text-[13px] tracking-widest uppercase bg-transparent text-white hover:bg-[#FFD700] hover:text-black font-normal hover:font-bold transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-white disabled:cursor-not-allowed"
                                    >
                                        [ .IRS_STUB ]
                                    </button>
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                {/* Telemetry HUD Cards */}
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 lg:gap-3 mt-2">
                    {/* TOTAL_SALES Card */}
                    <div className="relative group/card bg-black border border-zinc-800 p-2.5 lg:p-4 font-mono [clip-path:polygon(0_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%)] hover:border-zinc-600 transition-all overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-white/30 via-white/10 to-transparent"></div>
                        <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-zinc-700 group-hover/card:border-[#FFD700]/50 transition-colors"></div>
                        <div className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase mb-2 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-white/40 group-hover/card:bg-white animate-pulse"></span>
                            TOTAL_SALES
                        </div>
                        <div className="text-white font-bold text-[14px] lg:text-[20px] xl:text-[26px] tabular-nums tracking-tight leading-none drop-shadow-[0_0_8px_rgba(255,255,255,0.15)] truncate">
                            {isSummaryLoading ? <span className="text-zinc-600 animate-pulse text-[14px]">SYNCING...</span> : formatMoney(summaryData?.total_sales || '0')}
                        </div>
                        <div className="absolute bottom-1 right-2 text-[8px] text-zinc-700 tracking-widest select-none">USD</div>
                    </div>

                    {/* LIAB Card */}
                    <div className="relative group/card bg-black border border-zinc-800 p-2.5 lg:p-4 font-mono [clip-path:polygon(0_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%)] hover:border-[#FFD700]/50 transition-all overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#FFD700]/50 via-[#FFD700]/20 to-transparent"></div>
                        <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-zinc-700 group-hover/card:border-[#FFD700]/50 transition-colors"></div>
                        <div className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase mb-2 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-[#FFD700]/60 group-hover/card:bg-[#FFD700] animate-pulse"></span>
                            TAX_LIABILITY
                        </div>
                        <div className="text-[#FFD700] font-bold text-[14px] lg:text-[20px] xl:text-[26px] tabular-nums tracking-tight leading-none drop-shadow-[0_0_10px_rgba(255,215,0,0.3)] truncate">
                            {isSummaryLoading ? <span className="text-zinc-600 animate-pulse text-[14px]">SYNCING...</span> : formatMoney(summaryData?.total_tax || '0')}
                        </div>
                        <div className="absolute bottom-1 right-2 text-[8px] text-[#FFD700]/30 tracking-widest select-none">USD</div>
                    </div>

                    {/* VOL Card */}
                    <div className="relative group/card bg-black border border-zinc-800 p-2.5 lg:p-4 font-mono [clip-path:polygon(0_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%)] hover:border-zinc-600 transition-all overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-white/20 via-white/10 to-transparent"></div>
                        <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-zinc-700 group-hover/card:border-[#FFD700]/50 transition-colors"></div>
                        <div className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase mb-2 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-white/40 group-hover/card:bg-white animate-pulse"></span>
                            VOLUME
                        </div>
                        <div className="text-white font-bold text-[14px] lg:text-[20px] xl:text-[26px] tabular-nums tracking-tight leading-none truncate">
                            {isSummaryLoading ? <span className="text-zinc-600 animate-pulse text-[14px]">SYNCING...</span> : (summaryData?.processed_orders?.toLocaleString() || '0')}
                        </div>
                        <div className="absolute bottom-1 right-2 text-[8px] text-zinc-700 tracking-widest select-none">UNITS</div>
                    </div>

                    {/* TXNS Card */}
                    <div className="relative group/card bg-black border border-zinc-800 p-2.5 lg:p-4 font-mono [clip-path:polygon(0_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%)] hover:border-zinc-600 transition-all overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-white/20 via-white/10 to-transparent"></div>
                        <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-zinc-700 group-hover/card:border-[#FFD700]/50 transition-colors"></div>
                        <div className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase mb-2 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-white/40 group-hover/card:bg-white animate-pulse"></span>
                            TRANSACTIONS
                        </div>
                        <div className="text-white font-bold text-[14px] lg:text-[20px] xl:text-[26px] tabular-nums tracking-tight leading-none truncate">
                            {isLoading ? <span className="text-zinc-600 animate-pulse text-[14px]">SYNCING...</span> : (data?.total.toLocaleString() || 0)}
                        </div>
                        <div className="absolute bottom-1 right-2 text-[8px] text-zinc-700 tracking-widest select-none">COUNT</div>
                    </div>
                </div>
            </div>

            <SmartOmniSearch onSearch={handleSearch} />

            {/* Table wrapper - HUD Display Container */}
            <div className="flex-1 bg-black border border-zinc-800 rounded-none overflow-hidden flex flex-col relative z-0 mt-2 lg:mt-4 group/table [background-image:linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]">
                {/* 4 Corner Crosshairs */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#FFD700]/40 z-30"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#FFD700]/40 z-30"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#FFD700]/40 z-30 pointer-events-none"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#FFD700]/40 z-30 pointer-events-none"></div>

                <div className="overflow-x-auto flex-1 relative custom-scrollbar z-10">
                    <table className="w-full text-left whitespace-nowrap border-collapse">
                        <thead className="text-[10px] lg:text-[12px] uppercase text-zinc-400 font-mono tracking-[0.15em] lg:tracking-[0.2em] sticky top-0 bg-[#050505] z-20 border-b-2 border-zinc-800 shadow-md">
                            <tr>
                                <th className="px-3 lg:px-6 py-2.5 lg:py-4 font-bold border-r border-dashed border-zinc-800/50">Txn Hash</th>
                                <th className="px-3 lg:px-6 py-2.5 lg:py-4 font-bold border-r border-dashed border-zinc-800/50">Timestamp</th>
                                <th className="px-3 lg:px-6 py-2.5 lg:py-4 font-bold text-right border-r border-dashed border-zinc-800/50 hidden xl:table-cell">Coordinates</th>
                                <th className="px-3 lg:px-6 py-2.5 lg:py-4 text-right font-bold border-r border-dashed border-zinc-800/50">Subtotal</th>
                                <th className="px-3 lg:px-6 py-2.5 lg:py-4 text-right font-bold text-[#FFD700]/70 border-r border-dashed border-zinc-800/50">Rate</th>
                                <th className="px-3 lg:px-6 py-2.5 lg:py-4 text-right font-bold text-[#FFD700]/70 border-r border-dashed border-zinc-800/50">Tax</th>
                                <th className="px-3 lg:px-6 py-2.5 lg:py-4 text-right font-bold text-zinc-300 border-r border-dashed border-zinc-800/50">Total</th>
                                <th className="px-3 lg:px-6 py-2.5 lg:py-4 text-center font-bold hidden xl:table-cell">Info</th>
                            </tr>
                        </thead>
                        <tbody className="font-mono text-[11px] lg:text-[13px] tracking-wider bg-black">
                            {isLoading && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-24 text-center h-full">
                                        <div className="flex flex-col items-center justify-center gap-6">
                                            <div className="w-16 h-16 bg-black border-2 border-[#FFD700]/30 flex items-center justify-center shadow-[0_0_20px_rgba(255,215,0,0.15)]">
                                                <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin" />
                                            </div>
                                            <p className="text-[#FFD700] text-[14px] font-mono tracking-[0.3em] animate-pulse font-bold mt-2">ESTABLISHING DATA STREAM...</p>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {data && data.data.length === 0 && !isLoading && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center gap-6">
                                            <div className="flex items-center justify-center border-2 border-zinc-800 p-6 min-w-[400px]">
                                                <div className="w-3 h-6 bg-zinc-600 animate-pulse" />
                                                <span className="ml-4 text-zinc-400 text-[14px] font-mono tracking-[0.3em] font-bold">0x00000_NO_DATA_FOUND</span>
                                            </div>
                                            <p className="text-zinc-500 text-[12px] font-mono font-bold uppercase tracking-widest">Adjust query parameters to re-initialize.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {data?.data.map((order: Order) => (
                                <tr
                                    key={order.id}
                                    className="group hover:bg-[#FFD700]/5 border-b border-dashed border-zinc-800/80 relative z-10 hover:z-50 transition-none cursor-default"
                                >
                                    <td className="px-3 lg:px-6 py-2.5 lg:py-4 border-r border-dashed border-zinc-800/50 transition-none group-hover:bg-[#FFD700]/5 group-hover:shadow-[inset_4px_0_0_0_#FFD700]">
                                        <div className="flex items-center gap-3">
                                            <span className="text-zinc-400 group-hover:text-white font-bold tracking-widest font-mono">
                                                {order.id.slice(0, 8)}...
                                            </span>
                                            {order.source === 'manual' && (
                                                <span className="text-black border border-[#FFD700] px-2.5 py-1 lg:py-1.5 rounded-none text-[11px] lg:text-[13px] font-bold tracking-[0.2em] leading-none bg-[#FFD700] flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,215,0,0.3)] uppercase">
                                                    <div className="w-1.5 h-1.5 bg-black animate-pulse"></div>
                                                    MANUAL
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 lg:px-6 py-2.5 lg:py-4 text-zinc-400 border-r border-dashed border-zinc-800/50 group-hover:text-[#FFD700]/90 group-hover:bg-[#FFD700]/[0.02] transition-colors tracking-wider text-[10px] lg:text-[13px]">
                                        {formatDate(order.timestamp).toUpperCase()}
                                    </td>
                                    <td className="px-3 lg:px-6 py-2.5 lg:py-4 text-right border-r border-dashed border-zinc-800/50 transition-none group-hover:bg-[#FFD700]/[0.02] hidden xl:table-cell">
                                        <span className="text-zinc-500 tracking-wider font-bold font-mono text-[10px] lg:text-[13px]">
                                            <span className="text-zinc-400 group-hover:text-white transition-colors">{parseFloat(order.lat).toFixed(4)}</span><span className="text-zinc-700 mx-0.5">|</span><span className="text-zinc-400 group-hover:text-white transition-colors">{parseFloat(order.lon).toFixed(4)}</span>
                                        </span>
                                    </td>
                                    <td className="px-3 lg:px-6 py-2.5 lg:py-4 text-right text-white tabular-nums border-r border-dashed border-zinc-800/50 transition-none font-bold tracking-wide group-hover:bg-[#FFD700]/[0.02]">
                                        {formatMoney(order.subtotal)}
                                    </td>
                                    <td className="px-3 lg:px-6 py-2.5 lg:py-4 text-right border-r border-dashed border-zinc-800/50 transition-none group-hover:bg-[#FFD700]/[0.02]">
                                        <span className="text-[#FFD700] font-bold tabular-nums tracking-[0.05em] lg:tracking-[0.1em] drop-shadow-[0_0_2px_rgba(255,215,0,0.5)]">
                                            {formatRate(order.composite_tax_rate)}
                                        </span>
                                    </td>
                                    <td className="px-3 lg:px-6 py-2.5 lg:py-4 text-right text-[#FFD700] tabular-nums font-bold border-r border-dashed border-zinc-800/50 group-hover:shadow-[inset_0_0_15px_rgba(255,215,0,0.1)] transition-none tracking-wide group-hover:bg-[#FFD700]/[0.02]">
                                        {formatMoney(order.tax_amount)}
                                    </td>
                                    <td className="px-3 lg:px-6 py-2.5 lg:py-4 text-right text-white font-bold tabular-nums border-r border-dashed border-zinc-800/50 group-hover:bg-[#FFD700]/15 transition-none tracking-wide text-[12px] lg:text-[14px]">
                                        {formatMoney(order.total_amount)}
                                    </td>
                                    <td className="px-3 lg:px-6 py-2.5 lg:py-4 text-center text-zinc-500 group-hover:text-[#FFD700] transition-none relative group-hover:bg-[#FFD700]/[0.02] hidden xl:table-cell">
                                        <div className="flex items-center justify-center">
                                            <TaxBreakdownPopover
                                                breakdown={order.breakdown}
                                                jurisdictions={order.jurisdictions_applied}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {data && data.totalPages > 1 && (
                    <div className="border-t-2 border-[#FFD700]/20 bg-[#020202] px-3 lg:px-8 py-3 lg:py-5 flex flex-wrap items-center justify-between gap-2 z-10 sticky bottom-0 mt-auto relative overflow-hidden">
                        {/* Pagination Tech Bar */}
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#FFD700]/50 to-transparent"></div>
                        <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-4 lg:gap-x-8 gap-y-2 text-[10px] lg:text-[12px] font-mono font-bold tracking-[0.1em] lg:tracking-[0.2em] uppercase relative z-10">
                            <div className="hidden xl:flex items-center gap-2">
                                <span className="text-zinc-600">DATA_WIDTH:</span>
                                <span className="text-white bg-white/5 px-2 py-0.5 border border-white/10">[08_CH]</span>
                            </div>
                            <div className="flex items-center gap-1 lg:gap-2">
                                <span className="text-[#FFD700] drop-shadow-[0_0_5px_rgba(255,215,0,0.3)]">
                                    {String((page - 1) * limit + 1).padStart(4, '0')}-{String(Math.min(page * limit, data.total)).padStart(4, '0')}
                                </span>
                                <span className="text-zinc-600">/{data.total.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1 lg:gap-2">
                                <PageInput currentPage={page} totalPages={data.totalPages} onPageChange={setPage} />
                            </div>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 lg:gap-4 relative z-10 mt-2 sm:mt-0">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 lg:px-5 py-2 lg:py-2.5 font-mono text-[11px] lg:text-[12px] font-bold tracking-[0.15em] lg:tracking-[0.2em] text-[#FFD700] hover:bg-[#FFD700] hover:text-black transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#FFD700] active:scale-95 border border-transparent hover:border-[#FFD700] hover:shadow-[0_0_15px_rgba(255,215,0,0.3)]"
                            >
                                {'<'} <span className="hidden lg:inline">PREV</span>
                            </button>
                            <span className="text-zinc-800 mx-1 text-lg opacity-50">|</span>
                            <button
                                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                                disabled={page === data.totalPages}
                                className="px-3 lg:px-5 py-2 lg:py-2.5 font-mono text-[11px] lg:text-[12px] font-bold tracking-[0.15em] lg:tracking-[0.2em] text-[#FFD700] hover:bg-[#FFD700] hover:text-black transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#FFD700] active:scale-95 border border-transparent hover:border-[#FFD700] hover:shadow-[0_0_15px_rgba(255,215,0,0.3)]"
                            >
                                <span className="hidden lg:inline">NEXT</span> {'>'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
