import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImages,
  setMainImage,
  toggleProductFeatured,
  getFeaturedProducts,
  deleteProductImage,
  // Add the new controller functions
  getProductBySlug,
  searchProducts,
  getProductsByCategory,
  getProductsByTribe,
  toggleProductPublication
} from '../controllers/product.controller';
import { protect, restrictTo } from '../middleware/auth';
import { Role } from '@prisma/client';
import upload from '../middleware/upload';
// import {
//   validateCreateProduct,
//   validateUpdateProduct,
// } from '../validators/productValidator';


const router = express.Router();

// Public routes
router.get('/', getProducts);
router.get('/search', searchProducts);
router.get('/slug/:slug', getProductBySlug);
router.get('/featured', getFeaturedProducts);
router.get('/category/:categoryId', getProductsByCategory);
router.get('/tribe/:tribeId', getProductsByTribe);
router.get('/:id', getProductById);

// Protected routes (admin only)
router.use(protect);
router.use(restrictTo(Role.ADMIN));

router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);
router.patch('/:id/featured', toggleProductFeatured);
router.patch('/:id/publish', toggleProductPublication);

// Product image routes
router.post('/:id/images', upload.array('images', 5), uploadProductImages);
router.patch('/:productId/images/:imageId/set-main', setMainImage);
router.delete('/:productId/images/:imageId', deleteProductImage);

export default router;