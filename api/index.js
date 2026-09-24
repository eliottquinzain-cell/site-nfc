const netlifyHandler = require('../netlify/functions/api.js').handler;

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const event = {
        httpMethod: req.method,
        headers: req.headers || {},
        queryStringParameters: req.query || {},
        body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}),
        path: req.url
    };

    const context = {};

    try {
        const result = await netlifyHandler(event, context);
        if (result.headers) {
            for (const [key, value] of Object.entries(result.headers)) {
                res.setHeader(key, value);
            }
        }
        res.status(result.statusCode || 200).send(result.body);
    } catch (err) {
        console.error('API Error:', err);
        res.status(500).json({ error: 'Erreur interne du serveur', details: err.message });
    }
};
