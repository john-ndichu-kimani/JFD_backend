import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import prisma from '../utils/prisma';
import config from '../config';
import { AuthenticatedRequest, JwtPayload } from '../types';

export const protect = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    let token;

    // Get token from authorization header or cookies
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this resource',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

    // Check if user still exists
    const currentUser = await prisma.user.findUnique({
      where: {
        id: decoded.id,
      },
    });

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists',
      });
    }

    // Add user to request
    req.user = currentUser;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this resource',
    });
  }
};

export const restrictTo = (...roles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this resource',
      });
    }

    if (!roles.includes(req.user.role as Role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action',
      });
    }

    next();
  };
};