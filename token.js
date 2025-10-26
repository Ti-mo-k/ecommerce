// getToken.js
require('dotenv').config();
const axios = require('axios');

async function getAccessToken() {
    const url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
    const auth = Buffer.from(`${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`).toString('base64');

    try {
        const response = await axios.get(url, {
            headers: { Authorization: `Basic ${auth}` }
        });
        console.log("Access Token:", response.data.access_token);
        return response.data.access_token;
    } catch (err) {
        console.error(err.response.data);
    }
}

getAccessToken();
