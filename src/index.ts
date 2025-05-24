import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import config from './config';
import { errorHandler } from './middleware/error';
import authRouter from './routes/auth.route';
import userRouter from './routes/user.routes';
import productRouter from './routes/product.route';
import cartRouter from './routes/cart.route';
import categoryRouter from './routes/category.route'
import tribeRouter from './routes/tribe.route'
import orderRouter from './routes/order.route'
import paypalRouter from './routes/paypal.route'

const app = express();

// Middleware
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/products', productRouter);
app.use('/api/carts', cartRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/orders', orderRouter);
app.use('/api/tribes', tribeRouter);
app.use('/api/paypal',paypalRouter)

app.use('/uploads',express.static('uploads'))

// Error handling middleware (should be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = config.port || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});

export default app;