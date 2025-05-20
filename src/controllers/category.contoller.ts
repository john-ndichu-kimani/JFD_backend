import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../utils/prisma';
import { asyncHandler } from '../middleware/error';
import { AuthenticatedRequest } from '../types';

// Get all categories
export const getAllCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await prisma.category.findMany({
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
export const getCategoryById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const category = await prisma.category.findUnique({
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

  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found'
    });
  }

  res.status(200).json({
    success: true,
    data: category
  });
});

// Create a new category (Admin only)
export const createCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { name, description } = req.body;

  // Check if category already exists
  const existingCategory = await prisma.category.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } }
  });

  if (existingCategory) {
    return res.status(400).json({
      success: false,
      message: 'Category with this name already exists'
    });
  }

  function generateSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

const slug = generateSlug(name);

  const category = await prisma.category.create({
    data: {
      name,
      slug:slug,
      description
    }
  });

  res.status(201).json({
    success: true,
    data: category
  });
});

// Update a category (Admin only)
export const updateCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { id } = req.params;
  const { name, description } = req.body;

  // Check if category exists
  const existingCategory = await prisma.category.findUnique({
    where: { id }
  });

  if (!existingCategory) {
    return res.status(404).json({
      success: false,
      message: 'Category not found'
    });
  }

  // Check if new name already exists (if name is being updated)
  if (name && name !== existingCategory.name) {
    const nameExists = await prisma.category.findFirst({
      where: { 
        name: { equals: name, mode: 'insensitive' },
        id: { not: id }
      }
    });

    if (nameExists) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }
  }

  const updatedCategory = await prisma.category.update({
    where: { id },
    data: {
      name: name || existingCategory.name,
      description: description !== undefined ? description : existingCategory.description
    }
  });

  res.status(200).json({
    success: true,
    data: updatedCategory
  });
});

// Delete a category (Admin only)
export const deleteCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  // Check if category exists
  const existingCategory = await prisma.category.findUnique({
    where: { id },
    include: {
      products: true
    }
  });

  if (!existingCategory) {
    return res.status(404).json({
      success: false,
      message: 'Category not found'
    });
  }

  // Check if category has associated products
  if (existingCategory.products.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete category with associated products. Please remove products first or reassign them to another category.'
    });
  }

  // Delete the category
  await prisma.category.delete({
    where: { id }
  });

  res.status(200).json({
    success: true,
    message: 'Category deleted successfully'
  });
});