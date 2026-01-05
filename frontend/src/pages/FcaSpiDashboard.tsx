import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../services/api';
import { Search, Download, FileText, CheckCircle, Clock, AlertCircle, List } from 'lucide-react';
import { clsx } from 'clsx';

interface Item {
    itemId: string;
    title: string;
    owner: string;
    status: string;
    evidenceRequired: boolean;
    updatedAt: string;
}

export const FcaSpiDashboard = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        fetchItems();
    }, [statusFilter]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const query = statusFilter ? `?status=${statusFilter}` : '';
            const res = await apiClient.get(`/regulators/FCA-SPI/items${query}`);
            setItems(res.items);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const res = await apiClient.post('/regulators/FCA-SPI/export');
            if (res.downloadUrl) {
                window.location.href = res.downloadUrl;
            }
        } catch (e) {
            alert("Export failed: " + e);
        }
    };

    // Client-side search for simplicity as backend search is basic
    const filteredItems = items.filter(i =>
        i.title.toLowerCase().includes(search.toLowerCase()) ||
        i.itemId.toLowerCase().includes(search.toLowerCase())
    );

    // Stats
    const stats = {
        total: items.length,
        notStarted: items.filter(i => i.status === 'NOT_STARTED').length,
        inProgress: items.filter(i => ['DRAFT', 'REVIEW'].includes(i.status)).length,
        final: items.filter(i => i.status === 'FINAL').length,
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 leading-tight">FCA-SPI Compliance</h1>
                    <p className="mt-1 text-slate-500">Manage compliance workstreams and evidence deliverables for the Financial Conduct Authority.</p>
                </div>
                <button
                    onClick={handleExport}
                    className="btn-secondary group"
                >
                    <Download className="mr-2 h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
                    Export Report
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total Deliverables" value={stats.total} icon={<List className="h-5 w-5" />} color="info" />
                <StatCard label="Not Started" value={stats.notStarted} icon={<AlertCircle className="h-5 w-5" />} color="danger" />
                <StatCard label="In Progress" value={stats.inProgress} icon={<Clock className="h-5 w-5" />} color="warning" />
                <StatCard label="Final & Approved" value={stats.final} icon={<CheckCircle className="h-5 w-5" />} color="success" />
            </div>

            {/* Main Section */}
            <div className="glass-card overflow-hidden rounded-2xl bg-white animate-slide-up stagger-1">
                <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="relative flex-1 max-w-md">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Search className="h-4 w-4 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full rounded-xl border-slate-200 py-2 pl-10 text-sm placeholder:text-slate-400 focus:border-primary focus:ring-primary shadow-sm"
                                placeholder="Search deliverables..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <select
                            className="rounded-xl border-slate-200 py-2 pl-3 pr-10 text-sm focus:border-primary focus:ring-primary shadow-sm"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">All Statuses</option>
                            <option value="NOT_STARTED">Not Started</option>
                            <option value="DRAFT">Draft</option>
                            <option value="REVIEW">Review</option>
                            <option value="FINAL">Final</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">ID</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Deliverable Title</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Owner</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Evidence</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Updated</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-20 text-center"><span className="text-slate-400">Loading your compliance items...</span></td></tr>
                            ) : filteredItems.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-20 text-center"><span className="text-slate-400">No matching deliverables found.</span></td></tr>
                            ) : filteredItems.map((item, idx) => (
                                <tr key={item.itemId} className="group hover:bg-slate-50/80 transition-colors animate-fade-in" style={{ animationDelay: `${0.05 * (idx % 10)}s` }}>
                                    <td className="whitespace-nowrap px-6 py-4">
                                        <Link to={`/fca-spi/${item.itemId}`} className="font-mono text-sm font-semibold text-primary hover:text-primary-dark hover:underline">
                                            {item.itemId}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-slate-900">{item.title}</div>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                                                {item.owner?.charAt(0) || '?'}
                                            </div>
                                            <span className="text-sm text-slate-600">{item.owner}</span>
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4">
                                        <StatusBadge status={item.status} />
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4">
                                        {item.evidenceRequired ? (
                                            <div className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                                                <FileText className="mr-1.5 h-3.5 w-3.5" />
                                                Req
                                            </div>
                                        ) : <span className="text-slate-300 text-xs">Optional</span>}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-right text-xs text-slate-400">
                                        {new Date(item.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ label, value, icon, color }: { label: string, value: number, icon: React.ReactNode, color: 'primary' | 'success' | 'warning' | 'danger' | 'info' }) => {
    const colorClasses = {
        primary: 'bg-primary/10 text-primary border-primary/20',
        success: 'bg-success/10 text-success border-success/20',
        warning: 'bg-warning/10 text-warning border-warning/20',
        danger: 'bg-danger/10 text-danger border-danger/20',
        info: 'bg-info/10 text-info border-info/20',
    };

    return (
        <div className="glass-card flex items-center justify-between rounded-2xl bg-white p-6 transition-all hover:scale-[1.02] animate-slide-up stagger-1">
            <div>
                <dt className="text-sm font-medium text-slate-500">{label}</dt>
                <dd className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{value}</dd>
            </div>
            <div className={clsx("flex h-12 w-12 items-center justify-center rounded-xl border", colorClasses[color])}>
                {icon}
            </div>
        </div>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    const styles = {
        'NOT_STARTED': 'bg-slate-100 text-slate-600',
        'DRAFT': 'bg-warning-light text-warning',
        'REVIEW': 'bg-info-light text-info',
        'FINAL': 'bg-success-light text-success',
    } as const;

    // @ts-ignore
    const cls = styles[status] || styles['NOT_STARTED'];

    return (
        <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider", cls)}>
            {status.replace('_', ' ')}
        </span>
    );
}
