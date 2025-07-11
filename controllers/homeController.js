// controllers/homeController.js
const userModel = require('../models/userModel');

exports.home = async (req, res, next) => {
  try {
    const user = req.session.user;
    const cartCount = await userModel.getCartCount(user._id);
    await userModel.updateLastActive(user._id);
    res.json({ user, cartCount });
  } catch (err) {
    next(err);
  }
};
