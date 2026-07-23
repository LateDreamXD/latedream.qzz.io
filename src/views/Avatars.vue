<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { component as viewer } from 'v-viewer';
import { fetchData } from '@/utils';
import { InfoIcon } from '@lucide/vue';

const base_url = 'https://assets.latedream.qzz.io/avatars/latedream/';
const avatars = ref();

onMounted(async () => {
	avatars.value = await fetchData('avatars');
});
</script>

<template>
	<div class="p-4 overflow-y-auto h-full">
		<span class="p-2 inline-flex items-center gap-2 bg-gray-800 rounded-sm">
			<InfoIcon /> 所有附件均以
			<a class="text-blue-500 hover:underline" href="https://creativecommons.org/licenses/by-nc/4.0/">CC BY-NC
				4.0</a>
			协议许可
		</span>

		<div class="not-last:mb-4" v-for="(list, key) of avatars" :key="key">
			<span class="font-bold text-lg">{{ list._name }}</span>
			<viewer class="flex gap-4">
				<template v-for="(avatar, id) of avatars[key]" :key="id">
					<div v-if="typeof avatar === 'object'">
						<Tippy :placement="list._name.startsWith('OC')? 'bottom': 'top'">
							<div class="relative flex flex-col items-center hover:*:last:block">
								<img class="w-32 h-32" :src="`${base_url}${avatar.file}`" />
								<span class="w-full text-center text-xs">{{ avatar.name }}</span>
							</div>
							<template #content>
								<div class="flex flex-col text-sm">
									<span>{{ avatar.file }}</span>
									<span>{{ avatar.pixel }}px, {{ avatar.size }}kb</span>
									<span>用于：{{ avatar.used }}</span>
									<span>AI: {{ avatar.ai || '否' }}</span>
								</div>
							</template>
						</Tippy>
					</div>
				</template>
			</viewer>
		</div>
	</div>
</template>