<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { fetchData } from '@/utils';
import { SkinViewer, useSkinViewer } from '@daidr/minecraft-skin-renderer/vue3';
import { WebGLRendererPlugin } from "@daidr/minecraft-skin-renderer/webgl";

const socials = ref<Record<string, any>>({});

const { error } = useSkinViewer();

onMounted(async () => {
	socials.value = await fetchData('socials');
});
</script>

<template>
	<div class="flex flex-col h-full overflow-y-auto">
		<div class="p-8 flex flex-col md:flex-row gap-4 w-full justify-around items-center">
			<div class="flex items-center gap-8">
				<Tippy placement="bottom">
					<img class="w-12 h-12 md:w-14 md:h-14 rounded-full"
						src="https://assets.latedream.qzz.io/avatars/latedream/current.webp"
						@click="$router.push('/avatars')" />
					<template #content>
						<span>查看历史头像</span>
					</template>
				</Tippy>
				<div class="flex flex-col">
					<span class="text-2xl font-bold">
						晚梦
					</span>
					<span>LateDreamXD</span>
				</div>
			</div>
			<span class="flex gap-4 relative">
				<template v-if="socials" v-for="(item, id) of socials" :key="id">
					<Tippy placement="bottom" v-if="typeof item._hide === 'undefined' || !item._hide">
						<a :href="item.url" target="_blank" rel="noopener">
							<img :src="item.icon" class="w-6 h-6 drop-shadow-xs drop-shadow-white/20" />
						</a>
						<template #content>
							<span>{{ item.label }}</span>
						</template>
					</Tippy>
				</template>
			</span>
		</div>
		<div class="p-4 flex items-center justify-center">
			<SkinViewer v-if="!error" :plugins="[WebGLRendererPlugin]"
				cape="https://textures.minecraft.net/texture/308b32a9e303155a0b4262f9e5483ad4a22e3412e84fe8385a0bdd73dc41fa89"
				skin="https://textures.minecraft.net/texture/7054c9cf61f8a7d87d4d55b9c92901dc456a5eee4ca4b95d690dad16c4e09425"
				animation="idle" :rotation="{
					phi: 1.4,
					theta: -0.4
				}" slim style="width: 120px; height: 240px;" />
			<span class="p-4 h-fit font-bold bg-blue-400/20 rounded-sm">
				来之不易的，一定要好好珍惜。
			</span>
		</div>
		<span class="text-transparent text-center select-text" title="awa">这都被你发现了 awa</span>
	</div>
</template>
