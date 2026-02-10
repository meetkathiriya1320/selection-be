import express from 'express';
import { getSelectionOrders, createSelectionOrder, updateStatus, updateSelectionOrder, deleteSelectionOrder } from '../controllers/selectionOrderController.js';

const router = express.Router();

// GET all selection orders
router.get('/', getSelectionOrders);

// POST create selection order
router.post('/', createSelectionOrder);

// PUT update status
router.put('/:id/status', updateStatus);

// PUT update details (sizes, dates)
router.put('/:id', updateSelectionOrder);

// DELETE order
router.delete('/:id', deleteSelectionOrder);

export default router;