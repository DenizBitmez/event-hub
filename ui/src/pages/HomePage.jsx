import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, ChevronRight, Ticket, Filter, X } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5181/api';

export default function HomePage() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter State
    const [location, setLocation] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [categories, setCategories] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const params = {};
            if (location) params.location = location;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
            if (selectedCategoryId) params.categoryId = selectedCategoryId;

            const response = await axios.get(`${API_BASE_URL}/Event`, { params });
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
            const response = await axios.get(`${API_BASE_URL}/Event/categories`);
            setCategories(response.data);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    useEffect(() => {
        fetchEvents();
        fetchCategories();
    }, [selectedCategoryId]); // Reload events when category changes

    // Mock images for demonstration
    const getEventImage = (id) => {
        const images = [
            "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=1000", // Concert
            "https://images.unsplash.com/photo-1514525253440-b393452e8d26?auto=format&fit=crop&q=80&w=1000", // Club
            "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?auto=format&fit=crop&q=80&w=1000", // Party
            "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=1000"  // Art
        ];
        return images[id % images.length];
    };

    const handleFilterSubmit = (e) => {
        e.preventDefault();
        fetchEvents();
    };

    const clearFilters = () => {
        setLocation('');
        setStartDate('');
        setEndDate('');
        setSelectedCategoryId(null);
        fetchEvents();
    };

    const handleSync = async () => {
        try {
            setLoading(true);
            await axios.post(`${API_BASE_URL}/Event/sync?keyword=concert`);
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
            <div className="relative h-[500px] w-full overflow-hidden bg-gray-900">
                <div className="absolute inset-0">
                    <img
                        src="https://images.unsplash.com/photo-1459749411177-287ce63e3ba6?auto=format&fit=crop&q=80&w=1920"
                        alt="Hero"
                        className="w-full h-full object-cover opacity-60"
                    />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-transparent to-transparent"></div>
                <div className="relative max-w-7xl mx-auto px-4 h-full flex flex-col justify-center">
                    <span className="text-orange-500 font-bold uppercase tracking-wider mb-2">Featured Event</span>
                    <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight">
                        Eras Tour <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-600">Global Experience</span>
                    </h1>
                    <p className="text-gray-300 text-lg md:text-xl max-w-2xl mb-8">
                        Join the most anticipated musical event of the decade. Experience the magic, the music, and the memories.
                    </p>
                    <div className="flex gap-4">
                        <button className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-full font-bold transition-all transform hover:scale-105 flex items-center gap-2">
                            <Ticket className="w-5 h-5" /> Buy Tickets
                        </button>
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
                        <div className="flex-1 w-full">
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
                        <div className="w-full md:w-48">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date</label>
                            <input
                                type="date"
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="w-full md:w-48">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Date</label>
                            <input
                                type="date"
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <button type="submit" className="flex-1 md:flex-none bg-gray-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-black transition-colors flex items-center justify-center gap-2">
                                <Filter className="w-4 h-4" /> Filter
                            </button>
                            {(location || startDate || endDate) && (
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
