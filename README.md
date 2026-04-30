# Mystery Engine for Carved From Brindlewood Bay games

![Foundry v14](https://img.shields.io/badge/foundry-v14-green) [![Github All Releases](https://img.shields.io/github/downloads/MrTheBino/mystery-engine-fvtt/total.svg)]()

This is a **unofficial** system implementation for Carved From Brindlewood Bay.

Check out [The Gauntlet](https://www.gauntlet-rpg.com/) for their great TTRPG games!

This system works different than a normal FoundryVTT system for a specific
TTRPG system. Instead having a ready made character sheet where you simply
enter your attributes etc, you build a character sheet in this system.

It's easy and nearly the same amount of work in another system. You build a 
Public Access or The Between sheet in minutes.

The system provides an example character for reference and a compendium with a
small documentation.

The notebook app is for handling a session or campaign. You see an overview
of the characters, the threats and notes/page handling. Your players
can use the notebook too, but they are not able to alter it and they see
only stuff they should see like clues for threats etc.

## Features
 - Notebook for the GM to handle a campaign / session
 - Character & Threats sheets
 - different CSS styles like standard, 90ies, victorian etc.
  
## Supported games are

- The Between
- Public Access
- Brindlewood Bay
- any other game of the type of Brindlewood Bay

# Text styling of checklists

The checklist item supports bbCode styling

* [b] bold[/b]
 * [i] italic[/i]
 * [u] underline[/u]
 * [s] strikethough[/s]
 * [br] line break[/br]
 * [list] list item 1 [br] list item 2 [br] list item 3 [/list]

## Roadmap

- provide a victorian style for the user interface
- improved css styling
- finding all bugs ;)
  
## Manifest-URL for manual installation of the system

    https://github.com/MrTheBino/mystery-engine-fvtt/releases/latest/download/system.json


## Developer Commands

    npm run build # generates CSS from the sass files
    npm run unpack-compendium # generate json files from the compendiums
    npm run pack-compendium # generates compendiums fron the json files