import { createApp } from 'vue';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import Tooltip from 'primevue/tooltip';
import 'primeicons/primeicons.css';
import './assets/tailwind.css';
import './assets/styles.scss';

import App from './App.vue';
import router from './router';

// TRA gold/black PrimeVue preset — buttons, inputs, focus rings pick up the brand.
const IdrasPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#FFFBEB', 100: '#FEF3C7', 200: '#FDE68A', 300: '#FCD34D',
      400: '#F5C400', 500: '#E0B200', 600: '#C99E00', 700: '#A17E00',
      800: '#7A5F00', 900: '#5C4700', 950: '#2E2400',
    },
  },
});

const app = createApp(App);

app.use(createPinia());
app.use(PrimeVue, {
  theme: {
    preset: IdrasPreset,
    options: { darkModeSelector: '.app-dark' },
  },
});
app.use(ToastService);
app.use(ConfirmationService);
app.directive('tooltip', Tooltip);
app.use(router);
app.mount('#app');
