# Vercel Deployment Guide

## 🚀 Quick Deployment Steps

### 1. **Prepare Your Repository**
```bash
# Make sure all changes are committed
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. **Deploy to Vercel**
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "New Project"
3. Import your `service-YIC` repository
4. Vercel will auto-detect SvelteKit framework

### 3. **Configure Environment Variables**
In your Vercel dashboard, go to Settings > Environment Variables and add:

#### Required Variables:
```
GOOGLE_SERVICE_ACCOUNT_KEY_BASE64=your_base64_encoded_key
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id
GOOGLE_APPS_SCRIPT_WEB_APP_URL=your_gas_webapp_url
NEXTAUTH_SECRET=your_random_secret
NEXTAUTH_URL=https://your-app-name.vercel.app
GOOGLE_CLIENT_ID=your_oauth_client_id
GOOGLE_CLIENT_SECRET=your_oauth_client_secret
```

### 4. **Security Setup**

#### Google Service Account Key:
- Your `.env` file contains the base64 encoded key
- Copy the value and paste into Vercel environment variables
- Never commit the actual `.env` file

#### Google Sheets API:
- Ensure your service account has edit access to your Google Sheet
- Share the sheet with your service account email

#### Google Apps Script:
- Deploy your GAS web app with "Execute as: Me" and "Who has access: Anyone"
- Update the URL in Vercel environment variables

### 5. **OAuth Configuration**
Update your Google OAuth app settings:
- Authorized redirect URIs: `https://your-app-name.vercel.app/api/auth/callback/google`
- Authorized JavaScript origins: `https://your-app-name.vercel.app`

## 🔒 Security Checklist

- ✅ `.env` files are in `.gitignore`
- ✅ All sensitive data is in Vercel environment variables
- ✅ Google service account has minimal required permissions
- ✅ OAuth URLs are updated for production domain
- ✅ No hardcoded secrets in code

## 📋 Files Included in Deployment

### Included:
- All `/src` files (components, routes, API endpoints)
- `package.json` and `package-lock.json`
- `svelte.config.js`
- `vite.config.js`
- `tailwind.config.js`
- `vercel.json` (deployment configuration)
- `.env.example` (template for environment variables)

### Excluded (by .gitignore):
- `.env` (contains actual secrets)
- `node_modules/`
- `/build`
- `.svelte-kit/`

## 🛠 Post-Deployment Testing

1. **Test Authentication**: Try logging in with Google OAuth
2. **Test API Endpoints**: 
   - Check rental creation
   - Test data export functionality
   - Verify Google Sheets integration
3. **Test Admin Panel**: Ensure all functionality works
4. **Mobile Responsiveness**: Test on mobile devices

## 🔧 Troubleshooting

### Common Issues:
1. **Build Failures**: Check package.json dependencies
2. **API Errors**: Verify all environment variables are set
3. **OAuth Issues**: Confirm redirect URLs match exactly
4. **Google Sheets Access**: Ensure service account permissions

### Logs:
- Check Vercel function logs in dashboard
- Use browser developer tools for client-side issues

## 📞 Support
If you encounter issues, check:
1. Vercel deployment logs
2. Browser console errors
3. Google Cloud Console API quotas
4. Google Sheets sharing permissions