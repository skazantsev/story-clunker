

## Add "Research" Button with Firecrawl Integration

### Overview
Add a "Research" button to each story segment that searches the web for real-world information related to the segment's content, displaying results in the inline alert.

### Prerequisite
Connect Firecrawl to the project via Settings > Connectors.

---

### Changes

**1. Create Edge Function** (`supabase/functions/firecrawl-research/index.ts`)
- Accept segment content as input
- Use Lovable AI to extract a searchable topic from the content
- Call Firecrawl search API with that topic
- Handle quota exceeded errors with status 429 and structured response:
  ```json
  { "error": "quota_exceeded", "message": "Firecrawl API quota exceeded..." }
  ```
- Return top 2-3 results formatted as a brief summary

**2. Update StoryBuilder** (`src/components/StoryBuilder.tsx`)
- Add `researchingSegmentId` state
- Add `handleResearch(segmentId, content)` function:
  - Clear existing alert
  - Call edge function
  - Check for `quota_exceeded` error and display as error alert
  - Display results in success alert
- Add "Research" button with `Globe` icon

---

### Error Handling Pattern (matching Narrate)

Edge function quota handling:
```text
if (response.status === 429 || errorData.error?.includes('rate') || errorData.error?.includes('quota')) {
  return Response with:
    - status: 429
    - body: { error: "quota_exceeded", message: "Firecrawl API quota exceeded. Please check your Firecrawl plan limits." }
}
```

Frontend handling in `handleResearch`:
```text
if (errorData.error === "quota_exceeded") {
  setInlineAlert({
    type: 'error',
    title: "API Quota Exceeded",
    message: errorData.message
  });
  return;
}
```

---

### UI Addition
New button in segment card (after "Get Feedback"):
```text
[Volume2] Narrate  |  [Lightbulb] Get Feedback  |  [Globe] Research
```

---

### Example Flow
1. User clicks "Research" on segment about "abandoned Mars colony"
2. AI extracts topic: "Mars colonization plans"
3. Firecrawl searches web
4. Green alert shows: "NASA and SpaceX have outlined Mars colonization plans targeting the 2030s-2040s. Key challenges include radiation, food production, and return fuel."

