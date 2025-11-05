# Claude Code Task: Implement Photo/Video Upload for Forge PWA

## Project Context

You're working on a Next.js 14 (TypeScript) PWA for gym trainers to message clients. The app currently has:
- ✅ Real-time text messaging working
- ✅ Authentication system (trainer/client roles)
- ✅ Supabase backend with database and storage
- ✅ Mobile-first responsive design

**Storage bucket already created**: `chat-media` in Supabase

## Your Task

Implement complete photo/video upload functionality in the chat interface with the following requirements:

### 1. Upload Button & File Picker
- [ ] Add a paperclip/attachment icon button next to the text input in `MessageInput.tsx`
- [ ] File picker should accept: `image/*` and `video/*`
- [ ] Mobile: Enable camera access with `capture="environment"` attribute
- [ ] Desktop: Standard file picker
- [ ] File size validation: Images max 10MB, Videos max 50MB
- [ ] File type validation: Only allow jpg, jpeg, png, gif, webp, mp4, mov, avi

### 2. Upload to Supabase Storage
- [ ] Upload files to the `chat-media` bucket in Supabase Storage
- [ ] File path structure: `{conversation_id}/{timestamp}_{filename}`
- [ ] Generate unique filenames to prevent collisions (use UUID or timestamp)
- [ ] Get public URL after successful upload
- [ ] Handle upload errors gracefully with user-friendly messages

### 3. Progress Bar During Upload
- [ ] Show upload progress percentage (0-100%)
- [ ] Display progress bar UI component below the message input
- [ ] Cancel upload button (optional but nice-to-have)
- [ ] Disable send button while uploading
- [ ] Visual feedback: "Uploading photo..." or "Uploading video..."

### 4. Save Message to Database
- [ ] After successful upload, insert message into `messages` table
- [ ] Set `media_url` field to the public URL from Supabase Storage
- [ ] Set `media_type` field to either `'image'` or `'video'`
- [ ] Keep `content` field null or empty for media-only messages
- [ ] Use same realtime subscription pattern as text messages

### 5. Display Images Inline in Chat
- [ ] Render `<img>` tags for messages where `media_type === 'image'`
- [ ] Images should be responsive (max-width: 100%, max-height: 400px)
- [ ] Click to view full-size (modal or new tab)
- [ ] Loading state while image loads
- [ ] Fallback for broken images
- [ ] Maintain message bubble styling (sender vs receiver)

### 6. Display Videos with Player
- [ ] Render `<video>` tags for messages where `media_type === 'video'`
- [ ] Include video controls (play, pause, volume, fullscreen)
- [ ] Responsive sizing (max-width: 100%, max-height: 400px)
- [ ] Preload metadata but not full video
- [ ] Fallback for unsupported video formats
- [ ] Maintain message bubble styling (sender vs receiver)

### 7. Error Handling
- [ ] Network errors during upload
- [ ] File too large errors
- [ ] Unsupported file type errors
- [ ] Storage permission errors
- [ ] Display error messages to user
- [ ] Retry upload button on failure

### 8. Mobile Optimization
- [ ] Compress images before upload (optional but recommended)
- [ ] Touch-friendly upload button (min 44x44px)
- [ ] Mobile camera access working properly
- [ ] Handle orientation changes
- [ ] Test on iOS Safari and Android Chrome

## Technical Implementation Details

### Files to Modify

**1. `app/chat/components/MessageInput.tsx`**
- Add file input (hidden) with ref
- Add upload button that triggers file input
- Add upload progress state
- Add file validation logic
- Add Supabase Storage upload logic
- Show progress bar during upload

**2. `app/chat/components/ChatWindow.tsx`**
- Update message rendering logic to handle media messages
- Add image rendering component
- Add video rendering component
- Maintain existing text message rendering
- Handle mixed content (optional: text + media)

**3. Supabase Storage Configuration (if needed)**
- Verify `chat-media` bucket exists and is public
- Check RLS policies allow authenticated users to upload
- Check RLS policies allow users to read from conversations they're in

