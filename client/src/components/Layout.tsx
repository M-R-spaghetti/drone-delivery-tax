import { ReactNode, useState, useEffect } from 'react';
import { LayoutDashboard, UploadCloud, Hexagon, Settings, Plus, User, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface LayoutProps {
    children: ReactNode;
    activeTab: 'orders' | 'upload' | 'stats' | 'admin';
    setActiveTab: (tab: 'orders' | 'upload' | 'stats' | 'admin') => void;
    onNewOrder: () => void;
}

export default function Layout({ children, activeTab, setActiveTab, onNewOrder }: LayoutProps) {
    // Sidebar: collapsed on laptop-sized screens by default, expanded on xl+
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Auto-detect screen width: collapse sidebar on laptop-size screens
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 1280px)');
        const handler = (e: MediaQueryListEvent | MediaQueryList) => {
            setSidebarCollapsed(!e.matches);
            if (!e.matches) setSidebarOpen(false);
        };
        handler(mq);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    // Close mobile sidebar on nav click
    const handleNavClick = (tab: typeof activeTab) => {
        setActiveTab(tab);
        setSidebarOpen(false);
    };

    const getBreadcrumbs = () => {
        let module = '';
        let page = '';
        switch (activeTab) {
            case 'stats':
                module = 'ANALYTICS';
                page = 'GLOBAL_METRICS';
                break;
            case 'orders':
                module = 'LEDGER';
                page = 'TRANSACTIONS';
                break;
            case 'upload':
                module = 'INGESTION';
                page = 'BATCH_LOAD';
                break;
            case 'admin':
                module = 'SECURITY';
                page = 'ADMIN_CONSOLE';
                break;
        }
        return (
            <div className="flex items-center gap-2 lg:gap-4 min-w-0">
                <div className="w-3 h-3 border border-[#FFD700] p-[2px] shrink-0">
                    <div className="w-full h-full bg-[#FFD700] animate-pulse"></div>
                </div>
                <span className="font-mono text-xs lg:text-sm tracking-widest uppercase flex items-center gap-1 lg:gap-2 min-w-0 truncate">
                    <span className="text-zinc-500 hidden xl:inline">SYS_ROOT</span>
                    <span className="text-zinc-700 hidden xl:inline">/</span>
                    <span className="text-zinc-400">{module}</span>
                    <span className="text-zinc-700">/</span>
                    <span className="text-white font-bold">{page}</span>
                </span>
            </div>
        );
    };

    const NavItem = ({ id, icon: Icon, label, sublabel }: { id: typeof activeTab, icon: any, label: string, sublabel: string }) => {
        const isActive = activeTab === id;
        const isCollapsed = sidebarCollapsed && !sidebarOpen;
        return (
            <button
                onClick={() => handleNavClick(id)}
                title={isCollapsed ? label : undefined}
                className={`group relative flex ${isCollapsed ? 'flex-col items-center px-2 py-4' : 'flex-col items-start px-7 py-5'} transition-all duration-300 rounded-none border-b border-zinc-900 overflow-hidden
                    ${isActive
                        ? 'bg-gradient-to-r from-[#FFD700]/10 via-[#FFD700]/5 to-transparent'
                        : 'hover:bg-zinc-900/40'
                    }`}
            >
                {/* Active Indicator Line */}
                <div className={`absolute left-0 top-0 bottom-0 w-[2px] transition-colors duration-300 ${isActive ? 'bg-[#FFD700]' : 'bg-transparent group-hover:bg-zinc-700'}`}></div>

                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-4'} w-full relative z-10 overflow-hidden`}>
                    <Icon strokeWidth={1.5} className={`w-5 h-5 shrink-0 transition-colors ${isActive ? 'text-[#FFD700]' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                    {!isCollapsed && (
                        <span className={`text-sm font-mono tracking-[0.15em] uppercase transition-colors truncate ${isActive ? 'text-white font-bold' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                            {label}
                        </span>
                    )}
                </div>
                {!isCollapsed && (
                    <span className={`text-[10px] font-mono tracking-widest uppercase mt-2 ${isCollapsed ? 'ml-0' : 'ml-9'} transition-colors truncate max-w-full block ${isActive ? 'text-[#FFD700]/80' : 'text-zinc-600 group-hover:text-zinc-500'}`}>
                        {sublabel}
                    </span>
                )}
            </button>
        );
    };

    const isCollapsed = sidebarCollapsed && !sidebarOpen;

    return (
        <div className="flex h-screen bg-[#000000] overflow-hidden text-zinc-300 font-sans antialiased selection:bg-[#FFD700] selection:text-black">
            {/* Mobile Overlay */}
            {sidebarOpen && sidebarCollapsed && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 xl:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Left Sidebar - The Command Node */}
            <aside className={`
                ${isCollapsed ? 'w-[60px]' : 'w-64 lg:w-72'}
                ${sidebarOpen && sidebarCollapsed ? 'fixed inset-y-0 left-0 w-72 z-40' : ''}
                shrink-0 bg-[#000000] border-r border-zinc-900 flex flex-col z-20 shadow-[8px_0_32px_rgba(0,0,0,0.8)] relative transition-all duration-300
            `}>
                {/* Logo Area */}
                <div className={`h-16 lg:h-20 flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-7'} border-b border-zinc-900 shrink-0 relative bg-zinc-950/20`}>
                    <div className="absolute left-0 bottom-0 w-full h-[1px] bg-gradient-to-r from-zinc-800 via-zinc-900 to-transparent"></div>
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 bg-[#FFD700] shadow-[0_0_12px_rgba(255,215,0,0.4)] relative shrink-0">
                            <div className="absolute inset-0 border border-white animate-ping opacity-20"></div>
                        </div>
                        {!isCollapsed && (
                            <h1 className="text-sm font-mono font-bold tracking-[0.2em] text-white whitespace-nowrap">
                                [ NYS_DR_NET ]
                            </h1>
                        )}
                    </div>
                </div>

                {/* Nav Links */}
                <nav className="flex-1 px-0 py-2 flex flex-col gap-0 overflow-y-auto scrollbar-hide">
                    <NavItem id="stats" icon={LayoutDashboard} label="Analytics" sublabel="Global Metrics & HUD" />
                    <NavItem id="orders" icon={Hexagon} label="Ledger" sublabel="Immutable Transactions" />
                    <NavItem id="upload" icon={UploadCloud} label="Ingestion" sublabel="Batch Data Load" />

                    {!isCollapsed && (
                        <div className="mt-8 mb-2 px-7">
                            <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">System Maintenance</span>
                        </div>
                    )}
                    {isCollapsed && <div className="mt-4 mb-2 mx-auto w-6 h-px bg-zinc-800" />}
                    <NavItem id="admin" icon={Settings} label="Sys_Admin" sublabel="Security Console" />
                </nav>

                {/* Bottom Actions */}
                <div className={`${isCollapsed ? 'p-2' : 'p-6'} border-t border-zinc-900 shrink-0 flex flex-col gap-4 bg-zinc-950/30`}>
                    {!isCollapsed ? (
                        <>
                            {/* Full Execution Button */}
                            <div className="relative w-full group cursor-pointer" onClick={onNewOrder}>
                                <div
                                    className="w-full h-full p-[1px] bg-zinc-700 hover:bg-[#FFD700] transition-colors duration-300"
                                    style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))' }}
                                >
                                    <button
                                        className="w-full outline-none flex items-center justify-between px-5 py-4 bg-[#050505] text-zinc-300 group-hover:bg-[#FFD700] group-hover:text-black transition-colors duration-300"
                                        style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))' }}
                                    >
                                        <span className="font-mono text-sm tracking-widest font-bold uppercase">&gt; INIT_ORDER</span>
                                        <Plus className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                                    </button>
                                </div>
                            </div>

                            {/* Status Readout Screen */}
                            <div className="flex flex-col gap-2 p-4 bg-black border border-zinc-900 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-zinc-800/20 to-transparent"></div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">SEC_LINK:</span>
                                    <span className="text-[10px] font-mono tracking-widest text-emerald-500 uppercase font-bold">ENCRYPTED</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">NET_NODE:</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-mono tracking-widest text-[#FFD700] uppercase font-bold">ACTIVE</span>
                                        <div className="w-1.5 h-1.5 bg-[#FFD700] animate-pulse rounded-none shadow-[0_0_8px_rgba(255,215,0,0.6)]" />
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Collapsed: icon-only new order button */
                        <button
                            onClick={onNewOrder}
                            className="w-10 h-10 mx-auto border border-zinc-700 bg-[#050505] text-zinc-400 hover:bg-[#FFD700] hover:text-black hover:border-[#FFD700] transition-colors flex items-center justify-center"
                            title="INIT_ORDER"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    )}

                    {/* Collapse toggle button */}
                    <button
                        onClick={() => {
                            if (sidebarCollapsed) {
                                setSidebarOpen(!sidebarOpen);
                            } else {
                                setSidebarCollapsed(true);
                            }
                        }}
                        className={`${isCollapsed ? 'w-10 h-8 mx-auto' : 'w-full h-8'} flex items-center justify-center text-zinc-600 hover:text-[#FFD700] transition-colors border border-zinc-900 hover:border-[#FFD700]/30 bg-black/50`}
                        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                    </button>
                </div>
            </aside>

            {/* Main Area */}
            <main className="flex-1 flex flex-col relative overflow-hidden bg-[#000000] min-w-0">
                {/* Header - Telemetry Bar */}
                <header className="h-14 lg:h-16 xl:h-20 flex items-center justify-between px-3 lg:px-5 xl:px-8 border-b border-zinc-900 bg-[#000000] shrink-0 relative bg-zinc-950/20">
                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-[#FFD700]/10 via-zinc-900 to-transparent"></div>

                    <div className="flex items-center gap-3">
                        {/* Hamburger for collapsed sidebar */}
                        {sidebarCollapsed && (
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-[#FFD700] transition-colors xl:hidden"
                            >
                                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </button>
                        )}
                        {getBreadcrumbs()}
                    </div>

                    <div className="flex items-center gap-3 lg:gap-6">
                        <div className="flex flex-col items-end hidden sm:flex">
                            <span className="text-[10px] lg:text-[11px] font-mono text-zinc-500 tracking-widest uppercase mb-1">OP_ID: <span className="text-zinc-300">77-BETA</span></span>
                            <span className="text-[8px] lg:text-[9px] font-mono text-[#FFD700]/70 tracking-widest uppercase">CLEARANCE: LEVEL_4</span>
                        </div>
                        <div className="w-8 h-8 lg:w-10 lg:h-10 border border-zinc-800 bg-zinc-950 flex items-center justify-center relative shrink-0">
                            {/* Reticle brackets */}
                            <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t-[1.5px] border-l-[1.5px] border-[#FFD700]/50"></div>
                            <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b-[1.5px] border-r-[1.5px] border-[#FFD700]/50"></div>
                            <User className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
                        </div>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-y-auto relative bg-[#000000] scrollbar-hide">
                    <div className="w-full h-full min-h-full">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
