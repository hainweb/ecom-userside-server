
const userModel = require('../models/userModel');

exports.list = async (req, res, next) => {
  try {
    const addrs = await userModel.getAddress(req.session.user._id);
    res.json(addrs);
  } catch (err) {
    next(err);
  }
};

exports.add = async (req, res, next) => {
  try {
    const resp = await userModel.addAddress(
      req.session.user._id,
      req.body
    );
    res.json(resp);
  } catch (err) {
    next(err);
  }
};

exports.edit = async (req, res, next) => {
  try {
    const resp = await userModel.editUserAddress(
      req.body,
      req.session.user._id
    );
    res.json(resp);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const resp = await userModel.deleteAddress(
      req.body.addressId,
      req.session.user._id
    );
    res.json(resp);
  } catch (err) {
    next(err);
  }
};
