# Vercel Environment Variables Checklist

## Required Environment Variables

Make sure these are set in your Vercel project:

### 1. MONGO_URI (REQUIRED)
- **Description**: Your MongoDB Atlas connection string
- **Format**: `mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority`
- **Where to find**: MongoDB Atlas → Connect → Connect your application
- **Vercel Setup**: 
  - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
  - Add: `MONGO_URI` = `your-connection-string-here`

### 2. JWT_SECRET (REQUIRED)
- **Description**: Secret key for signing JWT tokens
- **Format**: Any secure random string (minimum 32 characters recommended)
- **Example**: `your-super-secret-jwt-key-here-change-this-in-production`
- **Vercel Setup**: 
  - Add: `JWT_SECRET` = `your-secret-key-here`

### 3. JWT_EXPIRE (OPTIONAL)
- **Description**: JWT token expiration time
- **Default**: `24h`
- **Examples**: `24h`, `7d`, `30d`
- **Vercel Setup**: 
  - Add: `JWT_EXPIRE` = `24h` (or your preferred expiration)

### 4. NODE_ENV (OPTIONAL but RECOMMENDED)
- **Description**: Node environment
- **Value**: `production`
- **Vercel Setup**: 
  - Add: `NODE_ENV` = `production`

### 5. AWS_LAMBDA_JS_RUNTIME (REQUIRED for PDF Generation)
- **Description**: Node.js runtime version for AWS Lambda (used by Vercel)
- **Value**: `nodejs22.x` or `nodejs20.x`
- **Why**: Required to fix Chromium library issues (libnss3.so) in serverless environment
- **Vercel Setup**: 
  - Add: `AWS_LAMBDA_JS_RUNTIME` = `nodejs22.x`
- **Note**: This ensures Chromium has access to necessary system libraries for PDF generation

## How to Add Environment Variables in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (`fm-backend-six`)
3. Click **Settings** tab
4. Click **Environment Variables** in the sidebar
5. Click **Add New**
6. Enter the variable name and value
7. Select environments: **Production**, **Preview**, and **Development**
8. Click **Save**
9. **Redeploy** your application (the variables take effect on next deployment)

## Common Issues

### ❌ "MONGO_URI environment variable is not set"
- **Fix**: Make sure `MONGO_URI` is added in Vercel Environment Variables
- **Note**: Environment variables are case-sensitive!

### ❌ "MongoDB Atlas connection failed"
- **Fix**: 
  1. Check your MongoDB Atlas IP whitelist (add `0.0.0.0/0` for Vercel)
  2. Verify the connection string is correct
  3. Make sure database user has correct permissions

### ❌ "JWT_SECRET" errors
- **Fix**: Add `JWT_SECRET` environment variable in Vercel

### ❌ "PDF generation failed: libnss3.so: cannot open shared object file"
- **Fix**: 
  1. Add `AWS_LAMBDA_JS_RUNTIME` = `nodejs22.x` environment variable in Vercel
  2. Ensure `@sparticuz/chromium` version is `^141.0.0` or later
  3. Ensure Node.js version is 20.x or 22.x in Vercel settings
  4. Redeploy the application
- **Note**: This error occurs when Chromium can't find required system libraries in the serverless environment

## Verification

After adding environment variables:

1. Redeploy your application
2. Test the root endpoint: `https://fm-backend-six.vercel.app/`
3. Should return: `{"success": true, "message": "API is running"}`
4. Check Vercel function logs for any errors

## Example .env file (Local Development)

```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/factory-management?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRE=24h
NODE_ENV=development
PORT=5000
```

**Important**: Never commit `.env` files to git! These are already in `.gitignore`.

