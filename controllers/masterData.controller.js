const MasterData = require('../models/masterData.model');
const {
    masterDataCreateSchema,
    masterDataUpdateSchema,
    masterDataBulkCreateSchema
} = require('../validations/masterData.validations');
const logger = require('../utils/logger');

// ─── Public: List / Search (any authenticated user) ─────────────────────────

exports.listMasterData = async (req, res) => {
    const { type, search = '', category, page = 1, limit = 50, isActive } = req.query;

    const filter = {};

    if (type) {
        if (!['skill', 'language', 'industry'].includes(type)) {
            return res.status(400).json({ error: 'Query param "type" must be "skill", "language" or "industry"' });
        }
        filter.type = type;
    }

    // Only show active items to non-admin users
    if (req.user.role !== 'admin') {
        filter.isActive = true;
    } else if (isActive !== undefined) {
        filter.isActive = isActive === 'true';
    }

    if (category) {
        filter.category = new RegExp(`^${category}$`, 'i');
    }

    if (search) {
        filter.name = new RegExp(search, 'i');
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [items, total] = await Promise.all([
        MasterData.find(filter)
            .sort({ category: 1, name: 1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        MasterData.countDocuments(filter)
    ]);

    res.json({
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        items
    });
};

// ─── Public: Get all categories for a type ───────────────────────────────────

exports.getCategories = async (req, res) => {
    const { type } = req.query;

    if (!type || !['skill', 'language', 'industry'].includes(type)) {
        return res.status(400).json({ error: 'Query param "type" is required and must be "skill", "language" or "industry"' });
    }

    const categories = await MasterData.distinct('category', { type, isActive: true });
    res.json({ type, categories: categories.filter(Boolean).sort() });
};

// ─── Admin: Create single ────────────────────────────────────────────────────

exports.createMasterData = async (req, res) => {
    const { error, value } = masterDataCreateSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details.map(d => d.message) });

    // Check for duplicate
    const existing = await MasterData.findOne({ type: value.type, name: { $regex: new RegExp(`^${value.name}$`, 'i') } });
    if (existing) {
        return res.status(409).json({ error: `A ${value.type} with name "${value.name}" already exists` });
    }

    const item = await MasterData.create(value);
    logger.info(`MasterData created: ${value.type} — "${value.name}" by ${req.user.email}`);
    res.status(201).json(item);
};

// ─── Admin: Bulk create ──────────────────────────────────────────────────────

exports.bulkCreateMasterData = async (req, res) => {
    const { error, value } = masterDataBulkCreateSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details.map(d => d.message) });

    const { type, items } = value;

    // Get existing names (case-insensitive) to skip duplicates
    const existingNames = (await MasterData.find({ type }).select('name').lean())
        .map(d => d.name.toLowerCase());

    const toInsert = [];
    const skipped = [];

    for (const item of items) {
        if (existingNames.includes(item.name.toLowerCase())) {
            skipped.push(item.name);
        } else {
            toInsert.push({ ...item, type });
            existingNames.push(item.name.toLowerCase()); // prevent intra-batch duplicates
        }
    }

    let inserted = [];
    if (toInsert.length > 0) {
        inserted = await MasterData.insertMany(toInsert, { ordered: false });
    }

    logger.info(`MasterData bulk create: ${inserted.length} added, ${skipped.length} skipped (type: ${type}) by ${req.user.email}`);

    res.status(201).json({
        message: `${inserted.length} ${type}(s) added, ${skipped.length} skipped (duplicates)`,
        inserted: inserted.length,
        skipped,
        items: inserted
    });
};

// ─── Admin: Update ───────────────────────────────────────────────────────────

exports.updateMasterData = async (req, res) => {
    const { error, value } = masterDataUpdateSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details.map(d => d.message) });

    const item = await MasterData.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    // If renaming, check for duplicate
    if (value.name && value.name.toLowerCase() !== item.name.toLowerCase()) {
        const duplicate = await MasterData.findOne({
            type: item.type,
            name: { $regex: new RegExp(`^${value.name}$`, 'i') },
            _id: { $ne: item._id }
        });
        if (duplicate) {
            return res.status(409).json({ error: `A ${item.type} with name "${value.name}" already exists` });
        }
    }

    Object.assign(item, value);
    await item.save();

    logger.info(`MasterData updated: ${item.type} "${item.name}" (${item._id}) by ${req.user.email}`);
    res.json(item);
};

// ─── Admin: Delete ───────────────────────────────────────────────────────────

exports.deleteMasterData = async (req, res) => {
    const item = await MasterData.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    logger.info(`MasterData deleted: ${item.type} "${item.name}" (${item._id}) by ${req.user.email}`);
    res.json({ message: `${item.type} "${item.name}" deleted` });
};

// ─── Admin: Bulk delete ──────────────────────────────────────────────────────

exports.bulkDeleteMasterData = async (req, res) => {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: '"ids" must be a non-empty array of ObjectIds' });
    }

    const result = await MasterData.deleteMany({ _id: { $in: ids } });

    logger.info(`MasterData bulk delete: ${result.deletedCount} items removed by ${req.user.email}`);
    res.json({ message: `${result.deletedCount} item(s) deleted` });
};
