import { createBrowserRouter } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import EventDetailPage from './pages/EventDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MyBookingsPage from './pages/MyBookingsPage';
import HelpCenterPage from './pages/HelpCenterPage';
import ContactSupportPage from './pages/ContactSupportPage';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <MainLayout />,
        children: [
            {
                index: true,
                element: <HomePage />,
            },
            {
                path: 'event/:id',
                element: <EventDetailPage />,
            },
            {
                path: 'login',
                element: <LoginPage />,
            },
            {
                path: 'register',
                element: <RegisterPage />,
            },
            {
                path: 'my-bookings',
                element: <MyBookingsPage />,
            },
            {
                path: 'help',
                element: <HelpCenterPage />,
            },
            {
                path: 'contact',
                element: <ContactSupportPage />,
            },
        ],
    },
]);
