const userModel = require("../models/userModel");

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
    const { username, password } = req.body;

    if (
      req.session.lockedOutUntil &&
      req.session.lockedOutUntil <= Date.now()
    ) {
      req.session.failedAttempts = 0;
      req.session.lockedOutUntil = null;
    }

    if (req.session.lockedOutUntil && req.session.lockedOutUntil > Date.now()) {
      const timeLeft = Math.ceil(
        (req.session.lockedOutUntil - Date.now()) / 1000
      );
      return res.json({
        loggedIn: false,
        timeLeft,
        message: `Too many failed attempts. Try again in ${timeLeft} seconds.`,
      });
    }

    if (!req.session.failedAttempts) {
      req.session.failedAttempts = 0;
    }

    let response = await userModel.doLogin(req.body);
    if (response.status) {
      req.session.user = { loggedIn: true, ...response.user };
      req.session.failedAttempts = 0;

      res.json({ loggedIn: true, user: req.session.user });

      userModel.updateLastActive(req.session.user._id);
      console.log("updated last in router");
    } else {
      req.session.failedAttempts += 1;

      if (req.session.failedAttempts >= 10) {
        req.session.lockedOutUntil = Date.now() + 2 * 60 * 1000;
        res.json({
          loggedIn: false,
          timeLeft: 120,
          message: "Too many failed attempts. Please try again in 2 minutes.",
        });
      } else {
        req.session.loginErr = "Invalid username or password";
        res.json({ loggedIn: false, message: req.session.loginErr });
      }
    }
  } catch (error) {
    next(error);
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
