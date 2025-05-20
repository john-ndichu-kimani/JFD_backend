import { Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../utils/prisma';
import { asyncHandler } from '../middleware/error';
import { AuthenticatedRequest } from '../types';
import { Prisma } from '@prisma/client';

// Get user cart
export const getUserCart = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized'
    });
  }

  const cart = await prisma.cart.findUnique({
    where: { id: req.user.id },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: {
                take: 1
              }
            }
          }
        }
      }
    }
  });

  // If no cart exists, return an empty cart
  if (!cart) {
    return res.status(200).json({
      success: true,
      data: {
        items: [],
        total: 0
      }
    });
  }

  // Calculate the current total (in case product prices have changed)
  let total = 0;
  for (const item of cart.items) {
    total += item.quantity * item.product.price.toNumber();
  }

  // Update cart total if it has changed
  
  if (!cart.total.equals(total)) {
  await prisma.cart.update({
    where: { id: cart.id },
    data: { total },
  });
}


  res.status(200).json({
    success: true,
    data: {
      ...cart,
      total // Use the freshly calculated total
    }
  });
});

// Add item to cart
export const addItemToCart = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized'
    });
  }

  const { productId, quantity } = req.body;

  // Verify product exists and is available
  const product = await prisma.product.findUnique({
    where: { id: productId }
  });

  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  if (!product.isPublished) {
    return res.status(400).json({
      success: false,
      message: 'Product is not available for purchase'
    });
  }

  if (product.stockQuantity < quantity) {
    return res.status(400).json({
      success: false,
      message: `Only ${product.stockQuantity} items available in stock`
    });
  }

  // Get or create user's cart
  let cart = await prisma.cart.findUnique({
    where: { id: req.user.id },
    include: { items: true }
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: {
       sessionId: req.user.id,
        total: new Prisma.Decimal(0)

      },
      include: { items: true }
    });
  }

  // Check if product already in cart
  const existingCartItem = cart.items.find(item => item.productId === productId);

  // Using transaction to ensure consistency
  const updatedCart = await prisma.$transaction(async (prismaClient) => {
    if (existingCartItem) {
      // Update existing cart item
      const newQuantity = existingCartItem.quantity + quantity;
      
      // Check if new quantity exceeds available stock
      if (newQuantity > product.stockQuantity) {
        throw new Error(`Cannot add ${quantity} more items. Only ${product.stockQuantity} available in stock.`);
      }
      
      await prismaClient.cartItem.update({
        where: { id: existingCartItem.id },
        data: { quantity: newQuantity }
      });
    } else {
      // Add new cart item
      await prismaClient.cartItem.create({
        data: {
          cartId: cart!.id,
          productId,
          quantity,
          price: product.price
        }
      });
    }

    // Recalculate cart total
    const updatedItems = await prismaClient.cartItem.findMany({
      where: { cartId: cart!.id },
      include: { product: true }
    });

    const total = updatedItems.reduce(
      (sum, item) => sum + item.quantity * item.product.price.toNumber(),
      0
    );

    // Update cart with new total
    return prismaClient.cart.update({
      where: { id: cart!.id },
      data: { total },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: {
                  take: 1
                }
              }
            }
          }
        }
      }
    });
  }).catch((error) => {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  });

  if (!updatedCart) return;

  res.status(200).json({
    success: true,
    data: updatedCart
  });
});

// Update cart item quantity
export const updateCartItem = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized'
    });
  }

  const { itemId } = req.params;
  const { quantity } = req.body;

  // Check if quantity is valid
  if (quantity < 1) {
    return res.status(400).json({
      success: false,
      message: 'Quantity must be at least 1'
    });
  }

  // Get the cart item
  const cartItem = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: {
      cart: true,
      product: true
    }
  });

  if (!cartItem) {
    return res.status(404).json({
      success: false,
      message: 'Cart item not found'
    });
  }

  // Check if cart belongs to user
  if (cartItem.cart.sessionId !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this cart'
    });
  }

  // Check if quantity exceeds available stock
  if (quantity > cartItem.product.stockQuantity) {
    return res.status(400).json({
      success: false,
      message: `Only ${cartItem.product.stockQuantity} items available in stock`
    });
  }

  // Update cart item quantity and recalculate cart total
  const updatedCart = await prisma.$transaction(async (prismaClient) => {
    // Update cart item
    await prismaClient.cartItem.update({
      where: { id: itemId },
      data: { quantity }
    });

    // Recalculate cart total
    const updatedItems = await prismaClient.cartItem.findMany({
      where: { cartId: cartItem.cartId },
      include: { product: true }
    });

    const total = updatedItems.reduce(
      (sum, item) => sum + item.quantity * item.product.price.toNumber(),
      0
    );

    // Update cart with new total
    return prismaClient.cart.update({
      where: { id: cartItem.cartId },
      data: { total },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: {
                  take: 1
                }
              }
            }
          }
        }
      }
    });
  });

  res.status(200).json({
    success: true,
    data: updatedCart
  });
});

// Remove item from cart
export const removeCartItem = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized'
    });
  }

  const { itemId } = req.params;

  // Get the cart item
  const cartItem = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: {
      cart: true
    }
  });

  if (!cartItem) {
    return res.status(404).json({
      success: false,
      message: 'Cart item not found'
    });
  }

  // Check if cart belongs to user
  if (cartItem.cart.sessionId !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this cart'
    });
  }

  // Remove cart item and recalculate cart total
  const updatedCart = await prisma.$transaction(async (prismaClient) => {
    // Delete cart item
    await prismaClient.cartItem.delete({
      where: { id: itemId }
    });

    // Recalculate cart total
    const updatedItems = await prismaClient.cartItem.findMany({
      where: { cartId: cartItem.cartId },
      include: { product: true }
    });

    const total = updatedItems.reduce(
      (sum, item) => sum + item.quantity * item.product.price.toNumber(),
      0
    );

    // Update cart with new total
    return prismaClient.cart.update({
      where: { id: cartItem.cartId },
      data: { total },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: {
                  take: 1
                }
              }
            }
          }
        }
      }
    });
  });

  res.status(200).json({
    success: true,
    data: updatedCart
  });
});

// Clear cart
export const clearCart = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized'
    });
  }

  // Get user's cart
  const cart = await prisma.cart.findUnique({
    where: { sessionId: req.user.id }
  });

  if (!cart) {
    return res.status(200).json({
      success: true,
      data: {
        items: [],
        total: 0
      }
    });
  }

  // Clear cart items and reset total
  await prisma.$transaction([
    prisma.cartItem.deleteMany({
      where: { cartId: cart.id }
    }),
    prisma.cart.update({
      where: { id: cart.id },
      data: { total: 0 }
    })
  ]);

  res.status(200).json({
    success: true,
    data: {
      ...cart,
      items: [],
      total: 0
    },
    message: 'Cart cleared successfully'
  });
});