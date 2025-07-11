// controllers/authController.js
const userModel = require('../models/userModel');

exports.getLoginStatus = (req, res) => {
  if (req.session.user?.loggedIn) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    const info = req.session.info;
    req.session.info = false;
    res.json({ loggedIn: false, message: info });
  }
};

exports.login = async (req, res, next) => {
  try {
    // (lockout logic could be in middleware or model)
    const response = await userModel.doLogin(req.body);
    if (response.status) {
      req.session.user = { loggedIn: true, ...response.user };
      await userModel.updateLastActive(response.user._id);
      res.json({ loggedIn: true, user: req.session.user });
    } else {
      res.json({ loggedIn: false, message: response.message });
    }
  } catch (err) {
    next(err);
  }
};

exports.logout = (req, res) => {
  req.session.user = null;
  res.json({ logout: true });
};

exports.signup = async (req, res, next) => {
  try {
    const response = await userModel.doSignup(req.body);
    if (response.status) {
      req.session.user = { loggedIn: true, ...response.user };
      res.json({ status: true, user: req.session.user });
    } else {
      res.json({ status: false, message: response.message });
    }
  } catch (err) {
    next(err);
  }
};

exports.findUser = async (req, res, next) => {
  try {
    const response = await userModel.doSignup(req.body, false, true);
    res.json(response);
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const response = await userModel.changePassword(req.body);
    res.json(response);
  } catch (err) {
    next(err);
  }
};
