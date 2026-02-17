import express from 'express';
import { createInquiry, getInquiries, getMyInquiries } from '../controllers/inquiryController.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';
import { createInquiryValidator } from '../validators/inquiryValidator.js';
import validate from '../middleware/validate.js';

const router = express.Router();

router.post('/', createInquiryValidator, validate, createInquiry); // Public (or authenticated)
router.get('/', authenticate, authorizeAdmin, getInquiries);
router.get('/my', authenticate, getMyInquiries);

export default router;
