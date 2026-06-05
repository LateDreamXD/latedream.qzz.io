import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

import Viewer from 'v-viewer';
import 'viewerjs/dist/viewer.css';

import './index.css';

const app = createApp(App);
app.use(router);
app.use(Viewer, {
	defaultOptions: {
		zIndex: 100
	}
});
app.mount('#app');

document.documentElement.classList.toggle('dark', true);
