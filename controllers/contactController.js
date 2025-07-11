// controllers/contactController.js
const userModel = require('../models/userModel');

exports.submit = async (req, res, next) => {
  try {
    const resp = await userModel.addContact(req.body);
    res.json(resp);
  } catch (err) {
    next(err);
  }
};
