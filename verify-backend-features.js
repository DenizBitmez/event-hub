const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:5181/api';

// Helper for making requests
async function request(method, endpoint, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(BASE_URL + endpoint);
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                let parsed;
                const isJson = res.headers['content-type']?.includes('application/json');
                try {
                    parsed = isJson ? JSON.parse(data) : data;
                } catch (e) {
                    parsed = data;
                }

                resolve({
                    status: res.statusCode,
                    body: parsed
                });
            });
        });

        req.on('error', (e) => reject(e));
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function run() {
    console.log("--- Starting Backend Feature Verification ---");

    // 1. Auth as Admin
    console.log("\n1. Logging in as Admin...");
    const adminLogin = await request('POST', '/Auth/login', {
        email: "admin@eventhub.com",
        password: "admin123"
    });

    let adminToken = null;
    if (adminLogin.status === 200) {
        adminToken = adminLogin.body?.token;
        console.log("Admin Token obtained: TRUE");
    } else {
        console.error("Failed to login as admin:", adminLogin.body);
        console.log("Attempting to continue without admin token (might fail if auth enforced)...");
    }

    // 2. Seed Events
    console.log("\n2. Seeding Events...");
    // Attempt with token, even if null (might fail if auth required)
    const seedRes = await request('POST', '/Admin/seed-events', {}, adminToken);
    console.log("Seed Status:", seedRes.status);
    console.log("Seed Response:", seedRes.body);

    // 3. Login as Normal User
    console.log("\n3. Logging in as User...");
    const userUser = "testuser_" + Math.floor(Math.random() * 1000);
    const userEmail = `${userUser}@example.com`;

    // Register first
    await request('POST', '/Auth/register', {
        username: userUser,
        email: userEmail,
        password: "password123"
    });

    const userLogin = await request('POST', '/Auth/login', {
        email: userEmail,
        password: "password123"
    });

    if (userLogin.status !== 200) {
        console.error("User Login Failed:", userLogin.body);
        return;
    }

    const userToken = userLogin.body.token;
    console.log("User Token obtained: TRUE");

    // 4. Filter Events
    console.log("\n4. Testing Event Filtering (Location: Istanbul)...");
    const istanbulEvents = await request('GET', '/Event?location=Istanbul');
    console.log(`Found ${istanbulEvents.body.length} events in Istanbul.`);

    const tarkanEvent = istanbulEvents.body.find(e => e.name.includes("Tarkan"));
    if (!tarkanEvent) {
        console.error("CRITICAL: Tarkan event not found!");
        return;
    }
    console.log("Found Tarkan Event ID:", tarkanEvent.id);

    // 5. Get Seats
    console.log(`\n5. Fetching Seats for Event ${tarkanEvent.id}...`);
    const seatsRes = await request('GET', `/Event/${tarkanEvent.id}/seats`);
    const seats = seatsRes.body;
    console.log(`Retrieved ${seats.length} seats.`);

    const seatToBook = seats.find(s => s.status === 'Available');
    if (!seatToBook) {
        console.error("No available seats found!");
        return;
    }
    console.log(`Selected Seat: ${seatToBook.section} - ${seatToBook.row}${seatToBook.number} (ID: ${seatToBook.id})`);

    // 6. Book Ticket (via Seat Booking)
    // Note: The new BookingController Logic for direct seat booking needs 'BookSeatAsync' exposed or used via 'Confirm' or similar.
    // Looking at BookingController, there isn't a direct "BookSeat" endpoint exposed except via 'confirm' (Redis flow) OR standard 'BookTicket' (naive quantity flow).
    // Wait, the new requirement implies "Own Seat Selection".
    // Does 'BookTicket' support specific seat? 
    // The naive implementation in 'BookingService.BookTicketAsync' (lines 27-97) DOES NOT take a SeatID. It just decrements capacity.
    // The 'ConfirmBooking' endpoint (lines 87-106) calls 'BookSeatAsync'.
    // SO, to book a specific seat, we must go through the Reserve -> Confirm flow.

    console.log("\n6. Booking Flow (Reserve -> Confirm)...");

    // 6a. Reserve
    console.log("   a) Reserving User...");
    const reserveRes = await request('POST', '/Booking/reserve', {
        eventId: tarkanEvent.id,
        seatId: seatToBook.id
    }, userToken);

    if (reserveRes.status !== 200) {
        console.error("Reservation Failed:", reserveRes.body);
        return;
    }
    console.log("   Reservation Success:", reserveRes.body);

    // 6b. Confirm
    console.log("   b) Confirming Booking...");
    const confirmRes = await request('POST', '/Booking/confirm', {
        eventId: tarkanEvent.id,
        seatId: seatToBook.id
    }, userToken);

    if (confirmRes.status !== 200) {
        console.error("Confirmation Failed:", confirmRes.body);
        return;
    }
    console.log("   Confirmation Success. Ticket ID:", confirmRes.body.ticketId);

    // 7. My Bookings
    console.log("\n7. Verifying My Bookings...");
    const myBookings = await request('GET', '/Booking/user/my-bookings', null, userToken);

    if (myBookings.status !== 200) {
        console.error("Fetch Bookings Failed:", myBookings.body);
        return;
    }

    console.log(`Found ${myBookings.body.length} bookings.`);

    const recentBooking = myBookings.body.find(b => b.id === confirmRes.body.ticketId);
    if (recentBooking) {
        console.log("SUCCESS: Booking verified in entry!");
        console.log(`   Event: ${recentBooking.eventName}`);
        console.log(`   Seat: ${recentBooking.seatSection} ${recentBooking.seatRow}-${recentBooking.seatNumber}`);
    } else {
        console.error("FAILURE: Booking not found in history.");
    }

    console.log("\n--- Verification Complete ---");
}

run();
