import express from 'express';
import { register, login, verifyOTP } from '../controllers/authController.js';
import validate from '../middleware/validate.js';
import { registerValidator, loginValidator } from '../validators/authValidator.js';

const router = express.Router();

router.post('/register', registerValidator, validate, register);
router.post('/verify-otp', verifyOTP);
router.post('/login', loginValidator, validate, login);

export default router;