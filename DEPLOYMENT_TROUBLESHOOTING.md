# Backend Deployment Troubleshooting Guide

## Quick Checks

### 1. Syntax Errors
✅ **Verified**: All files pass syntax checks
- `server.js` - ✅ Valid
- `src/controllers/reportController.js` - ✅ Valid
- `src/services/pdfService.js` - ✅ Valid

### 2. Common Vercel Deployment Errors

#### Error: "Module not found" or "Cannot find module"
**Fix:**
- Ensure all dependencies are in `package.json`
- Check that `node_modules` is not committed (should be in `.gitignore`)
- Verify `package.json` has all required dependencies

#### Error: "Cannot find module '@vercel/node'"
**Fix:**
- This is handled by Vercel automatically
- Ensure `vercel.json` specifies `"use": "@vercel/node"`

#### Error: "Function exceeded maximum duration"
**Fix:**
- Current setting: `maxDuration: 60` seconds
- For PDF generation, may need to increase to 120 seconds
- Update `vercel.json`:
  ```json
  "functions": {
    "server.js": {
      "maxDuration": 120,
      "memory": 3008
    }
  }
  ```

#### Error: "Out of memory"
**Fix:**
- Current setting: `memory: 3008` MB
- For PDF generation with Chromium, may need more memory
- Update `vercel.json`:
  ```json
  "functions": {
    "server.js": {
      "maxDuration": 120,
      "memory": 3008
    }
  }
  ```
- Note: Vercel Pro plan required for >1024MB memory

#### Error: "Environment variable not set"
**Fix:**
- Check Vercel Dashboard → Settings → Environment Variables
- Required variables:
  - `MONGO_URI`
  - `JWT_SECRET`
  - `AWS_LAMBDA_JS_RUNTIME` (for PDF generation)

#### Error: "ECONNREFUSED" or MongoDB connection errors
**Fix:**
- Check MongoDB Atlas IP whitelist (add `0.0.0.0/0` for Vercel)
- Verify `MONGO_URI` is correct
- Check MongoDB Atlas connection string format

#### Error: "PDF generation failed" or Chromium errors
**Fix:**
- Ensure `AWS_LAMBDA_JS_RUNTIME=nodejs22.x` is set in Vercel
- Verify `@sparticuz/chromium` version is `^141.0.0`
- Check Node.js version in `package.json`: `"engines": { "node": ">=20.11.0" }`

### 3. Build Configuration

#### Current `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node",
      "config": {
        "includeFiles": ["dist/**"]
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ],
  "functions": {
    "server.js": {
      "maxDuration": 60,
      "memory": 3008
    }
  }
}
```

### 4. Testing Locally

Before deploying, test locally:
```bash
cd fmserver
npm install
node server.js
```

### 5. Deployment Steps

1. **Commit all changes:**
   ```bash
   git add .
   git commit -m "Fix: Updated report generation and deployment config"
   git push
   ```

2. **Check Vercel Dashboard:**
   - Go to your project
   - Check "Deployments" tab
   - View build logs for errors

3. **Verify Environment Variables:**
   - Settings → Environment Variables
   - Ensure all required variables are set for Production, Preview, and Development

4. **Redeploy if needed:**
   - Click "Redeploy" in Vercel Dashboard
   - Or push a new commit

### 6. Debugging

#### View Logs:
- Vercel Dashboard → Your Project → Functions → View Logs
- Or use Vercel CLI: `vercel logs`

#### Test Endpoints:
```bash
# Test root endpoint
curl https://your-backend.vercel.app/

# Test API endpoint
curl https://your-backend.vercel.app/api/

# Test with auth (replace TOKEN)
curl -H "Authorization: Bearer TOKEN" https://your-backend.vercel.app/api/admin/users
```

## If Still Having Issues

1. **Share the exact error message** from Vercel deployment logs
2. **Check Vercel build logs** for specific errors
3. **Verify Node.js version** matches `package.json` engines
4. **Check all environment variables** are set correctly
5. **Review recent changes** that might have broken deployment

