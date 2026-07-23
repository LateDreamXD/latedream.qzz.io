<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ArrowLeftIcon } from '@lucide/vue';

const route = useRoute();

const title = ref('关于我');
const fullTitle = computed(() => `晚梦的个人页~ *2.0 | ${title.value}`);

watch(() => route.meta, newVal => {
	if(newVal.title) title.value = newVal.title as string;
	document.title = fullTitle.value;
});
</script>

<template>
	<div class="fixed flex flex-col w-full h-fit top-[50%] translate-y-[-50%] md:w-[50%] md:h-[50%] md:left-[50%] md:translate-[-50%] *:[div]:shadow *:[div]:shadow-[#141414]/20 *:select-none">
		<div class="bg-[#5a5a5a]/25 text-white border border-white/18 backdrop-blur-xl rounded-t-md flex justify-between items-center p-2">
			<span v-if="route.name === 'About'">{{ fullTitle }}</span>
			<span v-else class="inline-flex gap-2">
				<button class="hover:opacity-65 transition-opacity cursor-pointer" @click="$router.back()">
					<ArrowLeftIcon />
				</button>
				{{ fullTitle }}
			</span>
			<span class="flex items-center gap-2 *:[button]:hover:cursor-pointer *:[button]:disabled:cursor-not-allowed">
				<button class="bg-[#64C355] w-4 h-4 rounded-full" disabled />
				<button class="bg-[#F3C153] w-4 h-4 rounded-full" disabled />
				<button class="bg-[#F1695A] w-4 h-4 rounded-full" disabled />
			</span>
		</div>
		<div class="bg-black/25 text-amber-50/90 border border-white/20 backdrop-blur-md border-t-0 rounded-b-md flex-1 overflow-hidden">
			<router-view v-slot="{ Component, route }">
				<component :is="Component" :key="route.path" />
			</router-view>
		</div>
	</div>

	<footer class="fixed bottom-1 left-1 right-1 text-white">
		<div class="flex flex-col">
			<a class="text-blue-300 hover:underline" href="https://icp.gov.moe/?keyword=20241144" target="_blank" rel="noopener">萌ICP备20241144号</a>
			<span>&copy; 2026 晚梦，保留所有权利</span>
		</div>
	</footer>
</template>