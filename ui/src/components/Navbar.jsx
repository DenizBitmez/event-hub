import { Link } from 'react-router-dom';
import { Search, User, Menu, Ticket } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
    const { user, logout } = useAuth();
    return (
        <nav className="bg-[#1a237e] text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="bg-orange-500 p-2 rounded-lg group-hover:bg-orange-600 transition-colors">
                            <Ticket className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-bold text-2xl tracking-tight">EventHub</span>
                    </Link>

                    {/* Search Bar (Hidden on mobile) */}
                    <div className="hidden md:flex flex-1 max-w-lg mx-8 relative">
                        <input
                            type="text"
                            placeholder="Search for events, artists, or venues..."
                            className="w-full bg-white/10 border border-white/20 rounded-full py-2.5 px-6 pl-12 text-sm text-white placeholder-gray-300 focus:outline-none focus:bg-white focus:text-gray-900 focus:placeholder-gray-500 transition-all duration-300"
                        />
                        <Search className="absolute left-4 top-2.5 w-5 h-5 text-gray-300 pointer-events-none" />
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-6">
                        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-300">
                            <Link to="/" className="hover:text-white transition-colors">Concerts</Link>
                            <Link to="/" className="hover:text-white transition-colors">Theaters</Link>
                            <Link to="/" className="hover:text-white transition-colors">Sports</Link>
                        </div>

                        {user ? (
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium hidden sm:inline">{user.email}</span>
                                <Link to="/my-bookings" className="text-sm font-medium hover:text-white transition-colors">My Bookings</Link>
                                <button
                                    onClick={logout}
                                    className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-colors text-sm"
                                >
                                    Log Out
                                </button>
                            </div>
                        ) : (
                            <Link to="/login" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-colors">
                                <User className="w-5 h-5" />
                                <span className="hidden sm:inline text-sm font-medium">Log In</span>
                            </Link>
                        )}

                        <button className="md:hidden text-gray-300 hover:text-white">
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
