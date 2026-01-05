import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient, uploadFile } from '../services/api';
import { ArrowLeft, Save, Upload, File as FileIcon, Download } from 'lucide-react';

export const DeliverableDetail = () => {
    const { itemId } = useParams<{ itemId: string }>();
    const [item, setItem] = useState<any>(null);
    const [evidence, setEvidence] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Edit State
    const [formData, setFormData] = useState({
        status: '',
        owner: '',
        notes: '',
        description: ''
    });

    useEffect(() => {
        if (itemId) fetchData();
    }, [itemId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [itemRes, evRes] = await Promise.all([
                apiClient.get(`/regulators/FCA-SPI/items/${itemId}`),
                apiClient.get(`/regulators/FCA-SPI/items/${itemId}/evidence`)
            ]);
            setItem(itemRes);
            setEvidence(evRes.evidence || []);
            setFormData({
                status: itemRes.status,
                owner: itemRes.owner || '',
                notes: itemRes.notes || '',
                description: itemRes.description || ''
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await apiClient.put(`/regulators/FCA-SPI/items/${itemId}`, formData);
            // Reload item
            await fetchData();
        } catch (e) {
            alert("Save failed");
        } finally {
            setSaving(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            // 1. Get Presigned URL
            const preRes = await apiClient.post(`/regulators/FCA-SPI/items/${itemId}/evidence/presign`, {
                fileName: file.name,
                contentType: file.type
            });

            // 2. Upload to S3
            await uploadFile(preRes.uploadUrl, file, file.type);

            // 3. Commit Metadata
            await apiClient.post(`/regulators/FCA-SPI/items/${itemId}/evidence/commit`, {
                s3Key: preRes.s3Key,
                fileName: file.name,
                contentType: file.type,
                sizeBytes: file.size
            });

            // 4. Refresh List
            const evRes = await apiClient.get(`/regulators/FCA-SPI/items/${itemId}/evidence`);
            setEvidence(evRes.evidence || []);

        } catch (err) {
            console.error(err);
            alert("Upload failed");
        }
    };

    const handleDownload = async (s3Key: string) => {
        try {
            // Use query param for simplicity as discussed in backend impl
            const res = await apiClient.get(`/regulators/FCA-SPI/items/${itemId}/evidence/dummy/download?s3Key=${encodeURIComponent(s3Key)}`);
            if (res.downloadUrl) window.open(res.downloadUrl, '_blank');
        } catch (e) {
            alert("Download failed");
        }
    };

    if (loading) return (
        <div className="flex h-[60vh] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <p className="text-slate-500 font-medium">Loading details...</p>
            </div>
        </div>
    );
    if (!item) return <div className="p-8 glass-card rounded-2xl text-center text-danger font-medium">Item not found</div>;

    return (
        <div className="space-y-8 animate-fade-in">
            <Link to="/fca-spi" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-primary transition-colors group">
                <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to Compliance List
            </Link>

            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">{item.itemId}</span>
                        <h1 className="text-3xl font-bold text-slate-900">{item.title}</h1>
                    </div>
                    <p className="mt-2 text-sm text-slate-500 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-slate-300"></span>
                        Assigned to <span className="font-semibold text-slate-700">{item.owner || 'Unassigned'}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-200"></span>
                        Created by {item.createdBy}
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary"
                >
                    {saving ? (
                        <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            Saving Changes...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                        </>
                    )}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Form */}
                <div className="lg:col-span-2 space-y-8 animate-slide-up stagger-1">
                    <div className="glass-card overflow-hidden rounded-2xl bg-white p-8">
                        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                            <div className="h-8 w-1 bg-primary rounded-full"></div>
                            <h3 className="text-lg font-bold text-slate-900">General Information</h3>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                                <textarea
                                    rows={4}
                                    className="block w-full rounded-xl border-slate-200 text-sm focus:border-primary focus:ring-primary shadow-sm transition-all"
                                    value={formData.description}
                                    placeholder="Enter deliverable description..."
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Workflow Status</label>
                                    <select
                                        className="block w-full rounded-xl border-slate-200 text-sm focus:border-primary focus:ring-primary shadow-sm"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option value="NOT_STARTED">Not Started</option>
                                        <option value="DRAFT">Draft</option>
                                        <option value="REVIEW">Review</option>
                                        <option value="FINAL">Final</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Owner Name</label>
                                    <input
                                        type="text"
                                        className="block w-full rounded-xl border-slate-200 text-sm focus:border-primary focus:ring-primary shadow-sm"
                                        value={formData.owner}
                                        placeholder="Enter owner name..."
                                        onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden rounded-2xl bg-white p-8">
                        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                            <div className="h-8 w-1 bg-slate-300 rounded-full"></div>
                            <h3 className="text-lg font-bold text-slate-900">Internal Remarks</h3>
                        </div>
                        <textarea
                            rows={6}
                            placeholder="Add internal notes, compliance findings or audit trail comments..."
                            className="block w-full rounded-xl border-slate-200 text-sm focus:border-primary focus:ring-primary shadow-sm transition-all"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>
                </div>

                {/* Evidence Sidebar */}
                <div className="space-y-8 animate-slide-up stagger-2">
                    <div className="glass-card overflow-hidden rounded-2xl bg-slate-900 p-8 text-white">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <Upload className="h-5 w-5 text-primary-400" />
                            Evidence Management
                        </h3>

                        <label className="block w-full cursor-pointer rounded-xl border-2 border-dashed border-slate-700 bg-slate-800/50 p-6 text-center transition-all hover:bg-slate-800 hover:border-primary/50 group">
                            <div className="flex flex-col items-center">
                                <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <Upload className="h-6 w-6 text-slate-400 group-hover:text-primary" />
                                </div>
                                <span className="text-sm font-semibold text-slate-200">Upload Evidence</span>
                                <span className="mt-1 text-xs text-slate-500">PDF, JPG, DOCX up to 10MB</span>
                            </div>
                            <input type="file" className="hidden" onChange={handleFileUpload} />
                        </label>

                        <div className="mt-8 space-y-4">
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 border-b border-slate-800 pb-2">Uploaded Files</p>
                            <ul className="divide-y divide-slate-800">
                                {evidence.map((ev: any) => (
                                    <li key={ev.SK} className="flex items-center justify-between py-4 group">
                                        <div className="flex items-center truncate mr-3">
                                            <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center mr-3 group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                                                <FileIcon className="h-4 w-4" />
                                            </div>
                                            <div className="truncate">
                                                <p className="truncate text-sm font-medium text-slate-200" title={ev.fileName}>{ev.fileName}</p>
                                                <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Approved Evidence</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDownload(ev.s3Key)}
                                            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
                                        >
                                            <Download className="h-4 w-4" />
                                        </button>
                                    </li>
                                ))}
                                {evidence.length === 0 && (
                                    <li className="py-8 text-center bg-slate-800/30 rounded-xl border border-slate-800/50 mt-4">
                                        <p className="text-sm text-slate-500 italic">No evidence uploaded yet</p>
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
