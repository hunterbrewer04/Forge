# Pull Request Issues and Conflicts Report

**PR Title:** feat: Profile Page Improvements - Avatar Upload & Username/Email  
**Branch:** copilot/sub-pr-9 → main  
**Date Generated:** 2026-01-21  
**Commit Range:** ca80ae1..db665c0 (2 commits)

---

## Executive Summary

This PR introduces profile page enhancements including avatar upload validation, username management, and email editing functionality. The code review has identified **10 critical issues** across **4 files**. Additionally, there are **2 merge conflicts** with the main branch that must be resolved before merging.

**Status:** ⚠️ CANNOT MERGE - Conflicts Detected

---

## 1. Merge Conflicts (BLOCKING)

### 🔴 Critical: 2 Files with Merge Conflicts

The following files have conflicting changes between this PR branch and the main branch:

#### File 1: `app/profile/edit/page.tsx`
- **Conflict Type:** Modified in both branches
- **Base:** `5ccad67` 
- **PR Branch:** `a0e188d`
- **Main Branch:** `6515d4e`
- **Affected Lines:** Around line 6-18 (imports and state variables)
- **Description:** Both branches have added different state variables and imports. Main branch appears to have added toast/modal functionality while PR branch added username/email functionality.

#### File 2: `app/profile/page.tsx`
- **Conflict Type:** Modified in both branches  
- **Base:** `1278138`
- **PR Branch:** `64785ed`
- **Main Branch:** `df26c06`
- **Affected Lines:** Around line 8-11, 19, 33-68 (imports, hooks, and avatar upload logic)
- **Description:** Main branch has added `useToast`, `Toast`, and `ConfirmModal` imports/functionality. PR branch uses `alert()` instead. The avatar upload validation logic differs significantly between branches.

**Resolution Required:** These conflicts must be manually resolved before the PR can be merged into main. Consider whether to:
1. Keep the Toast/Modal implementation from main (better UX)
2. Merge both implementations together
3. Choose one approach consistently across both files

---

## 2. Security Issues

### 🔴 Critical: Avatar Storage Policy Vulnerabilities

#### Issue 1: Unrestricted Avatar Deletion (app/profile/page.tsx:64-65)
**Severity:** High  
**File:** `app/profile/page.tsx`  
**Lines:** 64-65

**Problem:**
```typescript
const oldPath = profile.avatar_url.split('/avatars/')[1]
if (oldPath) {
  await supabase.storage.from('avatars').remove([oldPath])
}
```

The avatar deletion logic doesn't validate that the user owns the avatar they're deleting. According to the storage policy, any authenticated user can delete any file in the 'avatars' bucket. This means a user could potentially delete another user's avatar.

**Risk:** A malicious user could delete other users' avatars by manipulating their profile data.

**Recommendation:**
```typescript
// Ensure the file being deleted belongs to the current user
if (oldPath && oldPath.startsWith(`${user.id}-`)) {
  await supabase.storage.from('avatars').remove([oldPath])
} else if (oldPath) {
  logger.warn?.('Attempted to delete non-owned avatar file skipped', { userId: user.id, oldPath })
}
```

#### Issue 2: Unrestricted Avatar Upload (app/profile/page.tsx:73-75)
**Severity:** High  
**File:** `app/profile/page.tsx`  
**Lines:** 73-75

**Problem:**
```typescript
const { error: uploadError } = await supabase.storage
  .from('avatars')
  .upload(fileName, file, { upsert: true })
```

The storage upload policy allows any authenticated user to upload files with any name to the 'avatars' bucket. This could allow users to overwrite other users' avatars by guessing or knowing their file names.

**Risk:** Users can overwrite other users' avatars, leading to data loss and potential security issues.

**Recommendation:** Restrict the upload policy to only allow users to upload files that start with their own user ID. Update Supabase storage policies:

```sql
-- Update storage policy
CREATE POLICY "Users can only upload their own avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND name LIKE auth.uid()::text || '-%'
);
```

---

## 3. Data Integrity Issues

### 🟡 Medium: Orphaned File Handling

#### Issue 3: No Rollback on Profile Update Failure (app/profile/page.tsx:94)
**Severity:** Medium  
**File:** `app/profile/page.tsx`  
**Lines:** 88-97

**Problem:**
If the profile update fails after a successful upload, the newly uploaded avatar file remains in storage but isn't linked to the profile. This creates orphaned files.

**Current Code:**
```typescript
if (updateError) {
  logger.error('Profile update error:', updateError)
  alert(`Failed to save: ${updateError.message}`)
  return
}
```

**Recommendation:**
```typescript
if (updateError) {
  logger.error('Profile update error:', updateError)
  // Roll back the newly uploaded avatar file to avoid orphaned files
  const { error: rollbackError } = await supabase.storage
    .from('avatars')
    .remove([fileName])
  if (rollbackError) {
    logger.error('Failed to roll back uploaded avatar:', rollbackError)
  }
  alert(`Failed to save: ${updateError.message}`)
  return
}
```

