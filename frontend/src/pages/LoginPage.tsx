import React, { useState } from 'react';
import { signIn } from 'aws-amplify/auth';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User as UserIcon } from 'lucide-react';
import '../animations.css';

export const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { isSignedIn } = await signIn({ username, password });
            if (isSignedIn) {
                navigate('/');
                window.location.reload(); // Force auth context re-check or we could expose setAuth
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 font-sans selection:bg-primary-100">
            <div className="mb-10 text-center animate-fade-in">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-xl shadow-primary/30">
                    <Shield className="h-10 w-10 text-white" />
                </div>
                <h1 className="text-4xl font-black tracking-tight text-slate-900">Zastras <span className="text-primary font-bold">Governance</span></h1>
                <p className="mt-3 text-sm font-medium text-slate-500 uppercase tracking-widest">Enterprise Compliance Portal</p>
            </div>

            <div className="w-full max-w-md animate-slide-up stagger-1">
                <div className="glass-card rounded-3xl bg-white p-10 shadow-premium">
                    <form onSubmit={handleLogin} className="space-y-8">
                        <div>
                            <label htmlFor="username" className="block text-sm font-bold text-slate-700 mb-2">Username / Email</label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                    <UserIcon className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    id="username"
                                    type="text"
                                    required
                                    value={username}
                                    placeholder="your@email.com"
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="block w-full rounded-xl border-slate-200 pl-11 py-3 text-sm focus:border-primary focus:ring-primary shadow-sm transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-bold text-slate-700 mb-2">Secure Password</label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                    <Lock className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    id="password"
                                    type="password"
                                    required
                                    value={password}
                                    placeholder="••••••••"
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full rounded-xl border-slate-200 pl-11 py-3 text-sm focus:border-primary focus:ring-primary shadow-sm transition-all"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 rounded-xl bg-danger/10 p-4 text-sm font-medium text-danger animate-shake">
                                <Shield className="h-4 w-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full py-4 text-base tracking-wide shadow-xl shadow-primary/20"
                        >
                            {loading ? (
                                <>
                                    <div className="mr-3 h-5 w-5 animate-spin rounded-full border-3 border-white border-t-transparent"></div>
                                    Verifying...
                                </>
                            ) : (
                                'AUTHENTICATE'
                            )}
                        </button>
                    </form>
                </div>

                <p className="mt-8 text-center text-xs text-slate-400 font-medium">
                    &copy; {new Date().getFullYear()} Zastras Ltd. All rights reserved.
                    <br />
                    This system is for authorized internal use only.
                </p>
            </div>
        </div>
    );
};
