import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchOrders, fetchSummary, type OrdersParams, type Order } from '../api/orders';
import TaxBreakdownPopover from './TaxBreakdownPopover';
import { Calendar as CalendarIcon, Inbox, Loader2, ChevronLeft, ChevronRight, AlertOctagon, Download } from 'lucide-react';

export default function OrdersTable() {
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const params: OrdersParams = {
        page,
        limit,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
    };

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['orders', params],
        queryFn: () => fetchOrders(params),
    });

    const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
        queryKey: ['orders-summary', { dateFrom: params.dateFrom, dateTo: params.dateTo }],
        queryFn: () => fetchSummary({ dateFrom: params.dateFrom, dateTo: params.dateTo }),
    });

    const handleExport = () => {
        const searchParams = new URLSearchParams();
        if (dateFrom) searchParams.set('dateFrom', dateFrom);
        if (dateTo) searchParams.set('dateTo', dateTo);
        window.location.href = `/api/orders/export?${searchParams.toString()}`;
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
        return `$${parseFloat(val).toFixed(2)}`;
    };

    const formatRate = (rate: string) => {
        return `${(parseFloat(rate) * 100).toFixed(4)}%`;
    };

    // Error State renders completely differently for maximum premium feel
    if (isError) {
        return (
            <div className="flex flex-col h-full animate-fade-in-up">
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-full max-w-lg bg-[#121214] border border-red-500/20 rounded-2xl p-8 text-center shadow-[0_0_50px_rgba(239,68,68,0.1)] relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500/0 via-red-500 to-red-500/0" />
                        <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20 mb-6">
                            <AlertOctagon className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-xl font-semibold text-white tracking-tight mb-2">System Exception Occurred</h3>
                        <div className="bg-black/50 border border-white/5 rounded-lg p-4 font-mono text-sm text-red-400 break-words mb-6 inline-block text-left relative overflow-x-auto w-full">
                            {(error as Error).message}
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2.5 bg-white text-black text-sm font-semibold rounded-lg hover:bg-zinc-200 transition-all active:scale-95"
                        >
                            Reconnect to Data Engine
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full animate-fade-in-up">
            {/* Header controls */}
            <div className="flex items-end justify-between mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-semibold text-white tracking-tight">Financial Ledger</h2>
                    <div className="text-xs text-zinc-500 font-mono mt-1.5 flex items-center gap-2 tracking-wide uppercase">
                        {isLoading ? (
                            <><Loader2 className="w-3 h-3 animate-spin text-blue-400" /> SYNCHRONIZING</>
                        ) : (
                            <><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> {data?.total.toLocaleString() || 0} PROCESSED TXNS</>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition-all bg-white/[0.04] hover:bg-white/10 rounded-lg border border-white/5 uppercase tracking-wider active:scale-95"
                    >
                        <Download className="w-3.5 h-3.5" /> Export Ledger
                    </button>
                    <div className="flex items-center bg-[#121214] border border-white/10 rounded-lg p-1 shadow-inner">
                        <div className="flex items-center gap-2 px-3 border-r border-white/10">
                            <CalendarIcon className="w-4 h-4 text-zinc-500" />
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                                className="bg-transparent text-sm text-zinc-300 font-mono focus:outline-none [&::-webkit-calendar-picker-indicator]:invert-[1] [&::-webkit-calendar-picker-indicator]:opacity-50 w-[115px]"
                            />
                        </div>
                        <div className="flex items-center gap-2 px-3">
                            <span className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest">To</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                                className="bg-transparent text-sm text-zinc-300 font-mono focus:outline-none [&::-webkit-calendar-picker-indicator]:invert-[1] [&::-webkit-calendar-picker-indicator]:opacity-50 w-[115px]"
                            />
                        </div>
                    </div>
                    {(dateFrom || dateTo) && (
                        <button
                            onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }}
                            className="px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-all bg-white/[0.04] hover:bg-white/10 rounded-lg border border-white/5 uppercase tracking-wider active:scale-95"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* CFO Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-[#121214] border border-white/10 rounded-xl p-5 shadow-lg relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">Total Sales</p>
                    <div className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
                        {isSummaryLoading ? <Loader2 className="w-5 h-5 animate-spin text-zinc-600" /> : formatMoney(summaryData?.total_sales || '0')}
                    </div>
                </div>
                <div className="bg-[#121214] border border-white/10 rounded-xl p-5 shadow-lg relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">Total Tax Liability</p>
                    <div className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
                        {isSummaryLoading ? <Loader2 className="w-5 h-5 animate-spin text-zinc-600" /> : formatMoney(summaryData?.total_tax || '0')}
                    </div>
                </div>
                <div className="bg-[#121214] border border-white/10 rounded-xl p-5 shadow-lg relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">Processed Orders</p>
                    <div className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
                        {isSummaryLoading ? <Loader2 className="w-5 h-5 animate-spin text-zinc-600" /> : (summaryData?.processed_orders?.toLocaleString() || '0')}
                    </div>
                </div>
            </div>

            {/* Table wrapper */}
            <div className="flex-1 bg-[#09090b] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col relative z-0">
                <div className="overflow-x-auto flex-1 relative">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="text-[10px] uppercase text-zinc-500 font-medium tracking-widest sticky top-0 bg-[#09090b]/90 backdrop-blur-xl z-20 border-b border-white/10">
                            <tr>
                                <th className="px-6 py-4 font-medium">Txn Hash</th>
                                <th className="px-6 py-4 font-medium">Timestamp</th>
                                <th className="px-6 py-4 font-medium text-right">Coordinates</th>
                                <th className="px-6 py-4 text-right font-medium">Subtotal</th>
                                <th className="px-6 py-4 text-right font-medium text-blue-500/80">Composite Rate</th>
                                <th className="px-6 py-4 text-right font-medium">Tax Yield</th>
                                <th className="px-6 py-4 text-right font-medium text-zinc-400">Total Cleared</th>
                                <th className="px-6 py-4 text-center font-medium">Breakdown</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.05]">
                            {isLoading && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-32 text-center h-full">
                                        <div className="flex flex-col items-center justify-center gap-4 animate-pulse-glow">
                                            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                                <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
                                            </div>
                                            <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">Querying Ledger...</p>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {data && data.data.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-32 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-16 h-16 rounded-2xl bg-white/[0.02] flex items-center justify-center border border-white/5">
                                                <Inbox className="w-6 h-6 text-zinc-600" />
                                            </div>
                                            <div>
                                                <p className="text-zinc-300 font-medium">No records found</p>
                                                <p className="text-zinc-500 text-sm mt-1">Adjust filters or ingest new payload.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {data?.data.map((order: Order) => (
                                <tr
                                    key={order.id}
                                    className="group hover:bg-white/[0.02] transition-colors duration-200"
                                >
                                    <td className="px-6 py-3.5">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors">
                                                {order.id.slice(0, 8)}
                                            </span>
                                            {order.source === 'manual' && (
                                                <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider leading-none">
                                                    MANUAL
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5 text-xs text-zinc-400">
                                        {formatDate(order.timestamp)}
                                    </td>
                                    <td className="px-6 py-3.5 text-right">
                                        <span className="font-mono text-[11px] text-zinc-500 tracking-tight bg-black px-2 py-1 rounded-md border border-white/5 inline-block min-w-min">
                                            {parseFloat(order.lat).toFixed(4)}, {parseFloat(order.lon).toFixed(4)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3.5 text-right text-zinc-400 font-mono tabular-nums text-xs">
                                        {formatMoney(order.subtotal)}
                                    </td>
                                    <td className="px-6 py-3.5 text-right">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/[0.08] text-blue-400 font-mono border border-blue-500/20 tabular-nums">
                                            {formatRate(order.composite_tax_rate)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3.5 text-right text-zinc-500 font-mono tabular-nums text-xs group-hover:text-zinc-300 transition-colors">
                                        {formatMoney(order.tax_amount)}
                                    </td>
                                    <td className="px-6 py-3.5 text-right text-emerald-400 font-semibold font-mono tabular-nums bg-emerald-500/[0.02] group-hover:bg-emerald-500/[0.05] transition-colors">
                                        {formatMoney(order.total_amount)}
                                    </td>
                                    <td className="px-6 py-3.5 text-center">
                                        <TaxBreakdownPopover
                                            breakdown={order.breakdown}
                                            jurisdictions={order.jurisdictions_applied}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {data && data.totalPages > 1 && (
                    <div className="border-t border-white/[0.08] bg-[#09090b] px-6 py-3 flex items-center justify-between z-10 sticky bottom-0">
                        <p className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">
                            Page <span className="text-zinc-200">{data.page}</span> / {data.totalPages}
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-1 text-zinc-500 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-500 transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-1 mx-2">
                                {/* Simplified sleek UI pagination logic */}
                                {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                                    let pageNum: number;
                                    if (data.totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (page <= 3) {
                                        pageNum = i + 1;
                                    } else if (page >= data.totalPages - 2) {
                                        pageNum = data.totalPages - 4 + i;
                                    } else {
                                        pageNum = page - 2 + i;
                                    }
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setPage(pageNum)}
                                            className={`w-7 h-7 rounded-md text-xs font-mono font-medium transition-all ${page === pageNum
                                                ? 'bg-white/10 text-white'
                                                : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                                disabled={page === data.totalPages}
                                className="p-1 text-zinc-500 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-500 transition-colors"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
