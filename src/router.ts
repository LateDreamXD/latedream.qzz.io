import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
	{
		path: '/',
		// component: () => import('@/views/Home.vue'),
		redirect: '/about',
	},
	{
		path: '/about',
		component: () => import('@/views/About.vue'),
		beforeEnter() {
			location.href = 'https://i.latedream.qzz.io';
		}
	}
];

export default createRouter({
	history: createWebHistory(),
	routes,
});
