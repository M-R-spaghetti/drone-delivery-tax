import { KPICard } from './components/KPICard'
import { DashboardChart } from './components/DashboardChart'
import { TaxDonutChart } from './components/TaxDonutChart'
import { NYGeoScatter } from './components/NYGeoScatter'
import { TransactionsTable } from './components/TransactionsTable'
import { mockOrders } from './data/mockData'
import { motion } from 'framer-motion'

function App() {
    const totalRevenue = mockOrders.reduce((sum, order) => sum + order.total_amount, 0);
    const totalTax = mockOrders.reduce((sum, order) => sum + order.tax_amount, 0);
    const avgTaxRate = mockOrders.reduce((sum, order) => sum + order.composite_tax_rate, 0) / mockOrders.length;
    const totalOrders = mockOrders.length;

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8 font-sans selection:bg-pure-red">
            {/* Header */}
            <motion.header
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4 pb-6 border-b border-zinc-900"
            >
                <div>
                    <h1 className="text-sm font-mono tracking-[0.5em] text-zinc-500 uppercase mb-1">
                        NOTHING.TAX_OS // SYSTEM.CORE
                    </h1>
                    <p className="text-2xl font-mono font-bold tracking-tighter">NY.DRONE.DELIVERY.ANALYTICS</p>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-mono text-zinc-600 uppercase">SYSTEM_STATE</span>
                        <span className="text-xs font-mono text-pure-red flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-pure-red animate-pulse" />
                            OPERATIONAL
                        </span>
                    </div>
                    <div className="h-10 w-[1px] bg-zinc-900 hidden md:block" />
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-mono text-zinc-600 uppercase">TIMESTAMP</span>
                        <span className="text-xs font-mono text-zinc-300">{new Date().toISOString().split('T')[0]} // 18:26:12</span>
                    </div>
                </div>
            </motion.header>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <KPICard
                    title="TOTAL REVENUE"
                    value={`$${(totalRevenue / 1000).toFixed(1)}K`}
                    subtitle="NET.DEBITS.NY"
                    delay={0.1}
                />
                <KPICard
                    title="TAX COLLECTED"
                    value={`$${totalTax.toLocaleString()}`}
                    subtitle="JURISDICTIONAL.CUT"
                    trend={{ value: "+12.4%", isPositive: true }}
                    delay={0.2}
                />
                <KPICard
                    title="AVG TAX RATE"
                    value={`${(avgTaxRate * 100).toFixed(2)}%`}
                    subtitle="COMPOSITE.INDEX"
                    delay={0.3}
                />
                <KPICard
                    title="TOTAL ORDERS"
                    value={totalOrders}
                    subtitle="UNIT.DELIVERIES"
                    trend={{ value: "NORMAL", isPositive: true }}
                    delay={0.4}
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                <div className="lg:col-span-2">
                    <DashboardChart data={mockOrders} delay={0.5} />
                </div>
                <div>
                    <TaxDonutChart data={mockOrders} delay={0.6} />
                </div>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div>
                    <NYGeoScatter data={mockOrders} delay={0.7} />
                </div>
                <div className="lg:col-span-2">
                    <TransactionsTable data={mockOrders} delay={0.8} />
                </div>
            </div>

            {/* Footer Decoration */}
            <footer className="mt-16 pt-8 border-t border-zinc-900 flex justify-between items-center opacity-30 pointer-events-none">
                <span className="text-[8px] font-mono uppercase tracking-[0.3em]">ENCRYPTED_LINK_ESTABLISHED</span>
                <div className="flex gap-4">
                    <span className="text-[8px] font-mono uppercase">VER_0.4.2</span>
                    <span className="text-[8px] font-mono uppercase">© 2026 ANTIGRAVITY.PROJECTS</span>
                </div>
            </footer>
        </div>
    )
}

export default App
