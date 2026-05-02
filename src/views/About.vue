<script setup lang="ts">
import { onMounted } from 'vue';
import socials from '@/data/socials.json';

onMounted(() => {
});
</script>

<template>
	<div class="flex flex-col w-[50%] h-[50%] fixed left-[50%] top-[50%] translate-[-50%] *:[div]:shadow *:[div]:shadow-[#141414]/20">
		<div class="bg-[#5a5a5a]/25 text-white border border-white/18 backdrop-blur-xl rounded-t-md flex justify-between items-center p-2">
			<span class="title">晚梦</span>
			<span class="flex items-center gap-2 *:[button]:hover:cursor-pointer *:[button]:disabled:cursor-not-allowed">
				<button class="bg-[#64C355] w-4 h-4 rounded-full" title="最小化" disabled />
				<button class="bg-[#F3C153] w-4 h-4 rounded-full" title="最大化" disabled />
				<button class="bg-[#F1695A] w-4 h-4 rounded-full" title="关闭" />
			</span>
		</div>
		<div class="bg-black/25 text-amber-50/90 border border-white/20 backdrop-blur-md border-t-0 rounded-b-md flex-1">
			<div class="p-4">
				<img class="w-24 h-24 rounded-full" src="https://assets.latedream.qzz.io/avatars/latedream/current.webp" />
				<span class="text-2xl font-bold mt-2">晚梦</span>
			</div>
			<div>
				<template v-for="item in socials" :key="item.platform">
					<span v-if="typeof item._hide || item._hide" class="flex items-center gap-2">
						<i v-if="typeof item.icon === 'string' || item.icon.type === 'fa'" class="w-6 h-6 icon-solid" :class="typeof item.icon === 'string'? item.icon: item.icon.name" />
						<img v-else :src="item.icon.url" class="w-6 h-6" />
					</span>
				</template>
			</div>
		</div>
	</div>
</template>
