import type { IMailer } from '@domain/auth/ports';
import { Resend } from 'resend';
import { logger } from '../../shared/logger';

function formatTtl(seconds: number): string {
  if (seconds >= 60) {
    const minutes = Math.round(seconds / 60);
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }
  return `${seconds} second${seconds === 1 ? '' : 's'}`;
}

export class ResendMailer implements IMailer {
  private readonly resend: Resend;
  private readonly fromAddress: string;
  private readonly ttlDisplay: string;

  constructor(apiKey: string, fromAddress: string, otpTtlSeconds: number) {
    this.resend = new Resend(apiKey);
    this.fromAddress = fromAddress;
    this.ttlDisplay = formatTtl(otpTtlSeconds);
  }

  async sendOtp(to: string, otp: string, name: string): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.fromAddress,
      to,
      subject: `${otp} is your Bingeo verification code`,
      html: this.buildEmail(
        otp,
        name,
        'Use the verification code below to complete your registration:',
      ),
    });

    if (error) {
      logger.error({ err: error, to }, 'Failed to send OTP email');
      throw new Error('Failed to send verification email');
    }

    logger.info({ to }, 'OTP email sent successfully');
  }

  async sendPasswordReset(to: string, otp: string, name: string): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.fromAddress,
      to,
      subject: `${otp} is your Bingeo password reset code`,
      html: this.buildEmail(otp, name, 'Use the code below to reset your password:'),
    });

    if (error) {
      logger.error({ err: error, to }, 'Failed to send password reset email');
      throw new Error('Failed to send password reset email');
    }

    logger.info({ to }, 'Password reset email sent successfully');
  }

  private buildEmail(otp: string, name: string, message: string): string {
    return `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #0f0d1b; color: #f5f5f5; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 24px; font-weight: 700; margin: 0; color: #ffffff;">Bingeo</h1>
          <p style="color: #a78bfa; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px;">Your Streaming Platform</p>
        </div>

        <p style="font-size: 16px; margin-bottom: 8px;">Hi ${name},</p>
        <p style="font-size: 14px; color: #9ca3af; margin-bottom: 24px;">
          ${message}
        </p>

        <div style="background: #1a1730; border: 1px solid rgba(167, 139, 250, 0.3); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #a78bfa;">${otp}</span>
        </div>

        <p style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">
          This code expires in <strong style="color: #f5f5f5;">${this.ttlDisplay}</strong>.
        </p>
        <p style="font-size: 13px; color: #6b7280;">
          If you didn't request this, you can safely ignore this email.
        </p>

        <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 32px 0 16px;" />
        <p style="font-size: 11px; color: #4b5563; text-align: center;">
          &copy; ${new Date().getFullYear()} Bingeo Entertainment Pvt. Ltd.
        </p>
      </div>
    `;
  }
}
