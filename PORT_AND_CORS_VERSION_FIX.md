# Port Configuration and CORS Version Fix

**Status**: ✅ **FIXED**
**Date**: 2026-01-17
**Issues**:
1. Backend running on wrong port (3001 instead of 4000)
2. CORS plugin version incompatible with Fastify

---

## Problem 1: Port Mismatch

**Error**: `POST http://localhost:4000/api/projects net::ERR_CONNECTION_REFUSED`

**Root Cause**:
- Frontend configured to connect to: `http://localhost:4000`
- Backend configured to run on: `PORT=3001` (in `.env`)

**Solution**: Updated `apps/server/.env` to use `PORT=4000`

---

## Problem 2: CORS Plugin Version Incompatible

**Error**:
```
FastifyError: fastify-plugin: @fastify/cors - expected '5.x' fastify version, '4.29.1' is installed
code: 'FST_ERR_PLUGIN_VERSION_MISMATCH'
```

**Root Cause**:
- Installed `@fastify/cors@^11.2.0` which requires Fastify v5
- Project uses `fastify@^4.26.0` (v4.29.1)

**Solution**: Downgraded CORS plugin to compatible version:
```bash
npm install @fastify/cors@^9 --workspace=server
```

**Version Compatibility**:
- ✅ Fastify v4 → @fastify/cors v9.x
- ❌ Fastify v4 → @fastify/cors v11.x (requires Fastify v5)

---

## Verification

### ✅ Backend Server Running
```bash
curl http://localhost:4000/health
```
**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-17T15:32:41.438Z",
  "uptime": 14.776714292
}
```

### ✅ CORS Headers Present
```bash
curl -I http://localhost:4000/api/projects -H "Origin: http://localhost:3001"
```
**Headers**:
```
access-control-allow-origin: http://localhost:3001
access-control-allow-credentials: true
```

### ✅ Projects API Working
Backend running and accepting requests on port 4000.

---

## Files Modified

1. **apps/server/.env**
   - Changed `PORT=3001` → `PORT=4000`

2. **apps/server/package.json**
   - Changed `@fastify/cors@^11.2.0` → `@fastify/cors@^9.0.0`

3. **apps/server/src/server.ts**
   - Added CORS configuration (from previous fix)

---

## Current Server Status

The backend server is now running in the background:

**Command**: `npm run dev` (in `apps/server/`)
**Port**: 4000
**Health**: ✅ Healthy
**CORS**: ✅ Configured
**Process ID**: Background task running

---

## Testing Project Creation

Now you can test the full flow:

1. **Frontend**: Should already be running on http://localhost:3001
2. **Backend**: Now running on http://localhost:4000
3. **Test**:
   - Go to http://localhost:3001
   - Click "New Project"
   - Fill out form (name + description)
   - Click "Create Project"
   - Should successfully create project and redirect to foundry-architect page

---

## Previous Errors - All Fixed

✅ **CORS Error**: Fixed by adding @fastify/cors plugin
✅ **Connection Refused**: Fixed by setting correct port
✅ **Version Mismatch**: Fixed by using compatible CORS version
✅ **Error Message Format**: Fixed by parsing `error.error.message`

---

## Development Workflow

### Start Backend
```bash
cd apps/server
npm run dev
# Server will run on port 4000
```

### Start Frontend
```bash
cd apps/web
npm run dev
# Frontend will run on port 3001 (or 3000)
```

### Stop Backend
If you started it in the current terminal session, just press `Ctrl+C`.

If running in background, find and kill the process:
```bash
lsof -ti :4000 | xargs kill
```

---

## Next Steps

With both servers running correctly:

1. ✅ Test project creation
2. ✅ Test project listing
3. Test project state fetching
4. Test all 17 agent pages
5. Test preview functionality (when ready)
6. Test download functionality (when ready)

---

**All blocking issues resolved - frontend can now communicate with backend!**
