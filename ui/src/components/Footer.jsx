import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="bg-[#0f172a] text-gray-400 py-16 border-t border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    <div className="space-y-6">
                        <Link to="/" className="text-2xl font-black text-white hover:text-orange-500 transition-colors">
                            Event<span className="text-orange-500">Hub</span>
                        </Link>
                        <p className="text-sm leading-relaxed text-gray-500">
                            Your gateway to the best events, concerts, theaters, and sports matches. Discover extraordinary experiences around you and book your spot in seconds.
                        </p>
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center gap-3 text-xs">
                                <Mail className="w-4 h-4 text-orange-500" />
                                <span>support@eventhub.com</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                                <Phone className="w-4 h-4 text-orange-500" />
                                <span>+90 (212) 555 0123</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-white font-bold text-sm uppercase tracking-widest mb-6">Quick Links</h4>
                        <ul className="space-y-4 text-sm font-medium">
                            <li><Link to="/" className="hover:text-orange-500 transition-colors">Home Page</Link></li>
                            <li><Link to="/my-bookings" className="hover:text-orange-500 transition-colors">Ticket Refund</Link></li>
                            <li><Link to="/help" className="hover:text-orange-500 transition-colors">Help Center</Link></li>
                            <li><Link to="/register" className="hover:text-orange-500 transition-colors">Join Us</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold text-sm uppercase tracking-widest mb-6">Top Categories</h4>
                        <ul className="space-y-4 text-sm font-medium">
                            <li><Link to="/" className="hover:text-orange-500 transition-colors">Music & Concerts</Link></li>
                            <li><Link to="/" className="hover:text-orange-500 transition-colors">Theaters</Link></li>
                            <li><Link to="/" className="hover:text-orange-500 transition-colors">Sports Events</Link></li>
                            <li><Link to="/" className="hover:text-orange-500 transition-colors">Art Galleries</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold text-sm uppercase tracking-widest mb-6">Follow The Excitement</h4>
                        <p className="text-sm text-gray-500 mb-6 font-medium">Stay updated with the latest events and exclusive offers.</p>
                        <div className="flex gap-3">
                            {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                                <a key={i} href="#" className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center hover:bg-orange-500 hover:text-white transition-all duration-300 border border-white/5">
                                    <Icon className="w-5 h-5" />
                                </a>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-semibold text-gray-500">
                    <p>&copy; {new Date().getFullYear()} EventHub Inc. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link to="/" className="hover:text-white transition-colors">Privacy Policy</Link>
                        <Link to="/" className="hover:text-white transition-colors">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
