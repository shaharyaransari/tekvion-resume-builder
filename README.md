# Resume Builder Backend

A Node.js Express backend API for the Resume Builder application with MongoDB integration.

## Features

- 🔐 User authentication with JWT
- 📄 Resume management and templates
- 📊 Analytics tracking
- 💳 Stripe payment integration
- 📧 Email notifications
- 🤖 AI-powered content generation with OpenAI
- 📝 Cover letter generation
- 🎨 Multiple resume templates
- ⭐ Rate limiting and security middleware

## Prerequisites

- Node.js 18.x or higher
- npm or yarn
- MongoDB database
- API keys for:
  - Stripe
  - OpenAI (optional for AI features)
  - Email service (Gmail or other SMTP)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/resume-builder-backend.git
cd resume-builder-backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Fill in your environment variables in `.env`

## Development

Run the development server with hot reload:

```bash
npm run dev
```

The server will start on `http://localhost:5000`

API documentation is available at `http://localhost:5000/api-docs`

## Production

Run the production server:

```bash
npm start
```

## Deployment to Vercel

### Prerequisites
- Vercel account (https://vercel.com)
- GitHub repository connected to Vercel

### Steps

1. Push your code to GitHub:
```bash
git add .
git commit -m "Your message"
git push origin main
```

2. Connect to Vercel:
   - Go to https://vercel.com/import
   - Select your GitHub repository
   - Select the `resume-builder-backend` folder as root directory
   - Import project

3. Set Environment Variables in Vercel:
   Go to Project Settings → Environment Variables and add:
   - `MONGO_URI` - MongoDB connection string
   - `JWT_SECRET` - JWT secret key
   - `EMAIL_USER` - Email address for notifications
   - `EMAIL_PASSWORD` - Email password or app password
   - `SMTP_HOST` - SMTP server (e.g., smtp.gmail.com)
   - `SMTP_PORT` - SMTP port (e.g., 587)
   - `STRIPE_SECRET_KEY` - Stripe secret key
   - `STRIPE_PUBLIC_KEY` - Stripe public key
   - `OPENAI_API_KEY` - OpenAI API key
   - `CORS_ORIGIN` - Allowed CORS origins
   - `NODE_ENV` - Set to "production"

4. Deploy:
   - Click Deploy
   - Your API will be available at `https://your-project.vercel.app`

## API Documentation

Full API documentation available at `/api-docs` endpoint using Swagger UI.

### Main Endpoints

- **Authentication**: `/api/auth/*`
- **Users**: `/api/users/*`
- **Resumes**: `/api/resumes/*`
- **Templates**: `/api/user-templates/*`, `/api/initial-templates/*`
- **Experience**: `/api/experience/*`
- **Education**: `/api/education/*`
- **Projects**: `/api/projects/*`
- **Payments**: `/api/payments/*`
- **Analytics**: `/api/analytics/*`

## Health Check

Check server status:
```
GET /health
```

## Project Structure

```
.
├── api/
│   └── index.js              # Vercel serverless entry point
├── config/                   # Configuration files
├── controllers/              # Route controllers
├── middlewares/              # Express middlewares
├── models/                   # MongoDB models
├── routes/                   # API routes
├── services/                 # Business logic services
├── utils/                    # Utility functions
├── validations/              # Request validations
├── admin-assets/             # Admin resources and templates
├── uploads/                  # User uploads directory
└── server.js                 # Local development server entry point
```

## Error Handling

The API uses standardized error responses:

```json
{
  "success": false,
  "message": "Error description",
  "statusCode": 400
}
```

## Rate Limiting

General rate limit: 100 requests per 15 minutes per IP address.

## License

ISC

## Support

For issues and questions, please create an issue on GitHub.
