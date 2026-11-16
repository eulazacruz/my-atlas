/* Ponte com o Android (Capacitor). No navegador tudo vira no-op. */
import { Capacitor, registerPlugin } from '@capacitor/core';

export const isNative = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

export interface Cutout {
  hasCutout: boolean;
  /** retângulo do furo da câmera em px físicos */
  left: number;
  top: number;
  right: number;
  bottom: number;
  density: number;
}

interface AtlasNativePlugin {
  getCutout(): Promise<Cutout>;
  updateWidgets(opts: { data: string }): Promise<void>;
  hasFirebase(): Promise<{ value: boolean }>;
  setImmersive(opts: { enabled: boolean }): Promise<void>;
}
export const AtlasNative = registerPlugin<AtlasNativePlugin>('AtlasNative');

export async function haptic(kind: 'light' | 'medium' | 'success' | 'warning' = 'light') {
  if (!isNative()) {
    try {
      navigator.vibrate?.(kind === 'light' ? 8 : kind === 'medium' ? 18 : [10, 40, 18]);
    } catch { /* noop */ }
    return;
  }
  const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
  if (kind === 'success') return Haptics.notification({ type: NotificationType.Success });
  if (kind === 'warning') return Haptics.notification({ type: NotificationType.Warning });
  return Haptics.impact({ style: kind === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light });
}

export async function getCutout(): Promise<Cutout | null> {
  if (!isNative()) return null;
  try {
    return await AtlasNative.getCutout();
  } catch {
    return null;
  }
}

/** Envia um retrato dos dados para os widgets da tela inicial. */
let lastWidgetPayload = '';
export async function pushWidgetData(data: unknown) {
  if (!isNative()) return;
  const json = JSON.stringify(data);
  if (json === lastWidgetPayload) return;
  lastWidgetPayload = json;
  try {
    await AtlasNative.updateWidgets({ data: json });
  } catch (e) {
    console.warn('widgets', e);
  }
}

/* ───────── Notificações locais ───────── */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!isNative()) {
    if (typeof Notification === 'undefined') return false;
    if (Notification.permission === 'granted') return true;
    return (await Notification.requestPermission()) === 'granted';
  }
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const cur = await LocalNotifications.checkPermissions();
  if (cur.display === 'granted') return true;
  const res = await LocalNotifications.requestPermissions();
  return res.display === 'granted';
}

let notifSeq = 1000;
export async function notifyNow(title: string, body: string) {
  if (!isNative()) {
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.visibilityState !== 'visible') new Notification(title, { body, icon: '/icons/icon-192.png' });
    } catch { /* noop */ }
    return;
  }
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  await LocalNotifications.schedule({ notifications: [{ id: notifSeq++, title, body, smallIcon: 'ic_stat_atlas' }] });
}

export interface Scheduled { id: number; title: string; body: string; at: Date }
/** Reagenda todos os lembretes locais (água, eventos, ciclo, sono…). */
export async function scheduleLocal(list: Scheduled[]) {
  if (!isNative()) return;
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const pending = await LocalNotifications.getPending();
  const ours = pending.notifications.filter((n) => n.id < 900000);
  if (ours.length) await LocalNotifications.cancel({ notifications: ours.map((n) => ({ id: n.id })) });
  const future = list.filter((n) => n.at.getTime() > Date.now() + 5000).slice(0, 60);
  if (future.length)
    await LocalNotifications.schedule({
      notifications: future.map((n) => ({ id: n.id, title: n.title, body: n.body, schedule: { at: n.at, allowWhileIdle: true }, smallIcon: 'ic_stat_atlas' })),
    });
}

/* ───────── Push (Firebase) ───────── */
export async function registerPush(onToken: (t: string) => void) {
  if (!isNative()) return false;
  try {
    const { value } = await AtlasNative.hasFirebase();
    if (!value) return false;
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') return false;
    await PushNotifications.addListener('registration', (t) => onToken(t.value));
    await PushNotifications.register();
    return true;
  } catch (e) {
    console.warn('push', e);
    return false;
  }
}

/* ───────── Deep links (login e ações dos widgets) ───────── */
export async function onDeepLink(cb: (url: string) => void) {
  if (!isNative()) return () => {};
  const { App } = await import('@capacitor/app');
  const h = await App.addListener('appUrlOpen', ({ url }) => cb(url));
  const launch = await App.getLaunchUrl();
  if (launch?.url) cb(launch.url);
  return () => h.remove();
}

export async function openExternal(url: string) {
  if (!isNative()) {
    window.location.href = url;
    return;
  }
  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url, presentationStyle: 'fullscreen', toolbarColor: '#000000' });
}
export async function closeExternal() {
  if (!isNative()) return;
  const { Browser } = await import('@capacitor/browser');
  try {
    await Browser.close();
  } catch { /* noop */ }
}

/** Botão voltar do Android → histórico do app. */
export async function onBackButton(cb: () => void) {
  if (!isNative()) return () => {};
  const { App } = await import('@capacitor/app');
  const h = await App.addListener('backButton', () => cb());
  return () => h.remove();
}

/* ───────── Localização ───────── */
export async function ensureLocationPermission(background = false): Promise<boolean> {
  if (!isNative()) {
    if (!navigator.geolocation) return false;
    return new Promise((res) => navigator.geolocation.getCurrentPosition(() => res(true), () => res(false), { timeout: 15000 }));
  }
  try {
    const { Geolocation } = await import('@capacitor/geolocation');
    const cur = await Geolocation.checkPermissions();
    if (cur.location === 'granted') return true;
    const r = await Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] });
    void background;
    return r.location === 'granted' || r.coarseLocation === 'granted';
  } catch (e) {
    console.warn('geo', e);
    return false;
  }
}

export async function permissionState(): Promise<{ notif: string; geo: string }> {
  if (!isNative()) {
    const notif = typeof Notification === 'undefined' ? 'indisponível' : Notification.permission;
    let geo = 'prompt';
    try { geo = (await navigator.permissions.query({ name: 'geolocation' as PermissionName })).state; } catch { /* noop */ }
    return { notif, geo };
  }
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const { Geolocation } = await import('@capacitor/geolocation');
    const n = await LocalNotifications.checkPermissions();
    const g = await Geolocation.checkPermissions();
    return { notif: n.display, geo: g.location };
  } catch {
    return { notif: '?', geo: '?' };
  }
}
