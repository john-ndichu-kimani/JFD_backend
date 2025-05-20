import express from 'express';
import {
  getUserCart,
  addItemToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from '../controllers/cart.controller';
import { protect } from '../middleware/auth';
// import {
//   validateAddItemToCart,
//   validateUpdateCartItem,
// } from '../validators/cartValidator';

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET /api/cart - Get user's cart
router.get('/', getUserCart);

// POST /api/cart/items - Add item to cart
router.post('/items', addItemToCart);

// PUT /api/cart/items/:itemId - Update cart item quantity
router.put('/items/:itemId',  updateCartItem);

// DELETE /api/cart/items/:itemId - Remove item from cart
router.delete('/items/:itemId', removeCartItem);

// DELETE /api/cart/clear - Clear entire cart
router.delete('/clear', clearCart);

export default router;