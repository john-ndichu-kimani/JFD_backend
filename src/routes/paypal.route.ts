import { Router } from 'express';
import {
  initiatePaypalPayment,
  handlePaypalConfirmation,
  handlePaypalCancellation,
  handlePaypalWebhook
} from '../controllers/paypal.controller';
import { protect } from '../middleware/auth';
const router = Router();

router.use(protect)

// Initiate PayPal payment (must be authenticated)
router.post('/pay/:orderId', initiatePaypalPayment);

// PayPal confirmation (callback from PayPal after payment approval)
router.get('/success', handlePaypalConfirmation);

// PayPal cancellation (callback if user cancels on PayPal)
router.get('/cancel', handlePaypalCancellation);

// Webhook from PayPal (should be configured in PayPal dashboard)
router.post('/webhook', handlePaypalWebhook);

export default router;
