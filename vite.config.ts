import type { UserConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

export default <UserConfig>{
	resolve: {
		alias: {
			'@': '/src',
		}
	},
	plugins: [vue(), tailwindcss()],
};