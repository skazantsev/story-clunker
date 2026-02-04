
## Handle ElevenLabs Quota Exceeded Error

### Problem
When ElevenLabs returns a quota exceeded error (401 with `quota_exceeded` status), the user sees a generic "Narration failed: 500" message instead of a helpful explanation.

### Solution
Add proper error parsing and user-friendly messaging for the quota exceeded case.

---

### Changes

**1. Update Edge Function** (`supabase/functions/narrate-segment/index.ts`)
- Parse the ElevenLabs error response JSON
- Detect the `quota_exceeded` status specifically
- Return a 429 status with a clear error type and message

**2. Update Client** (`src/components/StoryBuilder.tsx`)
- Check for JSON error responses from the edge function
- Display a specific toast message when quota is exceeded
- Guide user that ElevenLabs credits need to be added

---

### Technical Details

Edge function error handling (lines 54-61):
```text
- Parse errorText as JSON
- Check for detail.status === "quota_exceeded"
- Return { error: "quota_exceeded", message: "..." } with status 429
- Fall back to generic error for other cases
```

Client error handling in `handleNarrate`:
```text
- Try to parse error response as JSON
- Check for error === "quota_exceeded"
- Show specific toast: "Voice Credits Depleted" with message to add ElevenLabs credits
- Fall back to generic error toast
```

---

### User Experience
- **Before**: "Narration Error - Narration failed: 500"
- **After**: "Voice Credits Depleted - Your ElevenLabs account has run out of credits. Please add more credits to continue using narration."