#### Issue 4: No Error Handling for Old Avatar Deletion (app/profile/page.tsx:65)
**Severity:** Low-Medium  
**File:** `app/profile/page.tsx`  
**Lines:** 64-66

**Problem:**
If the old avatar deletion fails, the new avatar is still uploaded and saved. This could leave orphaned files in storage over time.

**Recommendation:**
```typescript
const { error: deleteError } = await supabase.storage.from('avatars').remove([oldPath])
if (deleteError) {
  logger.error('Failed to delete old avatar:', deleteError)
}
```

---

## 4. Code Quality Issues

### 🟡 Medium: Username Uniqueness Check Flaws

#### Issue 5: Incorrect Error Handling (app/profile/edit/page.tsx:63-65)
**Severity:** Medium  
**File:** `app/profile/edit/page.tsx`  
**Lines:** 56-69

**Problem:**
The username uniqueness check logic is flawed. When an error occurs that is not 'PGRST116' (no rows), the function returns `!data`, which would be `true` (indicating unique) even if there was a database error.

**Current Code:**
```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('id')
  .eq('username', usernameToCheck)
  .neq('id', user?.id)
  .single()

if (error && error.code === 'PGRST116') {
  // No rows returned - username is unique
  return true
}

return !data  // ⚠️ Returns true on ANY error!
```

**Risk:** This could allow duplicate usernames if the query fails due to database errors, network issues, or other problems.

**Recommendation:**
```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('id')
  .eq('username', usernameToCheck)
  .neq('id', user?.id)
  .maybeSingle()  // Use maybeSingle() instead of single()

if (error) {
  if (error.code === 'PGRST116') {
    // No rows returned - username is unique
    return true
  }
  logger.error('Error checking username uniqueness:', error)
  return false  // Fail closed on errors
}

// data is null when no row is found (username is unique)
return !data
```

#### Issue 6: Use of `.single()` Instead of `.maybeSingle()` (app/profile/edit/page.tsx:61)
**Severity:** Low-Medium  
**File:** `app/profile/edit/page.tsx`  
**Line:** 61

**Problem:**
The username uniqueness check uses `.single()` which will throw an error if multiple rows are found. While unlikely due to database constraints, it's better to use `.maybeSingle()` to handle this case more explicitly.

**Recommendation:** Use `.maybeSingle()` as shown in Issue 5 fix.

---

## 5. User Experience Issues

### 🟡 Medium: Poor User Feedback Mechanisms

#### Issue 7: Using `alert()` Instead of Modern UI Components (app/profile/page.tsx:47-56)
**Severity:** Medium (UX)  
**File:** `app/profile/page.tsx`  
**Lines:** 47, 54, 79, 95, 120, 123

**Problem:**
The code uses native JavaScript `alert()` for user feedback, which is not ideal for a modern web application. This is especially problematic given that the main branch appears to have a Toast system already implemented.

**Current Code:**
```typescript
alert('Image too large. Maximum size is 5MB.')
alert('Invalid file type. Please use JPG, PNG, GIF, or WebP.')
alert(`Upload failed: ${uploadError.message}`)
alert(`Failed to save: ${updateError.message}`)
```

**Recommendation:** Use a toast notification system or proper modal component for better user experience and consistency with the rest of the application. The merge conflict indicates main branch has `useToast` and `Toast` components available.

#### Issue 8: Fragile Email Error Message Matching (app/profile/edit/page.tsx:87)
**Severity:** Low-Medium  
**File:** `app/profile/edit/page.tsx`  
**Lines:** 86-92

**Problem:**
The email validation logic checks if the error message includes 'already registered', but this relies on string matching which is fragile and may not work if Supabase changes their error messages.

**Current Code:**
```typescript
if (emailError.message.includes('already registered')) {
  setError('This email is already in use by another account.')
}
```

**Recommendation:** Check the error code instead for more robust error handling:
```typescript
if (emailError.code === 'EMAIL_EXISTS' || emailError.status === 422) {
  setError('This email is already in use by another account.')
}
```

---

## 6. Input Validation Issues

### 🟠 Low: Missing File Extension Validation

#### Issue 9: Unsafe File Extension Extraction (app/profile/page.tsx:70)
**Severity:** Low  
**File:** `app/profile/page.tsx`  
**Line:** 70

**Problem:**
The file extension extraction using `split('.').pop()` is unsafe if the file name has no extension. While the MIME type is checked, the extension should also be validated.

**Current Code:**
```typescript
const fileExt = file.name.split('.').pop()
const fileName = `${user.id}-${Date.now()}.${fileExt}`
```

**Risk:** If a file has no extension (e.g., "avatar"), `fileExt` could be "avatar" or undefined, leading to unusual filenames.

