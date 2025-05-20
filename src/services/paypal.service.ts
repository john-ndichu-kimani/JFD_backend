import axios from 'axios';
import config from '../config';

const PAYPAL_API = process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com';

interface PayPalTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}
// Generate PayPal access token
const generateAccessToken = async (): Promise<string> => {
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
  const accessToken = await generateAccessToken();
  const response = await axios.post(
    `${PAYPAL_API}/v2/checkout/orders`,
    {
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
        return_url: `${process.env.SERVER_URL}/api/orders/confirm`,
        cancel_url: `${process.env.SERVER_URL}/api/orders/cancel`,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

// Capture PayPal payment
export const capturePaypalPayment = async (paypalOrderId: string) => {
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
};