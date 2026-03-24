const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 2525,
  secure: false,
  auth: {
    user: process.env.BREVO_EMAIL,
    pass: process.env.BREVO_SMTP_KEY
  }
});

const sendOTPEmail = async (email, otp) => {
  await transporter.sendMail({
    from: process.env.SENDER_EMAIL,
    to: email,
    subject: 'Your OTP Code - RentShare',
    html: `
      <h2>Your OTP Code</h2>
      <p>Your OTP is: <b style="font-size: 24px">${otp}</b></p>
      <p>Valid for 10 minutes</p>
      <p>If you did not request this, ignore this email.</p>
    `
   
  });
};

module.exports = sendOTPEmail ;