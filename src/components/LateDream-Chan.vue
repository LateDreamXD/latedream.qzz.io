<script setup lang="ts">
/**
 * LateDream-Chan.vue — 猫耳少女摸头挂件（pet-widget.src.js 的 Vue 3 重写）
 *
 * 用法：
 *   <LateDreamChan />                                   // 右下角常驻
 *   <LateDreamChan :scale="1.2" bubble="always" />
 *   <LateDreamChan @pet="payload => payload.text = '...'" />
 *
 * 事件：
 *   @pet   { line, text }                 一次摸头完成（按住松起 / 点击 / pet()）
 *                                         监听器里同步改 payload.text 会顶替台词泡内容
 *   @anvil { type, action, slot?, count? } 铁砧玩法（drop / land / squash / shatter / fling / free）
 *
 * 模板 ref 可用：
 *   pet() / say(text) / hide() / setAutoPet(on, seconds) / getAutoPet()
 *   / dropAnvil('anvil'|'chipped'|'damaged') / flingAll() / setScale(n) / getScale()
 *   / setLines(arr) / setOptions(patch)
 */
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { usePreferredReducedMotion } from '@vueuse/core';

defineOptions({ name: 'LateDreamChan' });

/* ---------- 类型 ---------- */
type AnvilType = 'anvil' | 'chipped' | 'damaged';
type BubbleMode = 'once' | 'always' | 'off';
type PetTrigger = 'release' | 'click';

interface AnvilSounds {
	drop?: string;
	break?: string;
	bounce?: string;
}

interface PetAssets {
	char?: string;
	bubble?: string;
	anvil?: string;
	chipped?: string;
	damaged?: string;
	sounds?: string[];
}

interface PetOptions {
	scale: number;
	bubble: BubbleMode;
	bounce: boolean;
	bounceStrength: number;
	speed: number;
	sound: boolean;
	anvilSquash: number;
	anvilScale: number;
	anvilOverlap: number;
	pressScale: number;
	menu: boolean;
	petTrigger: PetTrigger;
	autoPetInterval: number;
	anvilSounds: AnvilSounds | null;
	assets: PetAssets;
	lines: string[];
}

interface PetPayload {
	line: string | null;
	text: string | null;
}

interface AnvilPayload {
	type: AnvilType;
	action: 'drop' | 'land' | 'squash' | 'shatter' | 'fling' | 'free';
	slot?: number;
	count?: number;
}

interface AnvilItem {
	id: number;
	type: AnvilType;
	left: number;
	top: number;
	width: number;
	height: number;
	/** 弹飞时先要保持在的 translateY（完整铁砧压扁后不为 0） */
	fromY: number;
}

interface FragmentItem {
	id: number;
	left: number;
	top: number;
	width: number;
	height: number;
	clip: string;
	src: string;
}

interface HoldState {
	id: number;
	jelly: boolean;
}

/* ---------- 素材（public/assets/LateDream-Chan） ---------- */
const CHAR_PNG = '/assets/LateDream-Chan/char.png';
const BUBBLE_PNG = '/assets/LateDream-Chan/bubble.png';
const ANVIL_PNG = '/assets/LateDream-Chan/Anvil.png';
const CHIPPED_PNG = '/assets/LateDream-Chan/Chipped_Anvil.png';
const DAMAGED_PNG = '/assets/LateDream-Chan/Damaged_Anvil.png';
const DEFAULT_SOUNDS = ['/assets/LateDream-Chan/click-duck.wav'];
const ANVIL_BREAK_SRC = '/assets/LateDream-Chan/anvil-break.ogg';

/* ---------- 随机台词池（\n 手动换行，建议 ≤2 行 × ≤5 字） ---------- */
const DEFAULT_LINES = [
	'我的天\n吓哭了',
	'唔…头发\n要乱了啦',
	'再摸要\n变笨了哦',
	'摸一次\n五块钱',
	'今天也\n想摆烂',
	'诶嘿~',
	'你是不是\n很闲呀',
	'咪呜——',
	'不要摸\n呆毛！',
	'好舒服…\n再来一下',
	'哦豁',
	'哼，仅\n此一次',
	'困困的\n别闹啦',
	'阿巴\n阿巴',
	'行叭\n行叭',
	'大脑\n宕机了',
];

/* ---------- 尺寸（与原始素材比例对应） ---------- */
const ANVIL_W = 104;
const ANVIL_H = 128;
const ANVIL_L = 108;
const CHAR_H = 206;
const ROOT_H = 212;
const HIT_BOT = 76; // 判定点：底座压进头发的深度
const SINK = 36; // 压扁后铁砧沉入的深度
const JELLY_SQUASH_AT = 0.28; // 果冻压到最扁、马上回升的那一帧
const PRESS_DIP_MS = 115; // 裂纹铁砧下压到最低点

/* 定时弹跳间隔：0.1~1.0s，0.01s 一档 = 60~600BPM */
const FREQ_MIN = 0.1;
const FREQ_MAX = 1;
const FREQ_STEP = 0.01;

/* 碎裂剪切块（百分比多边形，六块） */
const SHARDS = [
	'polygon(0% 0%, 55% 0%, 40% 38%, 0% 30%)',
	'polygon(55% 0%, 100% 0%, 100% 42%, 62% 52%, 40% 38%)',
	'polygon(0% 30%, 40% 38%, 45% 70%, 12% 78%, 0% 62%)',
	'polygon(40% 38%, 62% 52%, 60% 78%, 45% 70%)',
	'polygon(62% 52%, 100% 42%, 100% 82%, 68% 88%, 60% 78%)',
	'polygon(12% 78%, 45% 70%, 60% 78%, 68% 88%, 40% 100%, 8% 96%)',
];

/* ---------- 菜单图标（静态 SVG，v-html 渲染） ---------- */
const ICON_EARS =
	'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
	'<path d="M3.6 2.6 9.9 6.1 4.3 10.5z"/>' +
	'<path d="M20.4 2.6 14.1 6.1 19.7 10.5z"/>' +
	'<ellipse cx="12" cy="14.6" rx="7.9" ry="6.7"/></svg>';

const ICON_CLOCK =
	'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
	'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.2v5l3.4 2"/></svg>';

