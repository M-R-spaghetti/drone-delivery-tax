import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, ShoppingCart, Percent, TrendingUp } from 'lucide-react';
import KpiCard from './KpiCard';
import TopCities from './TopCities';
import TopTransactions from './TopTransactions';
import RevenueChart from './RevenueChart';

export interface StatsData {
    summary: {
        totalOrders: number;
        totalRevenue: number;
        totalTax: number;
        averageOrderValue: number;
    };
    topCities: Array<{ city: string; orders: number; revenue: number }>;
    topTransactions: Array<{ order_id: string; amount: number; city: string; timestamp: string }>;
    revenueByDay: Array<{ date: string; revenue: number }>;
}

export default function StatsDashboard() {
    const [data, setData] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('http://localhost:3001/api/stats')
            .then(res => res.json())
            .then(json => {
                setData(json);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch stats:', err);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin glow-blue"></div>
            </div>
        );
    }

    if (!data) {
        return <div className="text-zinc-400 text-center py-20">Failed to load statistics.</div>;
    }

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    return (
        <motion.div
            className="flex flex-col gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header Text */}
            <motion.div
                className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 backdrop-blur-xl"
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            >
                <h1 className="text-2xl font-semibold text-white mb-2 tracking-tight">Analytics Overview</h1>
                <p className="text-zinc-400 text-sm leading-relaxed">
                    System performance is nominal. In the current period, NYS Drone Data has processed <strong className="text-zinc-200">{data.summary.totalOrders.toLocaleString()}</strong> deliveries
                    for a total revenue of <strong className="text-zinc-200">${data.summary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>.
                    The average order value stands at ${data.summary.averageOrderValue.toLocaleString(undefined, { maximumFractionDigits: 2 })},
                    yielding ${data.summary.totalTax.toLocaleString(undefined, { minimumFractionDigits: 2 })} in tax collection.
                </p>
            </motion.div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    title="Total Revenue"
                    value={data.summary.totalRevenue}
                    prefix="$"
                    icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
                    trend="+12.4%"
                    trendUp={true}
                    color="emerald"
                />
                <KpiCard
                    title="Total Orders"
                    value={data.summary.totalOrders}
                    icon={<ShoppingCart className="w-5 h-5 text-blue-400" />}
                    trend="+5.2%"
                    trendUp={true}
                    color="blue"
                />
                <KpiCard
                    title="Average Order Value"
                    value={data.summary.averageOrderValue}
                    prefix="$"
                    icon={<TrendingUp className="w-5 h-5 text-purple-400" />}
                    trend="-1.2%"
                    trendUp={false}
                    color="purple"
                />
                <KpiCard
                    title="Total Tax Collected"
                    value={data.summary.totalTax}
                    prefix="$"
                    icon={<Percent className="w-5 h-5 text-pink-400" />}
                    trend="+14.8%"
                    trendUp={true}
                    color="pink"
                />
            </div>

            {/* Main Visuals: Chart & Top Transctions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <RevenueChart data={data.revenueByDay} />
                </div>
                <div>
                    <TopTransactions transactions={data.topTransactions} />
                </div>
            </div>

            {/* Geo Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
                <TopCities cities={data.topCities} />
            </div>
        </motion.div>
    );
}
