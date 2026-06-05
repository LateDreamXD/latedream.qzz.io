import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
	{
		path: '/',
		name: 'Index',
		redirect: '/about',
	},
	{
		path: '/about',
		name: 'About',
		component: () => import('@/views/About.vue'),
		meta: {
			title: '关于我'
		}
	},
	{
		path: '/avatars',
		name: 'Avatars',
		component: () => import('@/views/Avatars.vue'),
		meta: {
			title: '我的历史头像'
		}
	}
];

export default createRouter({
	history: createWebHistory(),
	routes,
});