const ICON_SLIDER =
	'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
	'<path d="M4 9h16M4 15h16"/><circle cx="9.5" cy="9" r="2.7" fill="currentColor" stroke="none"/>' +
	'<circle cx="15" cy="15" r="2.7" fill="currentColor" stroke="none"/></svg>';

const ICON_VOLUME =
	'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
	'<path d="M3.2 9.2h3.3l4.9-3.9v13.4l-4.9-3.9H3.2z" fill="currentColor" stroke="none"/>' +
	'<path d="M15.3 9.4a4.3 4.3 0 0 1 0 5.2"/>' +
	'<path d="M18.2 6.9a8.2 8.2 0 0 1 0 10.2"/></svg>';

const ICON_MUTED =
	'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
	'<path d="M3.2 9.2h3.3l4.9-3.9v13.4l-4.9-3.9H3.2z" fill="currentColor" stroke="none"/>' +
	'<path d="M15.4 9.6l5.2 4.8M20.6 9.6l-5.2 4.8"/></svg>';

const CRACK_CHIPPED = '<path class="pw-crack" d="M12.2 14.8l1.7 2.3-1.2 2.1"/>';
const CRACK_DAMAGED =
	'<path class="pw-crack" d="M10 14.8l1.6 2.2-1 2.2"/>' +
	'<path class="pw-crack" d="M15.2 15l-1.2 2 1.4 2"/>' +
	'<path class="pw-crack" d="M12.6 5.4h2.4l-1.3 2"/>';

function anvilIcon(cracks: string) {
	return (
		'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
		'<path d="M3.2 5.2 0 7.3l3.2 2.1z"/>' +
		'<rect x="3" y="5" width="15" height="4.6" rx="1.2"/>' +
		'<rect x="9" y="9.6" width="6" height="4.6"/>' +
		'<rect x="5" y="14.2" width="13.6" height="5" rx="1.2"/>' +
		cracks +
		'</svg>'
	);
}

const ICON_ANVIL = anvilIcon('');
const ICON_CHIPPED = anvilIcon(CRACK_CHIPPED);
const ICON_DAMAGED = anvilIcon(CRACK_DAMAGED);

/* ---------- 组件配置 ---------- */
const props = withDefaults(
	defineProps<{
		scale?: number;
		bubble?: BubbleMode;
		bounce?: boolean;
		bounceStrength?: number;
		speed?: number;
		sound?: boolean;
		anvilSquash?: number;
		anvilScale?: number;
		anvilOverlap?: number;
		pressScale?: number;
		menu?: boolean;
		petTrigger?: PetTrigger;
		autoPetInterval?: number;
		anvilSounds?: AnvilSounds | null;
		assets?: PetAssets;
		lines?: string[];
	}>(),
	{
		scale: 1,
		bubble: 'once',
		bounce: true,
		bounceStrength: 1,
		speed: 1,
		sound: true,
		anvilSquash: 0.35,
		anvilScale: 1,
		anvilOverlap: 2,
		pressScale: 0.75,
		menu: true,
		petTrigger: 'release',
		autoPetInterval: 0.5,
		anvilSounds: null,
		assets: () => ({}),
		lines: () => [],
	},
);

const emit = defineEmits<{
	(e: 'pet', payload: PetPayload): void;
	(e: 'anvil', payload: AnvilPayload): void;
}>();

/* ---------- 运行时配置（props + 菜单 / setOptions 的运行时覆盖） ---------- */
function clamp(n: number, lo: number, hi: number): number | null {
	n = Number(n);
	if (!Number.isFinite(n)) return null;
	return Math.min(hi, Math.max(lo, n));
}

const overrides = reactive<Partial<PetOptions>>({});

const settings = computed<PetOptions>(() => {
	const raw = { ...props, ...overrides } as PetOptions;
	return {
		...raw,
		scale: clamp(raw.scale, 0.4, 3) ?? 1,
		bounceStrength: clamp(raw.bounceStrength, 0.4, 1.5) ?? 1,
		speed: clamp(raw.speed, 0.4, 2.5) ?? 1,
		anvilSquash: clamp(raw.anvilSquash, 0.15, 0.85) ?? 0.35,
		anvilScale: clamp(raw.anvilScale, 0.5, 2) ?? 1,
		anvilOverlap: clamp(raw.anvilOverlap, -40, 80) ?? 2,
		pressScale: clamp(raw.pressScale, 0.5, 0.95) ?? 0.75,
		autoPetInterval: clamp(raw.autoPetInterval, FREQ_MIN, 3600) ?? 0.5,
		bubble: ['once', 'always', 'off'].includes(raw.bubble) ? raw.bubble : 'once',
		petTrigger: raw.petTrigger === 'click' ? 'click' : 'release',
		lines: raw.lines && raw.lines.length ? raw.lines : DEFAULT_LINES,
		assets: raw.assets ?? {},
		anvilSounds: raw.anvilSounds ?? null,
	};
});

const asset = computed(() => {
	const a = settings.value.assets;
	return {
		char: a.char || CHAR_PNG,
		bubble: a.bubble || BUBBLE_PNG,
		anvil: a.anvil || ANVIL_PNG,
		chipped: a.chipped || CHIPPED_PNG,
		damaged: a.damaged || DAMAGED_PNG,
		sounds: a.sounds && a.sounds.length ? a.sounds : DEFAULT_SOUNDS,
	};
});

function anvilSrc(type: AnvilType) {
	return type === 'chipped' ? asset.value.chipped : type === 'damaged' ? asset.value.damaged : asset.value.anvil;
}

/* ---------- DOM / 状态 ---------- */
const charEl = ref<HTMLButtonElement | null>(null);
const bubbleEl = ref<HTMLDivElement | null>(null);

const squashed = ref(false);
const pressed = ref(false);
const holding = ref(false);
const bubbleVisible = ref(false);
const bubbleText = ref('');
const bubbleFontSize = ref('17px');
const petted = ref(false);

const menuOpen = ref(false);
const cfgOpen = ref(false);
const autoOn = ref(false);

const anvils = ref<AnvilItem[]>([]);
const fragments = ref<FragmentItem[]>([]);
const anvilEls = new Map<number, HTMLElement>();
const fragmentEls = new Map<number, HTMLElement>();

const anvilStack = ref<AnvilItem[]>([]);
let pendingSlots = 0;

const reducedMotion = usePreferredReducedMotion();
let alive = true;
let seq = 0;
const nextId = () => ++seq;

