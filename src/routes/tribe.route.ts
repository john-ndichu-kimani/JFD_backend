import express from 'express';
import {
  getAllTribes,
  getTribeById,
  createTribe,
  updateTribe,
  deleteTribe,
} from '../controllers/tribe.controller';
import { protect, restrictTo } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = express.Router();

// Public routes
router.get('/', getAllTribes);
router.get('/:id', getTribeById);

// Protected admin routes
router.use(protect);
router.use(restrictTo(Role.ADMIN));

router.post('/',createTribe);
router.put('/:id', updateTribe);
router.delete('/:id', deleteTribe);

export default router;