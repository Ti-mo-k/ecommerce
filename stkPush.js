require('dotenv').config();
const axios = require('axios');

async function getAccessToken() {
  const url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
  const auth = Buffer.from(`${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`).toString('base64');

  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Basic ${auth}` }
    });
    return response.data.access_token;
  } catch (err) {
    console.error("❌ Access Token Error:", err.response?.data || err.message);
  }
}

async function stkPush(phone, amount) {
  const shortcode = process.env.SHORTCODE;
  const passkey = process.env.PASSKEY;
  const timestamp = new Date().toISOString().replace(/[-T:\.Z]/g, "").slice(0, 14);
  const password = Buffer.from(shortcode + passkey + timestamp).toString('base64');

  const accessToken = await getAccessToken();

  const data = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.round(amount), // Ensure amount is an integer
    PartyA: phone,
    PartyB: shortcode,
    PhoneNumber: phone,
    CallBackURL: process.env.CALLBACK_URL,
    AccountReference: "E-shop",
    TransactionDesc: "Payment Test"
  };

  try {
    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      data,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    console.log("✅ STK Push Response:", response.data);
    if (response.data.ResponseCode !== '0') {
      throw new Error(`STK Push failed: ${response.data.ResponseDescription || response.data.errorMessage || 'Unknown error'}`);
    }
    return response.data; // Return the response data
  } catch (err) {
    console.error("❌ STK Push Failed:", err.response?.data || err.message);
    throw err; // Re-throw the error to propagate it
  }
}

module.exports = stkPush;
