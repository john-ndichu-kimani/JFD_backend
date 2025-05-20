import express from 'express';
import {
  register,
  login,
  getCurrentUser,
  logout,
  updatePassword,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller';
import { protect } from '../middleware/auth';
// import {
//   validateRegister,
//   validateLogin,
//   validateUpdatePassword,
//   validateForgotPassword,
//   validateResetPassword,
// } from '../validators/authValidator';

const authRouter = express.Router();

// Public routes (no authentication required)
authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/reset-password', resetPassword);

// Protected routes (require authentication)
authRouter.use(protect);

authRouter.get('/me', getCurrentUser);
authRouter.post('/logout', logout);
authRouter.put('/update-password', updatePassword);

export default authRouter;