**Recommendation:**
```typescript
const fileExtParts = file.name.split('.')
const fileExt = fileExtParts.length > 1 && fileExtParts[fileExtParts.length - 1]
  ? fileExtParts[fileExtParts.length - 1]
  : 'bin'
const fileName = `${user.id}-${Date.now()}.${fileExt}`
```

---

## 7. Summary of Files Changed

### Modified Files in PR (4 total)

| File | Lines Changed | Issues Found | Severity |
|------|--------------|--------------|----------|
| `app/profile/page.tsx` | ~100 | 7 | 🔴 High |
| `app/profile/edit/page.tsx` | ~150 | 3 | 🟡 Medium |
| `contexts/AuthContext.tsx` | ~10 | 0 | ✅ Clean |
| `lib/types/database.ts` | ~5 | 0 | ✅ Clean |

### Files with Merge Conflicts (2 total)
- ❌ `app/profile/page.tsx` (CONFLICT)
- ❌ `app/profile/edit/page.tsx` (CONFLICT)

---

## 8. Required Actions Before Merge

### Immediate (Blocking)
1. ✅ **Resolve merge conflicts in both files**
   - Reconcile Toast vs Alert implementations
   - Merge or choose avatar upload logic
   - Ensure consistent approach across files

2. 🔴 **Fix Security Issues**
   - Issue #1: Add ownership validation for avatar deletion
   - Issue #2: Restrict upload policy in Supabase

### High Priority (Should Fix)
3. 🟡 **Fix Data Integrity Issues**
   - Issue #3: Add rollback on profile update failure
   - Issue #5: Fix username uniqueness check error handling

### Medium Priority (Recommended)
4. 🟡 **Improve User Experience**
   - Issue #7: Replace alert() with Toast system (resolve with merge)
   - Issue #4: Add logging for old avatar deletion failures

### Low Priority (Nice to Have)
5. 🟠 **Code Quality Improvements**
   - Issue #6: Use `.maybeSingle()` instead of `.single()`
   - Issue #8: Use error codes instead of message string matching
   - Issue #9: Add file extension validation

---

## 9. Database Migration Required

Before testing or merging this PR, the following SQL must be run in Supabase:

```sql
-- Add username column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Update storage policies for avatars (Security Fix)
DROP POLICY IF EXISTS "Anyone can upload an avatar." ON storage.objects;

CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND name LIKE auth.uid()::text || '-%'
);

DROP POLICY IF EXISTS "Avatar can be deleted" ON storage.objects;

CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND name LIKE auth.uid()::text || '-%'
);
```

---

## 10. Test Checklist (Updated with Issues)

Before marking this PR as ready:

- [ ] **Merge Conflicts**
  - [ ] Resolve conflicts in `app/profile/page.tsx`
  - [ ] Resolve conflicts in `app/profile/edit/page.tsx`
  - [ ] Decide on Toast vs Alert approach
  
- [ ] **Security Fixes**
  - [ ] Apply avatar deletion ownership check
  - [ ] Update Supabase storage policies
  - [ ] Test that users cannot delete other users' avatars
  - [ ] Test that users cannot overwrite other users' avatars
  
- [ ] **Data Integrity**
  - [ ] Add rollback logic for failed profile updates
  - [ ] Test rollback works correctly
  
- [ ] **Username Functionality**
  - [ ] Fix username uniqueness check error handling
  - [ ] Upload valid image < 5MB → succeeds, avatar updates
  - [ ] Try duplicate username → shows error
  - [ ] Username displays on profile page
  
- [ ] **Avatar Upload**
  - [ ] Upload image > 5MB → shows appropriate error
  - [ ] Upload non-image file → shows appropriate error
  - [ ] Check Supabase Storage → old avatars removed
  - [ ] Check Supabase Storage → no orphaned files on errors
  
- [ ] **Email Functionality**
  - [ ] Change email → shows "verification sent" message
  - [ ] Try duplicate email → shows appropriate error

---

## 11. Additional Notes

### Code Review Comments Addressed
All 10 issues identified in this report correspond to code review comments from `copilot-pull-request-reviewer[bot]`. Each issue includes:
- The specific file and line numbers
- The problem description
- The potential risk/impact
- A concrete recommendation for fixing

### Maintenance Recommendations
1. Consider implementing a file cleanup job to remove orphaned avatar files
2. Add monitoring for failed avatar operations
3. Implement rate limiting for avatar uploads
4. Add unit tests for username validation logic
5. Add integration tests for avatar upload/delete flows

---

## Document Version
- **Version:** 1.0
- **Generated:** 2026-01-21
- **Generated By:** GitHub Copilot
- **Last Updated:** 2026-01-21

---

**⚠️ This PR cannot be merged until merge conflicts are resolved and critical security issues are addressed.**
