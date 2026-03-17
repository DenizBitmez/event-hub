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
    console.log("Starting Admin Verification...");

    // 1. Login as Admin
    console.log("[1] Logging in as Admin...");
    var adminLogin = await request('POST', '/auth/login', JSON.stringify({ Email: 'admin@eventhub.com', Password: 'admin123' }));
    if (adminLogin.status !== 200) {
        console.error("Admin Login Failed. Status:", adminLogin.status, "Body:", adminLogin.body);
        return;
    }
    var adminToken = JSON.parse(adminLogin.body).token;

    // 2. Login as User
    console.log("[2] Logging in as User...");
    var userLogin = await request('POST', '/auth/login', JSON.stringify({ Email: 'test@example.com', Password: 'hashed_secret' }));
    var userToken = JSON.parse(userLogin.body).token;

    // 3. Check Initial Report
    console.log("[3] Checking Initial Report...");
    var reportRes1 = await request('GET', '/admin/reports/events', null, adminToken);
    if (reportRes1.status !== 200) {
        console.error("Get Report Failed. Status:", reportRes1.status, "Body:", reportRes1.body);
        return;
    }
    var report1 = JSON.parse(reportRes1.body);
    if (!report1 || report1.length === 0) { console.error("Report is empty"); return; }
    var capacityBefore = report1[0].remainingCapacity;
    console.log(`   Initial Capacity: ${capacityBefore}`);

    // 4. Book a Ticket
    console.log("[4] Booking a Ticket...");
    var bookRes = await request('POST', '/booking', JSON.stringify({ EventId: 1, Quantity: 1 }), userToken);
    var ticketId = JSON.parse(bookRes.body).ticketId;
    console.log(`   Booked Ticket ID: ${ticketId}`);

    // 5. Cancel Ticket
    console.log("[5] Admin Cancelling Ticket...");
    var cancelRes = await request('POST', `/admin/tickets/${ticketId}/cancel`, null, adminToken);
    if (cancelRes.status === 200) console.log("   Cancellation Success");
    else console.error("   Cancellation Failed", cancelRes);

    // 6. Check Final Report
    console.log("[6] Checking Final Report...");
    var report2 = JSON.parse((await request('GET', '/admin/reports/events', null, adminToken)).body);
    var capacityAfter = report2[0].remainingCapacity;
    console.log(`   Final Capacity: ${capacityAfter}`);

    if (capacityAfter === capacityBefore) {
        console.log("PASSED: Inventory correctly restored!");
    } else {
        console.log("FAILED: Inventory verification mismatch.");
    }
}

run();
