/**
 * utils/sendEmail.js
 * * This utility initializes and configures Nodemailer.
 * * It creates a reusable "transporter" object from the .env credentials
 * * and exports a single function to send emails throughout the app.
 */
const nodemailer = require('nodemailer');

// 1. Create the Nodemailer Transporter
// This object is what actually connects to the mail server (like Gmail)
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    secure: process.env.MAIL_PORT == 465, // true for port 465, false for others like 587
    auth: {
        user: process.env.MAIL_USER, // Your email from .env
        pass: process.env.MAIL_PASS  // Your app password from .env
    },
});

/**
 * Sends a pre-formatted email.
 * @param {object} options - Email options
 * @param {string} options.to - Recipient's email address
 * @param {string} options.subject - Subject line
 * @param {string} options.html - The HTML content of the email
 * @param {Array} [options.attachments=[]] - An optional array of Nodemailer attachment objects
 */
const sendEmail = async ({ to, subject, html, attachments = [] }) => {
    try {
        const mailOptions = {
            from: `"Sahara Platform" <${process.env.MAIL_USER}>`, // Sender address
            to: to,
            subject: subject,
            html: html,
            attachments: attachments // Pass attachments to mailOptions
        };

        // Send the email
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully to ${to}. Message ID: ${info.messageId}`);
        return true;

    } catch (error) {
        console.error(`❌ Error sending email to ${to}:`, error);
        // We throw the error so the calling controller can decide how to handle it.
        throw new Error('Email failed to send.');
    }
};

module.exports = sendEmail;