import type { RouteConfig } from 'sveltekit-auto-openapi/types';

export const _config = {
	openapiOverride: {
		POST: {
			summary: 'Create user',
			description: 'Creates a new user with email',

			parameters: [
				{
					name: 'x-api-key',
					in: 'header',
					required: true,
					schema: {
						type: 'string'
					}
				}
			],
			requestBody: {
				content: {
					'application/json': {
						schema: {
							type: 'object',
							properties: {
								email: {
									type: 'string',
									format: 'email',
									pattern:
										"^(?!\\.)(?!.*\\.\\.)([A-Za-z0-9_'+\\-\\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$"
								}
							},
							required: ['email'],
							additionalProperties: false
						}
					}
				}
			},
			responses: {
				'200': {
					description: 'Success',
					content: {
						'application/json': {
							schema: {
								type: 'object',
								properties: {
									success: {
										type: 'boolean',
										const: true
									}
								},
								required: ['success'],
								additionalProperties: false
							}
						}
					}
				},
				'404': {
					description: 'Success',
					content: {
						'application/json': {
							schema: {
								type: 'object',
								properties: {
									message: {
										type: 'string'
									}
								},
								required: ['message'],
								additionalProperties: false
							}
						}
					}
				}
			}
		}
	}
} satisfies RouteConfig;

export async function POST({ validated, json, error }) {
	const { email } = validated.body;
	if (email !== 'example@test.com') {
		error(404, {
			message: 'User not found'
		});
	}
	return json({ success: true });
}
