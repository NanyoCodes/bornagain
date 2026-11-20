import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const actionCodeSettings = {
      // Production action URL for custom identity activation
      url: 'https://bornagainglobal.com/__/auth/action',
      handleCodeInApp: true,
    };

    const link = await adminAuth.generateEmailVerificationLink(email, actionCodeSettings);

    const { data, error } = await resend.emails.send({
      from: 'BornAgain Global <verify@bornagainglobal.com>',
      to: email,
      subject: 'Activate your Kingdom identity - BornAgain Global',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb; }
            .wrapper { width: 100%; table-layout: fixed; background-color: #f9fafb; padding-bottom: 40px; }
            .container { max-width: 600px; margin: 40px auto; padding: 40px; border-radius: 40px; background: #ffffff; border: 1px solid #f0f0f0; box-shadow: 0 20px 40px rgba(0,0,0,0.05); text-align: center; }
            .logo { width: 80px; height: 80px; margin-bottom: 24px; border-radius: 20px; }
            h1 { color: #111827; font-size: 28px; font-weight: 900; letter-spacing: -0.02em; text-transform: uppercase; margin-bottom: 16px; }
            p { color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 32px; }
            .button { background-color: #f97416; color: #ffffff !important; padding: 18px 40px; text-decoration: none; border-radius: 20px; font-weight: 900; font-size: 14px; letter-spacing: 0.1em; display: inline-block; box-shadow: 0 10px 20px rgba(249,116,22,0.3); }
            .footer { margin-top: 40px; padding-top: 32px; border-top: 1px solid #f3f4f6; color: #9ca3af; font-size: 12px; }
            .footer p { margin: 4px 0; color: #9ca3af; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <img src="https://i.postimg.cc/K8VD8BYD/Born-Again-Mountain-Sunrise-Emblem.png" class="logo" alt="BornAgain" />
              <h1>Activate Your Identity</h1>
              <p>Welcome to the global movement of the redeemed. To ensure the integrity of our community and testimonies, please verify your email address below to activate your account.</p>
              <a href="${link}" class="button">ACTIVATE NOW</a>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} BORN AGAIN GLOBAL</p>
                <p>Built for the Great Commission</p>
                <p style="margin-top: 16px;">If you didn't create an account, you can safely ignore this message.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, messageId: data?.id });
  } catch (error: any) {
    console.error('Email verification error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
