/**
 * derive_recipe_ids.cjs
 * Derives recipe-item-ids.json (a flat array of item ids that have at least
 * one recipe) from recipes-per-item.json, so the app can build its isRecipe
 * search index without downloading the full 14.8MB recipes file on first load.
 *
 * Run standalone: node scripts/derive_recipe_ids.cjs
 * Also invoked at the end of update_data.cjs step 3.
 */
const fs = require('fs');
const path = require('path');

const APP_DATA_DIR = path.join(__dirname, '../public/data/gathering-log');
const RECIPES_PATH = path.join(APP_DATA_DIR, 'recipes-per-item.json');
const OUTPUT_PATH = path.join(APP_DATA_DIR, 'recipe-item-ids.json');

function deriveRecipeIds() {
    if (!fs.existsSync(RECIPES_PATH)) {
        console.error(`Missing ${RECIPES_PATH}; cannot derive recipe item ids.`);
        process.exitCode = 1;
        return;
    }

    const recipes = JSON.parse(fs.readFileSync(RECIPES_PATH, 'utf-8'));
    const ids = Object.keys(recipes)
        .filter(id => Array.isArray(recipes[id]) && recipes[id].length > 0)
        .map(Number)
        .filter(Number.isFinite)
        .sort((a, b) => a - b);

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(ids), 'utf-8');
    const sizeKb = (fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1);
    console.log(`Derived ${ids.length} recipe item ids -> recipe-item-ids.json (${sizeKb} KB)`);
}

deriveRecipeIds();

module.exports = { deriveRecipeIds };
