const userModel = require("../models/userModel");

exports.editProfile = async (req, res, next) => {
  let userId = req.session.user._id;
  try {
    const response = await userModel.editProfile(userId, req.body);
    if (response) {
      res.json({ status: true });
    }
  } catch (err) {
    next(err);
  }
};
