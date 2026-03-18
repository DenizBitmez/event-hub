import { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, ShieldCheck, Database, Zap, CreditCard, Clock, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { API_ORIGIN } from '../config';

export default function HealthDashboardPage() {
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchHealth = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_ORIGIN}/health`);
            setHealth(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching health status:', err);
            if (err.response && err.response.data) {
                // Handle 503 Unhealthy status by showing the results anyway
                setHealth(err.response.data);
                setError(null);
            } else {
                setError('Could not connect to health monitoring service.');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHealth();
        let interval;
        if (autoRefresh) {
            interval = setInterval(fetchHealth, 10000); // Refresh every 10s
        }
        return () => clearInterval(interval);
    }, [autoRefresh]);

    const getIcon = (key) => {
        switch (key.toLowerCase()) {
            case 'npgsql': return <Database className="w-6 h-6" />;
            case 'redis': return <Zap className="w-6 h-6" />;
            case 'stripe': return <CreditCard className="w-6 h-6" />;
            default: return <ShieldCheck className="w-6 h-6" />;
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen py-12 px-4">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-xs font-black uppercase tracking-widest mb-4">
                            <Activity className="w-3 h-3" /> System Status
                        </div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Health Dashboard</h1>
                        <p className="text-gray-500 font-medium mt-1">Real-time monitoring of system dependencies</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${autoRefresh ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                        >
                            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
                        </button>
                        <button
                            onClick={fetchHealth}
                            className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                        >
                            <RefreshCw className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                </div>

                {/* Main Status Grid */}
                {loading && !health ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
                        {[1, 2, 3].map(i => <div key={i} className="h-48 bg-gray-200 rounded-3xl"></div>)}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {health?.results?.map((res) => (
                            <div key={res.key} className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-xl hover:shadow-gray-200/50 transition-all group">
                                <div className="space-y-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${res.status === 'Healthy' ? 'bg-green-50 text-green-600 group-hover:bg-green-600 group-hover:text-white' : 'bg-red-50 text-red-600'}`}>
                                        {getIcon(res.key)}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 capitalize">{res.key}</h3>
                                        <p className="text-sm text-gray-500">{res.description || 'Service check'}</p>
                                    </div>
                                </div>

                                <div className="mt-8 flex items-center justify-between">
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${res.status === 'Healthy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {res.status}
                                    </div>
                                    <div className="flex items-center gap-1 text-gray-400 text-[10px] font-bold">
                                        <Clock className="w-3 h-3" /> {res.duration ? `${(parseFloat(res.duration.split(':')[2]) * 1000).toFixed(0)}ms` : 'N/A'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Overall Status Card */}
                {health && (
                    <div className={`rounded-[2.5rem] p-10 text-white shadow-2xl transition-colors duration-500 flex flex-col md:flex-row items-center gap-8 ${health.status === 'Healthy' ? 'bg-gray-900 shadow-gray-900/20' : 'bg-red-600 shadow-red-600/20'}`}>
                        <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center shrink-0">
                            {health.status === 'Healthy' ? <CheckCircle2 className="w-10 h-10 text-green-400" /> : <AlertCircle className="w-10 h-10 text-red-200" />}
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h2 className="text-3xl font-black mb-2">System is {health.status}</h2>
                            <p className="text-gray-400 font-medium">
                                {health.status === 'Healthy'
                                    ? 'All core systems are operational. Dependencies are responding within expected latency bounds.'
                                    : 'Some systems are experiencing issues. Please check the individual component status above.'}
                            </p>
                        </div>
                        <div className="text-center md:text-right shrink-0">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-1">Total Latency</p>
                            <p className="text-4xl font-black text-white">{health.duration ? `${(parseFloat(health.duration.split(':')[2]) * 1000).toFixed(0)}ms` : '...'}</p>
                        </div>
                    </div>
                )}

                {/* Error Notification */}
                {error && (
                    <div className="bg-red-50 border border-red-100 rounded-3xl p-6 flex items-center gap-4 text-red-700">
                        <AlertCircle className="w-6 h-6 shrink-0" />
                        <div>
                            <p className="font-bold">Connection Error</p>
                            <p className="text-sm opacity-80">{error}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
