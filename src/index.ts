import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

import VueViewer from 'v-viewer';
import 'viewerjs/dist/viewer.css';

import VueTippy from 'vue-tippy';

import './index.css';

const app = createApp(App);
app.use(router);
app.use(VueViewer, {
	defaultOptions: {
		zIndex: 100
	}
});
app.use(VueTippy, {
	component: 'Tippy',
	componentSingleton: 'Tippy-Singleton',
	directive: 'tippy',
	defaultProps: {
		animation: 'slid',
		interactive: true,
		placement: 'top',
		theme: 'nightdream',
		// followCursor: 'horizontal',
	}
});
app.mount('#app');

document.documentElement.classList.toggle('dark', true);
