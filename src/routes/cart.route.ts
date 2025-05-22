import express from 'express';
import { 
  getCartById,
  addItemToCart, 
  updateCartItem, 
  removeCartItem, 
  clearCart
} from '../controllers/cart.controller';

const router = express.Router();

// GET /api/carts/:sessionId - Get user's cart by session ID
router.get('/:sessionId', getCartById);

// POST /api/carts/:cartId/items - Add item to cart
router.post('/:cartId/items', addItemToCart);

// PATCH /api/carts/items/:itemId - Update cart item quantity
router.patch('/items/:itemId', updateCartItem);

// DELETE /api/carts/items/:itemId - Remove item from cart
router.delete('/items/:itemId', removeCartItem);

// DELETE /api/carts/:cartId - Clear entire cart
router.delete('/:cartId', clearCart);

export default router;