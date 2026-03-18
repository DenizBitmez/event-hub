import { useState } from 'react';
import axios from 'axios';
import { Calendar, Users, Ticket, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../config';

const CARD_API_BASE_URL = `${CARD_API_BASE_URL}/Booking`;

const strategies = [
    { id: 'naive', name: 'Naive (Race Condition)', color: 'bg-red-100 text-red-800 border-red-200' },
    { id: 'pessimistic', name: 'Pessimistic Lock', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    { id: 'optimistic', name: 'Optimistic Lock', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    { id: 'redis', name: 'Redis Lock', color: 'bg-green-100 text-green-800 border-green-200' },
];

export default function EventCard({ event, refreshEvents }) {
    const [loading, setLoading] = useState(null);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    const handleBook = async (strategy) => {
        setLoading(strategy);
        setMessage(null);
        setError(null);

        try {
            const response = await axios.post(`${CARD_API_BASE_URL}/${strategy}`, event.id, {
                headers: { 'Content-Type': 'application/json' }
            });
            setMessage(response.data);
            refreshEvents();
        } catch (err) {
            if (err.response) {
                setError(err.response.data || 'Booking failed');
            } else {
                setError('Network error or server unavailable');
            }
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Ticket className="w-6 h-6" />
                    {event.name}
                </h3>
                <p className="text-indigo-100 mt-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(event.date).toLocaleDateString()}
                </p>
            </div>

            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2 text-gray-600">
                        <Users className="w-5 h-5" />
                        <span className="font-medium">Remaining Capacity:</span>
                    </div>
                    <span className={`text-2xl font-bold ${event.capacity > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {event.capacity}
                    </span>
                </div>

                <div className="space-y-3">
                    <p className="text-sm text-gray-500 font-medium uppercase tracking-wide mb-2">Booking Strategy</p>
                    <div className="grid grid-cols-1 gap-2">
                        {strategies.map((strategy) => (
                            <button
                                key={strategy.id}
                                onClick={() => handleBook(strategy.id)}
                                disabled={loading !== null || event.capacity <= 0}
                                className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-between border ${strategy.color} hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                <span>{strategy.name}</span>
                                {loading === strategy.id && <Loader2 className="w-4 h-4 animate-spin" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Message Area */}
                {(message || error) && (
                    <div className={`mt-6 p-4 rounded-lg text-sm flex items-start gap-3 ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                        {error ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
                        <div>
                            <p className="font-semibold">{error ? 'Error' : 'Success'}</p>
                            <p>{message || error}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
