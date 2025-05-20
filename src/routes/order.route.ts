import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth';
import { 
  getAllOrders, 
  getUserOrders, 
  getOrderById, 
  createOrder, 
  updateOrderToPaid, 
  updateOrderStatus, 
  cancelOrder 
} from '../controllers/order.controller';
import { 
  initiatePaypalPayment, 
  handlePaypalConfirmation, 
  handlePaypalCancellation, 
  handlePaypalWebhook 
} from '../controllers/paypal.controller';
import { 
  validateCreateOrder, 
  validateUpdateOrderStatus,
  validatePaymentResult,
  validatePayPalPayment
} from '../validators/orders.validator';

const router = Router();

// Public routes
router.post('/webhook/paypal', handlePaypalWebhook);
router.get('/confirm', handlePaypalConfirmation);
router.get('/cancel', handlePaypalCancellation);

// Protected routes (requires authentication)
router.use(protect);

// Customer routes
router.route('/')
  .post(validateCreateOrder, createOrder)  // Create order
  .get(getUserOrders);                     // Get user's orders

router.route('/:id')
  .get(getOrderById);                      // Get order by ID

router.route('/:id/pay')
  .post(validatePaymentResult, updateOrderToPaid);                // Mark order as paid (generic)

router.route('/:id/paypal')
  .post(validatePayPalPayment, initiatePaypalPayment);            // Initiate PayPal payment

router.route('/:id/cancel')
  .put(cancelOrder);                       // Cancel order

// Admin routes
router.use(restrictTo('ADMIN'));
router.get('/admin/all', getAllOrders);    // Get all orders (admin only)
router.put('/:id/status', validateUpdateOrderStatus, updateOrderStatus); // Update order status

export default router;