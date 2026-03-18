import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import { Calendar, MapPin, ChevronRight, Ticket, Filter, X, Search } from 'lucide-react';
import { API_BASE_URL } from '../config';

const HOME_API_BASE_URL = API_BASE_URL;

export default function HomePage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter State
    const [keyword, setKeyword] = useState(searchParams.get('search') || '');
    const [location, setLocation] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [categories, setCategories] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const params = {};
            const searchKeyword = searchParams.get('search') || keyword;
            if (searchKeyword) params.searchTerm = searchKeyword;
            if (location) params.location = location;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
            if (selectedCategoryId) params.categoryId = selectedCategoryId;

            const response = await axios.get(`${HOME_API_BASE_URL}/Event`, { params });
            // Sort by Date
            const sorted = response.data.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
            setEvents(sorted);
        } catch (error) {
            console.error('Error fetching events:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await axios.get(`${HOME_API_BASE_URL}/Event/categories`);
            setCategories(response.data);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    useEffect(() => {
        // Sync local keyword with URL param if it changes
        const urlSearch = searchParams.get('search');
        if (urlSearch !== null) {
            setKeyword(urlSearch);
        }
        fetchEvents();
        fetchCategories();
    }, [selectedCategoryId, searchParams]); // Reload when category or URL search changes

    // ... (rest of the helper functions remain the same)

    const handleFilterSubmit = (e) => {
        e.preventDefault();
        // Clear category selection when performing a keyword search to avoid restricted results
        // but KEEP location and date filters so they can be used together
        if (keyword) {
            setSelectedCategoryId(null);
        }

        // Construct search params based on ALL current filter states
        const newParams = {};
        if (keyword) newParams.search = keyword;
        // We don't necessarily want to put location/dates in URL if not requested, 
        // but setSearchParams will trigger the useEffect which calls fetchEvents.
        setSearchParams(newParams);
        fetchEvents();
    };

    const clearFilters = () => {
        setKeyword('');
        setLocation('');
        setStartDate('');
        setEndDate('');
        setSelectedCategoryId(null);
        setSearchParams({});
        fetchEvents();
    };

    const handleSync = async () => {
        try {
            setLoading(true);
            await axios.post(`${API_BASE_URL}/Event/sync?keyword=${keyword || 'concert'}`);
            alert("Sync successful! Real events from Ticketmaster added.");
            fetchEvents();
        } catch (error) {
            console.error('Sync error:', error);
            alert("Sync failed: " + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {/* Hero Section */}
            <div className="relative h-[600px] w-full overflow-hidden bg-gray-900 flex items-center">
                <div className="absolute inset-0">
                    <img
                        src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=1920"
                        alt="Hero"
                        className="w-full h-full object-cover scale-105 animate-slow-zoom"
                    />
                    <div className="absolute inset-0 bg-black/40"></div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/60 to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>

                <div className="relative max-w-7xl mx-auto px-4 w-full">
                    <div className="max-w-3xl space-y-8">
                        <div>
                            <span className="bg-orange-600 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-xl shadow-orange-950/20 mb-6 inline-block">
                                Discover Events
                            </span>
                            <h1 className="text-6xl md:text-8xl font-black text-white leading-[1.1] filter drop-shadow-2xl">
                                Find Your <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600">
                                    Next Experience
                                </span>
                            </h1>
                        </div>

                        {/* Search Bar in Hero */}
                        <div className="relative max-w-2xl">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search for artists, venues, or events..."
                                className="w-full pl-16 pr-24 py-6 bg-white rounded-2xl shadow-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/20 text-lg font-medium"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleFilterSubmit(e)}
                            />
                            {keyword && (
                                <button
                                    onClick={() => { setKeyword(''); setSearchParams({}); fetchEvents(); }}
                                    className="absolute right-32 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                            <button
                                onClick={handleFilterSubmit}
                                className="absolute right-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg"
                            >
                                Search
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Categories & Filter */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm py-4">
                <div className="max-w-7xl mx-auto px-4">
                    {/* Category Buttons */}
                    <div className="flex flex-wrap gap-2 mb-6 justify-center">
                        <button
                            onClick={() => setSelectedCategoryId(null)}
                            className={`px-6 py-2 rounded-full font-bold transition-all ${!selectedCategoryId ? 'bg-orange-500 text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            All
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategoryId(cat.id)}
                                className={`px-6 py-2 rounded-full font-bold transition-all ${selectedCategoryId === cat.id ? 'bg-orange-500 text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleFilterSubmit} className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full text-sm">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Location</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Istanbul, Ankara..."
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="w-full md:w-40">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date</label>
                            <input
                                type="date"
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="w-full md:w-40">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Date</label>
                            <input
                                type="date"
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <button type="submit" className="flex-1 md:flex-none bg-gray-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-black transition-colors flex items-center justify-center gap-2">
                                <Filter className="w-4 h-4" /> Filter
                            </button>
                            {(keyword || location || startDate || endDate) && (
                                <button type="button" onClick={clearFilters} className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg font-bold hover:bg-gray-200 transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleSync}
                                className="bg-orange-100 text-orange-600 px-4 py-2 rounded-lg font-bold hover:bg-orange-200 transition-colors flex items-center gap-2"
                                title="Sync with Ticketmaster"
                            >
                                <ChevronRight className="w-4 h-4" /> Sync
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Event Grid */}
            <div className="max-w-7xl mx-auto px-4 py-16">
                <h2 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                    <span className="w-1.5 h-8 bg-orange-500 rounded-full"></span>
                    Upcoming Events
                </h2>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="animate-pulse bg-gray-200 rounded-xl h-80"></div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {events.length > 0 ? (
                            events.map((event) => (
                                <Link to={`/event/${event.id}`} key={event.id} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col h-full">
                                    <div className="relative h-48 overflow-hidden">
                                        <img
                                            src={event.imageUrl || "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=1000"}
                                            alt={event.name}
                                            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                                        />
                                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-gray-900 shadow-sm">
                                            {event.capacity} Left
                                        </div>
                                    </div>
                                    <div className="p-5 flex-grow flex flex-col">
                                        <div className="flex items-center gap-2 text-xs font-bold text-orange-500 mb-2 uppercase tracking-wide">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(event.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors">
                                            {event.name}
                                        </h3>
                                        <div className="mt-auto pt-4 flex items-center justify-between text-sm text-gray-500 border-t border-gray-100">
                                            <div className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                <span className="truncate max-w-[100px]">{event.location}</span>
                                            </div>
                                            <span className="flex items-center text-orange-600 font-semibold group-hover:translate-x-1 transition-transform">
                                                Buy <ChevronRight className="w-4 h-4" />
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="col-span-full text-center py-12 text-gray-500">
                                No events found matching your criteria.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
