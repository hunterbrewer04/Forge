# Claude Code Pre-Commit Security Hook

This hook automatically prevents common security issues from entering your codebase before commits are made.

## What It Does

The pre-commit hook runs **automatically** when Claude Code attempts to execute a `git commit` command. It performs the following security checks:

### 🚫 **BLOCKING Errors** (Exit Code 2 - Commit Prevented)

1. **`.env` File Detection**
   - Blocks commits containing any `.env` file variations (`.env`, `.env.local`, `.env.development`, etc.)
   - Prevents accidental credential exposure to git history

2. **Exposed Credentials Detection**
   - Scans for hardcoded API keys, tokens, and passwords
   - Detects patterns including:
     - Supabase JWT tokens (`eyJ...`)
     - OpenAI API keys (`sk-...`)
     - GitHub tokens (`ghp_...`)
     - Google API keys (`AIza...`)
     - Hardcoded passwords
     - API keys in code

### ⚠️ **WARNING** (Non-blocking - Commit Allowed)

3. **Console.log Statements**
   - Warns about debug logging in production code
   - Suggests removal or proper logging framework

4. **TypeScript `any` Types**
   - Warns about new uses of the `any` type
   - Encourages proper type safety

5. **Unsafe Supabase Patterns**
   - Detects database queries without visible auth context
   - Reminds developers to verify RLS policies

## Installation

### Step 1: Copy Files to Your Project

Copy the following files into your Claude Code project:

```
your-project/
├── .claude/
│   ├── settings.json          # Hook configuration
│   └── hooks/
│       └── pre-commit-security.sh  # The actual hook script
```

### Step 2: Make the Script Executable

```bash
chmod +x .claude/hooks/pre-commit-security.sh
```

### Step 3: Test the Hook

Try committing a file with an exposed credential:

```bash
# Create a test file with a fake API key
echo "const key = 'sk-1234567890abcdefghijklmnopqrstuv'" > test.ts

# Stage and try to commit
git add test.ts
git commit -m "test"
```

**Expected result:** The hook should **block** the commit and show an error.

## How It Works

When Claude Code is about to execute a `git commit` command:

1. **Hook Trigger**: The `PreToolUse` hook intercepts the Bash tool
2. **Command Check**: The script checks if it's a git commit command
3. **File Scan**: Analyzes all staged files for security issues
4. **Decision**:
   - **Exit 0**: All checks passed → Commit proceeds
   - **Exit 2**: Blocking error found → Commit prevented, error sent to Claude

## Example Output

### ❌ Blocked Commit (Credential Found)

```
🔒 Running pre-commit security checks...
Checking for .env files...
Scanning for exposed credentials...
❌ ERROR: Potential credential detected in config.ts
   Pattern: anonKey[[:space:]]*:[[:space:]]*["']eyJ
   Action: Review and remove exposed credentials
  anonKey: '**REDACTED**.**REDACTED**.**REDACTED**'

❌ COMMIT BLOCKED: Security issues must be fixed first
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### ✅ Successful Commit (No Issues)

```
🔒 Running pre-commit security checks...
Checking for .env files...
Scanning for exposed credentials...
Checking for console.log statements...
Checking for new TypeScript 'any' types...
Checking for unsafe Supabase query patterns...

✅ All security checks passed
```

## Configuration

The hook is configured in `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/pre-commit-security.sh",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

### Options:

- **`matcher`**: `"Bash"` - Only runs on bash commands (like `git commit`)
- **`timeout`**: `30` - Maximum 30 seconds for the hook to complete
- **`command`**: Path to the script (uses `$CLAUDE_PROJECT_DIR` to ensure it works regardless of Claude's current directory)

## Customization

### Add Custom Patterns

Edit `.claude/hooks/pre-commit-security.sh` and add patterns to the `PATTERNS` array:

```bash
declare -a PATTERNS=(
  "YOUR_CUSTOM_PATTERN_HERE"
  "another-pattern"
  # ... existing patterns
)
```

### Disable Specific Checks

Comment out sections you don't need:

```bash
# ============================================================================
# CHECK 3: Detect console.log statements in production code
# ============================================================================
# echo "Checking for console.log statements..."
# ... rest of the check code ...
```

### Change Warnings to Blocking Errors

To make console.log detection **block** commits instead of just warning:

```bash
if grep -E 'console\.(log|debug|info)' "$FILE" > /dev/null 2>&1; then
  echo -e "${RED}❌ ERROR: console.log found in $FILE${NC}" >&2
  ERRORS_FOUND=1  # Add this line to block
fi
```

## Troubleshooting

### Hook Doesn't Run

1. Check file permissions:
   ```bash
   ls -la .claude/hooks/pre-commit-security.sh
   ```
   Should show `-rwxr-xr-x` (executable)

2. Verify the settings.json file exists:
   ```bash
   cat .claude/settings.json
   ```

3. Test the hook manually:
   ```bash
   echo "git commit -m 'test'" | ./.claude/hooks/pre-commit-security.sh
   ```

### Hook Times Out

Increase the timeout in `.claude/settings.json`:

```json
{
  "timeout": 60  // Increase to 60 seconds
}
```

### False Positives

If the hook incorrectly flags safe code:

1. Check which pattern triggered
2. Adjust the pattern in the script
3. Or add an exception for specific files

## Integration with Other Tools

This hook works alongside:

- **ESLint**: Hook runs first, then ESLint can run
- **Prettier**: Format after security checks pass
- **TypeScript**: Type checking happens separately
- **Other hooks**: Multiple hooks can run in sequence

## Benefits

✅ **Prevents credential leaks** before they reach git history  
✅ **Catches issues early** in the development cycle  
✅ **Zero manual intervention** - runs automatically  
✅ **Fast feedback** - Claude sees errors immediately  
✅ **Consistent enforcement** - same checks every time  

## Next Steps

After setting up the pre-commit hook, consider adding:

1. **Post-commit hooks** - Run tests after successful commits
2. **Custom commands** - `/fix-security`, `/audit-quick`, etc.
3. **Pre-push hooks** - Final validation before pushing to remote

## Related Files

- **settings.json**: Hook configuration
- **pre-commit-security.sh**: The security check script (this is what actually runs)

## Support

For issues or questions:
1. Check the Claude Code hooks documentation: https://docs.claude.com/en/docs/claude-code/hooks
2. Review the script output for specific errors
3. Test manually to isolate the issue

---

**Remember:** This hook is your first line of defense against security issues. It runs automatically every time Claude tries to commit code, giving you peace of mind that credentials won't leak into your repository.
