import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Calendar, MapPin, Clock, Info, ShieldCheck, Ticket, Armchair } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '../components/CheckoutForm';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { API_BASE_URL, API_ORIGIN } from '../config';

const PAGE_API_BASE_URL = API_BASE_URL;

export default function EventDetailPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const [event, setEvent] = useState(null);
    const [seats, setSeats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSeats, setSelectedSeats] = useState([]);
    const [reservationId, setReservationId] = useState(null); // Just a flag or expiry
    const [bookingStep, setBookingStep] = useState('select'); // select, reserved, payment, confirmed
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);
    const [clientSecret, setClientSecret] = useState(''); // New state for Stripe Payment Intent
    const [stripePromise, setStripePromise] = useState(null);

    useEffect(() => {
        axios.get(`${PAGE_API_BASE_URL}/Stripe/config`).then(async (r) => {
            const { publishableKey } = r.data;
            if (publishableKey) {
                setStripePromise(loadStripe(publishableKey));
            } else {
                console.warn('No Stripe publishable key configured on the server.');
            }
        });
    }, []);

    // Fetch Event and Seats
    const fetchData = async () => {
        try {
            const [eventRes, seatsRes] = await Promise.all([
                axios.get(`${PAGE_API_BASE_URL}/Event/${id}`),
                axios.get(`${PAGE_API_BASE_URL}/Event/${id}/seats`)
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
        // Fallback polling removed to test Real-time updates purely via SignalR
        // const interval = setInterval(fetchData, 5000); 
        // return () => clearInterval(interval);
    }, [id]);

    // SignalR Real-Time Connection
    useEffect(() => {
        if (!id) return;

        const connection = new HubConnectionBuilder()
            .withUrl(`${API_ORIGIN}/hubs/seats`) // e.g. http://localhost:5181/hubs/seats
            .configureLogging(LogLevel.Information)
            .withAutomaticReconnect()
            .build();

        connection.start()
            .then(() => {
                console.log("SignalR Connected to SeatHub");
                connection.invoke("JoinEventGroup", id.toString());

                connection.on("SeatUpdated", (seatId, status) => {
                    console.log(`Real-time update: Seat ${seatId} is now ${status}`);
                    setSeats(prevSeats =>
                        prevSeats.map(seat =>
                            seat.id === seatId ? { ...seat, status: status } : seat
                        )
                    );
                });
            })
            .catch(err => console.error("SignalR Connection Error: ", err));

        return () => {
            if (connection.state === "Connected") {
                connection.invoke("LeaveEventGroup", id.toString()).catch(console.error);
                connection.stop();
            }
        };
    }, [id]);

    // Note: Kept the old success query params logic in case the redirect is ever needed, 
    // but the inline CheckoutForm doesn't use it anymore by default.
    useEffect(() => {
        if (!user) return; // Wait for user context
        const query = new URLSearchParams(window.location.search);

        if (query.get('success') && query.get('session_id')) {
            const sessionId = query.get('session_id');
            const finalizeCheckout = async () => {
                try {
                    const res = await axios.post(`${PAGE_API_BASE_URL}/Stripe/complete-checkout`, { sessionId });
                    setBookingStep('confirmed');
                    setMessage(`Booking Confirmed! Main Ticket ID: ${res.data?.ticketId || ''}`);
                    fetchData();
                    window.history.replaceState({}, document.title, window.location.pathname);
                } catch (err) {
                    setError(err.response?.data?.message || err.response?.data || 'Failed to finalize booking.');
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            };
            finalizeCheckout();
        } else if (query.get('canceled')) {
            setError('Payment was canceled. You can try again.');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [id, user]);

    const handleReserve = async () => {
        if (!user) {
            setError("Please login to book a seat.");
            return;
        }
        if (selectedSeats.length === 0) return;

        try {
            setMessage(null);
            setError(null);
            await axios.post(`${PAGE_API_BASE_URL}/Booking/reserve-multiple`, {
                eventId: parseInt(id),
                seatIds: selectedSeats.map(s => s.id)
            });
            setBookingStep('reserved');
            setMessage(`${selectedSeats.length} seats reserved! You have 10 minutes to confirm.`);
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
        if (!user || selectedSeats.length === 0) return;

        try {
            const res = await axios.post(`${API_BASE_URL}/Stripe/create-payment-intent`, {
                eventId: parseInt(id),
                seatIds: selectedSeats.map(s => s.id)
            });

            // Set client secret and move to payment step
            setClientSecret(res.data.clientSecret);
            setBookingStep('payment');
            setError(null);
        } catch (err) {
            if (err.response && err.response.status === 401) {
                setError("Session expired. Please logout and login again.");
            } else {
                setError(err.response?.data?.error || err.response?.data?.message || 'Payment initiation failed.');
            }
        }
    };

    const handlePaymentSuccess = (data) => {
        setBookingStep('confirmed');
        setMessage(`Booking Confirmed! Main Ticket ID: ${data?.ticketId || ''}`);
        fetchData();
        setClientSecret('');
    };

    const handlePaymentCancel = () => {
        setBookingStep('reserved'); // Send them back to reserved step
        setClientSecret('');
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full"></div></div>;
    if (!event) return <div className="min-h-screen flex items-center justify-center">Event not found</div>;

    // Group seats by Row (simple grouping)
    const seatsByRow = seats.reduce((acc, seat) => {
        if (!acc[seat.row]) acc[seat.row] = [];
        acc[seat.row].push(seat);
        return acc;
    }, {});

    const eventImage = event?.imageUrl || "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=1000";

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            {/* Header / Hero Section */}
            <div className="relative h-[55vh] min-h-[400px]">
                <img src={eventImage} className="absolute inset-0 w-full h-full object-cover" alt={event.name} />
                <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/40 to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-gray-50 via-transparent to-transparent"></div>

                <div className="absolute inset-0 flex items-center">
                    <div className="max-w-7xl mx-auto px-4 w-full">
                        <div className="max-w-2xl space-y-6">
                            <div className="flex flex-wrap gap-2">
                                {event.category && (
                                    <span className="bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg shadow-orange-900/20">
                                        {event.category.name}
                                    </span>
                                )}
                                {event.genre && (
                                    <span className="bg-white/10 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-white/20">
                                        {event.genre}
                                    </span>
                                )}
                            </div>

                            <h1 className="text-5xl md:text-6xl font-black text-white leading-tight filter drop-shadow-2xl">
                                {event.name}
                            </h1>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white/90">
                                <div className="flex items-center gap-3 group">
                                    <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:bg-orange-500/20 transition-colors">
                                        <Calendar className="w-5 h-5 text-orange-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-white/50 font-bold uppercase tracking-widest">Date</p>
                                        <p className="font-semibold">{new Date(event.startDate).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 group">
                                    <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:bg-orange-500/20 transition-colors">
                                        <MapPin className="w-5 h-5 text-orange-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-white/50 font-bold uppercase tracking-widest">Location</p>
                                        <p className="font-semibold">{event.venue || event.location}, {event.city}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            <div className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Seat Map & About */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-gray-900">
                            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                                <Info className="w-6 h-6 text-orange-600" />
                            </div>
                            About This Event
                        </h2>
                        <div className="space-y-4">
                            <p className="text-gray-600 leading-relaxed whitespace-pre-line pl-6 border-l-2 border-orange-200">
                                {event.description || `${event.name} will take place at ${event.venue || event.location} on ${new Date(event.startDate).toLocaleDateString()}. Don't miss this amazing ${event.genre || 'event'}!`}
                            </p>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-gray-100">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Venue</p>
                                    <p className="text-sm font-bold text-gray-700">{event.venue || 'TBA'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">City</p>
                                    <p className="text-sm font-bold text-gray-700">{event.city || 'TBA'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Genre</p>
                                    <p className="text-sm font-bold text-gray-700">{event.genre || 'Live Event'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Price From</p>
                                    <p className="text-sm font-bold text-orange-600">${event.price}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-8 shadow-sm">
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
                                                        setSelectedSeats(prev => {
                                                            const isSelected = prev.find(ps => ps.id === seat.id);
                                                            if (isSelected) {
                                                                return prev.filter(ps => ps.id !== seat.id);
                                                            } else {
                                                                return [...prev, seat];
                                                            }
                                                        });
                                                    }
                                                }}
                                                disabled={seat.status !== 'Available'}
                                                className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${selectedSeats.some(ps => ps.id === seat.id)
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

                </div>

                {/* Right: Booking Summary */}
                <div className="lg:col-span-1">
                    <div className="sticky top-24 bg-white rounded-3xl shadow-xl p-6 border border-gray-100">
                        <h3 className="text-xl font-bold mb-4">Booking Summary</h3>

                        {selectedSeats.length > 0 ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 rounded-xl space-y-2 max-h-60 overflow-y-auto">
                                    {selectedSeats.map(seat => (
                                        <div key={seat.id} className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                                            <span className="text-gray-500">Row {seat.row} - {seat.number}</span>
                                            <span className="font-semibold text-orange-600">${seat.price || 100}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                                        <span className="text-gray-900 font-bold">Total ({selectedSeats.length})</span>
                                        <span className="text-xl font-bold text-gray-900">
                                            ${selectedSeats.reduce((sum, s) => sum + (s.price || 100), 0).toFixed(2)}
                                        </span>
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
                                        Proceed to Pay
                                    </button>
                                )}

                                {user && bookingStep === 'payment' && clientSecret && (
                                    <div className="mt-4 border-t border-gray-100 pt-4">
                                        <Elements
                                            stripe={stripePromise}
                                            options={{
                                                clientSecret,
                                                appearance: {
                                                    theme: 'stripe',
                                                }
                                            }}
                                        >
                                            <CheckoutForm
                                                clientSecret={clientSecret}
                                                baseUrl={API_BASE_URL}
                                                onSuccess={handlePaymentSuccess}
                                                onCancel={handlePaymentCancel}
                                                selectedSeatsCount={selectedSeats.length}
                                                totalAmount={selectedSeats.reduce((sum, s) => sum + (s.price || 100), 0)}
                                            />
                                        </Elements>
                                    </div>
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
