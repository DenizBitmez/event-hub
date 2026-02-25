import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Ticket, Calendar, MapPin, Armchair } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5181/api';

export default function MyBookingsPage() {
    const { user } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchBookings = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/Booking/user/my-bookings`);
            setBookings(response.data);
        } catch (error) {
            console.error('Error fetching bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchBookings();
        }
    }, [user]);

    const handleRefund = async (ticketId) => {
        if (!window.confirm('Are you sure you want to refund this ticket? This action cannot be undone.')) return;

        try {
            await axios.post(`${API_BASE_URL}/Booking/refund/${ticketId}`);
            // Update local state or re-fetch
            fetchBookings();
        } catch (error) {
            console.error('Error refunding ticket:', error);
            alert('Failed to refund ticket. Please try again.');
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full"></div></div>;

    return (
        <div className="bg-gray-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-8 flex items-center gap-3">
                    <Ticket className="w-8 h-8 text-orange-500" /> My Tickets
                </h1>

                {bookings.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                        <Ticket className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings yet</h3>
                        <p className="text-gray-500 mb-6">You haven't purchased any tickets yet.</p>
                        <Link to="/" className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-orange-600 hover:bg-orange-700">
                            Browse Events
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {bookings.map((booking) => (
                            <div key={booking.id} className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row border border-gray-100 transition-all hover:shadow-md">
                                <div className="bg-gradient-to-br from-orange-500 to-pink-600 p-6 flex flex-col justify-center items-center text-white md:w-48 relative overflow-hidden">
                                    <div className="relative z-10 text-center">
                                        <div className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1">Status</div>
                                        <div className="font-bold text-lg">{booking.status}</div>
                                    </div>
                                    <div className="absolute inset-0 bg-white/10 transform rotate-12 scale-150"></div>
                                </div>
                                <div className="p-6 flex-1">
                                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-2">{booking.eventName}</h3>
                                            <div className="space-y-2 text-sm text-gray-600">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-orange-500" />
                                                    {new Date(booking.eventDate).toLocaleDateString()} at {new Date(booking.eventDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-4 h-4 text-orange-500" />
                                                    {booking.venue}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-lg min-w-[150px]">
                                            <div className="flex items-center gap-2 mb-2 text-gray-900 font-bold">
                                                <Armchair className="w-4 h-4 text-gray-500" /> Seat Info
                                            </div>
                                            <div className="text-sm space-y-1 text-gray-600">
                                                <div className="flex justify-between"><span>Section:</span> <span className="font-medium text-gray-900">{booking.seatSection}</span></div>
                                                <div className="flex justify-between"><span>Row:</span> <span className="font-medium text-gray-900">{booking.seatRow}</span></div>
                                                <div className="flex justify-between"><span>Seat:</span> <span className="font-medium text-orange-600">{booking.seatNumber}</span></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-6 flex flex-wrap gap-4 items-center justify-between border-t border-gray-100 pt-4">
                                        <div className="text-sm text-gray-400">
                                            Purchased on {new Date(booking.purchaseDate).toLocaleDateString()}
                                        </div>
                                        <div className="text-xl font-bold text-gray-900">
                                            ${booking.price}
                                        </div>
                                    </div>

                                    {booking.status === 'Confirmed' && (
                                        <div className="mt-4 flex justify-end">
                                            <button
                                                onClick={() => handleRefund(booking.id)}
                                                className="text-xs font-bold text-red-500 hover:text-red-600 uppercase tracking-widest border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-all"
                                            >
                                                Refund Ticket
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
