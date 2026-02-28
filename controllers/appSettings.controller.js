const AppSettings = require('../models/appSettings.model');
const { appSettingSchema, appSettingUpdateSchema } = require('../validations/appSettings.validation');
const logger = require('../utils/logger');

// Public: get app name (no auth required)
exports.getAppName = async (_req, res) => {
    const name = await AppSettings.get('app_name', 'Resume Builder');
    res.json({ appName: name });
};

// Get all settings (admin only)
exports.getAllSettings = async (req, res) => {
    const { category } = req.query;
    const filter = category ? { category } : {};
    const settings = await AppSettings.find(filter).sort({ category: 1, key: 1 });

    // Mask sensitive values (API keys, secrets, etc.) before sending to the client
    const masked = settings.map(s => {
        const obj = s.toObject();
        if (AppSettings.isSensitiveKey(obj.key)) {
            obj.value = AppSettings.maskValue(obj.value);
            obj._sensitive = true; // flag for the frontend
        }
        return obj;
    });

    res.json({ settings: masked });
};

// Get a single setting by key
exports.getSettingByKey = async (req, res) => {
    const setting = await AppSettings.findOne({ key: req.params.key });
    if (!setting) return res.status(404).json({ error: 'Setting not found' });

    const obj = setting.toObject();
    if (AppSettings.isSensitiveKey(obj.key)) {
        obj.value = AppSettings.maskValue(obj.value);
        obj._sensitive = true;
    }
    res.json(obj);
};

// Create a new setting (admin only)
exports.createSetting = async (req, res) => {
    const { error, value } = appSettingSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details.map(d => d.message) });

    const existing = await AppSettings.findOne({ key: value.key });
    if (existing) return res.status(409).json({ error: 'Setting with this key already exists' });

    const setting = await AppSettings.create(value);
    logger.info(`Setting created: ${setting.key} by admin ${req.user.email}`);
    res.status(201).json(setting);
};

// Update a setting value by key (admin only — value only, no description/category changes)
exports.updateSetting = async (req, res) => {
    const { error, value } = appSettingUpdateSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details.map(d => d.message) });

    const setting = await AppSettings.findOne({ key: req.params.key });
    if (!setting) return res.status(404).json({ error: 'Setting not found' });

    // If no value provided (or empty string for sensitive key), keep current value
    if (value.value === undefined || value.value === null) {
        return res.json({ message: 'No changes made', setting });
    }

    // For sensitive keys, an empty string means "clear the key"
    const previousValue = setting.value;
    setting.value = value.value;
    await setting.save();

    const isSensitive = AppSettings.isSensitiveKey(setting.key);
    const logPrev = isSensitive ? '***' : JSON.stringify(previousValue);
    const logNew = isSensitive ? '***' : JSON.stringify(value.value);
    logger.info(`Setting updated: ${setting.key} by admin ${req.user.email} (${logPrev} → ${logNew})`);
    res.json({ message: 'Setting updated', setting });
};

// Delete a setting by key (admin only)
exports.deleteSetting = async (req, res) => {
    const setting = await AppSettings.findOne({ key: req.params.key });
    if (!setting) return res.status(404).json({ error: 'Setting not found' });

    await setting.deleteOne();
    logger.warn(`Setting deleted: ${req.params.key} by admin ${req.user.email}`);
    res.json({ message: 'Setting deleted' });
};
