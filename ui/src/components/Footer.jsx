import { Facebook, Twitter, Instagram, Youtube } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="bg-[#111827] text-gray-400 py-12 border-t border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    <div>
                        <h4 className="text-white font-bold text-lg mb-4">EventHub</h4>
                        <p className="text-sm leading-relaxed">
                            Your gateway to the best events, concerts, theaters, and sports matches. Experience the excitement live.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-white font-bold text-lg mb-4">Help & Support</h4>
                        <ul className="space-y-2 text-sm">
                            <li><a href="#" className="hover:text-orange-500 transition-colors">Help Center</a></li>
                            <li><a href="#" className="hover:text-orange-500 transition-colors">Ticket Refund</a></li>
                            <li><a href="#" className="hover:text-orange-500 transition-colors">Contact Us</a></li>
                            <li><a href="#" className="hover:text-orange-500 transition-colors">Terms & Conditions</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-bold text-lg mb-4">Categories</h4>
                        <ul className="space-y-2 text-sm">
                            <li><a href="#" className="hover:text-orange-500 transition-colors">Concerts</a></li>
                            <li><a href="#" className="hover:text-orange-500 transition-colors">Theater</a></li>
                            <li><a href="#" className="hover:text-orange-500 transition-colors">Sports</a></li>
                            <li><a href="#" className="hover:text-orange-500 transition-colors">Family</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-bold text-lg mb-4">Follow Us</h4>
                        <div className="flex gap-4">
                            <a href="#" className="bg-gray-800 p-2 rounded-full hover:bg-orange-500 hover:text-white transition-all duration-300"><Facebook className="w-5 h-5" /></a>
                            <a href="#" className="bg-gray-800 p-2 rounded-full hover:bg-orange-500 hover:text-white transition-all duration-300"><Twitter className="w-5 h-5" /></a>
                            <a href="#" className="bg-gray-800 p-2 rounded-full hover:bg-orange-500 hover:text-white transition-all duration-300"><Instagram className="w-5 h-5" /></a>
                            <a href="#" className="bg-gray-800 p-2 rounded-full hover:bg-orange-500 hover:text-white transition-all duration-300"><Youtube className="w-5 h-5" /></a>
                        </div>
                    </div>
                </div>
                <div className="border-t border-gray-800 pt-8 text-center text-sm">
                    <p>&copy; {new Date().getFullYear()} EventHub. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
