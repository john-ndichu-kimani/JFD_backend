import axios from 'axios';
import config from '../config';

const PAYPAL_API = process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com';
// Default to localhost:3000 if SERVER_URL isn't set
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

interface PayPalTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// Generate PayPal access token
const generateAccessToken = async (): Promise<string> => {
  // Fixed the typo in clientId
  const auth = Buffer.from(`${config.paypalClientId}:${config.paypalClientSecret}`).toString('base64');
  
  const response = await axios.post<PayPalTokenResponse>(
    `${PAYPAL_API}/v1/oauth2/token`,
    'grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
  
  return response.data.access_token;
};

// Create PayPal order
export const createPaypalOrder = async (orderId: string, total: number) => {
  try {
    const accessToken = await generateAccessToken();
    
    // Log the complete payload for debugging
    const payload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: orderId,
          amount: {
            currency_code: 'USD',
            value: total.toFixed(2),
          },
        },
      ],
      application_context: {
        return_url: `${SERVER_URL}/api/orders/confirm`,
        cancel_url: `${SERVER_URL}/api/orders/cancel`,
      },
    };
    
    console.log('PayPal create order payload:', JSON.stringify(payload, null, 2));
    
    const response = await axios.post(
      `${PAYPAL_API}/v2/checkout/orders`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    return response.data;
  } catch (error: any) {
    // Enhanced error logging
    if (error.response) {
      // This is an Axios error with response data
      console.error('PayPal API Error Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    } else if (error.request) {
      // Request was made but no response received
      console.error('PayPal API Request Error (No Response):', error.request);
    } else {
      // Something else caused the error
      console.error('PayPal Error:', error.message);
    }
    throw error;
  }
};

// Capture PayPal payment
export const capturePaypalPayment = async (paypalOrderId: string) => {
  try {
    const accessToken = await generateAccessToken();
    
    const response = await axios.post(
      `${PAYPAL_API}/v2/checkout/orders/${paypalOrderId}/capture`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    return response.data;
  } catch (error: any) {
    // Enhanced error logging
    if (error.response) {
      // This is an Axios error with response data
      console.error('PayPal Capture Error Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    } else if (error.request) {
      // Request was made but no response received
      console.error('PayPal Capture Request Error (No Response):', error.request);
    } else {
      // Something else caused the error
      console.error('PayPal Capture Error:', error.message);
    }
    throw error;
  }
};