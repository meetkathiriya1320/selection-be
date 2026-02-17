import { body } from 'express-validator';

export const registerValidator = [
    body('name')
        .notEmpty().withMessage('Name is required')
        .isString().withMessage('Name must be a string'),
    body('email')
        .isEmail().withMessage('Must be a valid email address'),
    body('password')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
];

export const loginValidator = [
    body('email')
        .isEmail().withMessage('Must be a valid email address'),
    body('password')
        .notEmpty().withMessage('Password is required'),
];
