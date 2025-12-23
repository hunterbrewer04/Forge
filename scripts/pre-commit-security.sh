#!/bin/bash

# Pre-Commit Security Hook for Forge App
# Prevents common security issues from entering the codebase
# Exit code 0 = Allow, Exit code 2 = Block with error to Claude

# Read the command from STDIN (provided by Claude Code)
read -r COMMAND

# Only run on git commit commands
if [[ ! "$COMMAND" =~ ^git[[:space:]]+commit ]]; then
  exit 0
fi

# Color codes for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "🔒 Running pre-commit security checks..."

# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

if [ -z "$STAGED_FILES" ]; then
  echo "✅ No files staged for commit"
  exit 0
fi

# Initialize error flag
ERRORS_FOUND=0

# ============================================================================
# CHECK 1: Block .env file commits
# ============================================================================
echo "Checking for .env files..."
if echo "$STAGED_FILES" | grep -E '\.env(\.|$|\.local|\.development|\.production)' > /dev/null; then
  echo -e "${RED}❌ ERROR: .env file detected in commit${NC}" >&2
  echo -e "${RED}   Files: $(echo "$STAGED_FILES" | grep -E '\.env')${NC}" >&2
  echo -e "${YELLOW}   Action: Remove .env files from staging:${NC}" >&2
  echo -e "${YELLOW}   git reset HEAD .env*${NC}" >&2
  ERRORS_FOUND=1
fi

# ============================================================================
# CHECK 2: Detect exposed API keys and credentials
# ============================================================================
echo "Scanning for exposed credentials..."

# Patterns to check for exposed secrets
declare -a PATTERNS=(
  "SUPABASE_ANON_KEY[[:space:]]*=[[:space:]]*[\"']eyJ"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY[[:space:]]*=[[:space:]]*[\"']eyJ"
  "anonKey[[:space:]]*:[[:space:]]*[\"']eyJ"  # JavaScript/TypeScript object
  "eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}"  # JWT tokens
  "sk-[a-zA-Z0-9]{32,}"  # OpenAI-style keys
  "ghp_[a-zA-Z0-9]{36}"   # GitHub tokens
  "AIza[0-9A-Za-z-_]{35}" # Google API keys
  "password[[:space:]]*=[[:space:]]*[\"'][^\"']{8,}"
  "apiKey[[:space:]]*:[[:space:]]*[\"'][a-zA-Z0-9]{20,}"
)

for FILE in $STAGED_FILES; do
  # Skip binary files, images, package-lock.json
  if [[ "$FILE" =~ \.(jpg|jpeg|png|gif|webp|pdf|zip|tar|gz)$ ]] || [[ "$FILE" == "package-lock.json" ]]; then
    continue
  fi
  
  # Check if file exists (it might be deleted)
  if [ ! -f "$FILE" ]; then
    continue
  fi
  
  for PATTERN in "${PATTERNS[@]}"; do
    if grep -iE "$PATTERN" "$FILE" > /dev/null 2>&1; then
      echo -e "${RED}❌ ERROR: Potential credential detected in $FILE${NC}" >&2
      echo -e "${RED}   Pattern: $PATTERN${NC}" >&2
      echo -e "${YELLOW}   Action: Review and remove exposed credentials${NC}" >&2
      # Show the line (but redact the actual value)
      grep -iE "$PATTERN" "$FILE" | head -1 | sed 's/[a-zA-Z0-9]\{8\}[a-zA-Z0-9]*/**REDACTED**/g' >&2
      ERRORS_FOUND=1
      break
    fi
  done
done

# ============================================================================
# CHECK 3: Detect console.log statements in production code
# ============================================================================
echo "Checking for console.log statements..."

for FILE in $STAGED_FILES; do
  # Only check TypeScript/JavaScript files
  if [[ ! "$FILE" =~ \.(ts|tsx|js|jsx)$ ]]; then
    continue
  fi
  
  # Skip if file doesn't exist
  if [ ! -f "$FILE" ]; then
    continue
  fi
  
  # Check for console.log (but allow console.error, console.warn)
  if grep -E 'console\.(log|debug|info)' "$FILE" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  WARNING: console.log found in $FILE${NC}" >&2
    echo -e "${YELLOW}   Lines:${NC}" >&2
    grep -n 'console\.(log|debug|info)' "$FILE" | head -3 >&2
    echo -e "${YELLOW}   Recommendation: Remove debug logs or use proper logging${NC}" >&2
    # Don't block, just warn
  fi
done

# ============================================================================
# CHECK 4: Prevent new TypeScript 'any' types
# ============================================================================
echo "Checking for new TypeScript 'any' types..."

for FILE in $STAGED_FILES; do
  # Only check TypeScript files
  if [[ ! "$FILE" =~ \.(ts|tsx)$ ]]; then
    continue
  fi
  
  # Skip if file doesn't exist
  if [ ! -f "$FILE" ]; then
    continue
  fi
  
  # Check for 'any' type declarations
  ANY_COUNT=$(grep -E ':\s*any\b|<any>|any\[\]|Array<any>' "$FILE" | wc -l)
  
  if [ "$ANY_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  WARNING: TypeScript 'any' type found in $FILE ($ANY_COUNT occurrences)${NC}" >&2
    echo -e "${YELLOW}   Lines:${NC}" >&2
    grep -n -E ':\s*any\b|<any>|any\[\]|Array<any>' "$FILE" | head -3 >&2
    echo -e "${YELLOW}   Recommendation: Replace 'any' with specific types${NC}" >&2
    # Don't block, just warn
  fi
done

# ============================================================================
# CHECK 5: Validate RLS-safe Supabase patterns
# ============================================================================
echo "Checking for unsafe Supabase query patterns..."

for FILE in $STAGED_FILES; do
  # Only check TypeScript/JavaScript files
  if [[ ! "$FILE" =~ \.(ts|tsx|js|jsx)$ ]]; then
    continue
  fi
  
  # Skip if file doesn't exist
  if [ ! -f "$FILE" ]; then
    continue
  fi
  
  # Check for direct database access without RLS consideration
  # Pattern: supabase.from().select() without auth check context
  if grep -E 'supabase\.from.*\.select\(\)' "$FILE" > /dev/null 2>&1; then
    # This is a heuristic - check if the file has auth/user context
    if ! grep -E '(getUser|user\.id|session|auth\(\))' "$FILE" > /dev/null 2>&1; then
      echo -e "${YELLOW}⚠️  WARNING: Supabase query without visible auth context in $FILE${NC}" >&2
      echo -e "${YELLOW}   Ensure RLS policies are enabled and queries filter by user${NC}" >&2
    fi
  fi
done

# ============================================================================
# FINAL DECISION
# ============================================================================

if [ "$ERRORS_FOUND" -eq 1 ]; then
  echo -e "\n${RED}❌ COMMIT BLOCKED: Security issues must be fixed first${NC}" >&2
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" >&2
  exit 2  # Exit code 2 = blocking error, Claude will see the stderr
else
  echo -e "\n${GREEN}✅ All security checks passed${NC}"
  exit 0  # Exit code 0 = success, commit can proceed
fi
