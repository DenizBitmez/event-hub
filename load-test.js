import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50, // 50 Virtual Users
  duration: '10s', // Run for 10 seconds
};

export default function () {
  const url = 'http://localhost:5200/api/booking/naive'; // Adjust port if needed
  const payload = JSON.stringify(1); // EventId = 1
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'is status 200': (r) => r.status === 200,
    'is status 400 (Sold Out)': (r) => r.status === 400,
  });
  
  // No sleep, hit as hard as possible? Or minimal sleep
  sleep(0.1);
}
