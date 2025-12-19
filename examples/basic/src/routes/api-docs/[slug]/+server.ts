import ScalarModule from 'sveltekit-auto-openapi/scalar-module';

export const { GET, _config } = ScalarModule({
	openApiOpts: {
		openapi: '3.0.0',
		info: { title: 'My App API', version: '1.0.0' }
	}
});
