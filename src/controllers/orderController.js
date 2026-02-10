import Order from '../models/Order.js';
import SelectionOrder from '../models/SelectionOrder.js';
import { RESPONSE, errorResponse } from '../helpers/response.js';

export const createOrder = async (req, res) => {
    try {
        const { items: rawItems, user_id } = req.body;
        // If admin provides user_id, use it. Otherwise use logged in user.
        let targetUserId = req.user._id;
        if (req.user.role === 'admin' && user_id) {
            targetUserId = user_id;
        }

        if (!rawItems || rawItems.length === 0) {
            return RESPONSE.error(res, 400, "No items in order");
        }

        // Normalize dates to support both camelCase and snake_case inputs
        const items = rawItems.map(item => ({
            ...item,
            deliverDate: item.deliverDate || item.deliver_date,
            receiveDate: item.receiveDate || item.receive_date
        }));

        // --- CONFLICT CHECK START ---
        // Check availability for ALL items before creating any order.
        for (const item of items) {
            // Skip check if date is not provided (though logic usually requires it)
            if (!item.deliverDate || !item.receiveDate) continue;

            const newItemStart = new Date(item.deliverDate);
            const newItemEnd = new Date(item.receiveDate);

            // Validate Date Objects
            if (isNaN(newItemStart.getTime()) || isNaN(newItemEnd.getTime())) {
                return RESPONSE.error(res, 400, "Invalid Date Format provided.");
            }

            // Construct dynamic filter for size and date
            let conflictFilter = {
                selection_id: item.selection_id || item._id, // Handle if frontend sends full object or just ID
                status: { $in: ['pending', 'confirmed', 'delivered', 'received'] },
                // Date Overlap Logic in Mongo:
                // (ExistingStart <= NewEnd) AND (ExistingEnd >= NewStart)
                deliver_date: { $lte: newItemEnd },
                receive_date: { $gte: newItemStart }
            };

            // Size Conflict Logic:
            // If the user selects a Top Size, check if that Top Size is already booked.
            // If the user selects a Bottom Size, check if that Bottom Size is already booked.
            // If both, check if EITHER is booked ($or).
            const sizeConditions = [];
            if (item.selectedTopSize) sizeConditions.push({ selectedTopSize: item.selectedTopSize });
            if (item.selectedBottomSize) sizeConditions.push({ selectedBottomSize: item.selectedBottomSize });

            if (sizeConditions.length > 0) {
                conflictFilter.$or = sizeConditions;
            }

            const conflict = await SelectionOrder.findOne(conflictFilter);

            if (conflict) {
                const itemName = item.name || item.selection_id || "Unknown Item";
                console.log(item, "item")
                return errorResponse(res, `Item "${itemName.name}" is already booked for these dates.`, null, 400);
            }
        }

        // --- CONFLICT CHECK END ---

        // Calculate totals
        const total_amount = items.reduce((sum, item) => sum + item.pay, 0);
        const total_deposit = items.reduce((sum, item) => sum + item.deposit, 0);

        // 1. Create Main Order
        const mainOrder = new Order({
            user_id: targetUserId,
            total_amount,
            total_deposit,
            status: 'pending',
            items_count: items.length
        });
        await mainOrder.save();

        // 2. Create SelectionOrders linked to Main Order
        const selectionOrders = items.map(item => ({
            ...item,
            user_id: targetUserId,
            order_id: mainOrder._id,
            status: 'pending',
            // Ensure mapping keys match backend model expected keys
            deliver_date: item.deliverDate,
            receive_date: item.receiveDate,
            selection_id: item.selection_id || item._id
        }));

        await SelectionOrder.insertMany(selectionOrders);

        RESPONSE.success(res, 201, mainOrder);
    } catch (error) {
        console.error(error);
        RESPONSE.error(res, 9999, 500, error);
    }
};

export const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('user_id', 'name email')
            .sort({ createdAt: -1 });
        RESPONSE.success(res, 200, orders);
    } catch (error) {
        RESPONSE.error(res, 9999, 500, error);
    }
};

import { transformImageUrls } from '../helpers/imageHelper.js';

export const getOrderDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order.findById(id).populate('user_id', 'name email');
        if (!order) return RESPONSE.error(res, 404, "Order not found");

        // Security Check: Only Admin or Owner can view
        if (req.user.role !== 'admin' && order.user_id._id.toString() !== req.user._id.toString()) {
            return RESPONSE.error(res, 4003, 403, "Access denied");
        }

        const items = await SelectionOrder.find({ order_id: id }).populate('selection_id');
        const transformedItems = items.map(transformImageUrls);

        RESPONSE.success(res, 200, { order, items: transformedItems });
    } catch (error) {
        RESPONSE.error(res, 9999, 500, error);
    }
};

export const getUserOrders = async (req, res) => {
    try {
        const userId = req.user._id;
        const orders = await Order.find({ user_id: userId })
            .sort({ createdAt: -1 }); // Newest first

        RESPONSE.success(res, 200, orders);
    } catch (error) {
        RESPONSE.error(res, 9999, 500, error);
    }
};
