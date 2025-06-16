const nodemailer = require('nodemailer');
require('dotenv').config(); // Ensure dotenv is loaded to access environment variables

console.log(`Setting up email transporter...`);

// Create a transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  service: 'gmail', // Using Gmail service
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail email address from .env
    pass: process.env.EMAIL_PASSWORD // Your Gmail App Password from .env
  }
});


const sendMail = async (to, subject, text, html) => {
  try {
    const mailOptions = {
      from: `"Your App Name" <${process.env.EMAIL_USER}>`, // Sender address, can be customized
      to,      // Recipient(s)
      subject, // Email subject
      text,    // Plain text content
      html     // HTML content (if provided)
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.response);
  } catch (error) {
    console.error('Error sending email:', error);
    // Provide more detailed error logging for debugging
    if (error && error.response) {
      console.error('Nodemailer response error:', error.response);
    }
    if (error && error.responseCode) {
      console.error('Nodemailer response code:', error.responseCode);
    }
    if (error && error.code === 'EAUTH') {
      console.error('Authentication error: Check EMAIL_USER and EMAIL_PASSWORD in your .env file, especially if you need an App Password for Gmail (not your regular password).');
    }
  }
};


const sendOTPEmail = async (to, otp, username) => {
  const subject = 'Your One-Time Password (OTP) for Password Reset';
  const text = `Hi ${username},\n\nYour OTP for password reset is: ${otp}\n\nThis OTP is valid for 10 minutes. Please do not share it with anyone.\n\nIf you did not request a password reset, please ignore this email.\n\nRegards,\nYour App Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #0056b3;">Password Reset OTP</h2>
      <p>Hi <strong>${username}</strong>,</p>
      <p>Your One-Time Password (OTP) for password reset is:</p>
      <h3 style="background-color: #f0f0f0; padding: 10px; border-radius: 5px; display: inline-block; letter-spacing: 2px;">${otp}</h3>
      <p>This OTP is valid for <strong>10 minutes</strong>. Please do not share it with anyone.</p>
      <p>If you did not request a password reset, please ignore this email.</p>
      <p>Regards,<br>Your App Team</p>
    </div>
  `;
  await sendMail(to, subject, text, html);
};

const sendPasswordResetSuccessEmail = async (to, username) => {
  const subject = 'Your Password Has Been Successfully Reset';
  const text = `Hi ${username},\n\nThis is to confirm that your password for your account has been successfully reset.\n\nIf you did not perform this action, please contact support immediately.\n\nRegards,\nYour App Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #28a745;">Password Reset Successful!</h2>
      <p>Hi <strong>${username}</strong>,</p>
      <p>This is to confirm that your password for your account has been successfully reset.</p>
      <p>If you did not perform this action, please contact support immediately.</p>
      <p>Regards,<br>Your App Team</p>
    </div>
  `;
  await sendMail(to, subject, text, html);
};


const sendSignupConfirmationEmail = async (to, username) => {
  const subject = 'Welcome to Our Platform!';
  const text = `Hi ${username},\n\nThank you for registering with our platform! We're excited to have you.\n\nRegards,\nYour App Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #17a2b8;">Welcome!</h2>
      <p>Hi <strong>${username}</strong>,</p>
      <p>Thank you for registering with our platform! We're excited to have you.</p>
      <p>We hope you enjoy your experience.</p>
      <p>Regards,<br>Your App Team</p>
    </div>
  `;
  await sendMail(to, subject, text, html);
};

// Log environment variables for debugging purposes (remove in production)
 console.log("EMAIL_USER =", process.env.EMAIL_USER);
 console.log("EMAIL_PASSWORD =", process.env.EMAIL_PASSWORD);

module.exports = {sendMail,sendOTPEmail,sendPasswordResetSuccessEmail,sendSignupConfirmationEmail};




















// const nodemailer = require('nodemailer');
// console.log(`Sending email to sujansivasai123@gmail.com`);
// require('dotenv').config();
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.EMAIL_USER,       
//     pass: process.env.EMAIL_PASSWORD
//   }
// });


// const sendMail = async (to, subject, text) => {
//   try {
//     const info = await transporter.sendMail({
//       from: `"proj" <${process.env.EMAIL_USER}>`, 
//       to,      
//       subject, 
//       text     
//     });
//     console.log('Email sent successfully:', info.response);
//   } catch (error) { 
//     console.error('Error sending email:', error);
    
//     if (error && error.response) { 
//       console.error('Nodemailer response error:', error.response);
//     }
//     if (error && error.responseCode) { 
//       console.error('Nodemailer response code:', error.responseCode);
//     }
//     if (error && error.code === 'EAUTH') { 
//       console.error('Authentication error: Check EMAIL_USER and EMAIL_PASSWORD in your .env file, especially if you need an App Password for Gmail.');
//     }
//   }
// };
// console.log("EMAIL_USER =", process.env.EMAIL_USER);
// console.log("EMAIL_PASSWORD =", process.env.EMAIL_PASSWORD);


// module.exports = sendMail;
