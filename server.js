import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8080;

// ✅ Ensure CORS settings allow GitHub Pages
app.use(cors({
    origin: '*', // TEMP: Allow all origins for debugging
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ✅ Root route to confirm the server is running
app.get('/', (req, res) => {
    res.send('✅ VoApps CORS Proxy is running!');
});

// ✅ Proxy route
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

        const data = await response.json();
        console.log('✅ Response from API:', data);
        res.setHeader('Access-Control-Allow-Origin', '*'); // TEMP: Add explicit CORS header
        res.json(data);
    } catch (error) {
        console.error('❌ Proxy Error:', error.message);
        res.status(500).json({ error: 'Proxy request failed', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 CORS Proxy Server running on http://localhost:${PORT}`);
});
