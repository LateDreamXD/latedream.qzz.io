<script setup lang="ts">
import { ref, useTemplateRef, onMounted } from 'vue';
import { useLocalStorage } from '@vueuse/core';
import bgm from '@/data/bgm.json';
import { MusicIcon, PlayIcon, PauseIcon, VolumeIcon, Volume1Icon, Volume2Icon, VolumeXIcon } from '@lucide/vue';

const isPlaying = ref(false);
const isMuted = ref(false);
const bgmIndex = useLocalStorage('bgmIndex', 0);
const bgmVolume = useLocalStorage('bgmVolume', 0.1);
const audio = useTemplateRef('audio');

const play = () => audio.value?.play();
const pause = () => audio.value!.pause();
const changeVolumeByWheel = (e: WheelEvent) => {
	const { deltaY } = e;
	if(!isMuted || (!deltaY || deltaY === 0)) return;
	if(deltaY === -100 && bgmVolume.value < 1) bgmVolume.value += 0.1;
	if(deltaY === 100 && bgmVolume.value > 0) bgmVolume.value -= 0.1;
	bgmVolume.value = Math.floor(bgmVolume.value * 10) / 10;
	audio.value!.volume = bgmVolume.value;
}

onMounted(() => {
	audio.value!.volume = bgmVolume.value;
});
</script>

<template>
	<div id="player"
		class="bg-black/25 text-white/75 border border-white/20 backdrop-blur-sm p-4 rounded-md fixed top-1 right-1 translate-x-[90%] hover:translate-x-0 transition-transform flex gap-2 items-center">
		<audio ref="audio" id="bgm-player" :src="bgm[bgmIndex].file" :muted="isMuted" loop autoplay class="hidden" hidden @play="isPlaying = true" @pause="isPlaying = false"></audio>
		<div id="info">
			<MusicIcon class="inline animate-slow" :class="{ 'animate-spin': isPlaying }" />
			<span class="ml-2">
				<span class="text-white">{{ bgm[bgmIndex].title }}</span>
				<small class="ml-2">{{ bgm[bgmIndex].artist }}</small>
			</span>
		</div>
		<div id="controls">
			<Tippy placement="bottom">
				<button class="hover:opacity-60 transition-opacity" v-if="!isPlaying" type="button" @click="play">
					<PlayIcon />
				</button>
				<button class="hover:opacity-60 transition-opacity" v-else type="button" @click="pause">
					<PauseIcon />
				</button>
				<template #content>
					{{ isPlaying? '暂停': '播放' }}
				</template>
			</Tippy>
		</div>
		<hr class="w-px h-4 bg-current/75" />
		<div id="extra-controls">
			<Tippy placement="bottom">
				<button class="hover:opacity-60 transition-opacity" type="button" @click="isMuted = !isMuted" @wheel="changeVolumeByWheel">
					<template v-if="!isMuted">
						<Volume2Icon v-if="bgmVolume > 0.5" />
						<Volume1Icon v-else-if="bgmVolume > 0" />
						<VolumeIcon v-else />
					</template>
					<VolumeXIcon v-else />
				</button>
				<template #content>
					{{ isMuted? '已静音': `音量: ${ bgmVolume * 100 }%` }}
				</template>
			</Tippy>
		</div>
	</div>
</template>