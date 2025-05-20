import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import prisma from '../utils/prisma';
import config from '../config';
import { AuthenticatedRequest, JwtPayload } from '../types';
import { AppError, asyncHandler } from '../middleware/error';
import crypto from 'crypto'

// Generate JWT token
const generateToken = (id: string, email: string, role: string): string => {
  return jwt.sign(
    { id, email, role },
    config.jwtSecret,
    { expiresIn: '1h' }
  );
};


// Set token cookie
const createSendToken = (
  user: { id: string; email: string; role: string },
  statusCode: number,
  req: Request,
  res: Response
) => {
  const token = generateToken(user.id, user.email, user.role);

  // Create a session record
  const expiresAt = new Date(
    Date.now() + parseInt(config.jwtExpiresIn.replace('d', '')) * 24 * 60 * 60 * 1000
  );

  // Create a session in database
  prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  }).catch(err => console.error('Session creation error:', err));

  // Set cookie options
  const cookieOptions = {
    expires: expiresAt,
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
  };

  // Send token as cookie
  res.cookie('jwt', token, cookieOptions);

  // Send response
  res.status(statusCode).json({
    success: true,
    token,
    data: {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    },
  });
};

// Register new user
export const register = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  const { email, password, firstName, lastName } = req.body;

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'User already exists',
    });
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: 'CUSTOMER', // Default role
    },
  });

  // Create and send token
  createSendToken(
    { id: user.id, email: user.email, role: user.role },
    201,
    req,
    res
  );
});

// Login user
export const login = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  const { email, password } = req.body;

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
    });
  }

  // Check if password is correct
  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
    });
  }

  // Create and send token
  createSendToken(
    { id: user.id, email: user.email, role: user.role },
    200,
    req,
    res
  );
});

// Get current user
export const getCurrentUser = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const { password, ...userData } = user;

    res.status(200).json({
      success: true,
      data: {
        user: userData,
      },
    });
  }
);

// Logout user
export const logout = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (req.user) {
      // Delete user sessions
      await prisma.session.deleteMany({
        where: {
          userId: req.user.id,
        },
      });
    }

    // Clear cookie
    res.cookie('jwt', 'loggedout', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });

    res.status(200).json({
      success: true,
      message: 'User logged out successfully',
    });
  }
);

// Update password
export const updatePassword = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { currentPassword, newPassword } = req.body;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if current password is correct
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    const updatedUser = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        password: hashedPassword,
      },
    });

    // Create and send token
    createSendToken(
      { id: updatedUser.id, email: updatedUser.email, role: updatedUser.role },
      200,
      req,
      res
    );
  }
);

// Request password reset
export const forgotPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with that email',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expiry (10 minutes)
    const passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);

    // Save to database
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordResetToken,
        passwordResetExpires,
      },
    });

    // In a real application, send an email with the reset token
    // For now, we'll just return it
    res.status(200).json({
      success: true,
      message: 'Password reset token generated successfully',
      resetToken,
    });
  }
);

// Reset password with token
export const resetPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;

    // Hash token
    const passwordResetToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token is invalid or has expired',
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user
    const updatedUser = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    // Create and send token
    createSendToken(
      { id: updatedUser.id, email: updatedUser.email, role: updatedUser.role },
      200,
      req,
      res
    );
  }
);