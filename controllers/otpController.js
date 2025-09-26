const userModel = require("../models/userModel");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
const otpStore = {};
const requestCount = {};
const requestTime = {};
const failedAttempts = {};

function rateLimit(email, limit, windowMs) {
  const count = requestCount[email] || 0;
  const last = requestTime[email] || 0;
  if (count >= limit && Date.now() - last < windowMs) {
    return false;
  }
  if (Date.now() - last >= windowMs) {
    requestCount[email] = 0;
  }
  return true;
}

async function sendOtpEmail(to, name, otp) {
  const mailOptions = {
    from: `"KingCart" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Your One-Time Password (OTP) for KingCart",
    text: `Hello ${name},

Your OTP for KingCart is: ${otp}

This OTP is valid for 5 minutes. Please do not share it with anyone.

Thank you,
The KingCart Team`,
    html: `
  <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
    <h2 style="color: #0D6EFD; text-align: center;">KingCart</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p>Your One-Time Password (OTP) is:</p>
    <h1 style="text-align: center; color: #0D6EFD;">${otp}</h1>
    <p style="color: #555;">This OTP is valid for <strong>5 minutes</strong>. Please do not share it with anyone.</p>
    <p>Thank you,<br/><strong>KingCart Team</strong></p>
    <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
    <p style="font-size: 12px; color: #888; text-align: center;">
      You received this email because you requested an OTP for KingCart.
    </p>
  </div>
  `,
  };

  await transporter.sendMail(mailOptions);
}

exports.sendForgotOtp = async (req, res, next) => {
  try {
    const { Email, Name, Mobile } = req.body;
    if (!Email || !Name || !Mobile)
      return res.json({ status: false, message: "All fields required" });

    if (!rateLimit(Email, 12, 2 * 60 * 60 * 1000))
      return res.json({
        status: false,
        message: "Too many requests, try later.",
      });

    requestCount[Email] = (requestCount[Email] || 0) + 1;
    requestTime[Email] = Date.now();

    const otp = crypto.randomInt(100000, 999999).toString();
    otpStore[Email] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 };
    await sendOtpEmail(Email, Name, otp);

    res.json({ status: true, message: "OTP sent successfully." });
  } catch (err) {
    next(err);
  }
};

exports.sendSignupOtp = async (req, res, next) => {
  try {
    const { Email, Name } = req.body;
    const signupRes = await userModel.doSignup(req.body, true);
    if (!signupRes.status) return res.json(signupRes);

    if (!rateLimit(Email, 2, 2 * 60 * 60 * 1000))
      return res.json({
        status: false,
        message: "Too many requests, try later.",
      });

    requestCount[Email] = (requestCount[Email] || 0) + 1;
    requestTime[Email] = Date.now();

    const otp = crypto.randomInt(100000, 999999).toString();
    otpStore[Email] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 };
    await sendOtpEmail(Email, Name, otp);

    res.json({ status: true, message: "OTP sent successfully." });
  } catch (err) {
    console.log(err);

    next(err);
  }
};

exports.verify = async (req, res, next) => {
  try {
    const { Email, otp, forgot = false } = req.body;
    if (!Email || !otp)
      return res.json({ status: false, message: "Email and OTP required" });

    const record = otpStore[Email];
    if (!record || record.expiresAt < Date.now())
      return res.json({ status: false, message: "OTP expired" });

    if (record.otp !== otp) {
      failedAttempts[Email] = (failedAttempts[Email] || 0) + 1;
      return res.json({ status: false, message: "Invalid OTP" });
    }

    delete otpStore[Email];

    if (forgot) {
      return res.json({ status: true, message: "Proceed with reset" });
    }

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
