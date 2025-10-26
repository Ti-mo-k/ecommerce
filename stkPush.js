// stkPush.js
require('dotenv').config();
const axios = require('axios');

const shortcode = "174379"; // Sandbox shortcode
const passkey = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";

async function stkPush(phone, amount) {
    const timestamp = new Date().toISOString().replace(/[-T:\.Z]/g, "").slice(0, 14);
    const password = Buffer.from(shortcode + passkey + timestamp).toString('base64');

    // Use your access token
    const accessToken = await getAccessToken();

    const data = {
        "BusinessShortCode": shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": amount,
        "PartyA": phone, // The phone initiating the payment
        "PartyB": shortcode, 
        "PhoneNumber": phone,
        "CallBackURL": "https://example.com/callback",
        "AccountReference": "E-shop",
        "TransactionDesc": "Payment Test"
    };

    try {
        const response = await axios.post(
            'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            data,
            {
                headers: { Authorization: `Bearer ${accessToken}` }
            }
        );
        console.log(response.data);
    } catch (err) {
        console.error(err.response.data);
    }
}

// You need getAccessToken function too (from previous snippet)
async function getAccessToken() {
    const url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
    const auth = Buffer.from(`${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`).toString('base64');

    try {
        const response = await axios.get(url, {
            headers: { Authorization: `Basic ${auth}` }
        });
        return response.data.access_token;
    } catch (err) {
        console.error(err.response.data);
    }
}

// Test
// stkPush("254798688000", 1); // Replace with your sandbox phone number
module.exports = stkPush;