exports.verifyLogin = (req, res, next) => {
  if (req.session.user && req.session.user.loggedIn) {
    return next();
  }

  res.status(401).json({ loggedIn: false, message: "Unauthorized" });
};
