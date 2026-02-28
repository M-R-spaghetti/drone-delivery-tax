import { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { FilterType, TimeFilterConfig, resolveFilterDateRange, getFilterLabel, NYS_QUARTERS } from '../TimeFilter';
import {
    TaxBreakdownDonut,
    RevenueVsTaxChart,
    DailyOrdersHeatmap,
    EffectiveRateGauge,
    AvgOrderValueTrend,
    TaxLiabilitySummary,
    PeriodComparisonCard,
    QuickExportPanel,
} from './DashboardWidgets';
import type {
    TaxBreakdownData,
    RevenueByDayItem,
    HeatmapDayItem,
    AovByDayItem,
    ExportSummaryData,
} from './DashboardWidgets';


// ============================================================================
// LIVE SYNC CLOCK
// ============================================================================
function LiveSyncClock() {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const interval = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);
    return (
        <span className="text-[#FFD700] font-mono text-sm font-bold tracking-[0.2em]">
            {time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
    );
}

// ============================================================================
// TACTICAL CHRONO-MATRIX — ADVANCED TIME FILTER
// ============================================================================

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const QUICK_PRESETS: { key: FilterType; label: string }[] = [
    { key: 'ALL', label: 'ALL' },
    { key: 'MTD', label: 'MTD' },
    { key: 'QTD', label: 'QTD' },
    { key: 'YTD', label: 'YTD' },
    { key: '7D', label: '7D' },
    { key: '30D', label: '30D' },
    { key: '90D', label: '90D' },
];

const HoloTimeFilter = ({ currentFilter, onFilterChange, checkDataRange, monthDataCounts }: { currentFilter: TimeFilterConfig; onFilterChange: (c: TimeFilterConfig) => void; checkDataRange?: (start: string, end: string) => number; monthDataCounts?: Map<string, number> }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [activeSection, setActiveSection] = useState<'MONTH' | 'QUARTER' | 'NYS' | 'CUSTOM' | null>(null);

    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) { setIsOpen(false); setActiveSection(null); }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const selectPreset = useCallback((type: FilterType) => {
        onFilterChange({ type });
        setIsOpen(false);
        setActiveSection(null);
    }, [onFilterChange]);

    const selectMonth = useCallback((monthIdx: number) => {
        const dateStr = `${selectedYear}-${String(monthIdx + 1).padStart(2, '0')}`;
        onFilterChange({ type: 'MONTH', dateStr, year: selectedYear });
        setIsOpen(false);
        setActiveSection(null);
    }, [selectedYear, onFilterChange]);

    const selectQuarter = useCallback((q: number) => {
        onFilterChange({ type: 'QUARTER', quarter: q, year: selectedYear });
        setIsOpen(false);
        setActiveSection(null);
    }, [selectedYear, onFilterChange]);

    const selectNYSQuarter = useCallback((q: number) => {
        onFilterChange({ type: 'NYS_QUARTER', quarter: q, year: selectedYear });
        setIsOpen(false);
        setActiveSection(null);
    }, [selectedYear, onFilterChange]);

    const selectYear = useCallback((y: number) => {
        onFilterChange({ type: 'YEAR', year: y });
        setIsOpen(false);
        setActiveSection(null);
    }, [onFilterChange]);

    const applyCustomRange = useCallback(() => {
        if (customStart && customEnd && validateDateInput(customStart) && validateDateInput(customEnd)) {
            onFilterChange({ type: 'CUSTOM_RANGE', startDate: customStart, endDate: customEnd });
            setIsOpen(false);
            setActiveSection(null);
        }
    }, [customStart, customEnd, onFilterChange]);

    const validateDateInput = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

    const handleDateInput = (val: string, setter: (val: string) => void) => {
        const digits = val.replace(/\D/g, '').slice(0, 8);
        let formatted = digits;
        if (digits.length > 4) {
            formatted = digits.slice(0, 4) + '-' + digits.slice(4);
        }
        if (digits.length > 6) {
            formatted = formatted.slice(0, 7) + '-' + digits.slice(6);
        }
        setter(formatted);
    };

    const renderMaskedDate = (val: string) => {
        if (!val) return null;
        return (
            <span className="pointer-events-none absolute left-0 top-0 font-bold" style={{ userSelect: 'none' }}>
                {val.split('').map((char, i) => (
                    <span key={i} className={char === '-' ? 'text-zinc-500' : 'text-white'}>
                        {char}
                    </span>
                ))}
            </span>
        );
    };

    const matchedRecords = useMemo(() => {
        if (!checkDataRange) return null;
        if (validateDateInput(customStart) && validateDateInput(customEnd)) {
            return checkDataRange(customStart, customEnd);
        }
        return null;
    }, [customStart, customEnd, checkDataRange]);


    const isActiveFilter = (type: FilterType) => currentFilter.type === type;

    const shiftCurrentFilter = useCallback((direction: -1 | 1) => {
        if (currentFilter.type === 'MONTH' && currentFilter.dateStr) {
            const [y, m] = currentFilter.dateStr.split('-').map(Number);
            let nextM = m + direction;
            let nextY = currentFilter.year || y;
            if (nextM > 12) {
                nextM = 1;
                nextY += 1;
            } else if (nextM < 1) {
                nextM = 12;
                nextY -= 1;
            }
            onFilterChange({ type: 'MONTH', dateStr: `${nextY}-${String(nextM).padStart(2, '0')}`, year: nextY });
        } else if (currentFilter.type === 'QUARTER' && currentFilter.quarter && currentFilter.year) {
            let nextQ = currentFilter.quarter + direction;
            let nextY = currentFilter.year;
            if (nextQ > 4) {
                nextQ = 1;
                nextY += 1;
            } else if (nextQ < 1) {
                nextQ = 4;
                nextY -= 1;
            }
            onFilterChange({ type: 'QUARTER', quarter: nextQ, year: nextY });
        } else if (currentFilter.type === 'NYS_QUARTER' && currentFilter.quarter && currentFilter.year) {
            let nextQ = currentFilter.quarter + direction;
            let nextY = currentFilter.year;
            if (nextQ > 4) {
                nextQ = 1;
                nextY += 1;
            } else if (nextQ < 1) {
                nextQ = 4;
                nextY -= 1;
            }
            onFilterChange({ type: 'NYS_QUARTER', quarter: nextQ, year: nextY });
        } else if (currentFilter.type === 'YEAR' && currentFilter.year) {
            onFilterChange({ type: 'YEAR', year: currentFilter.year + direction });
        }
    }, [currentFilter, onFilterChange]);

    // Polygon clip for segmented buttons
    const segClip = 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)';
    const segClipFirst = 'polygon(0 0, 100% 0, calc(100% - 6px) 100%, 0 100%)';
    const segClipLast = 'polygon(6px 0, 100% 0, 100% 100%, 0 100%)';

    return (
        <div className="relative z-50" ref={ref}>
            {/* QUICK PRESETS — Segmented Toggle Bar */}
            <div className="flex items-stretch flex-wrap gap-y-1">
                {QUICK_PRESETS.map((p, i) => (
                    <button
                        key={p.key}
                        onClick={() => selectPreset(p.key)}
                        className={`px-2 lg:px-3 xl:px-4 py-1.5 lg:py-2 text-xs lg:text-sm font-mono font-bold tracking-[0.1em] lg:tracking-[0.15em] uppercase transition-colors ${isActiveFilter(p.key)
                            ? 'bg-[#FFD700] text-black'
                            : 'bg-[#0A0A0A] text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900 border-b border-[#FFD700]/20'
                            }`}
                        style={{
                            clipPath: i === 0 ? segClipFirst : i === QUICK_PRESETS.length - 1 ? segClipLast : segClip,
                            marginLeft: i > 0 ? '-6px' : '0',
                        }}
                    >
                        {p.label}
                    </button>
                ))}
                {/* EXPAND BUTTON */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`ml-1 lg:ml-2 px-2 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm font-mono font-bold tracking-widest uppercase transition-colors border ${isOpen
                        ? 'bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/40'
                        : 'bg-[#0A0A0A] text-zinc-500 border-zinc-800 hover:border-[#FFD700]/30 hover:text-zinc-400'
                        }`}
                    style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 6px) 100%, 0 100%)' }}
                >
                    {isOpen ? '▾' : '▸'} <span className="hidden xl:inline">CHRONO</span>
                </button>
            </div>

            {/* Current Filter Display */}
            {!['ALL', 'MTD', 'QTD', 'YTD', '7D', '30D', '90D'].includes(currentFilter.type) && (
                <div className="mt-2 text-sm font-mono text-[#FFD700] tracking-[0.2em] uppercase font-bold bg-[#FFD700]/10 border border-[#FFD700]/20 inline-flex items-center">
                    {currentFilter.type !== 'CUSTOM_RANGE' ? (
                        <button onClick={() => shiftCurrentFilter(-1)} className="px-3 py-1 hover:bg-[#FFD700]/20 hover:text-white transition-colors">⟨</button>
                    ) : (
                        <span className="px-3 py-1 opacity-50">⟨</span>
                    )}
                    <span className="py-1 px-2">{getFilterLabel(currentFilter)}</span>
                    {currentFilter.type !== 'CUSTOM_RANGE' ? (
                        <button onClick={() => shiftCurrentFilter(1)} className="px-3 py-1 hover:bg-[#FFD700]/20 hover:text-white transition-colors">⟩</button>
                    ) : (
                        <span className="px-3 py-1 opacity-50">⟩</span>
                    )}
                </div>
            )}

            {/* CHRONO-MATRIX MEGA MENU */}
            {isOpen && (
                <div
                    className="absolute right-0 top-full mt-3 bg-[#050505]/95 backdrop-blur-xl border border-zinc-800 shadow-2xl shadow-black/50 w-[calc(100vw-80px)] max-w-[560px]"
                    style={{
                        clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)',
                    }}
                >
                    {/* Top border accent */}
                    <div className="h-[2px] w-full bg-gradient-to-r from-[#FFD700]/60 via-[#FFD700] to-[#FFD700]/60" />

                    {/* Year Selector Bar */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-900">
                        <span className="text-xs font-mono text-zinc-600 tracking-[0.3em] uppercase font-bold">Fiscal Year</span>
                        <div className="flex">
                            {[2025, 2026].map((y, idx) => (
                                <button
                                    key={y}
                                    onClick={() => setSelectedYear(y)}
                                    className={`px-3 py-1 text-sm font-mono font-bold tracking-widest transition-colors ${selectedYear === y
                                        ? 'bg-[#FFD700] text-black z-10'
                                        : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'
                                        }`}
                                    style={{ clipPath: idx === 0 ? segClipFirst : segClip, marginLeft: idx > 0 ? '-6px' : '0' }}
                                >
                                    {y}
                                </button>
                            ))}
                            <button
                                onClick={() => selectYear(selectedYear)}
                                className="px-3 py-1 text-sm font-mono font-bold text-zinc-500 bg-zinc-900 hover:bg-zinc-800 hover:text-zinc-300 tracking-widest"
                                style={{ clipPath: segClipLast, marginLeft: '-6px' }}
                            >
                                FULL YEAR ▸
                            </button>
                        </div>
                    </div>

                    {/* Section Tabs */}
                    <div className="flex border-b border-zinc-900">
                        {(['MONTH', 'QUARTER', 'NYS', 'CUSTOM'] as const).map(sec => (
                            <button
                                key={sec}
                                onClick={() => setActiveSection(activeSection === sec ? null : sec)}
                                className={`flex-1 py-3 text-sm font-mono tracking-[0.2em] uppercase transition-colors border-b-2 font-bold ${activeSection === sec
                                    ? 'text-[#FFD700] border-[#FFD700] bg-[#FFD700]/5'
                                    : 'text-zinc-600 border-transparent hover:text-zinc-400 hover:bg-zinc-900/50'
                                    }`}
                            >
                                {sec === 'NYS' ? 'NYS TAX' : sec}
                            </button>
                        ))}
                    </div>

                    {/* ─── MONTH GRID ──────────────────────────────────────── */}
                    {activeSection === 'MONTH' && (
                        <div className="p-4">
                            <div className="text-xs font-mono text-zinc-600 tracking-[0.3em] uppercase mb-4 font-bold">Calendar Months · {selectedYear}</div>
                            <div className="grid grid-cols-4 gap-[2px]">
                                {MONTHS.map((m, idx) => {
                                    const monthKey = `${selectedYear}-${String(idx + 1).padStart(2, '0')}`;
                                    const isSelected = currentFilter.type === 'MONTH' && currentFilter.dateStr === monthKey;
                                    const dataCount = monthDataCounts?.get(monthKey) ?? -1;
                                    const hasData = dataCount > 0;
                                    const isKnown = dataCount >= 0;
                                    return (
                                        <button
                                            key={m}
                                            onClick={() => selectMonth(idx)}
                                            className={`py-3.5 text-center font-mono font-bold transition-colors relative ${isSelected
                                                ? 'bg-[#FFD700] text-black text-base'
                                                : hasData
                                                    ? 'bg-[#0A0A0A] text-zinc-300 hover:bg-zinc-800 hover:text-white text-sm'
                                                    : isKnown
                                                        ? 'bg-[#0A0A0A] text-zinc-700 hover:bg-zinc-900 text-sm opacity-50'
                                                        : 'bg-[#0A0A0A] text-zinc-500 hover:bg-zinc-900 text-sm'
                                                }`}
                                            style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
                                            title={isKnown ? (hasData ? `${dataCount} records` : 'No data') : m}
                                        >
                                            {m}
                                            {isKnown && hasData && !isSelected && (
                                                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#FFD700] rounded-full" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ─── QUARTER GRID ────────────────────────────────────── */}
                    {activeSection === 'QUARTER' && (
                        <div className="p-4">
                            <div className="text-xs font-mono text-zinc-600 tracking-[0.3em] uppercase mb-4 font-bold">Standard Fiscal Quarters · {selectedYear}</div>
                            <div className="grid grid-cols-4 gap-[3px]">
                                {[1, 2, 3, 4].map(q => {
                                    const months = MONTHS.slice((q - 1) * 3, q * 3);
                                    const isSelected = currentFilter.type === 'QUARTER' && currentFilter.quarter === q && currentFilter.year === selectedYear;
                                    return (
                                        <button
                                            key={q}
                                            onClick={() => selectQuarter(q)}
                                            className={`py-4 flex flex-col items-center gap-1.5 font-mono transition-colors ${isSelected
                                                ? 'bg-[#FFD700] text-black'
                                                : 'bg-[#0A0A0A] text-zinc-400 hover:bg-zinc-800 hover:text-white'
                                                }`}
                                            style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
                                        >
                                            <span className={`text-xl font-bold ${isSelected ? '' : 'text-zinc-300'}`}>Q{q}</span>
                                            <span className="text-xs font-bold tracking-widest text-[#FFD700]/60">{months.join('–')}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ─── NYS TAX QUARTERS ────────────────────────────────── */}
                    {activeSection === 'NYS' && (
                        <div className="p-4">
                            <div className="text-xs font-mono text-zinc-600 tracking-[0.3em] uppercase mb-4 font-bold">NYS Sales Tax Filing Periods · {selectedYear}</div>
                            <div className="grid grid-cols-2 gap-[3px]">
                                {NYS_QUARTERS.map((nq) => {
                                    const isSelected = currentFilter.type === 'NYS_QUARTER' && currentFilter.quarter === nq.q && currentFilter.year === selectedYear;
                                    return (
                                        <button
                                            key={nq.q}
                                            onClick={() => selectNYSQuarter(nq.q)}
                                            className={`py-3 px-4 flex flex-col gap-2 font-mono transition-colors text-left ${isSelected
                                                ? 'bg-[#FFD700] text-black'
                                                : 'bg-[#0A0A0A] text-zinc-400 hover:bg-zinc-800'
                                                }`}
                                            style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className={`text-base font-bold ${isSelected ? 'text-black' : 'text-zinc-200'}`}>[NYS_Q{nq.q}]</span>
                                                <span className="text-sm font-bold tracking-wider">{nq.label}</span>
                                            </div>
                                            <span className={`text-xs font-bold tracking-widest ${isSelected ? 'text-black/60' : 'text-[#FFD700]/60'}`}>
                                                FILING DUE: {nq.filing}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ─── CUSTOM RANGE (Terminal-style) ───────────────────── */}
                    {activeSection === 'CUSTOM' && (
                        <div className="p-4">
                            <div className="text-xs font-mono text-zinc-600 tracking-[0.3em] uppercase mb-4 font-bold flex justify-between">
                                <span>Custom Date Range · Terminal Input</span>
                                {matchedRecords !== null && (
                                    <span className={matchedRecords > 0 ? 'text-[#FFD700]' : 'text-[#71717A] animate-pulse'}>
                                        {matchedRecords > 0 ? `MATCHING_RECORDS: ${String(matchedRecords).padStart(3, '0')}` : '[ SYS.WARN // ZERO_DATAGRAMS_LOCATED ]'}
                                    </span>
                                )}
                            </div>
                            <div className="bg-[#0A0A0A] border border-zinc-800 p-4 font-mono relative">
                                <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-zinc-700" />
                                <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-zinc-700" />

                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-sm text-zinc-500 font-bold">{'>'}</span>
                                    <span className="text-sm text-[#FFD700] tracking-widest font-bold w-16">START</span>
                                    <div className="flex-1 relative h-7">
                                        {renderMaskedDate(customStart)}
                                        <input
                                            type="text"
                                            value={customStart}
                                            onChange={(e) => handleDateInput(e.target.value, setCustomStart)}
                                            placeholder="YYYYMMDD"
                                            className="w-full h-full absolute left-0 top-0 bg-transparent text-transparent caret-[#FFD700] outline-none font-bold text-lg font-mono tracking-wider placeholder:text-zinc-800"
                                            style={{ color: 'transparent' }}
                                        />
                                        {!customStart && (
                                            <span className="absolute left-0 top-1 w-[2px] h-5 bg-[#FFD700] animate-pulse" />
                                        )}
                                        <div className="absolute bottom-[-4px] left-0 w-full h-[1px] bg-zinc-800" />
                                        <div className="absolute bottom-[-4px] left-0 h-[1px] bg-[#FFD700] transition-all" style={{ width: customStart ? `${(customStart.length / 10) * 100}%` : '0%' }} />
                                    </div>
                                    {customStart.length === 10 && (
                                        <span className={`text-xs font-bold tracking-wider ${validateDateInput(customStart) ? 'text-[#FFD700]' : 'text-zinc-600'}`}>
                                            {validateDateInput(customStart) ? 'ACK' : 'ERR'}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-3 mb-6">
                                    <span className="text-sm text-zinc-500 font-bold">{'>'}</span>
                                    <span className="text-sm text-zinc-500 tracking-widest font-bold w-16">END</span>
                                    <div className="flex-1 relative h-7">
                                        {renderMaskedDate(customEnd)}
                                        <input
                                            type="text"
                                            value={customEnd}
                                            onChange={(e) => handleDateInput(e.target.value, setCustomEnd)}
                                            placeholder="YYYYMMDD"
                                            className="w-full h-full absolute left-0 top-0 bg-transparent text-transparent caret-[#FFD700] outline-none font-bold text-lg font-mono tracking-wider placeholder:text-zinc-800"
                                            style={{ color: 'transparent' }}
                                        />
                                        {!customEnd && (
                                            <span className="absolute left-0 top-1 w-[2px] h-5 bg-[#FFD700] animate-pulse" />
                                        )}
                                        <div className="absolute bottom-[-4px] left-0 w-full h-[1px] bg-zinc-800" />
                                        <div className="absolute bottom-[-4px] left-0 h-[1px] bg-[#FFD700] transition-all" style={{ width: customEnd ? `${(customEnd.length / 10) * 100}%` : '0%' }} />
                                    </div>
                                    {customEnd.length === 10 && (
                                        <span className={`text-xs font-bold tracking-wider ${validateDateInput(customEnd) ? 'text-[#FFD700]' : 'text-zinc-600'}`}>
                                            {validateDateInput(customEnd) ? 'ACK' : 'ERR'}
                                        </span>
                                    )}
                                </div>

                                <button
                                    onClick={applyCustomRange}
                                    disabled={!validateDateInput(customStart) || !validateDateInput(customEnd)}
                                    className={`w-full flex items-center justify-between py-3 px-4 text-sm font-mono font-bold tracking-[0.2em] uppercase transition-colors
                                        ${(!validateDateInput(customStart) || !validateDateInput(customEnd) || matchedRecords === 0)
                                            ? 'bg-transparent text-zinc-600 border border-zinc-800/50 cursor-not-allowed'
                                            : 'bg-[#FFD700] text-black hover:bg-[#FFD700]/90 border border-transparent'
                                        }`}
                                    style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
                                >
                                    <span>{(!validateDateInput(customStart) || !validateDateInput(customEnd) || matchedRecords === 0) ? 'SYSTEM HALTED' : 'EXECUTE QUERY'}</span>
                                    <span className="tracking-widest">{'>_'}</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* No section selected — show hint */}
                    {!activeSection && (
                        <div className="px-4 py-8 text-center">
                            <span className="text-sm font-mono text-zinc-600 tracking-[0.3em] uppercase font-bold">Select a temporal axis above</span>
                        </div>
                    )}

                    {/* Bottom accent */}
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
                </div>
            )}
        </div>
    );
};

// ============================================================================
// STATIC KPI CARD (NO ANIMATIONS)
// ============================================================================
const StaticKPICard = ({ title, value, subtitle, highlight }: {
    title: string; value: string; subtitle?: string; highlight?: boolean;
}) => (
    <div
        className={`relative p-5 flex flex-col justify-between overflow-hidden group transition-colors duration-0 border ${highlight ? 'bg-[#FFD700]/5 border-[#FFD700] hover:bg-[#FFD700]/10' : 'bg-[#050505] border-zinc-800 hover:border-[#FFD700] hover:bg-[#FFD700]/5'}`}
        style={{
            clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
        }}
    >
        <div className="flex justify-between items-start z-10 w-full mb-4">
            <span className="text-sm font-mono tracking-[0.2em] text-[#71717A] uppercase truncate pr-2">{title}</span>
            {highlight && <span className="w-2.5 h-2.5 shrink-0 bg-[#FFD700]" />}
        </div>
        <div className="z-10 flex flex-col">
            <span className="text-2xl sm:text-3xl 2xl:text-4xl font-mono font-bold text-white tracking-tighter truncate w-full" style={{ textShadow: highlight ? '0 0 15px rgba(252,225,0,0.4)' : 'none' }}>
                {value}
            </span>
            {subtitle && <span className="text-sm font-mono tracking-widest text-[#FFD700] mt-1.5 font-bold uppercase">{subtitle}</span>}
        </div>
        <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#FFD700]/50" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#FFD700]/50" />
    </div>
);

// ============================================================================
// GEOGRAPHIC REVENUE BY REGION — accepts pre-computed data
// ============================================================================
interface GeoRegionItem {
    name: string;
    revenue: number;
    orders: number;
    tax: number;
}

const GeoRevenueByRegion = ({ data }: { data: GeoRegionItem[] }) => {
    const maxRev = Math.max(...data.map(r => r.revenue), 1);
    const totalOrders = data.reduce((a, r) => a + r.orders, 0);

    return (
        <div className="w-full h-full bg-[#050505] border border-zinc-800 p-5 relative flex flex-col">
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#FFD700 1px, transparent 1px), linear-gradient(90deg, #FFD700 1px, transparent 1px)', backgroundSize: '40px 40px', backgroundPosition: 'center center' }} />
            <div className="flex justify-between items-center mb-5 border-b border-zinc-900 pb-2 relative z-10">
                <h3 className="text-base font-mono text-[#71717A] tracking-[0.3em] uppercase font-bold">Geo Revenue Sectors</h3>
                <span className="text-sm font-mono text-zinc-600 uppercase tracking-widest font-bold">{totalOrders} TXN</span>
            </div>
            <div className="flex-1 flex flex-col justify-around w-full gap-1 relative z-10">
                {data.map((reg, idx) => {
                    const pct = (reg.revenue / maxRev) * 100;
                    return (
                        <div key={idx} className="w-full">
                            <div className="flex justify-between items-baseline mb-1 gap-2">
                                <div className="flex items-baseline gap-2 min-w-0 flex-1">
                                    <span className="text-sm lg:text-base font-mono text-white tracking-widest font-bold truncate max-w-[120px] lg:max-w-[200px]">{reg.name}</span>
                                    <span className="text-xs lg:text-sm font-mono text-zinc-500 font-bold shrink-0">{reg.orders}</span>
                                </div>
                                <span className="text-sm lg:text-base font-mono text-[#FFD700] tabular-nums font-bold shrink-0">{(reg.revenue / 1000).toFixed(1)}K $</span>
                            </div>
                            <div className="w-full h-[4px] bg-[#111] relative">
                                <div
                                    className="h-full"
                                    style={{ width: `${pct}%`, opacity: 0.5 + (pct / 100) * 0.5, background: 'linear-gradient(90deg, rgba(252,225,0,0.5) 0%, #FFD700 100%)', boxShadow: '0 0 8px rgba(252,225,0,0.5)' }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#FFD700]/50 m-2" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#FFD700]/50 m-2" />
        </div>
    );
};


// ============================================================================
// API RESPONSE TYPE
// ============================================================================
interface DashboardStatsResponse {
    kpis: { totalRev: number; totalTax: number; avgRate: number; orders: number };
    revenueByDay: RevenueByDayItem[];
    taxBreakdown: TaxBreakdownData;
    dailyHeatmap: HeatmapDayItem[];
    aovByDay: AovByDayItem[];
    geoRevenue: GeoRegionItem[];
    recentOrders: any[];
    monthCounts: Record<string, number>;
}

// ============================================================================
// MAIN STATS DASHBOARD
// ============================================================================
export default function StatsDashboard() {
    const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [showSpinner, setShowSpinner] = useState(false);
    const [timeFilter, setTimeFilter] = useState<TimeFilterConfig>({ type: '30D' });
    const [monthDataCounts, setMonthDataCounts] = useState<Map<string, number>>(new Map());

    const { start: filterStart, end: filterEnd } = useMemo(() => resolveFilterDateRange(timeFilter), [timeFilter]);

    // Single fetch for ALL dashboard data — with delayed loading indicator
    useEffect(() => {
        setLoading(true);
        setShowSpinner(false);

        // Only show the spinner if the request takes longer than 300ms
        const spinnerTimer = setTimeout(() => setShowSpinner(true), 300);

        const params = new URLSearchParams();
        if (filterStart) params.set('dateFrom', filterStart.toISOString().split('T')[0]);
        if (filterEnd) params.set('dateTo', filterEnd.toISOString().split('T')[0]);

        fetch(`/api/dashboard-stats?${params.toString()}`)
            .then(res => res.json())
            .then((json: DashboardStatsResponse) => {
                setStats(json);
                // Set month counts from the single response
                if (json.monthCounts) {
                    const counts = new Map<string, number>();
                    Object.entries(json.monthCounts).forEach(([k, v]) => counts.set(k, v));
                    setMonthDataCounts(counts);
                }
            })
            .catch(err => {
                console.error("Failed to load dashboard data:", err);
                setStats(null);
            })
            .finally(() => {
                clearTimeout(spinnerTimer);
                setLoading(false);
                setShowSpinner(false);
            });

        return () => clearTimeout(spinnerTimer);
    }, [timeFilter]);

    const checkDataRangeCount = useCallback((startStr: string, endStr: string) => {
        // Quick estimate from month counts
        if (!stats) return 0;
        const start = new Date(startStr + 'T00:00:00.000Z');
        const end = new Date(endStr + 'T23:59:59.999Z');
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
        // Estimate from revenueByDay data (days with data = records exist)
        return stats.revenueByDay.filter(d => {
            const dTime = new Date(d.date + 'T12:00:00Z').getTime();
            return dTime >= start.getTime() && dTime <= end.getTime();
        }).length;
    }, [stats]);

    const KPIs = stats?.kpis ?? { totalRev: 0, totalTax: 0, avgRate: 0, orders: 0 };

    const exportData: ExportSummaryData = useMemo(() => ({
        kpis: KPIs,
        taxBreakdown: stats?.taxBreakdown ?? { state: 0, county: 0, city: 0, special: 0 },
    }), [stats]);

    return (
        <div className="min-h-screen relative bg-[#000000] text-[#FFFFFF] font-sans overflow-x-hidden selection:bg-[#FFD700] selection:text-black w-full">
            <style>{`
                @keyframes bootSequence {
                    0% { opacity: 0; transform: translateY(15px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                @keyframes glitchInitial {
                    0%, 100% { text-shadow: none; transform: translate(0); }
                    20% { transform: translate(-2px, 1px); text-shadow: 2px 0px #FFD700, -2px 0px #FF003C; }
                    40% { transform: translate(2px, -1px); text-shadow: -2px 0px #00FFFF, 2px 0px #FFD700; }
                    60% { transform: translate(0, 0); text-shadow: 2px 0px #FFD700; }
                }
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .boot-anim { opacity: 0; animation: bootSequence 0.6s cubic-bezier(0.1, 0.9, 0.2, 1) forwards; }
                .boot-del-1 { animation-delay: 0.1s; }
                .boot-del-2 { animation-delay: 0.2s; }
                .boot-del-3 { animation-delay: 0.3s; }
                .boot-del-4 { animation-delay: 0.4s; }
                .boot-del-5 { animation-delay: 0.5s; }
                .glitch-once { animation: glitchInitial 0.4s ease-out 0.2s forwards; }
                .cursor-blink { animation: blink 1s step-end infinite; }
            `}</style>

            {/* CRT Scanline Overlay */}
            <div className="pointer-events-none fixed inset-0 z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] mix-blend-overlay opacity-30" />

            <div className="relative z-10 w-full px-6 py-6 pb-24">
                {/* Header */}
                <header className="mb-4 lg:mb-6 xl:mb-8 flex flex-col gap-3 lg:gap-4 border-b border-zinc-900 pb-4 lg:pb-5 boot-anim relative z-50">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 lg:gap-4">
                        <div className="flex flex-col gap-1 shrink-0">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-2 h-6 bg-[#FFD700]" />
                                <h1 className="text-xl lg:text-2xl xl:text-3xl font-mono font-bold text-[#FFFFFF] tracking-tighter uppercase whitespace-nowrap glitch-once">
                                    <span className="text-zinc-500">CORPO.</span>
                                    <span className="text-[#FFD700]">TAX_OS</span>
                                </h1>
                            </div>
                            <p className="text-[#71717A] font-mono text-xs lg:text-sm uppercase tracking-[0.15em] lg:tracking-[0.3em] flex items-center gap-2">
                                <span className="w-2 h-2 border border-[#FFD700] shrink-0" />
                                <span className="truncate">Secure Executive Override <span className="hidden lg:inline">// System Nominal</span></span>
                                <span className="text-[#FFD700] cursor-blink font-bold">_</span>
                            </p>
                        </div>
                        <div className="flex gap-3 lg:gap-4 xl:gap-6 font-mono text-sm text-zinc-500 items-center">
                            <div className="hidden xl:flex flex-col items-end border-l border-zinc-900 pl-4 xl:pl-6 space-y-1">
                                <span className="uppercase text-xs tracking-[0.2em] text-[#71717A]">Sector Status</span>
                                <span className="text-[#FFD700] text-xs xl:text-sm font-bold tracking-widest flex items-center gap-2 bg-[#FFD700]/10 px-2 py-0.5 border border-[#FFD700]/20">
                                    <span className="w-2 h-2 bg-[#FFD700]" />
                                    LIVE_SYNC
                                </span>
                            </div>
                            <div className="hidden xl:flex flex-col items-end pl-4 xl:pl-6 border-l border-zinc-900 space-y-1">
                                <span className="uppercase text-xs tracking-[0.2em] text-[#71717A]">Node Time</span>
                                <LiveSyncClock />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center">
                        <HoloTimeFilter currentFilter={timeFilter} onFilterChange={setTimeFilter} checkDataRange={checkDataRangeCount} monthDataCounts={monthDataCounts} />
                    </div>
                </header>

                {/* Scrollable Content */}
                <div className="flex flex-col gap-8 w-full">

                    {/* ─── LOADING OVERLAY — only shows if request takes >300ms ── */}
                    {showSpinner && !stats && (
                        <div className="flex flex-col items-center justify-center py-32 boot-anim">
                            <div className="w-16 h-16 border-2 border-[#FFD700]/30 flex items-center justify-center mb-6 relative">
                                <div className="w-8 h-8 border-2 border-[#FFD700] border-t-transparent animate-spin" />
                            </div>
                            <p className="text-[#FFD700] text-[16px] font-mono tracking-[0.3em] uppercase font-bold animate-pulse">ESTABLISHING DATA STREAM...</p>
                            <p className="text-zinc-600 text-[12px] font-mono tracking-[0.2em] uppercase mt-3">{getFilterLabel(timeFilter)}</p>
                        </div>
                    )}

                    {/* ─── NO DATA STATE ────────────────────────────────────────── */}
                    {!loading && stats && stats.kpis.orders === 0 && (
                        <div className="flex flex-col items-center justify-center py-32 boot-anim">
                            <div className="w-20 h-20 border-2 border-zinc-800 flex items-center justify-center mb-6 relative" style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))' }}>
                                <span className="text-3xl font-mono text-zinc-600">∅</span>
                            </div>
                            <p className="text-zinc-400 text-[18px] font-mono tracking-[0.3em] uppercase font-bold mb-3">NO DATA IN THIS PERIOD</p>
                            <p className="text-zinc-600 text-[13px] font-mono tracking-[0.2em] uppercase mb-1">
                                Filter: <span className="text-[#FFD700]">{getFilterLabel(timeFilter)}</span>
                            </p>
                            <p className="text-zinc-700 text-[11px] font-mono tracking-[0.15em] uppercase mt-2">
                                Try selecting a different period or use ALL TIME to view all records
                            </p>
                            <button
                                onClick={() => setTimeFilter({ type: 'ALL' })}
                                className="mt-6 px-8 py-3 bg-[#0A0A0A] border border-[#FFD700]/30 text-[#FFD700] font-mono text-sm tracking-[0.2em] uppercase font-bold hover:bg-[#FFD700] hover:text-black transition-colors"
                                style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
                            >
                                SHOW ALL TIME ▸
                            </button>
                        </div>
                    )}

                    {/* ─── DASHBOARD CONTENT (only when data is available) ──────── */}
                    {stats && stats.kpis.orders > 0 && (<>

                        {/* ─── EXPORT STRIP ──────────────────────────────────────────── */}
                        <section className="mb-6 boot-anim">
                            <QuickExportPanel data={exportData} />
                        </section>

                        {/* ─── SECTION 1: KPI CARDS ───────────────────────────────────── */}
                        <section className="mt-4 boot-anim boot-del-1">
                            <div className="flex items-center gap-3 mb-4 lg:mb-5">
                                <div className="w-1 h-3 lg:h-4 bg-[#FFD700]" />
                                <span className="text-xs lg:text-sm font-mono text-[#FFD700] uppercase tracking-[0.2em] lg:tracking-[0.3em] font-bold">Key Metrics</span>
                                <div className="flex-1 h-px bg-zinc-900" />
                            </div>
                            {/* Row 1: 4 compact KPI cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4 mb-4 lg:mb-5">
                                <div className="min-h-[110px] lg:min-h-[120px] xl:min-h-[140px]"><StaticKPICard title="Total Gross Volume" value={`${KPIs.totalRev.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`} subtitle="System Accumulation" /></div>
                                <div className="min-h-[110px] lg:min-h-[120px] xl:min-h-[140px]"><StaticKPICard title="Retained Tax Yield" value={`${KPIs.totalTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`} subtitle="Liquid Reserve" highlight /></div>
                                <div className="min-h-[110px] lg:min-h-[120px] xl:min-h-[140px]"><StaticKPICard title="Composite Tax Rate" value={`${(KPIs.avgRate * 100).toFixed(3)}%`} subtitle="Mean Extraction" /></div>
                                <div className="min-h-[110px] lg:min-h-[120px] xl:min-h-[140px]"><StaticKPICard title="Settled Datagrams" value={KPIs.orders.toLocaleString()} subtitle="Node Transactions" /></div>
                            </div>
                            {/* Row 2: Period Comparison (wider) + Eff Rate Gauge (narrower) */}
                            <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 lg:gap-5">
                                <div className="xl:col-span-3 min-h-[250px] lg:min-h-[280px] xl:min-h-[300px] h-[280px] lg:h-[320px] xl:h-[380px]"><PeriodComparisonCard data={stats.revenueByDay} /></div>
                                <div className="xl:col-span-2 min-h-[250px] lg:min-h-[280px] xl:min-h-[300px] h-[280px] lg:h-[320px] xl:h-[380px]"><EffectiveRateGauge rate={KPIs.avgRate} /></div>
                            </div>
                        </section>

                        {/* ─── SECTION 2: REVENUE CHART (full width, generous height) ── */}
                        <section className="mt-6 lg:mt-8 boot-anim boot-del-2">
                            <div className="flex items-center gap-3 mb-4 lg:mb-5">
                                <div className="w-1 h-3 lg:h-4 bg-[#FFD700]" />
                                <span className="text-xs lg:text-sm font-mono text-[#FFD700] uppercase tracking-[0.2em] lg:tracking-[0.3em] font-bold">Revenue Analysis</span>
                                <div className="flex-1 h-px bg-zinc-900" />
                            </div>
                            <div className="min-h-[300px] lg:min-h-[350px] xl:min-h-[400px] h-[320px] lg:h-[380px] xl:h-[450px]">
                                <RevenueVsTaxChart data={stats.revenueByDay} dateRange={{ start: filterStart, end: filterEnd }} />
                            </div>
                        </section>

                        {/* ─── SECTION 3: TAX BREAKDOWN + AOV + LIABILITY ────────────── */}
                        <section className="mt-6 lg:mt-8 boot-anim boot-del-3">
                            <div className="flex items-center gap-3 mb-4 lg:mb-5">
                                <div className="w-1 h-3 lg:h-4 bg-[#FFD700]" />
                                <span className="text-xs lg:text-sm font-mono text-[#FFD700] uppercase tracking-[0.2em] lg:tracking-[0.3em] font-bold">Tax Distribution & Trends</span>
                                <div className="flex-1 h-px bg-zinc-900" />
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5 xl:gap-6">
                                <div className="min-h-[280px] lg:min-h-[300px] xl:min-h-[350px] h-[300px] lg:h-[340px] xl:h-[380px]">
                                    <TaxBreakdownDonut data={stats.taxBreakdown} />
                                </div>
                                <div className="min-h-[280px] lg:min-h-[300px] xl:min-h-[350px] h-[300px] lg:h-[340px] xl:h-[380px]">
                                    <AvgOrderValueTrend data={stats.aovByDay} dateRange={{ start: filterStart, end: filterEnd }} />
                                </div>
                                <div className="min-h-[280px] lg:min-h-[300px] xl:min-h-[350px] h-[300px] lg:h-[340px] xl:h-[380px]">
                                    <TaxLiabilitySummary data={stats.taxBreakdown} />
                                </div>
                            </div>
                        </section>

                        {/* ─── SECTION 4: GEO REVENUE + HEATMAP ──────────────────────── */}
                        <section className="mt-6 lg:mt-8 mb-6 boot-anim boot-del-4">
                            <div className="flex items-center gap-3 mb-4 lg:mb-5">
                                <div className="w-1 h-3 lg:h-4 bg-[#FFD700]" />
                                <span className="text-xs lg:text-sm font-mono text-[#FFD700] uppercase tracking-[0.2em] lg:tracking-[0.3em] font-bold">Geographic & Temporal</span>
                                <div className="flex-1 h-px bg-zinc-900" />
                            </div>
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-5 xl:gap-6">
                                <div className="min-h-[300px] lg:min-h-[350px] xl:min-h-[400px] h-[320px] lg:h-[360px] xl:h-[420px]">
                                    <GeoRevenueByRegion data={stats.geoRevenue} />
                                </div>
                                <div className="min-h-[300px] lg:min-h-[350px] xl:min-h-[400px] h-[320px] lg:h-[360px] xl:h-[420px]">
                                    <DailyOrdersHeatmap data={stats.dailyHeatmap} />
                                </div>
                            </div>
                        </section>

                    </>)}
                </div>
            </div>
        </div>
    );
}
