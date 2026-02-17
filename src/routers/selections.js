import express from 'express';
import { getSelections, getSelection, createSelection, updateSelection, deleteSelection } from '../controllers/selectionController.js';
import { checkAvailability } from '../controllers/selectionOrderController.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';
import { createSelectionValidator } from '../validators/selectionValidator.js';
import validate from '../middleware/validate.js';

const router = express.Router();

// GET all selections (Public)
router.get('/', getSelections);

// POST create selection (Admin)
router.post('/', authenticate, authorizeAdmin, createSelectionValidator, validate, createSelection);

// GET availability dates (Public)
router.get('/:id/availability', checkAvailability);

// GET single selection (Public)
router.get('/:id', getSelection);

// PUT update selection (Admin)
router.put('/:id', authenticate, authorizeAdmin, createSelectionValidator, validate, updateSelection);

// DELETE selection (Admin)
router.delete('/:id', authenticate, authorizeAdmin, deleteSelection);

export default router;