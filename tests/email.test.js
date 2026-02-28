const { sendEmail } = require('../services/email.service');

// Test email sending
const testEmail = async () => {
    try {
        await sendEmail(
            'nexaweb.business@gmail.com',
            'Test Email',
            '<h1>Test Email</h1><p>This is a test email.</p>'
        );
        console.log('Test email sent successfully');
    } catch (error) {
        console.error('Test email failed:', error);
    }
};

testEmail();