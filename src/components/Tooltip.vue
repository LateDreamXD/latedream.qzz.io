<script setup lang="ts">
defineProps<{
	dataDirection: 'top' | 'bottom';
}>();
</script>

<template>
	<slot name="trigger"></slot>
	<span class="tooltip hidden peer-hover:block absolute min-w-45 z-10 animate-tooltip-slid-in bg-background p-4 rounded-sm pointer-events-none"
		:class="{ 'bottom-full': dataDirection === 'top', 'top-full': dataDirection === 'bottom', 'animate-tooltip-slid-in-bottom': dataDirection === 'bottom' }">
		<slot name="default"></slot>
	</span>
</template>