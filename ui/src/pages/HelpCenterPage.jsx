import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Search, HelpCircle, Ticket, CreditCard, RefreshCw, Lock, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { API_BASE_URL } from '../config';

const HELP_API_BASE_URL = API_BASE_URL;

const IconMap = {
    HelpCircle,
    Ticket,
    CreditCard,
    RefreshCw,
    Lock,
    Users: MessageSquare // Fallback for Users icon
};

export default function HelpCenterPage() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [openArticleId, setOpenArticleId] = useState(null);

    useEffect(() => {
        const fetchHelpData = async () => {
            try {
                const response = await axios.get(`${HELP_API_BASE_URL}/Help`);
                setCategories(response.data);
            } catch (error) {
                console.error('Error fetching help articles:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchHelpData();
    }, []);

    const toggleArticle = (id) => {
        setOpenArticleId(openArticleId === id ? null : id);
    };

    const scrollToCategory = (categoryName) => {
        const element = document.getElementById(`category-${categoryName.toLowerCase()}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full"></div></div>;

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            {/* Hero Section */}
            <div className="bg-[#0f172a] py-20 px-4">
                <div className="max-w-4xl mx-auto text-center space-y-8">
                    <h1 className="text-4xl md:text-5xl font-black text-white">How can we help you?</h1>
                    <div className="relative max-w-2xl mx-auto">
                        <Search className="absolute left-4 top-4 w-6 h-6 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search for articles (e.g., booking, refund)..."
                            className="w-full pl-14 pr-6 py-4 bg-white rounded-2xl shadow-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-lg"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 -mt-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {categories.map((cat, idx) => {
                        const Icon = IconMap[cat.icon] || HelpCircle;
                        return (
                            <div
                                key={idx}
                                onClick={() => scrollToCategory(cat.category)}
                                className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:border-orange-200 transition-all group cursor-pointer"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center mb-6 group-hover:bg-orange-500 transition-colors">
                                    <Icon className="w-6 h-6 text-orange-600 group-hover:text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">{cat.category}</h3>
                                <p className="text-sm text-gray-500">{cat.articles.length} articles</p>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-16 space-y-12">
                    {categories.map((cat, idx) => {
                        const filteredArticles = cat.articles.filter(a =>
                            a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            a.content.toLowerCase().includes(searchQuery.toLowerCase())
                        );

                        if (searchQuery && filteredArticles.length === 0) return null;

                        return (
                            <div key={idx} id={`category-${cat.category.toLowerCase()}`} className="space-y-6 scroll-mt-24">
                                <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                                    <span className="w-1.5 h-8 bg-orange-500 rounded-full"></span>
                                    {cat.category}
                                </h2>
                                <div className="space-y-4">
                                    {filteredArticles.map(article => (
                                        <div key={article.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                            <button
                                                onClick={() => toggleArticle(article.id)}
                                                className="w-full flex items-center justify-between p-6 text-left group"
                                            >
                                                <span className="font-bold text-gray-800 group-hover:text-orange-600 transition-colors">{article.title}</span>
                                                {openArticleId === article.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                            </button>
                                            {openArticleId === article.id && (
                                                <div className="px-6 pb-6 text-gray-600 leading-relaxed text-sm border-t border-gray-50 pt-4">
                                                    {article.content}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Support section */}
            <div className="max-w-5xl mx-auto px-4 mt-20">
                <div className="bg-orange-600 rounded-3xl p-10 text-white text-center space-y-6 shadow-2xl shadow-orange-950/20">
                    <h2 className="text-3xl font-black">Still have questions?</h2>
                    <p className="text-orange-100 max-w-xl mx-auto">
                        Our support team is always ready to help you with any issues or questions you might have.
                    </p>
                    <Link
                        to="/contact"
                        className="bg-white text-orange-600 px-10 py-3 rounded-full font-bold hover:bg-orange-50 transition-colors shadow-lg inline-block"
                    >
                        Contact Support
                    </Link>
                </div>
            </div>
        </div>
    );
}
