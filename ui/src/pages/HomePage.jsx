import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, ChevronRight, Ticket } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5181/api/Booking';

export default function HomePage() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/events`);
                setEvents(response.data);
            } catch (error) {
                console.error('Error fetching events:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

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
                        <button className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-full font-bold backdrop-blur-sm transition-all">
                            Learn More
                        </button>
                    </div>
                </div>
            </div>

            {/* Events Filter (Visual Only) */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex overflow-x-auto gap-8 py-4 text-sm font-medium text-gray-500 no-scrollbar">
                        <button className="text-orange-600 border-b-2 border-orange-600 pb-4 -mb-4 whitespace-nowrap">All Events</button>
                        <button className="hover:text-gray-900 whitespace-nowrap">Concerts</button>
                        <button className="hover:text-gray-900 whitespace-nowrap">Theater</button>
                        <button className="hover:text-gray-900 whitespace-nowrap">Stand-up</button>
                        <button className="hover:text-gray-900 whitespace-nowrap">Festivals</button>
                        <button className="hover:text-gray-900 whitespace-nowrap">Sports</button>
                    </div>
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
                        {events.map((event) => (
                            <Link to={`/event/${event.id}`} key={event.id} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col h-full">
                                <div className="relative h-48 overflow-hidden">
                                    <img
                                        src={getEventImage(event.id)}
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
                                        {new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors">
                                        {event.name}
                                    </h3>
                                    <div className="mt-auto pt-4 flex items-center justify-between text-sm text-gray-500 border-t border-gray-100">
                                        <div className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            <span>Istanbul</span>
                                        </div>
                                        <span className="flex items-center text-orange-600 font-semibold group-hover:translate-x-1 transition-transform">
                                            Buy Ticket <ChevronRight className="w-4 h-4" />
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
