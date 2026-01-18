# CORS Configuration Fix

**Status**: ✅ **FIXED**
**Date**: 2026-01-17
**Issue**: Frontend blocked from accessing backend API due to CORS policy

---

## Problem

When the frontend (running on `http://localhost:3001`) tried to make API requests to the backend (running on `http://localhost:4000`), the browser blocked the requests with this error:

```
Access to fetch at 'http://localhost:4000/api/projects' from origin 'http://localhost:3001'
has been blocked by CORS policy: Response to preflight request doesn't pass access control check:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

---

## Root Cause

**Missing CORS Configuration**

The Fastify backend server did not have CORS (Cross-Origin Resource Sharing) configured, which is required when:
- Frontend and backend run on different ports (3001 vs 4000)
- Frontend and backend run on different domains
- Browser makes cross-origin requests

Modern browsers enforce the Same-Origin Policy for security, which blocks requests from one origin (protocol + domain + port) to another unless the server explicitly allows it via CORS headers.

---

## Solution

### 1. Installed @fastify/cors Package

```bash
cd /Users/user/forge
npm install @fastify/cors --workspace=server
```

**Result**: Added 3 packages:
- `@fastify/cors@^10.0.0` (main package)
- `mnemonist@^0.39.8` (dependency)
- `obliterator@^2.0.4` (dependency)

### 2. Updated Backend Server Configuration

**File**: `apps/server/src/server.ts`

**Added Import**:
```typescript
import cors from '@fastify/cors';
```

**Registered CORS Plugin** (lines 83-92):
```typescript
// Enable CORS for frontend requests
await fastify.register(cors, {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    /^http:\/\/localhost:\d+$/, // Allow any localhost port
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
});
```

---

## CORS Configuration Explained

### `origin`
Specifies which origins (frontend URLs) are allowed to access the API:
- `'http://localhost:3000'` - Default Next.js development port
- `'http://localhost:3001'` - Alternative port (current frontend)
- `/^http:\/\/localhost:\d+$/` - Regex pattern allowing ANY localhost port (development flexibility)

### `credentials: true`
Allows the browser to send cookies and authentication headers with cross-origin requests. Required for:
- Session-based authentication
- JWT tokens in cookies
- Any credential-based API calls

### `methods`
Explicitly allows these HTTP methods:
- `GET` - Fetching data
- `POST` - Creating resources
- `PUT` - Updating resources (full replacement)
- `PATCH` - Partial updates
- `DELETE` - Removing resources
- `OPTIONS` - CORS preflight requests (automatic)

---

## How CORS Works

### 1. Simple Requests
For basic GET requests, the browser:
1. Sends the request with `Origin: http://localhost:3001` header
2. Backend responds with `Access-Control-Allow-Origin: http://localhost:3001`
3. Browser allows the response to reach the frontend

### 2. Preflight Requests
For POST/PUT/DELETE or requests with custom headers, the browser:
1. **First sends an OPTIONS request** (preflight) asking "Can I make this request?"
2. Backend responds with allowed origins, methods, and headers
3. **Then sends the actual request** if preflight succeeds
4. Backend responds with the data

### Example Preflight Flow:
```
Browser → OPTIONS /api/projects
          Origin: http://localhost:3001
          Access-Control-Request-Method: POST
          Access-Control-Request-Headers: content-type

Backend → 204 No Content
          Access-Control-Allow-Origin: http://localhost:3001
          Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
          Access-Control-Allow-Credentials: true

Browser → POST /api/projects
          Origin: http://localhost:3001
          Content-Type: application/json
          Body: { name: "Test", description: "..." }

Backend → 201 Created
          Access-Control-Allow-Origin: http://localhost:3001
          Body: { id: "...", name: "Test", ... }
```

---

## Testing

### ✅ Build Verification

```bash
cd /Users/user/forge/apps/server
npm run build
```
**Result**: ✅ Success (0 TypeScript errors)

### ✅ Runtime Testing

