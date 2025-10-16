// Email utility for sending notifications
// This is a placeholder implementation - in production, you would integrate with
// a service like SendGrid, AWS SES, or similar

interface WelcomeEmailData {
  email: string
  full_name?: string
  organization_name: string
  role: string
  login_url: string
}

interface PasswordResetEmailData {
  email: string
  full_name?: string
  organization_name: string
}

export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
  try {
    // In a real implementation, you would send an actual email here
    // For now, we'll just log the email content
    
    const emailContent = {
      to: data.email,
      subject: `Welcome to Temperature Dashboard - ${data.organization_name}`,
      html: `
        <h2>Welcome to Temperature Dashboard</h2>
        <p>Hello ${data.full_name || data.email},</p>
        <p>Your account has been created for <strong>${data.organization_name}</strong> with the role of <strong>${data.role === 'master_user' ? 'Master User' : 'User'}</strong>.</p>
        
        <h3>Getting Started</h3>
        <p>You can now log in to your account:</p>
        <p><a href="${data.login_url}" style="background-color: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login to Dashboard</a></p>
        
        <h3>Your Role</h3>
        ${data.role === 'master_user' 
          ? '<p>As a Master User, you have full administrative access to manage your organization, including creating users, managing sites, and configuring sensors.</p>'
          : '<p>As a User, you have read-only access to the sites assigned to you by your organization administrator.</p>'
        }
        
        <h3>Next Steps</h3>
        <ul>
          <li>Log in using your email address and the password provided by your administrator</li>
          <li>Change your password on first login for security</li>
          <li>Explore the dashboard and familiarize yourself with the interface</li>
          ${data.role === 'master_user' 
            ? '<li>Set up your organization by adding sites and sensors</li>'
            : '<li>Contact your organization administrator if you need access to additional sites</li>'
          }
        </ul>
        
        <p>If you have any questions or need assistance, please contact your system administrator.</p>
        
        <p>Best regards,<br>Temperature Dashboard Team</p>
      `,
      text: `
        Welcome to Temperature Dashboard
        
        Hello ${data.full_name || data.email},
        
        Your account has been created for ${data.organization_name} with the role of ${data.role === 'master_user' ? 'Master User' : 'User'}.
        
        You can log in at: ${data.login_url}
        
        Please change your password on first login for security.
        
        Best regards,
        Temperature Dashboard Team
      `
    }
    
    // Log the email for development purposes
    console.log('📧 Welcome Email Sent:', emailContent)
    
    // TODO: Integrate with actual email service
    // Example with SendGrid:
    // const sgMail = require('@sendgrid/mail')
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    // await sgMail.send(emailContent)
    
    return true
  } catch (error) {
    console.error('Failed to send welcome email:', error)
    return false
  }
}

export async function sendPasswordResetEmail(data: PasswordResetEmailData): Promise<boolean> {
  try {
    const emailContent = {
      to: data.email,
      subject: `Password Reset - Temperature Dashboard`,
      html: `
        <h2>Password Reset Notification</h2>
        <p>Hello ${data.full_name || data.email},</p>
        <p>Your password for the Temperature Dashboard has been reset by your system administrator.</p>
        
        <p>You will receive your new password separately. Please log in and change it immediately for security.</p>
        
        <p>If you did not request this password reset, please contact your system administrator immediately.</p>
        
        <p>Best regards,<br>Temperature Dashboard Team</p>
      `,
      text: `
        Password Reset Notification
        
        Hello ${data.full_name || data.email},
        
        Your password for the Temperature Dashboard has been reset by your system administrator.
        
        You will receive your new password separately. Please log in and change it immediately for security.
        
        If you did not request this password reset, please contact your system administrator immediately.
        
        Best regards,
        Temperature Dashboard Team
      `
    }
    
    console.log('📧 Password Reset Email Sent:', emailContent)
    
    return true
  } catch (error) {
    console.error('Failed to send password reset email:', error)
    return false
  }
}

export function getLoginUrl(): string {
  // In production, this would be your actual domain
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/login`
}