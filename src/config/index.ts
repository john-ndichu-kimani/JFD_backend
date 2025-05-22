import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  clientUrl:process.env.CLIENT_URL || 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'default_jwt_secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieSecret: process.env.COOKIE_SECRET || 'default_cookie_secret',
  paypalClientId: process.env.PAYPAL_CLIENT_ID || 'Aai-Jcr7GKdSubAVz5wpK8-Q6ZeFtSs98LO11m7kr8GQiXKUDEC5M5CLdNPGOe4ryQ3anw91Kx5fmjAe',
  paypalClientSecret: process.env.PAYPAL_CLIENT_SECRET || 'EHr1EZStW6KWrbI82nBHxw3dazWrdW2vKx8M0iuR8aTDZjVRMNvoW_OhRDTUke0Q9oZNfQ-klLpnyLr5',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  sessionSecret: process.env.SESSION_SECRET || 'default_session_secret',
  isProd: process.env.NODE_ENV === 'production',
  isDev: process.env.NODE_ENV === 'development',
};

export default config;