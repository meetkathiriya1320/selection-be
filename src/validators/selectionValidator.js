import { body } from 'express-validator';

export const createSelectionValidator = [
    body('name')
        .notEmpty().withMessage('Name is required')
        .isString().withMessage('Name must be a string'),
    body('price')
        .notEmpty().withMessage('Price is required')
        .isNumeric().withMessage('Price must be a number'),
    body('SKU')
        .notEmpty().withMessage('SKU is required')
        .isString().withMessage('SKU must be a string'),
    body('category')
        .optional()
        .isString().withMessage('Category must be a string'),
];
