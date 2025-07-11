// controllers/categoryController.js
const productModel = require('../models/productModel');

exports.list = async (req, res, next) => {
  try {
    const cats = await productModel.getCategories();
    res.json(cats);
  } catch (err) {
    next(err);
  }
};

exports.find = async (req, res, next) => {
  try {
    const result = await productModel.findCategory(
      req.params.thing
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};
