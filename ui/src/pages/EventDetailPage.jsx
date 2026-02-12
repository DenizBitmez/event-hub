import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Calendar, MapPin, Clock, Info, ShieldCheck, AlertTriangle, ChevronRight, Settings, Ticket } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5181/api/Booking';

const strategies = [
    { id: 'naive', name: 'Standard (Naive)', desc: 'Vulnerable to race conditions' },
    { id: 'pessimistic', name: 'Safe (Pessimistic)', desc: 'Uses DB Locking (Slower)' },
    { id: 'optimistic', name: 'Safe (Optimistic)', desc: 'Uses Versioning (Fast Fail)' },
    { id: 'redis', name: 'High Perf (Redis)', desc: 'Distributed Locking' },
];

export default function EventDetailPage() {
    const { id } = useParams();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    // Developer Mode Settings
    const [devMode, setDevMode] = useState(false);
    const [selectedStrategy, setSelectedStrategy] = useState('naive');

    const fetchEvent = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/events/${id}`);
            setEvent(response.data);
        } catch (error) {
            console.error('Error fetching event:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvent();
        // Auto-refresh for live capacity updates
        const interval = setInterval(fetchEvent, 2000);
        return () => clearInterval(interval);
    }, [id]);

    const handleBook = async () => {
        if (!event || event.capacity <= 0) return;

        setBookingLoading(true);
        setMessage(null);
        setError(null);

        try {
            const response = await axios.post(`${API_BASE_URL}/${selectedStrategy}`, event.id, {
                headers: { 'Content-Type': 'application/json' }
            });
            setMessage(response.data);
            fetchEvent();
        } catch (err) {
            if (err.response) {
                setError(err.response.data || 'Booking failed');
            } else {
                setError('Network error');
            }
        } finally {
            setBookingLoading(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full"></div></div>;
    if (!event) return <div className="min-h-screen flex items-center justify-center">Event not found</div>;

    const eventImage = "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=1000"; // Generic for now

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            {/* Dynamic Background Blur */}
            <div className="relative h-[60vh] overflow-hidden">
                <img src={eventImage} className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-50 scale-110" />
                <div className="absolute inset-0 bg-gradient-to-b from-gray-900/40 via-gray-900/60 to-gray-50"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 -mt-[40vh] relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Image & Details */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Main Card */}
                        <div className="bg-white rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5">
                            <div className="aspect-video relative">
                                <img src={eventImage} className="w-full h-full object-cover" />
                                <div className="absolute top-6 right-6 bg-white/95 backdrop-blur px-4 py-2 rounded-xl font-bold text-gray-900 shadow-lg flex flex-col items-center">
                                    <span className="text-xs uppercase text-gray-500 tracking-wider">Starting From</span>
                                    <span className="text-xl">$150.00</span>
                                </div>
                            </div>

                            <div className="p-8">
                                <div className="flex flex-wrap gap-4 mb-6">
                                    <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-semibold">Concert</span>
                                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">Live Music</span>
                                </div>

                                <h1 className="text-4xl font-extrabold text-gray-900 mb-6">{event.name}</h1>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-600">
                                    <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
                                        <Calendar className="w-6 h-6 text-orange-500" />
                                        <div>
                                            <p className="text-sm text-gray-500">Date</p>
                                            <p className="font-semibold text-gray-900">{new Date(event.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
                                        <Clock className="w-6 h-6 text-orange-500" />
                                        <div>
                                            <p className="text-sm text-gray-500">Time</p>
                                            <p className="font-semibold text-gray-900">20:00 (Doors 18:30)</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
                                        <MapPin className="w-6 h-6 text-orange-500" />
                                        <div>
                                            <p className="text-sm text-gray-500">Venue</p>
                                            <p className="font-semibold text-gray-900">Volkswagen Arena</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
                                        <ShieldCheck className="w-6 h-6 text-green-500" />
                                        <div>
                                            <p className="text-sm text-gray-500">Guarantee</p>
                                            <p className="font-semibold text-gray-900">Official Ticket</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 border-t border-gray-100 pt-8">
                                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <Info className="w-5 h-5 text-gray-400" /> Event Description
                                    </h3>
                                    <p className="text-gray-600 leading-relaxed">
                                        Join us for an unforgettable night of music and entertainment.
                                        Experience the thrill of live performance in one of the city's premier venues.
                                        This event promises spectacular visuals, incredible sound, and memories that will last a lifetime.
                                        Don't miss out on what critics are calling the "Must-See Event of the Year"!
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Sticky Booking Card */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24 space-y-4">
                            <div className="bg-white rounded-3xl shadow-xl p-6 ring-1 ring-black/5">
                                <div className="mb-6 pb-6 border-b border-gray-100">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-gray-500">Tickets Available</span>
                                        <span className={`text-3xl font-bold ${event.capacity > 0 ? 'text-gray-900' : 'text-red-500'}`}>
                                            {event.capacity}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${event.capacity < 10 ? 'bg-red-500' : 'bg-green-500'}`}
                                            style={{ width: `${Math.min(event.capacity * 2, 100)}%` }} // Mock progress
                                        ></div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleBook}
                                    disabled={bookingLoading || event.capacity <= 0}
                                    className={`w-full py-4 text-lg font-bold rounded-xl shadow-lg shadow-orange-500/30 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2
                                ${event.capacity <= 0
                                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700'
                                        }`}
                                >
                                    {bookingLoading ? (
                                        <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full"></div>
                                    ) : (
                                        <>
                                            <Ticket className="w-6 h-6" />
                                            {event.capacity > 0 ? 'Buy Ticket Now' : 'Sold Out'}
                                        </>
                                    )}
                                </button>

                                {(message || error) && (
                                    <div className={`mt-4 p-4 rounded-xl text-sm font-medium ${error ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                                        {message || error}
                                    </div>
                                )}
                            </div>

                            {/* Developer Options Toggle */}
                            <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-xl">
                                <button
                                    onClick={() => setDevMode(!devMode)}
                                    className="flex items-center justify-between w-full text-sm font-semibold text-slate-400 hover:text-white transition-colors"
                                >
                                    <span className="flex items-center gap-2">
                                        <Settings className="w-4 h-4" /> Developer / Simulation Settings
                                    </span>
                                    <ChevronRight className={`w-4 h-4 transform transition-transform ${devMode ? 'rotate-90' : ''}`} />
                                </button>

                                {devMode && (
                                    <div className="mt-4 pt-4 border-t border-slate-700 space-y-3 animation-fade-in">
                                        <div className="text-xs text-slate-400 mb-2">
                                            Simulate race conditions by opening this page in two windows and clicking "Buy Ticket" simultaneously using the "Naive" strategy.
                                        </div>
                                        {strategies.map(str => (
                                            <div
                                                key={str.id}
                                                onClick={() => setSelectedStrategy(str.id)}
                                                className={`p-3 rounded-lg cursor-pointer border transition-all ${selectedStrategy === str.id
                                                        ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                                                        : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-bold text-sm">{str.name}</span>
                                                    {selectedStrategy === str.id && <div className="w-2 h-2 rounded-full bg-orange-500"></div>}
                                                </div>
                                                <div className="text-xs text-slate-500">{str.desc}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
