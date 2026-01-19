const http = require('http');

const TOTAL_USERS = 50;
const API_BASE = 'http://localhost:5181/api';

// Helper for making requests
const request = (method, path, body, token = null) => {
    return new Promise((resolve) => {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (body) headers['Content-Length'] = Buffer.byteLength(body);

        const req = http.request(`${API_BASE}${path}`, {
            method,
            headers
        }, (res) => {
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
    console.log(`Step 1: Registering and Logging in ${TOTAL_USERS} users...`);
    const users = [];

    for (let i = 0; i < TOTAL_USERS; i++) {
        const email = `user${Date.now()}_${i}@test.com`;
        const password = "password123";

        // Register
        await request('POST', '/auth/register', JSON.stringify({
            FullName: `User ${i}`,
            Email: email,
            Password: password
        }));

        // Login
        const loginRes = await request('POST', '/auth/login', JSON.stringify({
            Email: email,
            Password: password
        }));

        if (loginRes.status === 200) {
            const token = JSON.parse(loginRes.body).token;
            users.push({ id: i, token });
        }
    }

    console.log(`Successfully authenticated ${users.length} users.`);
    if (users.length === 0) {
        console.error("Failed to authenticate any users. Aborting.");
        return;
    }

    console.log("Step 2: Starting Concurrent Booking Race...");

    const bookingPromises = users.map(u => {
        return request('POST', '/booking', JSON.stringify({
            EventId: 1,
            Quantity: 1
        }), u.token);
    });

    const results = await Promise.all(bookingPromises);

    let success = 0;
    let soldOut = 0;
    let errors = 0;

    results.forEach(r => {
        if (r.status === 200) success++;
        else if (r.status === 409 || r.status === 400) soldOut++; // 409 Conflict is expected for sold out
        else {
            errors++;
            // console.log("Error:", r.status, r.body); 
        }
    });

    const output = {
        total_requests: users.length,
        success_bookings: success,
        sold_out: soldOut,
        errors: errors,
        is_clean: success <= 10 && (success + soldOut === users.length)
    };

    console.log("JSON_RESULT:" + JSON.stringify(output));

    if (output.is_clean) console.log("PASSED: Perfect concurrency handling.");
    else console.log("FAILED: Potential over-selling or infrastructure errors.");
}

run();
