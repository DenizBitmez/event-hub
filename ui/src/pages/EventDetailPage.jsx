import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Calendar, MapPin, Clock, Info, ShieldCheck, Ticket, Armchair } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = 'http://localhost:5181/api';

export default function EventDetailPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const [event, setEvent] = useState(null);
    const [seats, setSeats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSeat, setSelectedSeat] = useState(null);
    const [reservationId, setReservationId] = useState(null); // Just a flag or expiry
    const [bookingStep, setBookingStep] = useState('select'); // select, reserved, confirmed
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    // Fetch Event and Seats
    const fetchData = async () => {
        try {
            const [eventRes, seatsRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/Event/${id}`),
                axios.get(`${API_BASE_URL}/Event/${id}/seats`)
            ]);
            setEvent(eventRes.data);
            console.log("Seats Response:", seatsRes.data);
            setSeats(seatsRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
            setError('Failed to load event data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // Poll for updates
        return () => clearInterval(interval);
    }, [id]);

    const handleReserve = async () => {
        if (!user) {
            setError("Please login to book a seat.");
            return;
        }
        if (!selectedSeat) return;

        try {
            setMessage(null);
            setError(null);
            await axios.post(`${API_BASE_URL}/Booking/reserve`, {
                eventId: parseInt(id),
                seatId: selectedSeat.id
            });
            setBookingStep('reserved');
            setMessage("Seat reserved! You have 10 minutes to confirm.");
            fetchData(); // Refresh seat status
        } catch (err) {
            if (err.response && err.response.status === 401) {
                setError("Session expired. Please logout and login again.");
            } else {
                setError(err.response?.data?.message || 'Reservation failed.');
            }
        }
    };

    const handleConfirm = async () => {
        if (!user || !selectedSeat) return;

        try {
            const res = await axios.post(`${API_BASE_URL}/Booking/confirm`, {
                eventId: parseInt(id),
                seatId: selectedSeat.id
            });
            setBookingStep('confirmed');
            setMessage(`Booking Confirmed! Ticket ID: ${res.data.ticketId}`);
            fetchData();
        } catch (err) {
            if (err.response && err.response.status === 401) {
                setError("Session expired. Please logout and login again.");
            } else {
                setError(err.response?.data?.message || 'Confirmation failed.');
            }
            setBookingStep('select'); // Reset on failure
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full"></div></div>;
    if (!event) return <div className="min-h-screen flex items-center justify-center">Event not found</div>;

    // Group seats by Row (simple grouping)
    const seatsByRow = seats.reduce((acc, seat) => {
        if (!acc[seat.row]) acc[seat.row] = [];
        acc[seat.row].push(seat);
        return acc;
    }, {});

    const eventImage = "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=1000";

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            {/* Header Image */}
            <div className="relative h-[40vh] overflow-hidden">
                <img src={eventImage} className="absolute inset-0 w-full h-full object-cover blur-sm opacity-50" />
                <div className="absolute inset-0 bg-gradient-to-b from-gray-900/40 via-gray-900/60 to-gray-50"></div>
                <div className="absolute bottom-0 left-0 w-full p-8 text-white max-w-7xl mx-auto">
                    <h1 className="text-4xl font-extrabold mb-2">{event.name}</h1>
                    <div className="flex items-center gap-4 text-sm font-medium">
                        <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(event.startDate).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {event.location}</span>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Seat Map */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        <Armchair className="w-6 h-6 text-orange-500" /> Select Your Seat
                    </h2>

                    <div className="overflow-x-auto">
                        <div className="min-w-[500px] flex flex-col gap-4 items-center">
                            <div className="w-2/3 h-8 bg-gray-300 rounded-b-xl mb-8 flex items-center justify-center text-gray-600 text-sm font-bold tracking-widest uppercase">Stage</div>

                            {Object.entries(seatsByRow).sort().map(([row, rowSeats]) => (
                                <div key={row} className="flex gap-2 items-center">
                                    <span className="w-6 text-center font-bold text-gray-400">{row}</span>
                                    {rowSeats.sort((a, b) => parseInt(a.number) - parseInt(b.number)).map(seat => (
                                        <button
                                            key={seat.id}
                                            onClick={() => {
                                                if (seat.status === 'Available') {
                                                    setBookingStep('select');
                                                    setSelectedSeat(seat);
                                                }
                                            }}
                                            disabled={seat.status !== 'Available'}
                                            className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${selectedSeat?.id === seat.id
                                                ? 'bg-orange-500 text-white ring-2 ring-orange-300 ring-offset-2'
                                                : seat.status === 'Available'
                                                    ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
                                                    : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                                }`}
                                            title={`Row ${seat.row} - Seat ${seat.number} (${seat.status})`}
                                        >
                                            {seat.number}
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-8 flex gap-4 justify-center text-sm text-gray-600">
                        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div> Available</div>
                        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-gray-100 rounded"></div> Sold / Reserved</div>
                        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-orange-500 rounded"></div> Selected</div>
                    </div>
                </div>

                {/* Right: Booking Summary */}
                <div className="lg:col-span-1">
                    <div className="sticky top-24 bg-white rounded-3xl shadow-xl p-6 border border-gray-100">
                        <h3 className="text-xl font-bold mb-4">Booking Summary</h3>

                        {selectedSeat ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Section</span>
                                        <span className="font-semibold">{selectedSeat.section}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Seat</span>
                                        <span className="font-semibold text-orange-600">Row {selectedSeat.row} - {selectedSeat.number}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                                        <span className="text-gray-900 font-bold">Price</span>
                                        <span className="text-xl font-bold text-gray-900">${selectedSeat.price}</span>
                                    </div>
                                </div>

                                {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}
                                {message && <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm">{message}</div>}

                                {!user && (
                                    <Link to="/login" className="block w-full py-3 bg-gray-800 text-white text-center rounded-xl font-bold hover:bg-gray-900">
                                        Login to Book
                                    </Link>
                                )}

                                {user && bookingStep === 'select' && (
                                    <button
                                        onClick={handleReserve}
                                        className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200"
                                    >
                                        Reserve Seat
                                    </button>
                                )}

                                {user && bookingStep === 'reserved' && (
                                    <button
                                        onClick={handleConfirm}
                                        className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-200"
                                    >
                                        Confirm & Pay
                                    </button>
                                )}

                                {user && bookingStep === 'confirmed' && (
                                    <div className="text-center p-4 bg-green-50 rounded-xl">
                                        <Ticket className="w-12 h-12 text-green-500 mx-auto mb-2" />
                                        <p className="font-bold text-green-800">You're going!</p>
                                        <Link to="/my-bookings" className="text-green-600 hover:underline text-sm mt-2 block">
                                            View Ticket
                                        </Link>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-400">
                                <Armchair className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>Select a seat to proceed</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
