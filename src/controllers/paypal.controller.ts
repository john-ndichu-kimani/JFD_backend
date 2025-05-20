import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/error';
import { AuthenticatedRequest } from '../types';
import prisma from '../utils/prisma';
import { OrderStatus } from '@prisma/client';
import { createPaypalOrder, capturePaypalPayment } from '../services/paypal.service';

// Define PayPal response types
interface PayPalOrderResponseLink {
  href: string;
  rel: string;
  method: string;
}

interface PayPalOrderResponse {
  id: string;
  status: string;
  links: PayPalOrderResponseLink[];
}

interface PayPalCaptureResponse {
  id: string;
  status: string;
  update_time: string;
  payer?: {
    email_address?: string;
  };
}

// Initiate PayPal payment process
export const initiatePaypalPayment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { orderId } = req.params;

  // Find the order
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }

  // Check if user is authorized to pay for this order
  if (order.userId !== req.user?.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to pay for this order'
    });
  }

  // Check if order is already paid
  if (order.isPaid) {
    return res.status(400).json({
      success: false,
      message: 'Order is already paid'
    });
  }

  try {
    // Create PayPal order
    const paypalOrder = await createPaypalOrder(order.id, order.total.toNumber()) as PayPalOrderResponse;

    // Update order with PayPal ID
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentMethod: 'PayPal',
        paymentProviderOrderId: paypalOrder.id
      }
    });

    // Find the approval URL
    const approvalLink = paypalOrder.links.find((link: PayPalOrderResponseLink) => link.rel === 'approve');
    
    if (!approvalLink) {
      throw new Error('PayPal approval URL not found');
    }

    res.status(200).json({
      success: true,
      data: {
        paypalOrderId: paypalOrder.id,
        approvalUrl: approvalLink.href
      }
    });
  } catch (error: any) {
    console.error('PayPal order creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create PayPal order',
      error: error.message
    });
  }
});

// Handle PayPal payment confirmation
export const handlePaypalConfirmation = asyncHandler(async (req: Request, res: Response) => {
  const { token, PayerID } = req.query;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'PayPal token is required'
    });
  }

  try {
    // Find the order with this PayPal order ID
    const order = await prisma.order.findFirst({
      where: { 
        paymentProviderOrderId: String(token)
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Capture the payment
    const captureData = await capturePaypalPayment(String(token)) as PayPalCaptureResponse;

    // Update order as paid
    const paymentResult = {
      id: captureData.id,
      status: captureData.status,
      updateTime: captureData.update_time,
      emailAddress: captureData.payer?.email_address
    };

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        isPaid: true,
        paidAt: new Date(),
        status: OrderStatus.PROCESSING,
        paymentResult: paymentResult
      }
    });

    // Redirect to frontend success page
    res.redirect(`${process.env.FRONTEND_URL}/orders/${order.id}/confirmation`);
  } catch (error: any) {
    console.error('PayPal capture error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process PayPal payment',
      error: error.message
    });
  }
});

// Handle PayPal payment cancellation
export const handlePaypalCancellation = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'PayPal token is required'
    });
  }

  try {
    // Find the order with this PayPal order ID
    const order = await prisma.order.findFirst({
      where: { 
        paymentProviderOrderId: String(token)
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Redirect to frontend cancel page
    res.redirect(`${process.env.FRONTEND_URL}/orders/${order.id}/cancelled`);
  } catch (error: any) {
    console.error('PayPal cancellation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process PayPal cancellation',
      error: error.message
    });
  }
});

// PayPal webhook handler
export const handlePaypalWebhook = asyncHandler(async (req: Request, res: Response) => {
  const { event_type, resource } = req.body;

  // Verify webhook signature (in production, implement proper signature verification)
  
  try {
    if (event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const paypalOrderId = resource.supplementary_data?.related_ids?.order_id;
      
      if (!paypalOrderId) {
        return res.status(400).json({
          success: false,
          message: 'PayPal order ID not found in webhook'
        });
      }

      // Find the order with this PayPal order ID
      const order = await prisma.order.findFirst({
        where: { 
          paymentProviderOrderId: paypalOrderId
        }
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // If not already marked as paid, update it
      if (!order.isPaid) {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            isPaid: true,
            paidAt: new Date(),
            status: OrderStatus.PROCESSING,
            paymentResult: {
              id: resource.id,
              status: 'COMPLETED',
              updateTime: new Date().toISOString()
            }
          }
        });
      }
    }

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('PayPal webhook error:', error);
    res.status(500).json({
      success: false, 
      message: 'Failed to process PayPal webhook',
      error: error.message
    });
  }
});