/* ---------- 定时器集中管理，卸载时一次清干净 ---------- */
const timers = new Set<number>();

function later(fn: () => void, ms: number) {
	const id = window.setTimeout(() => {
		timers.delete(id);
		fn();
	}, ms);
	timers.add(id);
	return id;
}

function clearLater(id: number | null) {
	if (id === null) return;
	timers.delete(id);
	window.clearTimeout(id);
}

function clearAllTimers() {
	timers.forEach(id => window.clearTimeout(id));
	timers.clear();
}

/* ---------- 声音 ---------- */
let audioPool: HTMLAudioElement[] = [];
let audioPoolKey = '';
let halfAudio: HTMLAudioElement | null = null;
let halfTimer: number | null = null;

function ensurePool() {
	if (typeof Audio === 'undefined') return [];
	const srcs = asset.value.sounds;
	const key = srcs.join('\n');
	if (key !== audioPoolKey) {
		audioPool.forEach(a => {
			try {
				a.pause();
			} catch {}
		});
		audioPool = srcs.map(src => new Audio(src));
		audioPoolKey = key;
	}
	return audioPool;
}

function playSound() {
	if (!settings.value.sound) return;
	const list = ensurePool();
	if (!list.length) return;
	const a = list[Math.floor(Math.random() * list.length)];
	try {
		a.pause();
		a.currentTime = 0;
		a.playbackRate = 0.9 + Math.random() * 0.25; // 轻微随机音高
		void a.play().catch(() => {});
	} catch {
		/* 自动播放被拦截也不影响交互 */
	}
}

function stopSounds() {
	if (halfTimer !== null) {
		clearLater(halfTimer);
		halfTimer = null;
	}
	if (halfAudio) {
		try {
			halfAudio.pause();
		} catch {}
		halfAudio = null;
	}
	audioPool.forEach(a => {
		try {
			a.pause();
		} catch {}
	});
}

function now() {
	return window.performance && performance.now ? performance.now() : Date.now();
}

/* 抚摸音效只播一半就停住；盯着 currentTime，避免起播延迟导致停在 0 */
function playHalfSound() {
	halfAudio = null;
	if (!settings.value.sound) return;
	const list = ensurePool();
	if (!list.length) return;
	const a = list[Math.floor(Math.random() * list.length)];
	try {
		a.pause();
		a.currentTime = 0;
		a.playbackRate = 1;
		void a.play().catch(() => {});
		halfAudio = a;
	} catch {
		return;
	}
	const deadline = now() + 1500;
	const waitHalf = () => {
		halfTimer = null;
		if (halfAudio !== a) return;
		const dur = a.duration;
		const half = (Number.isFinite(dur) && dur > 0 ? dur : 0.2) * 0.5;
		const t = a.currentTime || 0;
		if (a.ended || t >= half || now() > deadline) {
			try {
				a.pause();
			} catch {}
			return;
		}
		halfTimer = later(waitHalf, 16);
	};
	halfTimer = later(waitHalf, 16);
}

function resumeHalfSound() {
	const a = halfAudio;
	halfAudio = null;
	if (!a) return;
	try {
		void a.play().catch(() => {});
	} catch {}
}

function playAnvilSound(kind: 'drop' | 'break' | 'bounce') {
	if (!settings.value.sound) return;
	const map = settings.value.anvilSounds || {};
	const url = map[kind] || (kind === 'break' ? ANVIL_BREAK_SRC : null);
	if (!url || typeof Audio === 'undefined') return;
	try {
		const a = new Audio(url);
		a.volume = 0.9;
		a.playbackRate = 0.94 + Math.random() * 0.12;
		void a.play().catch(() => {});
	} catch {}
}

/* ---------- 台词泡 ---------- */
let hideTimer: number | null = null;
let bubbleSeq = 0;

function fitFont(text: string) {
	/* 台词需被包含在泡内：按行数/长度自动缩字号 */
	const lines = text.split('\n');
	const maxLen = lines.reduce((m, l) => Math.max(m, l.length), 0);
	if (lines.length > 2 || maxLen > 7) return '12.5px';
	if (maxLen > 5) return '14px';
	return '17px';
}

async function showBubble(text: string) {
	const token = ++bubbleSeq;
	bubbleText.value = text;
	bubbleFontSize.value = fitFont(text);
	bubbleVisible.value = false;
	if (hideTimer !== null) {
		clearLater(hideTimer);
		hideTimer = null;
	}
	await nextTick();
	const el = bubbleEl.value;
	if (token !== bubbleSeq || !el) return;
	void el.offsetWidth; // 强制回流，连点也能重放弹出动画
	if (hideTimer !== null) clearLater(hideTimer);
	bubbleVisible.value = true;
	hideTimer = later(() => {
		if (token !== bubbleSeq) return;
		bubbleVisible.value = false;
		hideTimer = null;
	}, 2800);
}

function hideBubble() {
	bubbleSeq++;
	if (hideTimer !== null) {
		clearLater(hideTimer);
		hideTimer = null;
	}
	bubbleVisible.value = false;
}

/* ---------- 摸头 ---------- */
function pickLine() {
	const lines = settings.value.lines;
	return lines[Math.floor(Math.random() * lines.length)] ?? DEFAULT_LINES[0];
}

function finishPet(o: { bubble?: boolean } = {}) {
	const payload: PetPayload = { line: null, text: null };
	if (o.bubble !== false) {
		if (settings.value.bubble === 'always') {
			payload.line = pickLine();
		} else if (settings.value.bubble === 'once' && !petted.value) {
			petted.value = true;
			payload.line = pickLine();
		}
	}
	emit('pet', payload); // 监听器可同步改 payload.text 来指定本次台词
	const text = payload.text || payload.line;
	if (o.bubble !== false && text) showBubble(text);
}

let idleJelly: Animation | null = null;

function startJelly(): Animation | null {
	const btn = charEl.value;
	if (!btn || reducedMotion.value === 'reduce') return null;
	idleJelly?.cancel();
	const k = settings.value.bounceStrength;
	const anim = btn.animate(
		[
			{ transform: 'translateY(0) scale(1,1)', easing: 'cubic-bezier(.3,.55,.5,1)' },
			{
				transform: `translateY(${(12 * k).toFixed(2)}px) scale(${(1 + 0.16 * k).toFixed(3)}, ${(1 - 0.26 * k).toFixed(3)})`,
				easing: 'cubic-bezier(.28,.45,.35,1)',
				offset: JELLY_SQUASH_AT,
			},
			{ transform: 'translateY(0) scale(1,1)' },
		],
		{ duration: 620 / settings.value.speed, easing: 'linear' },
	);
	idleJelly = anim;
	anim.onfinish = () => {
		if (idleJelly === anim) idleJelly = null;
	};
	return anim;
}

