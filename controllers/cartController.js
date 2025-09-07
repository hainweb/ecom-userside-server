
const userModel = require("../models/userModel");

exports.viewCart = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const products = await userModel.getCartProducts(userId);
    const total = await userModel.getTotalAmount(userId);
    const cartCount = await userModel.getCartCount(userId);
    res.json({ products, total, cartCount, user: req.session.user });
  } catch (err) {
    next(err);
  }
};

exports.getCartCount = async (req, res) => {
  const user = req.session.user;
  try {
    if (user) {
      const cartCount = await userModel.getCartCount(user._id);
      res.json({cartCount});
    }
  } catch (error) {
    throw new Error("Error getting cart count",error);
    
  }
};

exports.addToCart = async (req, res, next) => {
  try {
    const response = await userModel.addToCart(
      req.params.id,
      req.session.user._id
    );
    res.json(response);
  } catch (err) {
    next(err);
  }
};

exports.changeQuantity = async (req, res, next) => {
  try {
    const resp = await userModel.changeProductQuantity(req.body);
    resp.total = await userModel.getTotalAmount(req.body.user);
    res.json(resp);
  } catch (err) {
    next(err);
  }
};
