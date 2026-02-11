import SelectionOrder from '../models/SelectionOrder.js';
import SelectionDetails from '../models/SelectionDetails.js';
import { RESPONSE } from '../helpers/response.js';
import { get_message } from '../helpers/messages.js';
import { transformImageUrls } from '../helpers/imageHelper.js';

import Order from '../models/Order.js';

const updateParentOrder = async (orderId) => {
    try {
        const items = await SelectionOrder.find({ order_id: orderId });
        const total_amount = items.reduce((sum, item) => sum + item.pay, 0);
        const total_deposit = items.reduce((sum, item) => sum + item.deposit, 0);

        await Order.findByIdAndUpdate(orderId, {
            total_amount,
            total_deposit,
            items_count: items.length
        });
    } catch (error) {
        console.error("Failed to update parent order totals:", error);
    }
};

export const getSelectionOrders = async (req, res) => {
    try {
        const orders = await SelectionOrder.find()
            .populate('user_id', 'name email')
            .populate('selection_id')
            .sort({ createdAt: -1 });

        const transformedOrders = orders.map(transformImageUrls);
        RESPONSE.success(res, 2101, transformedOrders);
    } catch (error) {
        RESPONSE.error(res, 9999, 500, error);
    }
};

export const getMyOrders = async (req, res) => {
    try {
        const orders = await SelectionOrder.find({ user_id: req.user._id }).populate('selection_id');
        const transformedOrders = orders.map(transformImageUrls);
        RESPONSE.success(res, 2101, transformedOrders);
    } catch (error) {
        RESPONSE.error(res, 9999, 500, error);
    }
};

export const createSelectionOrder = async (req, res) => {
    let userId = req.user._id;

    // Allow admin to create order for other users
    if (req.user.role === 'admin' && req.body.user_id) {
        userId = req.body.user_id;
    }

    try {
        let orderId = req.body.order_id;

        // If no parent order ID is provided, create a new Parent Order
        if (!orderId) {
            const newParentOrder = new Order({
                user_id: userId,
                total_amount: 0, // Will be updated by updateParentOrder
                total_deposit: 0, // Will be updated by updateParentOrder
                status: 'pending',
                items_count: 0 // Will be updated by updateParentOrder
            });
            const savedParentOrder = await newParentOrder.save();
            orderId = savedParentOrder._id;
        }

        const order = new SelectionOrder({
            ...req.body,
            user_id: userId,
            order_id: orderId
        });

        const newOrder = await order.save();

        // Update parent order totals to include this new item
        await updateParentOrder(orderId);

        RESPONSE.success(res, 2102, transformImageUrls(newOrder), 201);
    } catch (error) {
        console.error("Create Selection Order Error:", error);
        RESPONSE.error(res, 9999, 500, error);
    }
};

export const cancelOrder = async (req, res) => {
    try {
        let order;
        if (req.user && req.user.role === 'admin') {
            order = await SelectionOrder.findById(req.params.id);
        } else {
            order = await SelectionOrder.findOne({ _id: req.params.id, user_id: req.user._id });
        }

        if (!order) return RESPONSE.error(res, 404, 'Order not found or unauthorized');

        if (order.status !== 'pending' && (!req.user || req.user.role !== 'admin')) {
            return RESPONSE.error(res, 400, 'Cannot cancel order that is not pending');
        }

        order.status = 'cancelled';
        await order.save();
        RESPONSE.success(res, 200, transformImageUrls(order));
    } catch (error) {
        RESPONSE.error(res, 9999, 500, error);
    }
};

export const checkAvailability = async (req, res) => {
    try {
        const { id } = req.params; // selection_id
        const { topSize, bottomSize } = req.query; // Sizes from query

        let filter = {
            selection_id: id,
            status: { $in: ['pending', 'confirmed', 'delivered', 'received'] }
        };

        // If sizes provided, filter by them. 
        // Logic: specific size booking blocks availability for that size only.
        if (topSize) filter.selectedTopSize = topSize;
        if (bottomSize) filter.selectedBottomSize = bottomSize;

        const orders = await SelectionOrder.find(filter);

        // Dates are now directly on result order objects
        const bookedDates = orders.map(o => {
            const from = new Date(o.deliver_date);
            const to = new Date(o.receive_date);
            // Check validity
            if (isNaN(from.getTime()) || isNaN(to.getTime())) return null;
            return { from, to };
        }).filter(d => d !== null);

        RESPONSE.success(res, 200, bookedDates);
    } catch (error) {
        RESPONSE.error(res, 9999, 500, error);
    }
};

export const updateStatus = async (req, res) => {
    try {
        const { status, payment_status, deposit_status } = req.body;

        const validStatuses = ['pending', 'confirmed', 'delivered', 'received', 'cancelled'];
        const validPaymentStatuses = ['pending', 'completed'];
        const validDepositStatuses = ['pending', 'received', 'returned'];

        const updates = {};

        if (status) {
            if (!validStatuses.includes(status)) return RESPONSE.error(res, 400, "Invalid status");
            updates.status = status;
        }

        if (payment_status) {
            if (!validPaymentStatuses.includes(payment_status)) return RESPONSE.error(res, 400, "Invalid payment status");
            updates.payment_status = payment_status;
        }

        if (deposit_status) {
            if (!validDepositStatuses.includes(deposit_status)) return RESPONSE.error(res, 400, "Invalid deposit status");
            updates.deposit_status = deposit_status;
        }

        if (Object.keys(updates).length === 0) {
            return RESPONSE.error(res, 400, "No valid fields to update");
        }

        const order = await SelectionOrder.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true }
        );

        if (!order) {
            return RESPONSE.error(res, 404, "Order not found");
        }

        RESPONSE.success(res, 200, transformImageUrls(order));
    } catch (error) {
        RESPONSE.error(res, 9999, 500, error);
    }
};

export const deleteSelectionOrder = async (req, res) => {
    try {
        const order = await SelectionOrder.findByIdAndDelete(req.params.id);
        if (!order) {
            return RESPONSE.error(res, 404, "Order not found");
        }

        // Update parent order totals
        if (order.order_id) {
            await updateParentOrder(order.order_id);
        }

        RESPONSE.success(res, 200, "Order deleted successfully");
    } catch (error) {
        RESPONSE.error(res, 9999, 500, error);
    }
};

export const updateSelectionOrder = async (req, res) => {
    try {
        const {
            selectedTopSize,
            selectedBottomSize,
            selectedColor,
            deliver_date,
            receive_date
        } = req.body;

        const updates = {};
        if (selectedTopSize !== undefined) updates.selectedTopSize = selectedTopSize;
        if (selectedBottomSize !== undefined) updates.selectedBottomSize = selectedBottomSize;
        if (selectedColor !== undefined) updates.selectedColor = selectedColor;
        if (deliver_date !== undefined) updates.deliver_date = deliver_date;
        if (receive_date !== undefined) updates.receive_date = receive_date;

        const order = await SelectionOrder.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true }
        );

        if (!order) {
            return RESPONSE.error(res, 404, "Order not found");
        }

        // Update parent order totals
        if (order.order_id) {
            await updateParentOrder(order.order_id);
        }

        RESPONSE.success(res, 200, transformImageUrls(order));
    } catch (error) {
        RESPONSE.error(res, 9999, 500, error);
    }
};