import z from 'zod';
import { useValidation, type RouteConfig } from 'sveltekit-auto-openapi/request-handler';

export const _config = {
	openapiOverride: {
		POST: {
			summary: 'Create user',
			description: 'Creates a new user with email',

			// Validate custom properties with $ prefix
			$headers: {
				$showErrorMessage: true,
				$skipValidation: false,
				schema: z.looseObject({ 'x-api-key': z.string() }).toJSONSchema()
			},

			// Validate request body (standard OpenAPI structure)
			requestBody: {
				content: {
					'application/json': {
						$showErrorMessage: true,
						$skipValidation: false,
						schema: z.object({ email: z.email() }).toJSONSchema()
					}
				}
			},

			// Validate responses (standard OpenAPI structure)
			responses: {
				'200': {
					description: 'Success',
					content: {
						'application/json': {
							$showErrorMessage: true,
							schema: z
								.object({
									success: z.literal(true)
								})
								.toJSONSchema()
						}
					}
				},
				'409': {
					description: 'Success',
					content: {
						'application/json': {
							$showErrorMessage: true,
							schema: z
								.object({
									success: z.literal(false)
								})
								.toJSONSchema()
						}
					}
				}
			}
		}
	}
} satisfies RouteConfig;

export const POST = useValidation('POST', _config, async ({ validated, json, error }) => {
	const { email } = validated.body;
	// Request is already validated by the hook!
	console.log('🚀 ~ POST ~ email:', email);
	error(404, {
		success: false
	});
	return json({ success: true });
});
