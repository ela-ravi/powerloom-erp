export interface SmsService {
  sendOtp(phone: string, code: string): Promise<void>;
}

export class MockSmsService implements SmsService {
  public lastSentCode: string | null = null;
  public lastSentPhone: string | null = null;

  async sendOtp(phone: string, code: string): Promise<void> {
    this.lastSentCode = code;
    this.lastSentPhone = phone;
    console.log(`[MockSMS] OTP for ${phone}: ${code}`);
  }
}

let smsServiceInstance: SmsService | null = null;

export function getSmsService(): SmsService {
  if (!smsServiceInstance) {
    smsServiceInstance = new MockSmsService();
  }
  return smsServiceInstance;
}

export function setSmsService(service: SmsService): void {
  smsServiceInstance = service;
}
