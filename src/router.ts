import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
	{
		path: '/',
		name: 'About',
		component: () => import('@/views/About.vue'),
		meta: {
			title: '关于我'
		}
	},
	{ path: '/about', redirect: '/' },
	{
		path: '/avatars',
		name: 'Avatars',
		component: () => import('@/views/Avatars.vue'),
		meta: {
			title: '我的历史头像'
		}
	},
	{
		path: '/sponsor',
		name: 'Sponsor',
		component: () => import('@/views/Sponsor.vue'),
		meta: {
			title: '投喂我'
		}
	}
];

export default createRouter({
	history: createWebHistory(),
	routes,
});
