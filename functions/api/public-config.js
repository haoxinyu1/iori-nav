// functions/api/public-config.js
import { jsonResponse } from '../_middleware';

/**
 * @summary Get public configuration settings
 * @route GET /api/public-config
 * @returns {Response} JSON response with public settings
 */
export async function onRequestGet({ env }) {
  // Check the environment variable. Convert to string to handle both boolean `true` from toml and string 'true' from secrets
  const submissionEnabled = String(env.ENABLE_PUBLIC_SUBMISSION) === 'true';

  // Get AI request delay, default to 1500ms if not set or invalid
  const aiRequestDelay = parseInt(env.AI_REQUEST_DELAY, 10);
  const validAiRequestDelay = !isNaN(aiRequestDelay) && aiRequestDelay > 0 ? aiRequestDelay : 1500;

  // Fetch dynamic settings from DB
  let layoutSettings = {
    layout_hide_desc: false,
    layout_hide_links: false,
    layout_hide_category: false,
    layout_hide_title: false,
    layout_hide_subtitle: false,
    layout_grid_cols: '4',
    layout_custom_wallpaper: '',
    layout_menu_layout: 'horizontal',
    layout_enable_frosted_glass: false,
    layout_frosted_glass_intensity: '15',
    layout_enable_bg_blur: false,
    layout_bg_blur_intensity: '0'
  };

  try {
    const { results } = await env.NAV_DB.prepare("SELECT key, value FROM settings WHERE key IN ('layout_hide_desc', 'layout_hide_links', 'layout_hide_category', 'layout_hide_title', 'layout_hide_subtitle', 'layout_grid_cols', 'layout_custom_wallpaper', 'layout_menu_layout', 'layout_enable_frosted_glass', 'layout_frosted_glass_intensity', 'layout_enable_bg_blur', 'layout_bg_blur_intensity')").all();
    if (results) {
      results.forEach(row => {
        // Store as boolean where appropriate, string for others
        if (row.key === 'layout_grid_cols' || row.key === 'layout_custom_wallpaper' || row.key === 'layout_menu_layout' || row.key === 'layout_frosted_glass_intensity' || row.key === 'layout_bg_blur_intensity') {
            layoutSettings[row.key] = row.value;
        } else {
            layoutSettings[row.key] = row.value === 'true';
        }
      });
    }
  } catch (e) {
    // Ignore error (e.g. table not exists), use defaults
  }

  return jsonResponse({
    submissionEnabled: submissionEnabled,
    aiRequestDelay: validAiRequestDelay,
    ...layoutSettings
  });
}