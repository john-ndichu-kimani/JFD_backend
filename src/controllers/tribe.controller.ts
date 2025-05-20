import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../utils/prisma';
import { asyncHandler } from '../middleware/error';
import { AuthenticatedRequest } from '../types';

// Get all categories
export const getAllTribes = asyncHandler(async (req: Request, res: Response) => {
  const categories = await prisma.tribe.findMany({
    include: {
      _count: {
        select: { products: true }
      }
    }
  });

  res.status(200).json({
    success: true,
    data: categories
  });
});

// Get single category with its products
export const getTribeById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const tribe = await prisma.tribe.findUnique({
    where: { id },
    include: {
      products: {
        where: { isPublished: true },
        include: {
          images: true,
          
        }
      }
    }
  });

  if (!tribe) {
    return res.status(404).json({
      success: false,
      message: 'Tribe not found'
    });
  }

  res.status(200).json({
    success: true,
    data: tribe
  });
});

// Create a new Tribe (Admin only)
export const createTribe = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
 

  const { name, description, region,country } = req.body;

  // Check if tribe already exists
  const existingTribe = await prisma.tribe.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } }
  });

  if (existingTribe) {
    return res.status(400).json({
      success: false,
      message: 'Category with this name already exists'
    });
  }

  function generateSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

const slug = generateSlug(name);

  const tribe = await prisma.tribe.create({
    data: {
      name,
      slug:slug,
      description,
      region,
      country
    }
  });

  res.status(201).json({
    success: true,
    data: tribe
  });
});

export const updateTribe = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { id } = req.params;
  const { name, description,slug,region,country } = req.body;

  const existingTribe = await prisma.tribe.findUnique({
    where: { id }
  });

  if (!existingTribe) {
    return res.status(404).json({
      success: false,
      message: 'Tribe not found'
    });
  }

  if (name && name !== existingTribe.name) {
    const nameExists = await prisma.category.findFirst({
      where: { 
        name: { equals: name, mode: 'insensitive' },
        id: { not: id }
      }
    });

    if (nameExists) {
      return res.status(400).json({
        success: false,
        message: 'Tribe with this name already exists'
      });
    }
  }

  const updatedCategory = await prisma.category.update({
    where: { id },
    data: {
      name: name || existingTribe.name,
      description: description !== undefined ? description : existingTribe.description
    }
  });

  res.status(200).json({
    success: true,
    data: updatedCategory
  });
});

export const deleteTribe = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const existingTribe = await prisma.tribe.findUnique({
    where: { id },
    include: {
      products: true
    }
  });

  if (!existingTribe) {
    return res.status(404).json({
      success: false,
      message: 'Tribe not found'
    });
  }

  if (existingTribe.products.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete tribe with associated products. Please remove products first or reassign them to another tribe.'
    });
  }

  await prisma.tribe.delete({
    where: { id }
  });

  res.status(200).json({
    success: true,
    message: 'Tribe deleted successfully'
  });
});