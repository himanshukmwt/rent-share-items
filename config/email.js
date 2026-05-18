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