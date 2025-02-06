import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({
    origin: 'https://eiznem.github.io',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.get('/', (req, res) => {
    res.send('✅ VoApps CORS Proxy is running!');
});

app.post('/proxy', async (req, res) => {
    const { url, apiKey, method = 'GET', body = null } = req.body;

    try {
        console.log(`🔗 Sending request to: ${url}`);

        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: body ? JSON.stringify(body) : undefined
        });

        const contentType = response.headers.get('content-type');

        // ✅ Check if the response is JSON or CSV
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            console.log('✅ JSON Response from API:', data);
            res.json(data);
        } else {
            const text = await response.text();
            console.log('✅ CSV Response received.');
            res.send(text);  // ✅ Send CSV as plain text
        }
    } catch (error) {
        console.error('❌ Proxy Error:', error.message);
        res.status(500).json({ error: 'Proxy request failed', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 CORS Proxy Server running on http://localhost:${PORT}`);
});
