// middleware/authMiddleware.js

/**
 * Blocks access if the user is not logged in.
 * For API routes, we return a 401 JSON response.
 * Adjust the response format if you need a redirect instead.
 */
exports.verifyLogin = (req, res, next) => {
  if (req.session.user && req.session.user.loggedIn) {
    return next();
  }
  // If this were a server-rendered flow you might redirect:
  // return res.redirect('/login');

  // For our JSON API endpoints, send an unauthorized response:
  res.status(401).json({ loggedIn: false, message: 'Unauthorized' });
};
