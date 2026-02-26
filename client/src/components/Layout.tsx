import { ReactNode } from 'react';
import { LayoutDashboard, UploadCloud, Hexagon, Plus } from 'lucide-react';

interface LayoutProps {
    children: ReactNode;
    activeTab: 'orders' | 'upload' | 'stats';
    setActiveTab: (tab: 'orders' | 'upload' | 'stats') => void;
    onNewOrder: () => void;
}

export default function Layout({ children, activeTab, setActiveTab, onNewOrder }: LayoutProps) {
    return (
        <div className="flex h-screen bg-[#09090b] overflow-hidden text-zinc-300 font-sans antialiased">
            {/* Left Sidebar */}
            <aside className="w-64 bg-[#09090b]/80 backdrop-blur-xl border-r border-white/[0.08] flex flex-col z-20 transition-all">
                {/* Logo Area */}
                <div className="h-16 flex items-center px-6 border-b border-white/[0.08]">
                    <div className="flex items-center gap-3">
                        <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900 border border-white/10 shadow-lg">
                            <Hexagon className="w-4 h-4 text-white" />
                        </div>
                        <h1 className="text-sm font-semibold tracking-tight text-white">
                            NYS Drone Data
                        </h1>
                    </div>
                </div>

                {/* Nav Links */}
                <nav className="flex-1 px-4 py-6 flex flex-col gap-1.5">
                    <button
                        onClick={() => setActiveTab('stats')}
                        className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-out active:scale-95 ${activeTab === 'stats'
                            ? 'bg-white/[0.04] text-white'
                            : 'text-zinc-500 hover:bg-white/[0.02] hover:text-zinc-300'
                            }`}
                    >
                        {activeTab === 'stats' && (
                            <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                        )}
                        <LayoutDashboard className={`w-4 h-4 transition-colors ${activeTab === 'stats' ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-400'}`} />
                        Analytics Dashboard
                    </button>

                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-out active:scale-95 ${activeTab === 'orders'
                            ? 'bg-white/[0.04] text-white'
                            : 'text-zinc-500 hover:bg-white/[0.02] hover:text-zinc-300'
                            }`}
                    >
                        {activeTab === 'orders' && (
                            <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                        )}
                        <Hexagon className={`w-4 h-4 transition-colors ${activeTab === 'orders' ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-400'}`} />
                        Ledger
                    </button>

                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-out active:scale-95 ${activeTab === 'upload'
                            ? 'bg-white/[0.04] text-white'
                            : 'text-zinc-500 hover:bg-white/[0.02] hover:text-zinc-300'
                            }`}
                    >
                        {activeTab === 'upload' && (
                            <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                        )}
                        <UploadCloud className={`w-4 h-4 transition-colors ${activeTab === 'upload' ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-400'}`} />
                        Batch Upload
                    </button>
                </nav>

                {/* Bottom Actions */}
                <div className="p-4 border-t border-white/[0.08]">
                    <button
                        onClick={onNewOrder}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-all duration-300 active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                    >
                        <Plus className="w-4 h-4" />
                        New Order
                    </button>
                    <div className="mt-4 flex items-center gap-2 px-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-glow" />
                        <span className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">System Nominal</span>
                    </div>
                </div>
            </aside>

            {/* Main Area */}
            <main className="flex-1 flex flex-col relative overflow-hidden">
                {/* Header */}
                <header className="h-16 flex items-center px-8 border-b border-white/[0.05] bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-10">
                    <h2 className="text-sm font-medium text-zinc-400 tracking-tight">
                        {activeTab === 'stats' ? 'Analytics / Overview' :
                            activeTab === 'orders' ? 'Transactions / Ledger' :
                                'Data Ingestion / CSV'}
                    </h2>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 relative">
                    <div className="max-w-7xl mx-auto w-full h-full">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
