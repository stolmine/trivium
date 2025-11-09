# Test Blockquote with Read Highlighting

This is a test to verify that blockquotes remain visually continuous even when parts are marked as read.

## Example 1: Multi-line blockquote

Here's some regular text before the blockquote.

> This is the first line of the blockquote.
> This is the second line of the blockquote.
> This is the third line of the blockquote.
> This is the fourth line of the blockquote.

Here's some text after the blockquote.

## Example 2: Blockquote with links

> This blockquote contains a [link to Wikipedia](https://en.wikipedia.org).
> And this line has another [link](https://example.com).
> Final line without a link.

## Test Instructions

1. Open this document in Trivium
2. Mark the SECOND line of the first blockquote as read (just that one line)
3. Verify that the blockquote visual structure remains continuous (all four lines should appear as ONE blockquote, not three separate ones)
4. The read portion should have black background with white text (or appropriate dark mode styling)
5. The unread portions should have normal blockquote styling

**Expected Result**: ONE continuous blockquote with mixed read/unread highlighting
**Previous Bug**: THREE separate blockquotes (line 1 | line 2 in read span | lines 3-4)
