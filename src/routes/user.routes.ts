import express from 'express';
import {
  getUserProfile,
  updateUserProfile,
  updateUserAddress,
  getAllUsers,
  getUserById,
  deleteUser,
  updateUserRole,
} from '../controllers/user.controller';
import { protect, restrictTo } from '../middleware/auth';
import { Role } from '@prisma/client';
// import {
//   validateUpdateProfile,
//   validateUpdateAddress,
//   validateUpdateRole,
// } from '../validators/userValidator';

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

// User profile routes
router.route('/profile')
  .get(getUserProfile)
  .put(updateUserProfile);

router.route('/address')
  .put(updateUserAddress);

// Admin-only routes
router.use(restrictTo(Role.ADMIN));

router.route('/')
  .get(getAllUsers);

router.route('/:id')
  .get(getUserById)
  .delete(deleteUser);

router.route('/:id/role')
  .put(updateUserRole);

export default router;