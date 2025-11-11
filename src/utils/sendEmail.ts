import nodemailer, { Transporter } from 'nodemailer';
import { logger } from './logger.js';

interface EmailOptions {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    attachments?: Array<{ filename: string; path: string }>;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
    try {
        // Load SMTP settings from .env

        const smtpConfig = {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_PORT === '465',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD,
            },
        };

        if (!smtpConfig.host || !smtpConfig.auth.user || !smtpConfig.auth.pass) {
            throw new Error('Missing SMTP configuration in .env');
        }

        const transporter: Transporter = nodemailer.createTransport(smtpConfig);

        const { to, subject, html, text, attachments } = options;

        if (!html && !text) {
            throw new Error('Either html or text content must be provided');
        }

        const finalHtml = html || (text ? `<p>${text.replace(/\n/g, '<br>')}</p>` : undefined);

        const mailOptions: nodemailer.SendMailOptions = {
            from: `"DJL 360 ERP" <${process.env.SMTP_FROM}>`,  
            subject,
            html: finalHtml,
            text,
            attachments,
        };

        // Handle single or multiple recipients
        const recipients = Array.isArray(to) ? to : [to];
        let allSuccessful = true;

        // Send individual emails to each recipient
        for (const recipient of recipients) {
            try {
                await transporter.sendMail({ ...mailOptions, to: recipient });
                logger.info(`Email sent successfully to ${recipient}`, { subject });
            } catch (error: any) {
                logger.error(`Failed to send email to ${recipient}`, { error: error.message, subject });
                allSuccessful = false;
            }
        }

        return allSuccessful;
    } catch (error: any) {
        logger.error('Failed to send email', { error: error.message, to: options.to, subject: options.subject });
        return false;
    }
}