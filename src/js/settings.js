/**
 * settings.js - 应用设置管理
 * 使用 localStorage 持久化，支持默认值和变更监听
 */

const SETTINGS_KEY = 'ainote-settings';

const DEFAULTS = {
  autoRender: true,
  theme: 'light',
  fontSize: 16,
  lineNumbers: true,
  editorMode: false,
  plantUmlServer: 'auto',
  plantUmlCustomServer: '',
};

class Settings {
  constructor() {
    this._listeners = [];
    this._data = { ...DEFAULTS };
    this._load();
  }

  get(key) {
    return this._data[key] ?? DEFAULTS[key];
  }

  set(key, value) {
    this._data[key] = value;
    this._save();
    this._notify({ key, value });
  }

  update(partial) {
    Object.assign(this._data, partial);
    this._save();
    this._notify(partial);
  }

  reset() {
    this._data = { ...DEFAULTS };
    this._save();
    this._notify(this._data);
  }

  getAll() {
    return { ...this._data };
  }

  onChange(fn) {
    this._listeners.push(fn);
  }

  _load() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        Object.assign(this._data, parsed);
      }
    } catch (e) {
      console.warn('[AINote] 设置加载失败，使用默认值');
    }
  }

  _save() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this._data));
    } catch (e) {
      console.warn('[AINote] 设置保存失败');
    }
  }

  _notify(change) {
    for (const fn of this._listeners) {
      try { fn(change, this._data); } catch (e) {}
    }
  }
}

const settings = new Settings();
export default settings;
export { DEFAULTS };
