import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../utils/prisma';
import { asyncHandler } from '../middleware/error';
import { AuthenticatedRequest } from '../types';
import { getFileUrl } from '../middleware/upload';

// Get all products with pagination and filtering
export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 12;
  const skip = (page - 1) * limit;
  
  // Filter parameters
  const categoryId = req.query.categoryId as string;
  const tribeId = req.query.tribeId as string;
  const search = req.query.search as string;
  const isAntique = req.query.isAntique === 'true';
  const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
  const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;
  
  // Build where clause
  const where: any = {};
  
  if (categoryId) {
    where.categoryId = categoryId;
  }
  
  if (tribeId) {
    where.tribeId = tribeId;
  }
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }
  
  if (req.query.isAntique !== undefined) {
    where.isAntique = isAntique;
  }
  
  // Price range
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    
    if (minPrice !== undefined) {
      where.price.gte = minPrice;
    }
    
    if (maxPrice !== undefined) {
      where.price.lte = maxPrice;
    }
  }
  
  // Get products
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      include: {
        category: true,
        tribe: true,
        images: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.product.count({ where }),
  ]);
  
  res.status(200).json({
    success: true,
    data: {
      products,
    },
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
});

// Get featured products
export const getFeaturedProducts = asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 6;
  
  // Get featured products
  const featuredProducts = await prisma.product.findMany({
    where: {
      isFeatured: true,
      isPublished: true, // Only return published products
    },
    take: limit,
    include: {
      category: true,
      tribe: true,
      images: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  
  res.status(200).json({
    success: true,
    data: {
      products: featuredProducts,
    },
  });
});

// Get product by ID or slug
export const getProductById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  // Check if parameter is UUID or slug
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  
  const where = isUuid ? { id } : { slug: id };
  
  const product = await prisma.product.findFirst({
    where,
    include: {
      category: true,
      tribe: true,
      images: true,
    },
  });
  
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found',
    });
  }
  
  res.status(200).json({
    success: true,
    data: {
      product,
    },
  });
});

// Create product (admin only)
export const createProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }
  
  const {
    name,
    slug,
    description,
    price,
    stockQuantity,
    categoryId,
    tribeId,
    isAntique,
    origin,
    materials,
    dimensions,
    condition,
  
    isFeatured,
  } = req.body;

  // if (!name || !slug || !description || !price || !stockQuantity || !categoryId) {
  //   return res.status(400).json({
  //     success: false,
  //     message: 'Missing required fields',
  //   });
  // }
  
  // Create product
  const product = await prisma.product.create({
    data: {
      name:name,
      slug:slug,
      description:description,
      price: parseFloat(price),
      stockQuantity: parseInt(stockQuantity),
      categoryId:categoryId,
      tribeId: tribeId || null,
      isAntique: Boolean(isAntique),
      isFeatured: Boolean(isFeatured) || false,
      origin: origin || null,
      materials: materials || null,
      dimensions: dimensions || null,
      condition: condition || null,
    },
  });
  
  res.status(201).json({
    success: true,
    data: {
      product,
    },
  });
});

// Update product (admin only)
export const updateProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }
  
  const { id } = req.params;
  
  // Check if product exists
  const productExists = await prisma.product.findUnique({
    where: {
      id,
    },
  });
  
  if (!productExists) {
    return res.status(404).json({
      success: false,
      message: 'Product not found',
    });
  }
  
  const {
    name,
    slug,
    description,
    price,
    stock,
    categoryId,
    tribeId,
    isAntique,
    origin,
 
    materials,
    dimensions,
    condition,
   
    isFeatured,
  } = req.body;
  
  // Update product
  const product = await prisma.product.update({
    where: {
      id,
    },
    data: {
      name,
      slug,
      description,
      price: parseFloat(price),
      stockQuantity: parseInt(stock),
      categoryId,
      tribeId: tribeId || null,
      isAntique: Boolean(isAntique),
      isFeatured: isFeatured !== undefined ? Boolean(isFeatured) : undefined,
      origin: origin || null,
      materials: materials || null,
      dimensions: dimensions || null,
      condition: condition || null,
    },
  });
  
  res.status(200).json({
    success: true,
    data: {
      product,
    },
  });
});

// Toggle product featured status (admin only)
export const toggleProductFeatured = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { isFeatured } = req.body;
  
  if (isFeatured === undefined) {
    return res.status(400).json({
      success: false,
      message: 'isFeatured field is required',
    });
  }
  
  // Check if product exists
  const productExists = await prisma.product.findUnique({
    where: {
      id,
    },
  });
  
  if (!productExists) {
    return res.status(404).json({
      success: false,
      message: 'Product not found',
    });
  }
  
  // Update product featured status
  const product = await prisma.product.update({
    where: {
      id,
    },
    data: {
      isFeatured: Boolean(isFeatured),
    },
    include: {
      category: true,
      tribe: true,
      images: true,
    },
  });
  
  res.status(200).json({
    success: true,
    data: {
      product,
    },
  });
});

// Get product by slug
export const getProductBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  
  const product = await prisma.product.findUnique({
    where: {
      slug,
    },
    include: {
      category: true,
      tribe: true,
      images: true,
    },
  });
  
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found',
    });
  }
  
  res.status(200).json({
    success: true,
    data: {
      product,
    },
  });
});

// Search products
export const searchProducts = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 12;
  const skip = (page - 1) * limit;
  const query = req.query.query as string;
  
  if (!query) {
    return res.status(400).json({
      success: false,
      message: 'Search query is required',
    });
  }
  
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      skip,
      take: limit,
      include: {
        category: true,
        tribe: true,
        images: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.product.count({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
    }),
  ]);
  
  res.status(200).json({
    success: true,
    data: {
      products,
    },
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
});

