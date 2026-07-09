#!/usr/bin/env bash
# Test Discovery Validator
# Ensures new test files are discoverable and use the expected test framework.
# Run before committing new tests: ./scripts/validate-tests.sh
#
# Adapt the patterns below to match your project's conventions:
#   TEST_FILE_PATTERN — glob for test files
#   DISCOVERABLE_DIRS — directories the test runner scans
#   FORBIDDEN_IMPORT  — import pattern that indicates wrong framework
#   REQUIRED_IMPORT   — import pattern that confirms correct framework

set -e

TEST_FILE_PATTERN=("*.test.ts" "*.test.tsx" "*.spec.ts")
DISCOVERABLE_DIRS=("tests/" "lib/" "src/")
FORBIDDEN_IMPORT="@jest/globals\|from.*jest\|import.*jest"
REQUIRED_IMPORT="from [\"']node:test[\"']"

echo "Validating test discoverability..."

# Find all test files
test_files=""
for pattern in "${TEST_FILE_PATTERN[@]}"; do
  found=$(find . -name "$pattern" | grep -v node_modules | grep -v ".claude/worktrees" | sort)
  test_files="${test_files}${found}"$'\n'
done
test_files=$(echo "$test_files" | sed '/^$/d')

if [ -z "$test_files" ]; then
  echo "No test files found."
  exit 0
fi

echo "Found test files:"
echo "$test_files" | sed 's/^/  - /'

echo ""
echo "Checking test framework usage..."
invalid_tests=0

while IFS= read -r file; do
  [ -z "$file" ] && continue
  if grep -qE "$FORBIDDEN_IMPORT" "$file" 2>/dev/null; then
    echo "FAIL $file uses a forbidden test framework import"
    invalid_tests=$((invalid_tests + 1))
  elif grep -qE "$REQUIRED_IMPORT" "$file" 2>/dev/null; then
    echo "OK   $file"
  fi
done <<< "$test_files"

echo ""
echo "Checking test discoverability..."
discoverable=0
undiscoverable=0

while IFS= read -r file; do
  [ -z "$file" ] && continue
  path="${file#./}"
  found_in_dir=false
  for dir in "${DISCOVERABLE_DIRS[@]}"; do
    if [[ "$path" == "${dir}"* ]]; then
      found_in_dir=true
      break
    fi
  done
  if $found_in_dir; then
    discoverable=$((discoverable + 1))
  else
    echo "WARN $file is not in a discoverable directory (${DISCOVERABLE_DIRS[*]})"
    undiscoverable=$((undiscoverable + 1))
  fi
done <<< "$test_files"

echo ""
echo "Test Validation Summary:"
echo "  Framework issues:     $invalid_tests"
echo "  Discoverability gaps: $undiscoverable"

if [ $invalid_tests -eq 0 ] && [ $undiscoverable -eq 0 ]; then
  echo "All tests are valid and discoverable."
  exit 0
else
  echo "Test validation found issues. Fix the items above."
  exit 1
fi
