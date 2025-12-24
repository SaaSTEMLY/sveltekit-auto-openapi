import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';
import svelteOpenApi from 'sveltekit-auto-openapi/plugin';

export default defineConfig({
	plugins: [
		sveltekit(),
		svelteOpenApi({
			showDebugLogs: true,
			skipAutoValidation: false,
			skipValidationDefault: false,
			returnsDetailedErrorDefault: true
		}) as Plugin
	]
});
