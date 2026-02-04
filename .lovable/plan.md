
## Change Error Display from Toast to Inline Alert

### Overview
Replace the toast notification for ElevenLabs quota exceeded errors with a persistent inline alert displayed at the top of the story builder area.

---

### Changes

**1. Add Error State** (`src/components/StoryBuilder.tsx`)
- Add new state: `narrationError: { title: string; message: string } | null`
- Initialize as `null`

**2. Update Error Handling**
- In `handleNarrate`, instead of calling `toast()` for quota exceeded:
  - Set `narrationError` state with title and message
- Clear error when user dismisses it or starts a new narration

**3. Add Inline Alert UI**
- Import `Alert`, `AlertTitle`, `AlertDescription` from `@/components/ui/alert`
- Import `AlertCircle` and `X` icons from lucide-react
- Render alert below the header, above the ScrollArea:
  ```
  {narrationError && (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{narrationError.title}</AlertTitle>
      <AlertDescription>{narrationError.message}</AlertDescription>
      <Button variant="ghost" size="sm" onClick={() => setNarrationError(null)}>
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  )}
  ```

---

### User Experience
- **Before**: Toast appears briefly in corner, easy to miss
- **After**: Persistent alert banner at top of story area with dismiss button, clearly visible until user acknowledges
