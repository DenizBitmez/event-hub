const http = require('http');

const API_BASE = 'http://localhost:5181/api';

const request = (method, path, body, token = null) => {
    return new Promise((resolve) => {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (body) headers['Content-Length'] = Buffer.byteLength(body);

        const req = http.request(`${API_BASE}${path}`, { method, headers }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', e => resolve({ status: 0, error: e.message }));
        if (body) req.write(body);
        req.end();
    });
};

async function run() {
    console.log("Starting Reservation Verification...");

    // 0. Login User 1 & 2
    console.log("[0] Authenticating Users...");
    var u1 = JSON.parse((await request('POST', '/auth/login', JSON.stringify({ Email: 'test@example.com', Password: 'hashed_secret' }))).body).token;

    // Register User 2
    await request('POST', '/auth/register', JSON.stringify({ FullName: "Rival User", Email: "rival@test.com", Password: "pwd" }));
    var u2 = JSON.parse((await request('POST', '/auth/login', JSON.stringify({ Email: 'rival@test.com', Password: 'pwd' }))).body).token;

    const EVENT_ID = 1;
    const SEAT_ID = 1; // Section A, Row 1, Seat 1

    // 1. User 1 Reserves Seat
    console.log(`[1] User 1 reserving Seat ${SEAT_ID}...`);
    var res1 = await request('POST', '/booking/reserve', JSON.stringify({ EventId: EVENT_ID, SeatId: SEAT_ID }), u1);
    console.log("   User 1 Reserve Status:", res1.status, res1.body);

    if (res1.status !== 200) { console.error("FAILED to reserve"); return; }

    // 2. User 2 Tries to Reserve Same Seat
    console.log(`[2] User 2 trying to reserve Seat ${SEAT_ID}...`);
    var res2 = await request('POST', '/booking/reserve', JSON.stringify({ EventId: EVENT_ID, SeatId: SEAT_ID }), u2);
    console.log("   User 2 Reserve Status (Expect 409):", res2.status);

    if (res2.status === 409) console.log("   PASSED: Seat is locked!");
    else console.error("   FAILED: User 2 could reserve locked seat!");

    // 3. User 1 Confirms Booking
    console.log(`[3] User 1 Confirming Booking...`);
    var confirm = await request('POST', '/booking/confirm', JSON.stringify({ EventId: EVENT_ID, SeatId: SEAT_ID }), u1);
    console.log("   Confirm Status:", confirm.status, confirm.body);

    if (confirm.status === 200) console.log("PASSED: Booking Confirmed via Redis Reservation!");
    else console.error("FAILED: Could not confirm.");
}

run();