// Get products by category
export const getProductsByCategory = asyncHandler(async (req: Request, res: Response) => {
  const { categoryId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 12;
  const skip = (page - 1) * limit;
  
  // Verify the category exists
  const categoryExists = await prisma.category.findUnique({
    where: {
      id: categoryId,
    },
  });
  
  if (!categoryExists) {
    return res.status(404).json({
      success: false,
      message: 'Category not found',
    });
  }
  
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: {
        categoryId,
      },
      skip,
      take: limit,
      include: {
        category: true,
        tribe: true,
        images: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.product.count({
      where: {
        categoryId,
      },
    }),
  ]);
  
  res.status(200).json({
    success: true,
    data: {
      products,
    },
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
});

// Get products by tribe
export const getProductsByTribe = asyncHandler(async (req: Request, res: Response) => {
  const { tribeId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 12;
  const skip = (page - 1) * limit;
  
  // Verify the tribe exists
  const tribeExists = await prisma.tribe.findUnique({
    where: {
      id: tribeId,
    },
  });
  
  if (!tribeExists) {
    return res.status(404).json({
      success: false,
      message: 'Tribe not found',
    });
  }
  
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: {
        tribeId,
      },
      skip,
      take: limit,
      include: {
        category: true,
        tribe: true,
        images: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.product.count({
      where: {
        tribeId,
      },
    }),
  ]);
  
  res.status(200).json({
    success: true,
    data: {
      products,
    },
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
});

// Toggle product publication status (admin only)
export const toggleProductPublication = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { isPublished } = req.body;
  
  if (isPublished === undefined) {
    return res.status(400).json({
      success: false,
      message: 'isPublished field is required',
    });
  }
  
  // Check if product exists
  const productExists = await prisma.product.findUnique({
    where: {
      id,
    },
  });
  
  if (!productExists) {
    return res.status(404).json({
      success: false,
      message: 'Product not found',
    });
  }
  
  // Update product publication status
  const product = await prisma.product.update({
    where: {
      id,
    },
    data: {
      isPublished: Boolean(isPublished),
    },
    include: {
      category: true,
      tribe: true,
      images: true,
    },
  });
  
  res.status(200).json({
    success: true,
    data: {
      product,
    },
  });
});

// Delete product (admin only)
export const deleteProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  
  // Check if product exists
  const product = await prisma.product.findUnique({
    where: {
      id,
    },
  });
  
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found',
    });
  }
  
  // Delete product
  await prisma.product.delete({
    where: {
      id,
    },
  });
  
  res.status(200).json({
    success: true,
    message: 'Product deleted successfully',
  });
});

// Upload product images
export const uploadProductImages = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  
  // Check if product exists
  const product = await prisma.product.findUnique({
    where: {
      id,
    },
  });
  
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found',
    });
  }
  
  if (!req.files || !Array.isArray(req.files)) {
    return res.status(400).json({
      success: false,
      message: 'Please upload at least one image',
    });
  }
  
  const files = req.files as Express.Multer.File[];
  
  // Get existing product images
  const existingImages = await prisma.productImage.findMany({
    where: {
      productId: id,
    },
  });
  
  // Add new images
  const uploadPromises = files.map(async (file, index) => {
    const isMain = index === 0 && existingImages.length === 0;
    const url = getFileUrl(req, file.filename);
    
    return prisma.productImage.create({
      data: {
        productId: id,
        url,
        altText: `${product.name} image ${index + 1}`,
        isMain,
      },
    });
  });
  
  const images = await Promise.all(uploadPromises);
  
  res.status(200).json({
    success: true,
    data: {
      images,
    },
  });
});

// Set main product image
export const setMainImage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { productId, imageId } = req.params;
  
  // Check if product exists
  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
  });
  
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found',
    });
  }
  
  // Check if image exists
  const image = await prisma.productImage.findFirst({
    where: {
      id: imageId,
      productId,
    },
  });
  
  if (!image) {
    return res.status(404).json({
      success: false,
      message: 'Image not found',
    });
  }
  
  // Reset all images to not main
  await prisma.productImage.updateMany({
    where: {
      productId,
    },
    data: {
      isMain: false,
    },
  });
  
  // Set selected image as main
  const updatedImage = await prisma.productImage.update({
    where: {
      id: imageId,
    },
    data: {
      isMain: true,
    },
  });
  
  res.status(200).json({
    success: true,
    data: {
      image: updatedImage,
    },
  });
});

// Delete product image
export const deleteProductImage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { productId, imageId } = req.params;
  
  // Check if product exists
  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
  });
  
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found',
    });
  }
  
  // Check if image exists
  const image = await prisma.productImage.findFirst({
    where: {
      id: imageId,
      productId,
    },
  });
  
  if (!image) {
    return res.status(404).json({
      success: false,
      message: 'Image not found',
    });
  }
  
  // Delete image
  await prisma.productImage.delete({
    where: {
      id: imageId,
    },
  });
  
  // If deleted image was main, set another image as main
  if (image.isMain) {
    const firstImage = await prisma.productImage.findFirst({
      where: {
        productId,
      },
    });
    
    if (firstImage) {
      await prisma.productImage.update({
        where: {
          id: firstImage.id,
        },
        data: {
          isMain: true,
        },
      });
    }
  }
  
  res.status(200).json({
    success: true,
    message: 'Image deleted successfully',
  });
});