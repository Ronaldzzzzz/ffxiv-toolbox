# FF14 Gathering Log Icon Retrieval Analysis

This document outlines how icons are retrieved and handled in the **FFXIV Gathering Log** project.

## Overview

The icons displayed in the web interface are not stored locally but are linked directly from an external API (CafeMaker). The `items.json` file serves as the data source for the frontend, containing the direct URLs to these icons.

## Retrieval Process

The icon URLs are generated and updated via the python script `GatheringLog/update_data.py`. The process involves the following steps:

1.  **Item Identification:**
    *   The script reads `items.json` to get the list of items.
    *   It uses the **Garland Tools API** to search for the item's internal Game ID based on its English name.
    *   **API Endpoint:** `https://www.garlandtools.org/api/search.php?text={NAME}&type=item`

2.  **Data Fetching:**
    *   Once the Game ID is obtained, the script queries the **CafeMaker API** for item details.
    *   **API Endpoint:** `https://cafemaker.wakingsands.com/item/{GAME_ID}`

3.  **Icon URL Extraction:**
    *   The CafeMaker API response contains an `Icon` field (e.g., `/i/020000/020001.png`).
    *   The script constructs the full URL by prepending the base domain.
    *   **Format:** `https://cafemaker.wakingsands.com{Icon_Path}`

4.  **Storage:**
    *   The full URL is saved into the `icon` field of the corresponding item object in `items.json`.
    *   Example entry in `items.json`:
        ```json
        {
          "id": "iron_ore",
          "icon": "https://cafemaker.wakingsands.com/i/020000/020001.png",
          ...
        }
        ```

## Frontend Display

*   **File:** `GatheringLog/index.html`
*   The frontend fetches `items.json` during initialization.
*   It renders the icon using a standard HTML `<img>` tag, setting the `src` attribute to the URL stored in the JSON data.
    ```html
    <img src="${item.icon}" ...>
    ```

## External Dependencies

The icon retrieval relies on the availability of the following external services:
1.  **Garland Tools** (`www.garlandtools.org`) - For resolving Item IDs.
2.  **CafeMaker** (`cafemaker.wakingsands.com`) - For hosting and serving the icon images.