### Code Patterns to Follow

**Upload to Supabase Storage:**
```typescript
const supabase = createBrowserClient()
const file = event.target.files[0]
const filePath = `${conversationId}/${Date.now()}_${file.name}`

const { data, error } = await supabase.storage
  .from('chat-media')
  .upload(filePath, file, {
    cacheControl: '3600',
    upsert: false
  })

if (error) {
  // Handle error
}

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('chat-media')
  .getPublicUrl(filePath)
```

**Insert Message with Media:**
```typescript
const { error } = await supabase
  .from('messages')
  .insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content: null, // or optional caption
    media_url: publicUrl,
    media_type: 'image' // or 'video'
  })
```

**Render Image in Chat:**
```typescript
{message.media_type === 'image' && (
  <img 
    src={message.media_url} 
    alt="Shared image"
    className="max-w-full max-h-96 rounded-lg"
  />
)}
```

**Render Video in Chat:**
```typescript
{message.media_type === 'video' && (
  <video 
    src={message.media_url}
    controls
    preload="metadata"
    className="max-w-full max-h-96 rounded-lg"
  >
    Your browser does not support video playback.
  </video>
)}
```

## Styling Guidelines

- Use existing Tailwind classes consistent with the app
- Message bubbles with media should have same padding/colors as text messages
- Upload button should match the send button style
- Progress bar should be subtle (thin line, blue color)
- Error messages should be red text below the input

## Testing Requirements

After implementation, verify:
1. Upload image from desktop works
2. Upload video from desktop works
3. Upload from mobile camera works
4. Progress bar shows during upload
5. Images display correctly inline
6. Videos play with controls
7. Realtime updates work (other user sees media immediately)
8. Error handling works (try uploading 100MB file)
9. Mobile responsive (test on small screens)

## Database Context

**Supabase Project**: `https://urzbpnptwjihosctswej.supabase.co`

**Messages Table Schema:**
```sql
messages:
  - id (uuid, primary key)
  - conversation_id (uuid, foreign key)
  - sender_id (uuid, foreign key)
  - content (text, nullable)
  - media_url (text, nullable)       -- THIS FIELD FOR MEDIA
  - media_type (text, nullable)      -- THIS FIELD FOR 'image' or 'video'
  - created_at (timestamp)
```

**Storage Bucket**: `chat-media` (already exists)

## Important Notes

1. **Use `lib/supabase-browser.ts`** for all client-side Supabase operations
2. **Don't break existing text messaging** - ensure text-only messages still work
3. **Mobile-first approach** - test mobile experience thoroughly
4. **Security**: Validate file types and sizes on client-side (server-side handled by Supabase)
5. **Performance**: Consider lazy loading for images/videos in long chats
6. **Accessibility**: Add proper alt text and ARIA labels

## Optional Enhancements (If Time Permits)

- [ ] Image compression before upload (reduce file size)
- [ ] Thumbnail generation for videos
- [ ] Multiple file upload at once
- [ ] Copy/paste image from clipboard
- [ ] Drag and drop file upload
- [ ] Caption/text with media message
- [ ] Delete/remove uploaded media

## Success Criteria

✅ Users can upload photos from their device  
✅ Users can upload videos from their device  
✅ Mobile users can take photos with camera and send  
✅ Upload progress is visible during upload  
✅ Images display inline in chat bubbles  
✅ Videos play with controls in chat bubbles  
✅ Realtime updates work for media messages  
✅ Error handling works for common failure cases  
✅ UI is mobile-responsive and looks good  

## Questions to Consider

- Should media messages support captions/text alongside the media?
- Should there be a "view full size" modal for images?
- Should videos auto-play (muted) or require user interaction?
- Should there be a gallery view to see all media in a conversation?

Use your best judgment for UX decisions and follow existing patterns in the codebase.

---

**Additional Context**: This is Phase 1 of the MVP. Once this is complete, the app will be ready for initial client demos. The current text messaging system is working perfectly with real-time updates via Supabase Realtime.
