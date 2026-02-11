import Selection from '../models/Selection.js';
import { RESPONSE } from '../helpers/response.js';
import { get_message } from '../helpers/messages.js';
import { transformImageUrls } from '../helpers/imageHelper.js';

export const getSelections = async (req, res) => {
    try {
        const { category, search } = req.query;
        let query = {};

        if (category && category !== 'All') {
            query.category = category;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } },
                { SKU: { $regex: search, $options: 'i' } },
                { colors: { $regex: search, $options: 'i' } },
                { up_color: { $regex: search, $options: 'i' } },
                { dawn_color: { $regex: search, $options: 'i' } }
            ];
        }

        const selections = await Selection.find(query);
        const transformedSelections = selections.map(transformImageUrls);
        RESPONSE.success(res, 2001, transformedSelections);
    } catch (error) {
        RESPONSE.error(res, 9999, 500, error);
    }
};

export const getSelection = async (req, res) => {
    try {
        const selection = await Selection.findById(req.params.id);
        if (!selection) return RESPONSE.error(res, 2002, 404);
        RESPONSE.success(res, null, transformImageUrls(selection));
    } catch (error) {
        RESPONSE.error(res, 9999, 500, error);
    }
};

export const createSelection = async (req, res) => {
    const selection = new Selection(req.body);
    try {
        const newSelection = await selection.save();
        RESPONSE.success(res, 2003, transformImageUrls(newSelection), 201);
    } catch (error) {
        RESPONSE.error(res, 9999, 500, error);
    }
};

export const updateSelection = async (req, res) => {
    try {
        const selection = await Selection.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!selection) return RESPONSE.error(res, 2002, 404);
        RESPONSE.success(res, 2004, transformImageUrls(selection));
    } catch (error) {
        RESPONSE.error(res, 9999, 500, error);
    }
};

export const deleteSelection = async (req, res) => {
    try {
        const selection = await Selection.findByIdAndDelete(req.params.id);
        if (!selection) return RESPONSE.error(res, 2002, 404);
        RESPONSE.success(res, 2005);
    } catch (error) {
        RESPONSE.error(res, 9999, 500, error);
    }
};