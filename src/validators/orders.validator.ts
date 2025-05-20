import { body, ValidationChain } from 'express-validator';
import { OrderStatus } from '@prisma/client';

/**
 * Validates the create order request
 */
export const validateCreateOrder: ValidationChain[] = [
  body('orderItems')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),
  
  body('orderItems.*.productId')
    .isString()
    .notEmpty()
    .withMessage('Product ID is required for each order item'),
  
  body('orderItems.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1 for each order item'),
  
  body('shippingAddress')
    .isObject()
    .withMessage('Shipping address is required'),
  
  body('shippingAddress.address')
    .isString()
    .notEmpty()
    .withMessage('Address is required'),
  
  body('shippingAddress.city')
    .isString()
    .notEmpty()
    .withMessage('City is required'),
  
  body('shippingAddress.postalCode')
    .isString()
    .notEmpty()
    .withMessage('Postal code is required'),
  
  body('shippingAddress.country')
    .isString()
    .notEmpty()
    .withMessage('Country is required'),
  
  body('paymentMethod')
    .isString()
    .notEmpty()
    .withMessage('Payment method is required'),
  
  body('shippingMethod')
    .isString()
    .notEmpty()
    .withMessage('Shipping method is required'),
  
  body('shippingPrice')
    .isFloat({ min: 0 })
    .withMessage('Shipping price must be a positive number'),
  
  body('totalPrice')
    .isFloat({ min: 0 })
    .withMessage('Total price must be a positive number')
];

/**
 * Validates the update order status request
 */
export const validateUpdateOrderStatus: ValidationChain[] = [
  body('status')
    .isIn(Object.values(OrderStatus))
    .withMessage(`Status must be one of: ${Object.values(OrderStatus).join(', ')}`)
];

/**
 * Validates payment result when updating order to paid
 */
export const validatePaymentResult: ValidationChain[] = [
  body('paymentResult')
    .isObject()
    .withMessage('Payment result is required'),
  
  body('paymentResult.id')
    .isString()
    .notEmpty()
    .withMessage('Payment ID is required'),
  
  body('paymentResult.status')
    .isString()
    .notEmpty()
    .withMessage('Payment status is required')
];

/**
 * Validates PayPal payment request
 */
export const validatePayPalPayment: ValidationChain[] = [
  body('orderId')
    .optional()
    .isString()
    .withMessage('Order ID must be a string')
];