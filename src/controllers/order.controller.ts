import { Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../utils/prisma';
import { asyncHandler } from '../middleware/error';
import { AuthenticatedRequest } from '../types';
import { OrderStatus, Prisma } from '@prisma/client';

type PaymentResult = {
  id: string;
  status: string;
  updateTime?: string;
  emailAddress?: string;
};

// Get all orders (Admin only)
export const getAllOrders = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const orders = await prisma.order.findMany({
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              images: {
                take: 1
              }
            }
          }
        }
      },
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  res.status(200).json({
    success: true,
    count: orders.length,
    data: orders
  });
});

// Get user orders (Customer can see only their own orders)
export const getUserOrders = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized'
    });
  }

  const orders = await prisma.order.findMany({
    where: {
      userId: req.user.id
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              images: {
                take: 1
              }
            }
          }
        }
      },
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  res.status(200).json({
    success: true,
    count: orders.length,
    data: orders
  });
});

// Get order by ID (Admin can see any order, Customer can only see their own orders)
export const getOrderById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const isAdmin = req.user?.role === 'ADMIN';

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
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
      },
    }
  });

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }

  // Check if user is authorized to view this order
  if (!isAdmin && order.userId !== userId) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this order'
    });
  }

  res.status(200).json({
    success: true,
    data: order
  });
});

// Create a new order
export const createOrder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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

  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    shippingMethod,
    shippingPrice,
    totalPrice
  } = req.body;

  if (!orderItems || orderItems.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No order items'
    });
  }

  try {
    const orderItemsWithProducts = await Promise.all(
      orderItems.map(async (item: { productId: string; quantity: number }) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId }
        });

        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        if (!product.isPublished) {
          throw new Error(`Product not available: ${product.name}`);
        }

        if (product.stockQuantity < item.quantity) {
          throw new Error(`Insufficient stock for product: ${product.name}`);
        }

        return {
          productId: item.productId,
          quantity: item.quantity,
          price: product.price,
          name: product.name,
          totalPrice: totalPrice
        };
      })
    );

    const orderData = {
      user: {
        connect: { id: req.user!.id }
      },
      paymentMethod,
      shippingCost: shippingPrice,
      total: totalPrice,
      shippingMethod,
      status: OrderStatus.PENDING,
      shippingAddress: shippingAddress as Prisma.JsonObject,
      items: {
        create: orderItemsWithProducts.map(item => ({
          product: { connect: { id: item.productId } },
          quantity: item.quantity,
          price: item.price,
          name: item.name,
          totalPrice: item.totalPrice
        }))
      }
    };

    const order = await prisma.$transaction(async (prismaClient) => {
      const newOrder = await prismaClient.order.create({
        data: orderData,
        include: {
          items: {
            include: { product: true }
          }
        }
      });

      for (const item of orderItemsWithProducts) {
        await prismaClient.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: {
              decrement: item.quantity
            }
          }
        });
      }

      return newOrder;
    });

    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Update order to paid status
export const updateOrderToPaid = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { paymentResult } = req.body;

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }

  const updateData: Prisma.OrderUpdateInput = {
    isPaid: true,
    status: OrderStatus.PROCESSING,
    updatedAt: new Date()
  };

  if (paymentResult) {
    const paymentData: PaymentResult = {
      id: paymentResult.id,
      status: paymentResult.status,
      updateTime: paymentResult.update_time,
      emailAddress: paymentResult.payer?.email_address
    };
    updateData.paymentResult = paymentData as Prisma.JsonObject;
  }

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: updateData
  });

  res.status(200).json({
    success: true,
    data: updatedOrder
  });
});

// Update order status (Admin only)
export const updateOrderStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { id } = req.params;
  const { status } = req.body;

  const order = await prisma.order.findUnique({
    where: { id }
  });

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }

  const updateData: Prisma.OrderUpdateInput = {
    status,
    ...(status === OrderStatus.SHIPPED && { 
      isShipped: true,
      shippedAt: new Date()
    }),
    ...(status === OrderStatus.DELIVERED && {
      isDelivered: true,
      deliveredAt: new Date()
    })
  };

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: updateData
  });

  res.status(200).json({
    success: true,
    data: updatedOrder
  });
});

// Cancel order (Admin or owner of the order)
export const cancelOrder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const isAdmin = req.user?.role === 'ADMIN';

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: true
        }
      }
    }
  });

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }

  if (!isAdmin && order.userId !== userId) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to cancel this order'
    });
  }

  if (order.isShipped || order.isDelivered) {
    return res.status(400).json({
      success: false,
      message: 'Cannot cancel an order that has been shipped or delivered'
    });
  }

  const cancelledOrder = await prisma.$transaction(async (prismaClient) => {
    for (const item of order.items) {
      await prismaClient.product.update({
        where: { id: item.productId },
        data: {
          stockQuantity: {
            increment: item.quantity
          }
        }
      });
    }

    return prismaClient.order.update({
      where: { id },
      data: {
        status: OrderStatus.CANCELLED
      }
    });
  });

  res.status(200).json({
    success: true,
    data: cancelledOrder,
    message: 'Order cancelled successfully'
  });
});