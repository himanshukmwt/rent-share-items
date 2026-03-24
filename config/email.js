// const nodemailer = require('nodemailer');

// const transporter = nodemailer.createTransport({
//   host: 'smtp-relay.brevo.com',
//   port: 2525,
//   secure: false,
//   auth: {
//     user: process.env.BREVO_EMAIL,
//     pass: process.env.BREVO_SMTP_KEY
//   }
// });

// const sendOTPEmail = async (email, otp) => {
//   await transporter.sendMail({
//     from: process.env.SENDER_EMAIL,
//     to: email,
//     subject: 'Your OTP Code - RentShare',
//     html: `
//       <h2>Your OTP Code</h2>
//       <p>Your OTP is: <b style="font-size: 24px">${otp}</b></p>
//       <p>Valid for 10 minutes</p>
//       <p>If you did not request this, ignore this email.</p>
//     `
   
//   });
// };

// module.exports = sendOTPEmail 

const axios = require("axios");

const sendOTPEmail = async (email, otp) => {
  try {
    const res = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "RentShare",
          email: process.env.SENDER_EMAIL, 
        },
        to: [{ email }],
        subject: "Your OTP Code",
        htmlContent: `<h2>Your OTP: ${otp}</h2>`,
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    console.error("Email error:", error.response?.data || error.message);
  }
};

module.exports = sendOTPEmail;