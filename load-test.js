import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50, // 50 Virtual Users
  duration: '10s', // Run for 10 seconds
};

export default function () {
  const url = 'http://localhost:5200/api/booking';
  // Payload matches BookingRequest DTO
  const payload = JSON.stringify({
    EventId: 1,
    UserId: Math.floor(Math.random() * 10000), // Random User ID
    Quantity: 1
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'is status 200 (Success)': (r) => r.status === 200,
    'is status 409 (Sold Out)': (r) => r.status === 409,
    'is status 400 (Bad Request)': (r) => r.status === 400,
  });

  sleep(0.1);
}

