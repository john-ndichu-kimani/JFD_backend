import { User } from '@prisma/client';
import { Request} from 'express';
export interface AuthenticatedRequest extends Request {
  user?: User;
  
}

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

export interface FileWithBuffer extends Express.Multer.File {
  buffer: Buffer;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: any;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface PaymentResult {
  id: string;
  status: string;
  update_time: string;
  email_address: string;
}

export interface ShippingAddress {
  street: string;
  city: string;
  state?: string;
  country: string;
  zipCode: string;
}

export interface CartItemType {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface OrderSummary {
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;}