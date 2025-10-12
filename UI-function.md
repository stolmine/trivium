This document represents specs for the UI.

Conventions: we want accessibilty and flexibility to be at the forefront of the UI design. A user should be able to do everything via mouse or keyboard with no gaps in navigation or functionality for either mode.

Overall UI will be sectioned as follows: 

Ingest section: a modal containing a text editor for manual input or copy/paste, it should also have a field for associating a link as well as other metadata (standard MLA bibliography format can be used to supply metadata fields), if the link is a wikipedia article the user can opt to parse the source automatically. Perhaps we could include pdf, epub, text file parsing as well?

Reading section: here the user can organize and read through their ingested text. On the left hand side we'll have a tree where the user can create folders to store ingested text objects, and navigate through them for reading in the main portion of this section. The nav tool should be resizable horizontally. The reading tool will have facility for marking sections as read. Any selected portion of text can be marked as read via context menu or hotkey. The program should be able to detect paragraphs, we will provide facility for selecting and moving through paragraphs via keyboard. The program will denote overall progress (measured in amount of text marked as read vs not, this allows for nonlinear reading as well as front to back progress). Collected text objects should be taggable so the user can create custom curricula to study.

Flashcard creation: I think this will be extendable to the right of the reading section. It should display whatever text has most recently been marked as read. The user can then select text within that subsection and right click or hotkey to produce a cloze deletion and thus a card. This leaves the question of how cards should be organized on the backend and how to make card organization and editing available to the user at the front end. Something to think about.

Study: This is the end goal of a user's journey through the software. This will be a separate page which replaces the rest of the UI (so users cannot sneak looks at their reading material). The user will be able to select portions of their created material to study: by article, by tag, by folder in the reading view, or just by schedule (new cards and any other cards due for review). The user can set limits on their total reviews and new cards per day. Look to anki for these specifics. We will use the anki grading system and hotkeys in this window.

Stats: a separate portion of the program where users can view their aggregated reading progress by article, tag, folder, or total collection. They can also view their flashcard scores with the same cross-sections.