import React, { useState, useEffect } from 'react';
import type { Activity, LocalTransportBookingDetails } from '../types';
import { bookLocalTransport, checkLocalTransportBookingStatus } from '../services/bookingService';
import { CloseIcon, LockIcon, CalendarIcon, CarIcon, CheckCircleIcon } from './icons';

interface LocalTransportBookingModalProps {
    activity: Activity;
    onClose: () => void;
    onBookingComplete: () => void;
}

const LocalTransportBookingModal: React.FC<LocalTransportBookingModalProps> = ({ activity, onClose, onBookingComplete }) => {
    const [payment, setPayment] = useState({ cardNumber: '', expiryDate: '', cvc: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmation, setConfirmation] = useState<{ message: string, id: string } | null>(null);
    const [isAlreadyBooked, setIsAlreadyBooked] = useState(false);

    useEffect(() => {
        setIsAlreadyBooked(checkLocalTransportBookingStatus(activity));
    }, [activity]);

    const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPayment({ ...payment, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        
        const bookingDetails: LocalTransportBookingDetails = { payment };
        
        try {
            const result = await bookLocalTransport(activity, bookingDetails);
            setConfirmation({ message: result.confirmationMessage, id: result.bookingId });
            setTimeout(() => {
              onBookingComplete();
              onClose();
            }, 5000);
        } catch (err) {
             setError(err instanceof Error ? err.message : 'An unknown error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const inputStyles = "form-input w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/50 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-cyan-400/50 dark:focus:border-cyan-400";
    
    if (isAlreadyBooked) {
         return (
             <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                 <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl dark:border dark:border-gray-700 p-8 max-w-md w-full relative">
                      <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-100 mb-2">Ride Already Booked</h2>
                      <p className="text-center text-gray-600 dark:text-gray-400">This local transport has already been booked and confirmed.</p>
                      <div className="mt-6 flex justify-center">
                          <button onClick={onClose} className="bg-cyan-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-cyan-700 transition duration-300">
                             Close
                          </button>
                      </div>
                 </div>
             </div>
        );
    }
    
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl dark:border dark:border-gray-700 p-6 max-w-md w-full relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 z-10">
                    <CloseIcon className="h-6 w-6" />
                </button>
                <div className="flex items-center mb-4">
                    <CarIcon className="h-8 w-8 text-cyan-600 dark:text-cyan-400 mr-3" />
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Book Local Ride</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{activity.description}</p>
                    </div>
                </div>

                {confirmation ? (
                     <div className="text-center p-8">
                        <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" />
                        <h3 className="mt-4 text-2xl font-bold text-green-600 dark:text-green-400">Ride Confirmed!</h3>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">{confirmation.message}</p>
                        <p className="mt-4 font-semibold text-gray-800 dark:text-gray-200">Booking ID: <span className="font-mono bg-gray-100 dark:bg-gray-700 p-1 rounded">{confirmation.id}</span></p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">You can view your booking details at any time from the itinerary tab.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-200">Payment Details</h3>
                            <div className="space-y-3">
                                <div>
                                    <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Card Number</label>
                                    <div className="relative">
                                        <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                        <input id="cardNumber" type="text" name="cardNumber" placeholder="0000 0000 0000 0000" value={payment.cardNumber} onChange={handlePaymentChange} required className={inputStyles} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expiry Date</label>
                                        <div className="relative">
                                            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                            <input id="expiryDate" type="text" name="expiryDate" placeholder="MM/YY" value={payment.expiryDate} onChange={handlePaymentChange} required className={inputStyles} />
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="cvc" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CVC</label>
                                        <div className="relative">
                                            <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                            <input id="cvc" type="text" name="cvc" placeholder="123" value={payment.cvc} onChange={handlePaymentChange} required className={inputStyles} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {error && <p className="text-red-500 text-sm text-center pt-2">{error}</p>}

                        <button type="submit" disabled={isLoading} className="w-full mt-4 py-3 font-bold text-white rounded-lg transition duration-300 flex items-center justify-center bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-400 disabled:cursor-wait">
                            {isLoading ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Processing...
                                </>
                            ) : `Confirm Booking for ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(activity.estimated_cost)}`}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default LocalTransportBookingModal;