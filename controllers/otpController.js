// controllers/otpController.js
const userModel = require('../models/userModel');
const sgMail    = require('@sendgrid/mail');
const crypto    = require('crypto');

sgMail.setApiKey(process.env.SENDERGRID_API);

const otpStore        = {};
const requestCount    = {};
const requestTime     = {};
const failedAttempts  = {};

function rateLimit(email, limit, windowMs) {
  const count = requestCount[email] || 0;
  const last  = requestTime[email] || 0;
  if (count >= limit && Date.now() - last < windowMs) {
    return false;
  }
  if (Date.now() - last >= windowMs) {
    requestCount[email] = 0;
  }
  return true;
}

async function sendOtpEmail(to, name, otp) {
  const msg = {
    to,
    from: 'kingcart.ecom@gmail.com',
    subject: 'Your OTP Code',
    text: `Hello ${name}, your OTP is ${otp}.`,
  };
  await sgMail.send(msg);
}

exports.sendForgotOtp = async (req, res, next) => {
  try {
    const { Email, Name, Mobile } = req.body;
    if (!Email || !Name || !Mobile)
      return res.json({ status: false, message: 'All fields required' });

    if (!rateLimit(Email, 12, 2 * 60 * 60 * 1000))
      return res.json({ status: false, message: 'Too many requests, try later.' });

    requestCount[Email] = (requestCount[Email] || 0) + 1;
    requestTime[Email]  = Date.now();

    const otp = crypto.randomInt(100000, 999999).toString();
    otpStore[Email] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 };
    await sendOtpEmail(Email, Name, otp);

    res.json({ status: true, message: 'OTP sent successfully.' });
  } catch (err) {
    next(err);
  }
};

exports.sendSignupOtp = async (req, res, next) => {
  try {
    const { Email, Name, Mobile } = req.body;
    const signupRes = await userModel.doSignup(req.body, true);
    if (!signupRes.status) return res.json(signupRes);

    if (!rateLimit(Email, 2, 2 * 60 * 60 * 1000))
      return res.json({ status: false, message: 'Too many requests, try later.' });

    requestCount[Email] = (requestCount[Email] || 0) + 1;
    requestTime[Email]  = Date.now();

    const otp = crypto.randomInt(100000, 999999).toString();
    otpStore[Email] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 };
    await sendOtpEmail(Email, Name, otp);

    res.json({ status: true, message: 'OTP sent successfully.' });
  } catch (err) {
    next(err);
  }
};

exports.verify = async (req, res, next) => {
  try {
    const { Email, otp, forgot = false } = req.body;
    if (!Email || !otp)
      return res.json({ status: false, message: 'Email and OTP required' });

    // handle failedAttempts throttle
    const record = otpStore[Email];
    if (!record || record.expiresAt < Date.now())
      return res.json({ status: false, message: 'OTP expired' });

    if (record.otp !== otp) {
      failedAttempts[Email] = (failedAttempts[Email] || 0) + 1;
      return res.json({ status: false, message: 'Invalid OTP' });
    }

    delete otpStore[Email];

    if (forgot) {
      return res.json({ status: true, message: 'Proceed with reset' });
    }

    // complete signup
    const userData = {
      Name: req.body.Name,
      LastName: req.body.LastName,
      Gender: req.body.Gender,
      Mobile: req.body.Mobile,
      Email: req.body.Email,
      Password: req.body.Password,
      CreatedAt: new Date(),
      LastActive: new Date(),
    };

    const signupRes = await userModel.doSignup(userData);
    if (signupRes.status) {
      req.session.user = { loggedIn: true, ...signupRes.user };
      return res.json({ status: true, user: req.session.user });
    }

    res.json(signupRes);
  } catch (err) {
    next(err);
  }
};
