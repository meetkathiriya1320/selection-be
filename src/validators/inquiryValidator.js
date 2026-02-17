import { body } from 'express-validator';

export const createInquiryValidator = [
    body('message')
        .notEmpty().withMessage('Message is required')
        .isString().withMessage('Message must be a string'),
    body('mobile')
        .optional()
        .isString().withMessage('Mobile must be a string'),
    body('name')
        .optional()
        .isString().withMessage('Name must be a string'),
];
