
const userModel = require("../models/userModel");

exports.getDetails = (req, res) => {
  res.json(req.session.user);
};



exports.editProfile = async (req, res, next) => {
  try {
    const updated = await userModel.editProfile(req.session.user._id, req.body);
    req.session.user = updated;
    res.json({ status: true });
  } catch (err) {
    next(err);
  }
};
