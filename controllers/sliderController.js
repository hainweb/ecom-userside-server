
const userModel = require('../models/userModel');

exports.list = async (req, res, next) => {
  try {
    const sliders = await userModel.getSlider();
    res.json(sliders);
  } catch (err) {
    next(err);
  }
};