function pet(o: { bubble?: boolean } = {}) {
	/* 一次性完整摸头（定时弹跳 / ref.pet() / petTrigger:'click' 用） */
	if (anvilStack.value.length) return false; // 被铁砧压住时不做摸头
	if (settings.value.bounce) startJelly();
	playSound();
	finishPet(o);
	return true;
}

function petHead() {
	if (anvilStack.value.length) {
		flingAll('free');
		return;
	}
	pet();
}

function onCharClick(e: MouseEvent) {
	/* 按住松起模式：鼠标/触摸的 click 已在 pointerup 里处理过（detail > 0），
	   这里只接键盘 Enter/Space 和辅助技术触发的激活（detail === 0） */
	if (settings.value.petTrigger === 'release' && e.detail > 0) return;
	petHead();
}

/* ---------- 按住松起 = 完成一次摸头 ----------
   按下：果冻停在「压到最扁、马上回升」那一帧 + 音效只放一半
   松起：果冻走完 + 放完剩下半段 + 这一刻才算完成一次摸头 */
let jellyAnim: Animation | null = null;
let jellyTimer: number | null = null;
let holdPress: HoldState | null = null;

function jellySquashMs(anim: Animation) {
	let dur = 620;
	try {
		const d = anim.effect?.getComputedTiming().duration;
		if (typeof d === 'number' && d > 0) dur = d;
	} catch {}
	return dur * JELLY_SQUASH_AT;
}

function holdJellySquash() {
	const anim = startJelly();
	jellyAnim = anim;
	if (jellyTimer !== null) {
		clearLater(jellyTimer);
		jellyTimer = null;
	}
	if (!anim) return false;
	const stopAt = jellySquashMs(anim);
	jellyTimer = later(
		() => {
			jellyTimer = null;
			if (jellyAnim !== anim) return;
			try {
				if (anim.playState === 'finished' || anim.playState === 'idle') return;
				anim.pause();
				anim.currentTime = stopAt;
			} catch {}
		},
		Math.max(stopAt - 8, 0),
	);
	return true;
}

function resumeJelly() {
	if (jellyTimer !== null) {
		clearLater(jellyTimer);
		jellyTimer = null;
	}
	const anim = jellyAnim;
	jellyAnim = null;
	if (!anim) return false;
	try {
		anim.play();
	} catch {
		return false;
	}
	return true;
}

function cancelJelly() {
	if (jellyTimer !== null) {
		clearLater(jellyTimer);
		jellyTimer = null;
	}
	const anim = jellyAnim ?? idleJelly;
	jellyAnim = null;
	idleJelly = null;
	if (anim) {
		try {
			anim.cancel();
		} catch {}
	}
	holding.value = false;
}

function beginHold(e: PointerEvent) {
	if (settings.value.petTrigger !== 'release') return;
	if (e.button != null && e.button !== 0) return; // 只认左键 / 单指
	const btn = charEl.value;
	if (!btn) return;
	holdPress = { id: e.pointerId, jelly: false };
	try {
		btn.setPointerCapture(e.pointerId); // 拖出角色再松手也算
	} catch {}
	if (anvilStack.value.length) return; // 被压住：按下不做任何事，松手 = 救援
	if (settings.value.bounce && holdJellySquash()) {
		holdPress.jelly = true; // 果冻走到一半停住 = 摸头做了一半
	} else {
		holding.value = true; // 拿不到动画时用静态压扁兜底
	}
	playHalfSound();
}

function endHold(e?: PointerEvent) {
	if (!holdPress) return;
	if (e && e.pointerId != null && e.pointerId !== holdPress.id) return;
	const held = holdPress;
	holdPress = null;
	if (anvilStack.value.length) {
		cancelJelly();
		flingAll('free'); // 松手 = 整堆弹飞
		return;
	}
	holding.value = false;
	if (held.jelly) resumeJelly();
	else cancelJelly();
	resumeHalfSound();
	finishPet({}); // 此刻才算完成一次摸头
}

function cancelHold() {
	holdPress = null;
	cancelJelly();
}

/* ---------- 铁砧玩法 ---------- */
function stackStep(h: number) {
	const overlap = clamp(h * 0.3 + settings.value.anvilOverlap, 0, h * 0.85) ?? 0;
	return h - overlap;
}

function emitAnvil(payload: AnvilPayload) {
	emit('anvil', payload);
}

function setAnvilEl(id: number, el: unknown) {
	if (el instanceof HTMLElement) anvilEls.set(id, el);
	else anvilEls.delete(id);
}

function setFragmentEl(id: number, el: unknown) {
	if (el instanceof HTMLElement) fragmentEls.set(id, el);
	else fragmentEls.delete(id);
}

function removeAnvil(id: number) {
	anvils.value = anvils.value.filter(item => item.id !== id);
	anvilEls.delete(id);
}

