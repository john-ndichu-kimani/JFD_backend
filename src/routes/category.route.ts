import express from 'express';
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/category.contoller';
import { protect, restrictTo } from '../middleware/auth';
import { Role } from '@prisma/client';
// import {
//   validateCreateCategory,
//   validateUpdateCategory,
// } from '../validators/categoryValidator';

const router = express.Router();

// Public routes
router.get('/', getAllCategories);
router.get('/:id', getCategoryById);

// Protected admin routes
router.use(protect);
router.use(restrictTo(Role.ADMIN));

router.post('/',createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

export default router;