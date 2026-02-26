import { motion } from 'framer-motion';
import { useMemo, useEffect, useState } from 'react';
import KPICard from '../KPICard';
import DashboardChart from '../DashboardChart';
import TopJurisdictions from '../TopJurisdictions';
import NYGeoScatter from '../NYGeoScatter';
import TransactionsTable from '../TransactionsTable';
import SmartContractTerminal from '../SmartContractTerminal';
import TimeFilter, { TimeFilterConfig } from '../TimeFilter';
import { MOCK_ORDERS } from '../../data/mockData';

// Isolated clock to prevent full-dashboard re-renders every 1s
const LiveSyncClock = () => {
    const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }, 1000);
        return () => clearInterval(timer);
    }, []);
    return <span className="text-[#FFFFFF]">{time}</span>;
};

export default function StatsDashboard() {
    const defaultData = MOCK_ORDERS;

    const [timeFilter, setTimeFilter] = useState<TimeFilterConfig>({ type: 'ALL' });

    // Filter data based on selected TimeFilter
    const data = useMemo(() => {
        const now = new Date().getTime();
        return defaultData.filter(order => {
            const orderTime = new Date(order.timestamp).getTime();

            switch (timeFilter.type) {
                case '24H':
                    return now - orderTime <= 24 * 60 * 60 * 1000;
                case '7D':
                    return now - orderTime <= 7 * 24 * 60 * 60 * 1000;
                case '30D':
                    return now - orderTime <= 30 * 24 * 60 * 60 * 1000;
                case 'SPECIFIC_DAY':
                    if (!timeFilter.dateStr) return true;
                    return new Date(order.timestamp).toISOString().split('T')[0] === timeFilter.dateStr;
                case 'SPECIFIC_MONTH':
                    if (!timeFilter.dateStr) return true;
                    return new Date(order.timestamp).toISOString().slice(0, 7) === timeFilter.dateStr;
                case 'ALL':
                default:
                    return true;
            }
        });
    }, [defaultData, timeFilter]);

    // Calculate KPIs
    const KPIs = useMemo(() => {
        const totalRev = data.reduce((acc, sum) => acc + sum.total_amount, 0);
        const totalTax = data.reduce((acc, sum) => acc + sum.tax_amount, 0);
        const avgRate = data.length > 0 ? data.reduce((acc, sum) => acc + sum.composite_tax_rate, 0) / data.length : 0;
        const orders = data.length;

        return {
            totalRev,
            totalTax,
            avgRate,
            orders
        };
    }, [data]);

    return (
        <div className="min-h-screen bg-[#000000] text-[#FFFFFF] p-4 md:p-8 font-sans selection:bg-[#E50000] selection:text-[#FFFFFF] overflow-x-hidden">

            {/* Header */}
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-900 pb-6"
            >
                <div>
                    <h1 className="text-xl md:text-2xl font-mono text-[#FFFFFF] tracking-tighter uppercase whitespace-nowrap">
                        <span className="text-[#E50000]">NOTHING.TAX_OS</span> // NY.DRONE.DELIVERY
                    </h1>
                    <p className="text-zinc-500 font-sans text-xs mt-2 uppercase tracking-widest">
                        System Nominal. Secure Link Auth.
                    </p>
                </div>
                <div className="flex gap-4 font-mono text-xs text-zinc-500 items-center">
                    <TimeFilter currentFilter={timeFilter} onFilterChange={setTimeFilter} />
                    <div className="flex flex-col items-end border-l border-zinc-900 pl-4">
                        <span className="uppercase text-[10px] tracking-widest mb-1 text-zinc-600">Status</span>
                        <span className="text-[#FFFFFF] flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#E50000] animate-pulse-glow" />
                            ONLINE
                        </span>
                    </div>
                    <div className="flex flex-col items-end pl-4 border-l border-zinc-900">
                        <span className="uppercase text-[10px] tracking-widest mb-1 text-zinc-600">Last Sync</span>
                        <LiveSyncClock />
                    </div>
                </div>
            </motion.header>

            {/* Main Grid */}
            <div className="flex flex-col gap-6 pb-20">

                {/* KPI Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KPICard
                        title="Total Revenue"
                        value={`$${KPIs.totalRev.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        trend="+12.4%"
                        trendUp={true}
                        delay={0.1}
                        highlight={false}
                    />
                    <KPICard
                        title="Total Tax Yield"
                        value={`$${KPIs.totalTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        subtitle="Trailing 30 Days"
                        delay={0.15}
                        highlight={true}
                    />
                    <KPICard
                        title="Avg Composite Rate"
                        value={`${(KPIs.avgRate * 100).toFixed(3)}%`}
                        trend="-0.015%"
                        trendUp={false}
                        delay={0.2}
                        highlight={false}
                    />
                    <KPICard
                        title="Processed Orders"
                        value={KPIs.orders.toLocaleString()}
                        delay={0.25}
                        highlight={false}
                    />
                </div>

                {/* Middle split: Area Chart & Donut */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[450px]">
                    <div className="lg:col-span-2 h-[400px] lg:h-full min-h-0 min-w-0">
                        <DashboardChart data={data} />
                    </div>
                    <div className="h-[400px] lg:h-full min-h-0 min-w-0">
                        <TopJurisdictions data={data} />
                    </div>
                </div>

                {/* Bottom split: GeoScatter & Transactions Table */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[450px]">
                    <div className="h-[400px] lg:h-full min-h-0 min-w-0">
                        <NYGeoScatter data={data} />
                    </div>
                    <div className="lg:col-span-2 h-[400px] lg:h-full min-h-0 min-w-0">
                        <TransactionsTable data={data} />
                    </div>
                </div>

                {/* Footer split: Smart Contract Terminal Log */}
                <div className="h-[250px] w-full mt-2">
                    <SmartContractTerminal />
                </div>

            </div>
        </div>
    );
}
