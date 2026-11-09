import nodemailer from 'nodemailer';
import 'dotenv/config';
// shortcut: sending from a personal Gmail account until the company M365 mailbox is wired
// up via Graph API. Swap this transport (and GMAIL_USER/GMAIL_APP_PASSWORD) out then.
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});
export const sendPasswordResetMail = async (mail) => {
    const info = await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: mail.to,
        subject: mail.subject,
        html: mail.html,
    });
    if (info.accepted.length === 0) {
        return { status: 'error', data: null, message: 'Failed to send email' };
    }
    return { status: 'success', data: info, message: 'Email sent successfully' };
};
