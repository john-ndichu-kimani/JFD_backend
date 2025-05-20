import { Router } from 'express';
import {
  initiatePaypalPayment,
  handlePaypalConfirmation,
  handlePaypalCancellation,
  handlePaypalWebhook
} from '../controllers/paypal.controller';
import { asyncHandler } from '../middleware/error';

const router = Router();


router.post(
  '/orders/:orderId',
 
);


router.get(
  '/success',
);


router.get(
  '/cancel',
);


router.post(
  '/webhook',
);

export default router;