import { Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../types';
import { asyncHandler } from '../middleware/error';

// Get user profile
export const getUserProfile = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
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
      include: {
        address: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
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

// Update user profile
export const updateUserProfile = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const { firstName, lastName, phone } = req.body;

    const updatedUser = await prisma.user.update({
      where: {
        id: req.user.id,
      },
      data: {
        firstName,
        lastName,
        phone,
      },
    });

    const { password, ...userData } = updatedUser;

    res.status(200).json({
      success: true,
      data: {
        user: userData,
      },
    });
  }
);

// Add or update user address
export const updateUserAddress = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const { street, city, state, country, zipCode } = req.body;

    // Check if address exists
    const existingAddress = await prisma.address.findUnique({
      where: {
        userId: req.user.id,
      },
    });

    let address;

    if (existingAddress) {
      // Update existing address
      address = await prisma.address.update({
        where: {
          id: existingAddress.id,
        },
        data: {
          street,
          city,
          state,
          country,
          zipCode,
        },
      });
    } else {
      // Create new address
      address = await prisma.address.create({
        data: {
          userId: req.user.id,
          street,
          city,
          state,
          country,
          zipCode,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        address,
      },
    });
  }
);

// Get all users (admin only)
export const getAllUsers = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.user.count(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        users,
      },
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  }
);

// Get user by ID (admin only)
export const getUserById = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: {
        id,
      },
      include: {
        address: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
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

// Delete user (admin only)
export const deleteUser = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Delete user
    await prisma.user.delete({
      where: {
        id,
      },
    });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  }
);

// Update user role (admin only)
export const updateUserRole = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { role } = req.body;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: {
        id,
      },
      data: {
        role,
      },
    });

    const { password, ...userData } = updatedUser;

    res.status(200).json({
      success: true,
      data: {
        user: userData,
      },
    });
  }
);