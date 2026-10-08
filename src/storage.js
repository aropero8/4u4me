import { Preferences } from '@capacitor/preferences';

// En Android usa el almacenamiento nativo; en el navegador, localStorage.
const KEY = 'wishlist_items';

export async function loadItems() {
  try {
    const { value } = await Preferences.get({ key: KEY });
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

export async function saveItems(items) {
  await Preferences.set({ key: KEY, value: JSON.stringify(items) });
}
