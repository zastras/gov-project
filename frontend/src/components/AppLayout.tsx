import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'aws-amplify/auth';
import { Shield, ChevronDown, ChevronRight, LogOut, LayoutDashboard, Settings, User } from 'lucide-react';
import { clsx } from 'clsx';
import '../animations.css';

export const AppLayout = () => {
    const navigate = useNavigate();
    const [regulatorsOpen, setRegulatorsOpen] = useState(true);

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
        window.location.reload();
    };

    return (
        <div className="flex h-screen bg-slate-50 font-sans selection:bg-primary-100">
            {/* Sidebar */}
            <div className="flex w-72 flex-col bg-slate-900 text-slate-300 shadow-2xl transition-all duration-300 ease-in-out">
                <div className="flex h-20 items-center px-8">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
                            <Shield className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-white">Zastras <span className="text-primary-400 font-medium">Gov</span></span>
                    </div>
                </div>

                <nav className="flex-1 space-y-6 px-4 py-6 overflow-y-auto">
                    <div>
                        <p className="px-4 mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Core</p>
                        <NavLink
                            to="/dashboard"
                            className={({ isActive }) => clsx(
                                "group flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                                isActive ? "bg-primary text-white shadow-lg shadow-primary/25" : "hover:bg-slate-800 hover:text-white"
                            )}
                        >
                            <LayoutDashboard className={clsx("mr-3 h-5 w-5 transition-colors", "group-hover:text-white")} />
                            Risks
                        </NavLink>
                    </div>

                    <div>
                        <p className="px-4 mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Compliance</p>
                        <button
                            onClick={() => setRegulatorsOpen(!regulatorsOpen)}
                            className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 hover:bg-slate-800 hover:text-white focus:outline-none group"
                        >
                            <div className="flex items-center">
                                <Shield className="mr-3 h-5 w-5 text-slate-400 group-hover:text-white" />
                                Regulators
                            </div>
                            {regulatorsOpen ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                        </button>

                        {regulatorsOpen && (
                            <div className="mt-2 space-y-1 pl-4 animate-slide-up">
                                <NavItem to="/cyber-essentials">Cyber Essentials</NavItem>
                                <NavItem to="/iso27001">ISO27001</NavItem>
                                <NavItem to="/fca-spi">FCA-SPI</NavItem>
                                <NavItem to="/gdpr">GDPR</NavItem>
                            </div>
                        )}
                    </div>
                </nav>

                <div className="mt-auto border-t border-slate-800 p-4 space-y-2">
                    <button className="flex w-full items-center rounded-xl px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
                        <Settings className="mr-3 h-5 w-5" />
                        Settings
                    </button>
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center rounded-xl px-4 py-2 text-sm font-medium text-slate-400 hover:bg-danger/10 hover:text-danger transition-colors"
                    >
                        <LogOut className="mr-3 h-5 w-5 transition-colors" />
                        Logout
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto bg-slate-50 relative">
                <header className="sticky top-0 z-10 flex h-20 items-center justify-end bg-white/70 px-8 backdrop-blur-md border-b border-slate-200 gap-4">
                    <button className="p-2 text-slate-400 hover:text-primary transition-colors">
                        <User className="h-6 w-6" />
                    </button>
                </header>
                <main className="p-8 max-w-7xl mx-auto animate-fade-in">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

const NavItem = ({ to, children }: { to: string, children: React.ReactNode }) => (
    <NavLink
        to={to}
        className={({ isActive }) => clsx(
            "flex items-center rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
            isActive ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-800/50 hover:text-white"
        )}
    >
        {({ isActive }) => (
            <>
                <span className={clsx("h-1.5 w-1.5 rounded-full mr-3 transition-all", isActive ? "bg-primary scale-125" : "bg-slate-700")}></span>
                {children}
            </>
        )}
    </NavLink>
);
