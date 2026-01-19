const http = require('http');

const TOTAL_REQUESTS = 50;
const CONCURRENCY = 50; // Simultaneous requests
const API_URL = 'http://localhost:5181/api/booking';

const makeRequest = (id) => {
    return new Promise((resolve) => {
        const data = JSON.stringify({
            EventId: 1,
            UserId: 1000 + id,
            Quantity: 1
        });

        const req = http.request(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        }, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                resolve({ status: res.statusCode, body });
            });
        });

        req.on('error', (e) => {
            resolve({ status: 0, error: e.message });
        });

        req.write(data);
        req.end();
    });
};

async function runTest() {
    console.log(`Starting ${TOTAL_REQUESTS} concurrent requests...`);

    const promises = [];
    for (let i = 0; i < TOTAL_REQUESTS; i++) {
        promises.push(makeRequest(i));
    }

    const results = await Promise.all(promises);

    let successCount = 0;
    let conflictCount = 0; // Sold Out (Expected)
    let errorCount = 0;

    results.forEach(r => {
        if (r.status === 200) successCount++;
        else if (r.status === 409 || r.status === 400) conflictCount++;
        else errorCount++;
    });

    const result = {
        total: TOTAL_REQUESTS,
        success: successCount,
        conflict: conflictCount,
        errors: errorCount,
        passed: successCount <= 10 && successCount + conflictCount === TOTAL_REQUESTS
    };

    console.log('JSON_RESULT:' + JSON.stringify(result));

    if (result.passed) {
        console.log('PASSED');
    } else {
        console.log('FAILED');
    }
}

runTest();