function dropAnvil(type: AnvilType | string = 'anvil') {
	const kind: AnvilType = type === 'chipped' || type === 'damaged' ? type : 'anvil';
	const a = settings.value.anvilScale;
	const w = ANVIL_W * a;
	const h = ANVIL_H * a;
	const step = stackStep(h);
	const baseBottom = ROOT_H - CHAR_H * settings.value.anvilSquash + SINK;
	const k = anvilStack.value.length + pendingSlots;
	/* 预测是否入堆：完整铁砧必入；裂纹/破损落在铁砧上才入堆（落地时按实际堆再确认） */
	const willStick = kind === 'anvil' || ((kind === 'chipped' || kind === 'damaged') && k > 0);
	if (willStick) pendingSlots++;
	const slotBottom = baseBottom - k * step;
	const fallBottom = k === 0 ? HIT_BOT : slotBottom; // 落点：判定点在头顶

	const item = reactive<AnvilItem>({
		id: nextId(),
		type: kind,
		left: ANVIL_L + (ANVIL_W - w) / 2,
		top: fallBottom - h,
		width: w,
		height: h,
		fromY: 0,
	});
	anvils.value.push(item); // 铁砧在上层，底座压进头顶
	playAnvilSound('drop');
	emitAnvil({ type: kind, action: 'drop', slot: k });

	void nextTick(() => {
		const el = anvilEls.get(item.id);
		if (!el) {
			if (willStick) pendingSlots--;
			return;
		}
		const fall = el.animate(
			[{ transform: 'translateY(-320px)' }, { transform: 'translateY(0)' }],
			{
				duration: reducedMotion.value === 'reduce' ? 1 : 430,
				easing: 'cubic-bezier(.42,0,.9,.5)',
				fill: 'forwards',
			},
		);
		fall.onfinish = () => {
			fall.cancel();
			if (willStick) pendingSlots--;
			if (kind === 'chipped' || kind === 'damaged') {
				/* 堆叠判断按落地瞬间的真实情况：下面是铁砧 → 入堆；下面是挂件 → 各自反应 */
				if (anvilStack.value.length > 0) {
					stickAnvil(item, fallBottom - h, baseBottom, step);
					emitAnvil({ type: kind, action: 'land' });
				} else if (kind === 'chipped') {
					playAnvilSound('bounce');
					emitAnvil({ type: 'chipped', action: 'fling' });
					pressAndFling(item);
				} else {
					shatter(item);
				}
				return;
			}
			if (anvilStack.value.length === 0) {
				const dy = squashByAnvil(el, baseBottom - fallBottom); // 撞头后压扁下沉
				item.fromY = dy;
				anvilStack.value.push(item);
			} else {
				stickAnvil(item, fallBottom - h, baseBottom, step);
			}
		};
	});
	return true;
}

/* 入堆：落到当前堆顶对应位置（预测偏差则就地归位） */
function stickAnvil(item: AnvilItem, currentTop: number, baseBottom: number, step: number) {
	const k = anvilStack.value.length;
	const targetTop = baseBottom - k * step - item.height;
	if (Math.abs(targetTop - currentTop) > 1) item.top = targetTop;
	item.fromY = 0;
	anvilStack.value.push(item);
}

