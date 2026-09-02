<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { fetchData } from '@/utils';
import { SkinViewer } from '@daidr/minecraft-skin-renderer/vue3';
import { WebGLRendererPlugin } from "@daidr/minecraft-skin-renderer/webgl";
import { HandCoinsIcon } from '@lucide/vue';

const show3DSkin = ref(false);
const socials = ref<Record<string, any>>({});

onMounted(async () => {
	socials.value = await fetchData('socials');
});
</script>

<template>
	<div class="flex flex-col h-full overflow-y-auto">
		<div class="p-8 flex flex-col md:flex-row gap-4 w-full justify-around items-center">
			<div class="flex items-center gap-8">
				<Tippy placement="bottom">
					<img class="w-12 h-12 md:w-14 md:h-14 rounded-full cursor-pointer"
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
							<img :src="item.icon" class="w-6 h-6 drop-shadow-xs drop-shadow-white/20"
								draggable="false" />
						</a>
						<template #content>
							<span>{{ item.label }}</span>
						</template>
					</Tippy>
				</template>
			</span>
		</div>
		<div class="p-4 flex flex-col">
			<div class="flex items-center justify-center">
				<Tippy placement="bottom">
					<img alt="oc-mc.png" class="w-30 h-30 hover:animate-tada cursor-pointer"
						style="image-rendering: pixelated;" v-if="!show3DSkin" src="/assets/oc-mc.png"
						@click="show3DSkin = true;" />
					<SkinViewer v-else :plugins="[WebGLRendererPlugin]"
						skin="https://textures.minecraft.net/texture/7054c9cf61f8a7d87d4d55b9c92901dc456a5eee4ca4b95d690dad16c4e09425"
						animation="idle" :rotation="{
							phi: 1.4,
							theta: -0.4
						}" slim style="width: 120px; height: 240px; cursor: pointer;"
						@click="show3DSkin = false;" />
					<template #content>
						<span>切换 {{ show3DSkin ? '2D 图片' : '3D 渲染' }}</span>
					</template>
				</Tippy>
				<div class="p-4 h-fit bg-blue-400/20 rounded-sm relative flex flex-col gap-4">
					<span class="font-bold">来之不易的，一定要好好珍惜。</span>
					<div>
						<router-link class="inline-flex gap-0.5 text-yellow-200 hover:underline" to="/sponsor"><HandCoinsIcon /> 投喂我</router-link>
					</div>
				</div>
			</div>
		</div>
		<span class="text-transparent text-center select-text">这都被你发现了 awa</span>
	</div>
</template>
