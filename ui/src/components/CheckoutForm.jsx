import React, { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import axios from 'axios';
import { Ticket, AlertCircle } from 'lucide-react';

export default function CheckoutForm({ clientSecret, onSuccess, onCancel, baseUrl, selectedSeatsCount, totalAmount }) {
    const stripe = useStripe();
    const elements = useElements();

    const [message, setMessage] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!stripe || !elements) {
            // Stripe.js has not yet loaded.
            return;
        }

        setIsProcessing(true);

        // Confirm the payment
        // We do not redirect! We use confirmPayment with redirect: 'if_required'
        let error, paymentIntent;
        try {
            const result = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: window.location.href,
                },
                redirect: 'if_required'
            });
            error = result.error;
            paymentIntent = result.paymentIntent;
        } catch (err) {
            console.error("Stripe confirmPayment threw an error:", err);
            setMessage(err.message || 'Payment processing failed due to an unexpected error.');
            setIsProcessing(false);
            return;
        }

        if (error) {
            setMessage(error.message);
            setIsProcessing(false);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            // Payment succeeded! Now we tell the backend to finalize the booking.
            try {
                const res = await axios.post(`${baseUrl}/Stripe/confirm-payment-intent`, {
                    paymentIntentId: paymentIntent.id
                });

                onSuccess(res.data);
            } catch (backendError) {
                console.error("Backend confirmation logic failed:", backendError);
                let errorMessage = 'Payment succeeded but booking failed! Please contact support.';
                if (backendError.response?.data) {
                    if (typeof backendError.response.data === 'string') {
                        errorMessage = backendError.response.data;
                    } else if (backendError.response.data.message) {
                        errorMessage = backendError.response.data.message;
                    } else if (backendError.response.data.error) {
                        errorMessage = backendError.response.data.error;
                    }
                } else if (backendError.message) {
                    errorMessage = backendError.message;
                }
                setMessage(errorMessage);
            }
            setIsProcessing(false);
        } else {
            setMessage("An unexpected status occurred.");
            setIsProcessing(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Ticket className="w-5 h-5 text-orange-500" /> Complete Payment
            </h3>

            <div className="bg-gray-50 p-4 rounded-xl mb-6 flex justify-between items-center text-sm">
                <div>
                    <span className="text-gray-500">Total (for {selectedSeatsCount} seats):</span>
                </div>
                <div className="text-lg font-black text-gray-900 border-l border-gray-200 pl-4">
                    ${totalAmount.toFixed(2)}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="p-4 border border-gray-200 rounded-xl bg-white shadow-inner">
                    <PaymentElement id="payment-element" />
                </div>

                {message && (
                    <div className="flex gap-2 items-center p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{message}</span>
                    </div>
                )}

                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isProcessing}
                        className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isProcessing || !stripe || !elements}
                        className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-200 disabled:opacity-50 flex items-center justify-center"
                    >
                        {isProcessing ? 'Processing...' : `Pay $${totalAmount.toFixed(2)}`}
                    </button>
                </div>
            </form>
        </div>
    );
}
