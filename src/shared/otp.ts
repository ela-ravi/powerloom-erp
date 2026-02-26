import bcrypt from "bcryptjs";
import { sql } from "../config/database.js";
import { AppError } from "./errors.js";
import { getSmsService } from "./sms/sms.interface.js";

/**
 * Rate limit, generate, hash, store, and send a 6-digit OTP.
 * Reusable across login, tenant registration, and invite registration.
 */
export async function generateAndStoreOtp(phone: string): Promise<{ message: string }> {
  // Rate limit: max 5 OTPs per phone per hour
  const recentOtps = await sql<{ count: string }[]>`
    SELECT COUNT(*) as count FROM otp_codes
    WHERE phone = ${phone} AND created_at > NOW() - INTERVAL '1 hour'
  `;

  if (parseInt(recentOtps[0].count, 10) >= 5) {
    throw AppError.rateLimited("Too many OTP requests. Try again later.");
  }

  // Generate 6-digit OTP
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const hashedCode = await bcrypt.hash(code, 10);

  // Store OTP (expires in 5 minutes)
  await sql`
    INSERT INTO otp_codes (phone, code, expires_at)
    VALUES (${phone}, ${hashedCode}, NOW() + INTERVAL '5 minutes')
  `;

  // Send OTP via SMS service
  const smsService = getSmsService();
  await smsService.sendOtp(phone, code);

  return { message: "OTP sent successfully" };
}

/**
 * Find the latest unexpired OTP for a phone, bcrypt compare, and mark verified.
 * Returns true on success, throws on failure.
 */
export async function verifyStoredOtp(phone: string, code: string): Promise<void> {
  const otps = await sql<
    { id: string; code: string; expires_at: Date; verified: boolean }[]
  >`
    SELECT * FROM otp_codes
    WHERE phone = ${phone} AND verified = false AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (otps.length === 0) {
    throw AppError.unauthorized("Invalid or expired OTP");
  }

  const otp = otps[0];
  const isValid = await bcrypt.compare(code, otp.code);

  if (!isValid) {
    throw AppError.unauthorized("Invalid OTP");
  }

  // Mark OTP as used
  await sql`UPDATE otp_codes SET verified = true WHERE id = ${otp.id}`;
}
