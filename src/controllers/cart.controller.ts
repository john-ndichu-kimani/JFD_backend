import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { asyncHandler } from '../middleware/error';
import { AuthenticatedRequest } from '../types';

/**
 * Get user's cart by session ID
 * @route GET /carts/:sessionId
 */
export const getCartById = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  if (!sessionId) {
    return res.status(400).json({ message: 'Session ID is required' });
  }

  const cart = await prisma.cart.findUnique({
    where: { sessionId },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!cart) {
    // Create a new cart if one doesn't exist
    const newCart = await prisma.cart.create({
      data: {
        sessionId,
        total: 0,
        items: {
          create: [],
        },
      },
      include: {
        items: true,
      },
    });
    return res.status(200).json(newCart);
  }

  res.status(200).json(cart);
});

/**
 * Add item to user's cart
 * @route POST /carts/:cartId/items
 */
export const addItemToCart = asyncHandler(async (req: Request, res: Response) => {
  const { cartId } = req.params;
  const { productId, quantity, price } = req.body;

  if (!cartId || !productId) {
    return res.status(400).json({ message: 'Cart ID and Product ID are required' });
  }

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ message: 'Quantity must be greater than 0' });
  }

  // Verify cart exists
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
  });

  if (!cart) {
    return res.status(404).json({ message: 'Cart not found' });
  }

  // Verify product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  // Check if product already in cart
  const existingItem = await prisma.cartItem.findFirst({
    where: {
      cartId,
      productId,
    },
  });

  // Use the product's price if not provided
  const itemPrice = price || product.price;

  if (existingItem) {
    // Update quantity if item already exists
    const updatedItem = await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: {
        quantity: existingItem.quantity + quantity,
      },
      include: {
        product: true,
      },
    });

    // Update cart total
    await updateCartTotal(cartId);
    
    return res.status(200).json(updatedItem);
  }

  // Add new item to cart
  const newItem = await prisma.cartItem.create({
    data: {
      cartId,
      productId,
      quantity,
      price: itemPrice,
    },
    include: {
      product: true,
    },
  });

  // Update cart total
  await updateCartTotal(cartId);

  res.status(201).json(newItem);
});

/**
 * Update cart item quantity
 * @route PATCH /cart-items/:itemId
 */
export const updateCartItem = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { itemId } = req.params;
  const { quantity } = req.body;

  if (!itemId) {
    return res.status(400).json({ message: 'Item ID is required' });
  }

  if (quantity === undefined || quantity < 0) {
    return res.status(400).json({ message: 'Valid quantity is required' });
  }

  // Find the cart item first
  const cartItem = await prisma.cartItem.findUnique({
    where: { id: itemId },
  });

  if (!cartItem) {
    return res.status(404).json({ message: 'Cart item not found' });
  }

  // If quantity is 0, remove the item
  if (quantity === 0) {
    await prisma.cartItem.delete({
      where: { id: itemId },
    });
    
    // Update cart total
    await updateCartTotal(cartItem.cartId);
    
    return res.status(200).json({ message: 'Item removed from cart' });
  }

  // Update the item
  const updatedItem = await prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity },
    include: {
      product: true,
    },
  });

  // Update cart total
  await updateCartTotal(cartItem.cartId);

  res.status(200).json(updatedItem);
});

/**
 * Remove item from cart
 * @route DELETE /cart-items/:itemId
 */
export const removeCartItem = asyncHandler(async (req: Request, res: Response) => {
  const { itemId } = req.params;

  if (!itemId) {
    return res.status(400).json({ message: 'Item ID is required' });
  }

  // Find the cart item first
  const cartItem = await prisma.cartItem.findUnique({
    where: { id: itemId },
  });

  if (!cartItem) {
    return res.status(404).json({ message: 'Cart item not found' });
  }

  // Save the cartId for updating the total
  const cartId = cartItem.cartId;

  // Delete the item
  await prisma.cartItem.delete({
    where: { id: itemId },
  });

  // Update cart total
  await updateCartTotal(cartId);

  res.status(200).json({ message: 'Item removed from cart' });
});

/**
 * Clear entire cart
 * @route DELETE /carts/:cartId
 */
export const clearCart = asyncHandler(async (req: Request, res: Response) => {
  const { cartId } = req.params;

  if (!cartId) {
    return res.status(400).json({ message: 'Cart ID is required' });
  }

  // Get the cart
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
  });

  if (!cart) {
    return res.status(404).json({ message: 'Cart not found' });
  }

  // Delete all items in the cart
  await prisma.cartItem.deleteMany({
    where: { cartId },
  });

  // Reset cart total to 0
  await prisma.cart.update({
    where: { id: cartId },
    data: { total: 0 }
  });

  res.status(200).json({ message: 'Cart cleared successfully' });
});

/**
 * Helper function to update the total price of a cart
 * @param cartId The ID of the cart to update
 */
const updateCartTotal = async (cartId: string): Promise<void> => {
  // Get all items in the cart
  const cartItems = await prisma.cartItem.findMany({
    where: { cartId },
    include: { product: true }
  });

  // Calculate the total price
  const total = cartItems.reduce((sum, item) => {
    return sum + (Number(item.price) * item.quantity);
  }, 0);

  // Update the cart with the new total
  await prisma.cart.update({
    where: { id: cartId },
    data: { total }
  });
};