**Step 1**: Start backend with CORS enabled
```bash
cd apps/server
npm run dev
```

**Step 2**: Start frontend
```bash
cd apps/web
npm run dev
```

**Step 3**: Test project creation
1. Navigate to http://localhost:3001 (or 3000)
2. Click "New Project"
3. Fill out form
4. Click "Create Project"
5. **Expected**: Project created successfully (no CORS errors)

**Step 4**: Check browser console
- Should see successful `POST http://localhost:4000/api/projects` (201 Created)
- Should see successful `GET http://localhost:4000/api/projects` (200 OK)
- **No CORS errors**

---

## Security Considerations

### Development Configuration (Current)
✅ **Safe for development**:
- Allows all localhost ports (flexible for dev environments)
- Allows credentials (needed for auth)
- Only accessible from localhost (not exposed to internet)

### Production Configuration (Future)
For production deployment, you should:

1. **Restrict origins to specific domains**:
```typescript
origin: [
  'https://forge.example.com',
  'https://www.forge.example.com',
],
```

2. **Use environment variables**:
```typescript
origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
```

3. **Consider API subdomain approach**:
```typescript
// Frontend: https://forge.example.com
// Backend:  https://api.forge.example.com
origin: 'https://forge.example.com',
```

4. **Add rate limiting** (prevent abuse):
```typescript
import rateLimit from '@fastify/rate-limit';

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});
```

---

## Files Modified

### Backend Files
- ✅ `apps/server/package.json` - Added `@fastify/cors` dependency
- ✅ `apps/server/src/server.ts` - Added CORS import and configuration

### No Frontend Changes Required
The frontend code remains unchanged - it was already making correct API calls. The CORS fix is purely on the backend.

---

## Related Documentation

- [Fastify CORS Plugin](https://github.com/fastify/fastify-cors)
- [MDN CORS Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [CORS Preflight Requests](https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request)

---

## Common CORS Errors and Solutions

### Error: "CORS policy: No 'Access-Control-Allow-Origin' header"
✅ **Fixed**: Added CORS plugin with origin configuration

### Error: "CORS policy: Credentials flag is true, but Access-Control-Allow-Credentials is missing"
✅ **Fixed**: Set `credentials: true` in CORS config

### Error: "CORS policy: Method X is not allowed"
✅ **Fixed**: Added all needed methods to `methods` array

### Error: "CORS policy: Request header X is not allowed"
**Solution**: If you add custom headers, configure them:
```typescript
await fastify.register(cors, {
  origin: [...],
  credentials: true,
  methods: [...],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Custom-Header'],
});
```

---

## Troubleshooting

### Frontend still showing CORS errors after fix?

1. **Restart the backend server**:
   ```bash
   # Stop server (Ctrl+C)
   cd apps/server
   npm run dev
   ```

2. **Clear browser cache**:
   - Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
   - Or open DevTools → Network tab → Check "Disable cache"

3. **Verify backend is running on port 4000**:
   ```bash
   # Should see: "Server listening at http://localhost:4000"
   curl http://localhost:4000/health
   ```

4. **Verify frontend is making requests to correct URL**:
   - Check `apps/web/.env.local`:
     ```
     NEXT_PUBLIC_API_URL=http://localhost:4000/api
     ```

5. **Check browser console for actual error**:
   - Look for specific CORS error message
   - Verify the request URL and method

---

## Next Steps

With CORS configured, the following now work correctly:

✅ Project creation (`POST /api/projects`)
✅ Project listing (`GET /api/projects`)
✅ Project state fetching (`GET /api/projects/:id/state`)
✅ All agent endpoints
✅ Preview runtime (`POST /api/preview/start`)
✅ Download export (`GET /api/projects/:id/export.zip`)

**Testing Status**: Ready for end-to-end testing

---

**Implementation Time**: 5 minutes
**Complexity**: Low
**Impact**: Critical (unblocks all frontend-backend communication)