/* 破损铁砧：自己碎掉（碎的同时播内建破碎音效） */
function shatter(item: AnvilItem) {
	const src = anvilSrc(item.type);
	playAnvilSound('break');
	emitAnvil({ type: 'damaged', action: 'shatter' });

	removeAnvil(item.id);
	const shards = SHARDS.map(clip =>
		reactive<FragmentItem>({
			id: nextId(),
			left: item.left,
			top: item.top,
			width: item.width,
			height: item.height,
			clip,
			src,
		}),
	);
	fragments.value.push(...shards);

	void nextTick(() => {
		shards.forEach((f, i) => {
			const el = fragmentEls.get(f.id);
			if (!el) {
				fragments.value = fragments.value.filter(x => x.id !== f.id);
				return;
			}
			const dir = i < 3 ? -1 : 1;
			const dx = dir * (40 + Math.random() * 70);
			const up = 30 + Math.random() * 60;
			const fall = 140 + Math.random() * 120;
			const rot = dir * (90 + Math.random() * 180);
			const anim = el.animate(
				[
					{ transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
					{
						transform: `translate(${dx * 0.5}px, ${-up}px) rotate(${rot * 0.5}deg)`,
						opacity: 1,
						offset: 0.32,
					},
					{ transform: `translate(${dx}px, ${fall}px) rotate(${rot}deg)`, opacity: 0 },
				],
				{ duration: 700 + Math.random() * 200, easing: 'ease-out', fill: 'forwards' },
			);
			anim.onfinish = () => {
				fragments.value = fragments.value.filter(x => x.id !== f.id);
			};
		});
	});
}

/* 直上弹飞（裂纹铁砧 / 整堆救援） */
function flingUp(item: AnvilItem) {
	const el = anvilEls.get(item.id);
	if (!el) {
		removeAnvil(item.id);
		return;
	}
	const anim = el.animate(
		[
			{ transform: `translateY(${item.fromY}px)`, easing: 'cubic-bezier(.15,.6,.45,1)' },
			{ transform: `translateY(${item.fromY - 820}px)` },
		],
		{ duration: 620, fill: 'forwards' },
	);
	el.animate([{ opacity: 1 }, { opacity: 1, offset: 0.72 }, { opacity: 0 }], {
		duration: 620,
		fill: 'forwards',
	});
	anim.onfinish = () => removeAnvil(item.id);
}

/* 裂纹铁砧砸到挂件：铁砧下压→弹起一条连贯曲线，挂件同步压一下再弹回 */
function pressAndFling(item: AnvilItem) {
	pressed.value = true;
	later(() => {
		pressed.value = false;
	}, 150);
	later(() => {
		if (alive) playSound(); // 反弹瞬间来一声小黄鸭
	}, PRESS_DIP_MS);

	const el = anvilEls.get(item.id);
	if (!el) {
		removeAnvil(item.id);
		return;
	}
	const anim = el.animate(
		[
			{ transform: 'translateY(0)', easing: 'cubic-bezier(.5,0,1,1)' },
			{ transform: 'translateY(16px)', easing: 'cubic-bezier(.15,.6,.45,1)', offset: 0.18 },
			{ transform: 'translateY(-820px)' },
		],
		{ duration: 640, fill: 'forwards' },
	);
	el.animate([{ opacity: 1 }, { opacity: 1, offset: 0.72 }, { opacity: 0 }], {
		duration: 640,
		fill: 'forwards',
	});
	anim.onfinish = () => removeAnvil(item.id);
}

/* 被压扁时点击角色：整堆直上弹飞 + 放完另一半音效 */
function flingAll(action: 'free' = 'free') {
	if (!anvilStack.value.length) return;
	squashed.value = false;
	resumeHalfSound();
	playAnvilSound('bounce');
	const snapshot = anvilStack.value.slice();
	emitAnvil({ type: 'anvil', action, count: snapshot.length });
	anvilStack.value = [];
	snapshot.forEach((item, i) => {
		later(() => flingUp(item), i * 70);
	});
}

/* 完整铁砧：把挂件压扁，抚摸音效播一半；返回铁砧需继续下沉的距离 */
function squashByAnvil(el: HTMLElement, dy: number) {
	squashed.value = true;
	el.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${dy}px)` }], {
		duration: 260,
		easing: 'cubic-bezier(.3,.7,.3,1)',
		fill: 'forwards',
	});
	if (!halfAudio) playHalfSound();
	emitAnvil({ type: 'anvil', action: 'squash' });
	return dy;
}

function cleanupAnvil() {
	anvils.value = [];
	fragments.value = [];
	anvilEls.clear();
	fragmentEls.clear();
	anvilStack.value = [];
	pendingSlots = 0;
	halfAudio = null;
	squashed.value = false;
	pressed.value = false;
	holding.value = false;
}

/* ---------- 小菜单 ---------- */
const muted = computed(() => !settings.value.sound);
const soundIcon = computed(() => (muted.value ? ICON_MUTED : ICON_VOLUME));
const soundLabel = computed(() => (muted.value ? '取消静音' : '静音'));
const freqLabel = computed(() => (Math.round(settings.value.autoPetInterval * 100) / 100).toFixed(2) + 's');
const bpmLabel = computed(() => {
	const s = settings.value.autoPetInterval;
	return (s > 0 ? Math.round(60 / s) : 0) + ' BPM';
});
const rangeValue = computed(() => String(clamp(settings.value.autoPetInterval, FREQ_MIN, FREQ_MAX) ?? FREQ_MIN));

let autoTimer: number | null = null;

function stopAuto() {
	if (autoTimer !== null) {
		window.clearInterval(autoTimer);
		autoTimer = null;
	}
}

function restartAuto() {
	stopAuto();
	if (autoOn.value) {
		autoTimer = window.setInterval(() => {
			pet({ bubble: false });
		}, settings.value.autoPetInterval * 1000);
	}
}

function setAutoPet(on: boolean, seconds?: number) {
	if (seconds != null) {
		const s = clamp(seconds, FREQ_MIN, 3600);
		if (s !== null) overrides.autoPetInterval = Math.round(s * 100) / 100;
	}
	autoOn.value = !!on;
	restartAuto();
	return autoOn.value;
}

/* 拖动条改间隔：更新配置 + 立即按新间隔重排定时器（开启中才重排） */
function applyFreq(v: number) {
	const s = clamp(v, FREQ_MIN, 3600);
	if (s === null) return null;
	const rounded = Math.round(s * 100) / 100; // 卡到 0.01s 精度
	overrides.autoPetInterval = rounded;
	return rounded;
}

function onRangeInput(e: Event) {
	applyFreq((e.target as HTMLInputElement).valueAsNumber);
}

function onRangeChange(e: Event) {
	applyFreq((e.target as HTMLInputElement).valueAsNumber);
	if (!autoOn.value) setAutoPet(true);
}

function toggleSound() {
	overrides.sound = !settings.value.sound;
	if (!settings.value.sound) stopSounds();
	else playSound(); // 取消静音时给一声，确认有声音了
	return settings.value.sound;
}

function onMenuItem(act: 'anvil' | 'chipped' | 'damaged' | 'auto' | 'sound') {
	if (act === 'auto') setAutoPet(!autoOn.value);
	else if (act === 'sound') toggleSound();
	else dropAnvil(act);
}

/* ---------- 运行时配置 ---------- */
function setScale(s: number) {
	const v = clamp(s, 0.4, 3);
	if (v !== null) overrides.scale = v;
	return settings.value.scale;
}

function setLines(arr: string[]) {
	if (arr && arr.length) overrides.lines = arr.slice();
}

function setOptions(patch: Partial<PetOptions> = {}) {
	Object.entries(patch).forEach(([key, value]) => {
		if (value === undefined) return;
		if (key === 'assets') {
			overrides.assets = { ...settings.value.assets, ...(value as PetAssets) };
		} else if (key === 'anvilSounds') {
			overrides.anvilSounds = { ...(settings.value.anvilSounds ?? {}), ...(value as AnvilSounds) };
		} else {
			(overrides as Record<string, unknown>)[key] = value;
		}
	});
}

function say(text: string) {
	if (text) showBubble(String(text));
}

/* ---------- 样式变量 ---------- */
const rootStyle = computed(() => {
	const k = settings.value.bounceStrength;
	return {
		transform: `scale(${settings.value.scale})`,
		'--pw-jelly-dy': `${(12 * k).toFixed(2)}px`,
		'--pw-jelly-sx': (1 + 0.16 * k).toFixed(3),
		'--pw-jelly-sy': (1 - 0.26 * k).toFixed(3),
		'--pw-anvil-squash': String(settings.value.anvilSquash),
		'--pw-press-scale': String(settings.value.pressScale),
	};
});

/* ---------- 监听 / 清理 ---------- */
watch(
	() => settings.value.autoPetInterval,
	() => {
		if (autoOn.value) restartAuto();
	},
);

watch(
	() => settings.value.sound,
	on => {
		if (!on) stopSounds();
	},
);

onBeforeUnmount(() => {
	alive = false;
	stopAuto();
	stopSounds();
	clearAllTimers();
	cancelJelly();
	cleanupAnvil();
});

defineExpose({
	pet,
	say,
	hide: hideBubble,
	setAutoPet,
	getAutoPet: () => ({ on: autoOn.value, interval: settings.value.autoPetInterval }),
	dropAnvil,
	flingAll,
	setScale,
	getScale: () => settings.value.scale,
	setLines,
	setOptions,
});
</script>

<template>
	<Teleport to="body">
		<div id="pet-widget" class="pw-root" :style="rootStyle">
			<!-- 思考泡（原表情包气泡图 + 文案叠在椭圆中心） -->
			<div ref="bubbleEl" class="pw-say" :class="{ 'pw-show': bubbleVisible }">
				<img :src="asset.bubble" alt="" draggable="false" />
				<div class="pw-text" :style="{ fontSize: bubbleFontSize }">{{ bubbleText }}</div>
			</div>

			<!-- 角色 -->
			<button
				ref="charEl"
				class="pw-char"
				type="button"
				aria-label="摸摸头"
				:class="{ 'pw-squashed': squashed, 'pw-pressed': pressed, 'pw-holding': holding }"
				@click="onCharClick"
				@pointerdown="beginHold"
				@pointerup="endHold"
				@pointercancel="cancelHold"
			>
				<img :src="asset.char" alt="猫耳少女" draggable="false" />
			</button>

			<!-- 铁砧（完整=压扁可堆叠 / 裂纹=直上弹飞 / 破损=碎掉） -->
			<div
				v-for="item in anvils"
				:key="item.id"
				:ref="el => setAnvilEl(item.id, el)"
				class="pw-anvil"
				:style="{
					left: `${item.left}px`,
					top: `${item.top}px`,
					width: `${item.width}px`,
					height: `${item.height}px`,
				}"
			>
				<img :src="anvilSrc(item.type)" alt="" draggable="false" />
			</div>

			<!-- 破碎的铁砧碎片 -->
			<div
				v-for="fragment in fragments"
				:key="fragment.id"
				:ref="el => setFragmentEl(fragment.id, el)"
				class="pw-frag"
				:style="{
					left: `${fragment.left}px`,
					top: `${fragment.top}px`,
					width: `${fragment.width}px`,
					height: `${fragment.height}px`,
					clipPath: fragment.clip,
				}"
			>
				<img :src="fragment.src" alt="" draggable="false" />
			</div>

			<!-- 小菜单：角色右上角猫耳圆球，向下伸展功能条 -->
			<div v-if="settings.menu" class="pw-menu" :class="{ 'pw-open': menuOpen }">
				<button class="pw-ball" type="button" aria-label="菜单" v-html="ICON_EARS" @click="menuOpen = !menuOpen" />
				<div class="pw-bar">
					<div
						class="pw-item"
						role="button"
						tabindex="0"
						title="完整铁砧"
						aria-label="完整铁砧"
						v-html="ICON_ANVIL"
						@click="onMenuItem('anvil')"
						@keydown.enter.prevent="onMenuItem('anvil')"
						@keydown.space.prevent="onMenuItem('anvil')"
					/>
					<div
						class="pw-item"
						role="button"
						tabindex="0"
						title="裂纹铁砧"
						aria-label="裂纹铁砧"
						v-html="ICON_CHIPPED"
						@click="onMenuItem('chipped')"
						@keydown.enter.prevent="onMenuItem('chipped')"
						@keydown.space.prevent="onMenuItem('chipped')"
					/>
					<div
						class="pw-item"
						role="button"
						tabindex="0"
						title="破损铁砧"
						aria-label="破损铁砧"
						v-html="ICON_DAMAGED"
						@click="onMenuItem('damaged')"
						@keydown.enter.prevent="onMenuItem('damaged')"
						@keydown.space.prevent="onMenuItem('damaged')"
					/>
					<div
						class="pw-item"
						role="button"
						tabindex="0"
						title="定时弹跳"
						aria-label="定时弹跳"
						:class="{ 'pw-active': autoOn }"
						:aria-pressed="autoOn ? 'true' : 'false'"
						v-html="ICON_CLOCK"
						@click="onMenuItem('auto')"
						@keydown.enter.prevent="onMenuItem('auto')"
						@keydown.space.prevent="onMenuItem('auto')"
					/>
					<div
						class="pw-item"
						role="button"
						tabindex="0"
						:class="{ 'pw-sub-open': cfgOpen }"
						title="定时弹跳间隔（0.1~1.0s，0.01s 一档，0.5s≈120BPM）"
						aria-label="定时弹跳间隔"
						@click="cfgOpen = !cfgOpen"
						@keydown.enter.prevent="cfgOpen = !cfgOpen"
						@keydown.space.prevent="cfgOpen = !cfgOpen"
					>
						<span class="pw-icon" v-html="ICON_SLIDER" />
						<div class="pw-sub" @click.stop @keydown.stop>
							<input
								class="pw-range"
								type="range"
								aria-label="定时弹跳间隔"
								:min="FREQ_MIN"
								:max="FREQ_MAX"
								:step="FREQ_STEP"
								:value="rangeValue"
								@input="onRangeInput"
								@change="onRangeChange"
							/>
							<span class="pw-val">{{ freqLabel }}</span>
							<span class="pw-bpm">{{ bpmLabel }}</span>
						</div>
					</div>
				</div>
				<div
					class="pw-item pw-mute"
					role="button"
					tabindex="0"
					:class="{ 'pw-active': muted }"
					:title="soundLabel"
					:aria-label="soundLabel"
					:aria-pressed="muted ? 'true' : 'false'"
					v-html="soundIcon"
					@click="onMenuItem('sound')"
					@keydown.enter.prevent="onMenuItem('sound')"
					@keydown.space.prevent="onMenuItem('sound')"
				/>
			</div>
		</div>
	</Teleport>
</template>

<style scoped>
.pw-root {
	position: fixed;
	right: 0;
	bottom: 0;
	z-index: 2147483000;
	width: 232px;
	height: 212px;
	pointer-events: none;
	transform-origin: 100% 100%;
	font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif;
	-webkit-font-smoothing: antialiased;
}

/* ---- 角色 ---- */
.pw-char {
	position: absolute;
	right: 0;
	bottom: 0;
	margin: 0;
	padding: 0;
	border: 0;
	background: transparent;
	width: 232px;
	line-height: 0;
	cursor: pointer;
	pointer-events: auto;
	transform-origin: 100% 100%;
	will-change: transform;
	transition: transform 0.26s cubic-bezier(0.2, 0.7, 0.3, 1);
	-webkit-tap-highlight-color: transparent;
}

.pw-char img {
	width: 100%;
	height: auto;
	display: block;
	user-select: none;
	-webkit-user-drag: none;
	-webkit-user-select: none;
}

.pw-char:hover {
	filter: brightness(1.05);
}

.pw-char:focus-visible {
	outline: 3px solid #b67ca0;
	outline-offset: 2px;
	border-radius: 12px;
}

/* 按住状态兜底（拿不到动画时用）：姿势和果冻「压到最扁」那一帧完全一致 */
.pw-char.pw-holding {
	transform: translateY(var(--pw-jelly-dy, 12px))
		scale(var(--pw-jelly-sx, 1.16), var(--pw-jelly-sy, 0.74));
	transition-duration: 0.12s;
}

.pw-char.pw-squashed {
	transform: scaleY(var(--pw-anvil-squash, 0.35));
}

.pw-char.pw-pressed {
	transform: scaleY(var(--pw-press-scale, 0.85));
	transition-duration: 0.13s;
}

/* ---- 思考泡 ---- */
.pw-say {
	position: absolute;
	left: -46px;
	top: -172px;
	width: 240px;
	height: 210px;
	transform: scale(0);
	transform-origin: 47% 94%;
	transition:
		opacity 0.16s ease,
		transform 0.16s ease;
	opacity: 0;
}

.pw-say.pw-show {
	transform: scale(1);
	opacity: 1;
	transition:
		opacity 0.18s ease,
		transform 0.42s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.pw-say img {
	position: absolute;
	left: 0;
	top: 0;
	width: 240px;
	height: 210px;
	user-select: none;
	-webkit-user-drag: none;
}

.pw-text {
	position: absolute;
	left: 40px;
	top: 39px;
	width: 160px;
	height: 81px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #262833;
	font-size: 17px;
	font-weight: 800;
	line-height: 1.32;
	text-align: center;
	white-space: pre-line;
}

/* ---- 铁砧 / 碎片 ---- */
.pw-anvil {
	position: absolute;
	pointer-events: none;
	will-change: transform;
}

.pw-anvil img {
	width: 100%;
	height: 100%;
	display: block;
	user-select: none;
	-webkit-user-drag: none;
}

.pw-frag {
	position: absolute;
	will-change: transform, opacity;
}

.pw-frag img {
	width: 100%;
	height: 100%;
	display: block;
	user-select: none;
	-webkit-user-drag: none;
}

/* ---- 小菜单 ---- */
.pw-menu {
	position: absolute;
	left: -10px;
	top: 10px;
	pointer-events: auto;
}

.pw-ball {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	background: #262833;
	border: 0;
	padding: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	color: #fff;
	box-shadow: 0 2px 8px rgba(38, 40, 51, 0.35);
}

.pw-ball :deep(svg) {
	width: 18px;
	height: 18px;
	display: block;
}

.pw-bar {
	position: absolute;
	right: 2px;
	top: 38px;
	display: flex;
	flex-direction: column;
	gap: 5px;
}

.pw-item {
	position: relative;
	box-sizing: border-box;
	width: 28px;
	height: 28px;
	border-radius: 50%;
	background: #fefefe;
	border: 2.5px solid #262833;
	padding: 0;
	cursor: pointer;
	color: #262833;
	user-select: none;
	display: flex;
	align-items: center;
	justify-content: center;
	opacity: 0;
	transform: translateY(-10px) scale(0.5);
	transform-origin: 50% 0;
	transition:
		opacity 0.18s ease,
		transform 0.24s cubic-bezier(0.34, 1.4, 0.64, 1);
	pointer-events: none;
	font-family: inherit;
}

.pw-item :deep(svg) {
	width: 16px;
	height: 16px;
	display: block;
}

.pw-icon {
	display: flex;
}

.pw-item :deep(.pw-crack) {
	stroke: #fefefe;
	fill: none;
	stroke-width: 1.5;
	stroke-linecap: round;
}

.pw-item.pw-active {
	background: #262833;
	color: #fff;
}

.pw-item.pw-active :deep(.pw-crack) {
	stroke: #262833;
}

/* 静音按钮：第二列，和第一个按钮同一行，从圆球方向弹出来 */
.pw-mute {
	position: absolute;
	left: 38px;
	top: 40px;
	transform: translateX(10px) scale(0.5);
	transform-origin: 100% 50%;
}

.pw-menu.pw-open .pw-item {
	opacity: 1;
	transform: none;
	pointer-events: auto;
}

.pw-menu.pw-open .pw-mute {
	transition-delay: 0.02s;
}

.pw-menu.pw-open .pw-bar .pw-item:nth-child(1) {
	transition-delay: 0.06s;
}

.pw-menu.pw-open .pw-bar .pw-item:nth-child(2) {
	transition-delay: 0.1s;
}

.pw-menu.pw-open .pw-bar .pw-item:nth-child(3) {
	transition-delay: 0.14s;
}

.pw-menu.pw-open .pw-bar .pw-item:nth-child(4) {
	transition-delay: 0.18s;
}

.pw-menu.pw-open .pw-bar .pw-item:nth-child(5) {
	transition-delay: 0.22s;
}

/* ---- 间隔拖动条（向左弹出小面板） ---- */
.pw-sub {
	position: absolute;
	right: calc(100% + 8px);
	top: 50%;
	margin-top: -16px;
	display: flex;
	align-items: center;
	gap: 6px;
	box-sizing: border-box;
	height: 32px;
	padding: 0 9px;
	background: #fefefe;
	border: 2.5px solid #262833;
	border-radius: 16px;
	box-shadow: 0 2px 8px rgba(38, 40, 51, 0.18);
	opacity: 0;
	transform: translateX(10px) scale(0.85);
	transform-origin: 100% 50%;
	transition:
		opacity 0.18s ease,
		transform 0.24s cubic-bezier(0.34, 1.4, 0.64, 1);
	pointer-events: none;
}

.pw-item.pw-sub-open .pw-sub {
	opacity: 1;
	transform: none;
	pointer-events: auto;
}

.pw-range {
	-webkit-appearance: none;
	appearance: none;
	width: 82px;
	height: 16px;
	margin: 0;
	background: transparent;
	cursor: pointer;
}

.pw-range::-webkit-slider-runnable-track {
	height: 5px;
	border-radius: 3px;
	background: #e2dde6;
}

.pw-range::-webkit-slider-thumb {
	-webkit-appearance: none;
	appearance: none;
	width: 13px;
	height: 13px;
	margin-top: -4px;
	border: 0;
	border-radius: 50%;
	background: #262833;
}

.pw-range::-moz-range-track {
	height: 5px;
	border-radius: 3px;
	background: #e2dde6;
}

.pw-range::-moz-range-thumb {
	width: 13px;
	height: 13px;
	border: 0;
	border-radius: 50%;
	background: #262833;
}

.pw-val {
	font-size: 11px;
	font-weight: 800;
	color: #262833;
	min-width: 32px;
	text-align: right;
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
}

.pw-bpm {
	font-size: 10px;
	font-weight: 700;
	color: #8d879a;
	min-width: 44px;
	text-align: right;
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
	flex: 0 0 auto;
}

@media (prefers-reduced-motion: reduce) {
	.pw-char {
		transition: none !important;
	}

	.pw-say {
		transition: opacity 0.2s ease !important;
		transform: none !important;
	}

	.pw-menu,
	.pw-item,
	.pw-sub {
		transition: none !important;
	}
}
</style>
