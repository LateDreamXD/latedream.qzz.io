<script setup lang="ts">

if(matchMedia('(prefers-color-scheme: dark)').matches) {
	document.documentElement.classList.add('dark');
}
</script>

<template>
	<router-view v-slot="{ Component, route }">
		<component :is="Component" :key="route.path" />
	</router-view>
</template>