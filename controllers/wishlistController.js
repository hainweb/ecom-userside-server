// controllers/wishlistController.js
const userModel = require('../models/userModel');

exports.view = async (req, res, next) => {
  try {
    const items = await userModel.getWishlistProducts(
      req.session.user._id
    );
    res.json({ user: req.session.user, wishlistItems: items });
  } catch (err) {
    next(err);
  }
};

exports.toggle = async (req, res, next) => {
  try {
    await userModel.addToWishlist(
      req.params.id,
      req.session.user._id
    );
    res.json({ status: true, message: 'Wishlist updated' });
  } catch (err) {
    next(err);
  }
};
