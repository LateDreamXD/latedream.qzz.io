<script setup lang="ts">
const qrcodes = [
	['微信', '/assets/qrcode/wechat.png'],
	['支付宝', '/assets/qrcode/alipay.jpg']
];
</script>

<template>
	<div id="sponsor" class="p-4">
		<div class="flex justify-center gap-6">
			<div v-for="qrcode in qrcodes" class="flex flex-col items-center gap-4">
				<img class="w-45 h-45 rounded-md" :src="qrcode[1]" draggable="false" />
				<sup>{{ qrcode[0] }}</sup>
			</div>
		</div>
		<p class="text-center mt-2">我很可爱，请给我钱 ᗜ 𖥦 ᗜ</p>
	</div>
</template>