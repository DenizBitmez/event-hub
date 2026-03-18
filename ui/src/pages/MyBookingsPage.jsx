import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Ticket, Calendar, MapPin, Armchair, Download, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import { API_BASE_URL } from '../config';

const PAGE_API_BASE_URL = API_BASE_URL;

export default function MyBookingsPage() {
    const { user } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const ticketRef = { current: null };

    const handleTicketClick = (booking) => {
        setSelectedTicket(booking);
    };

    const closeTicketModal = (e) => {
        if (e) e.stopPropagation();
        setSelectedTicket(null);
    };

    const handleDownloadPdf = (e) => {
        if (e) e.stopPropagation();
        const element = ticketRef.current;
        const opt = {
            margin: 0.5,
            filename: `ticket-${selectedTicket.id}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        html2pdf().from(element).set(opt).save();
    };

    const fetchBookings = async () => {
        try {
            const response = await axios.get(`${PAGE_API_BASE_URL}/Booking/user/my-bookings`);
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
                            <div key={booking.id}
                                onClick={() => handleTicketClick(booking)}
                                className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row border border-gray-100 transition-all hover:shadow-md cursor-pointer relative">
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
                                                onClick={(e) => { e.stopPropagation(); handleRefund(booking.id); }}
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

            {/* Ticket Modal */}
            {selectedTicket && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeTicketModal}>
                    <div
                        className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative"
                        onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside modal
                    >
                        {/* Close button */}
                        <button
                            onClick={closeTicketModal}
                            className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/10 hover:bg-black/20 rounded-full flex items-center justify-center transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-800" />
                        </button>

                        {/* Download button */}
                        <button
                            onClick={handleDownloadPdf}
                            className="absolute top-4 right-14 z-10 font-bold flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-full transition-colors text-sm shadow-md"
                        >
                            <Download className="w-4 h-4" /> PDF
                        </button>

                        {/* Printable Ticket Area */}
                        <div ref={(el) => { ticketRef.current = el; }} className="p-8 pb-10 bg-white">
                            <div className="text-center mb-6">
                                <Ticket className="w-12 h-12 text-orange-500 mx-auto mb-2" />
                                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{selectedTicket.eventName}</h2>
                                <p className="text-gray-500 uppercase tracking-widest text-xs mt-1 font-bold inline-block border border-gray-200 px-2 py-0.5 rounded-md mt-2">Official e-Ticket</p>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                                        <Calendar className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Date & Time</p>
                                        <p className="font-bold text-gray-900">{new Date(selectedTicket.eventDate).toLocaleDateString()} at {new Date(selectedTicket.eventDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                                        <MapPin className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Location</p>
                                        <p className="font-bold text-gray-900">{selectedTicket.venue}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 border-t border-b border-gray-200 py-4 mb-4 text-center bg-gray-50 rounded-lg">
                                <div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Section</p>
                                    <p className="font-black text-xl text-gray-900 truncate">{selectedTicket.seatSection}</p>
                                </div>
                                <div className="border-l border-r border-gray-200">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Row</p>
                                    <p className="font-black text-xl text-gray-900 truncate">{selectedTicket.seatRow}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Seat</p>
                                    <p className="font-black text-xl text-orange-600 truncate">{selectedTicket.seatNumber}</p>
                                </div>
                            </div>

                            <div className="flex justify-between items-end mt-6">
                                <div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Purchaser</p>
                                    <p className="font-bold text-gray-800">{user?.email || 'Guest'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Ticket ID</p>
                                    <p className="font-mono font-bold text-gray-800 text-sm">#{selectedTicket.id}</p>
                                </div>
                            </div>

                            {/* Fake Barcode Generator */}
                            <div className="mt-8 flex justify-center w-full overflow-hidden h-12 opacity-60">
                                {[...Array(40)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="bg-black inline-block h-full"
                                        style={{
                                            width: `${Math.max(1, Math.random() * 5)}px`,
                                            marginRight: `${Math.random() * 3}px`
                                        }}
                                    />
                                ))}
                            </div>
                            <div className="text-center mt-1">
                                <p className="text-[8px] tracking-[0.3em] font-mono text-gray-400">{selectedTicket.id}-{new Date(selectedTicket.purchaseDate).getTime().toString().slice(-6)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
