import { useRouteError, Link } from "react-router-dom";
import { AlertTriangle, Home, ArrowLeft, RefreshCw } from "lucide-react";

export default function ErrorPage() {
    const error = useRouteError();
    console.error(error);

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] -z-10 -mr-64 -mt-64 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-pink-500/10 rounded-full blur-[120px] -z-10 -ml-64 -mb-64"></div>

            <div className="max-w-xl w-full text-center space-y-8 relative z-10">
                {/* 404/Error Icon */}
                <div className="relative inline-block">
                    <div className="w-24 h-24 bg-red-500/20 rounded-3xl flex items-center justify-center mx-auto border border-red-500/30 transform transition-transform hover:scale-110">
                        <AlertTriangle className="w-12 h-12 text-red-500" />
                    </div>
                    <div className="absolute -top-4 -right-4 bg-orange-500 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow-lg">
                        Oops!
                    </div>
                </div>

                <div className="space-y-4">
                    <h1 className="text-7xl md:text-8xl font-black text-white tracking-tighter">
                        404
                    </h1>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-300">
                        Houston, we have a problem.
                    </h2>
                    <p className="text-gray-500 font-medium max-w-sm mx-auto leading-relaxed">
                        The page you're looking for was moved, renamed, or might never have existed in this galaxy.
                    </p>
                </div>

                {/* Error Trace (Only visible in dev) */}
                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-xs font-mono text-gray-400 inline-block">
                    Error Code: {error.status || '500'} | {error.statusText || error.message}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
                    <Link
                        to="/"
                        className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-pink-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:shadow-2xl hover:shadow-orange-500/40 transition-all active:scale-95 group w-full sm:w-auto"
                    >
                        <Home className="w-4 h-4 group-hover:-translate-y-1 transition-transform" />
                        Back to Earth
                    </Link>
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-2 bg-white/10 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-white/20 transition-all border border-white/10 w-full sm:w-auto justify-center"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Retry Sync
                    </button>
                </div>
            </div>
        </div>
    );
}
