import type { RouteConfig } from 'sveltekit-auto-openapi/types';
import { type } from 'arktype';
import z from 'zod';
import * as v from 'valibot';

export const _config = {
	openapiOverride: {
		POST: {
			summary: 'Create user',
			description: 'Creates a new user with email',

			// Validate request body (standard OpenAPI structure)
			requestBody: {
				// Validate custom properties with $ prefix
				$headers: {
					$_returnDetailedError: true,
					$_skipValidation: false,
					// USING ZOD SCHEMA
					schema: z.looseObject({ 'x-api-key': z.string() })
				},
				content: {
					'application/json': {
						$_returnDetailedError: true,
						$_skipValidation: false,
						// USING ARKTYPE SCHEMA
						schema: type({ email: 'string.email' })
					}
				}
			},

			// Validate responses (standard OpenAPI structure)
			responses: {
				'200': {
					description: 'Success',
					content: {
						'application/json': {
							$_returnDetailedError: true,
							$_skipValidation: false,
							// USING VALIBOT SCHEMA
							schema: v.object({
								success: v.literal(true)
							})
						}
					}
				},
				'404': {
					description: 'Success',
					content: {
						'application/json': {
							$_returnDetailedError: true,
							$_skipValidation: false,
							// USING MANUAL JSON SCHEMA
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
	console.log('🚀 ~ POST ~ email:', email);
	if (email !== 'example@test.com') {
		error(404, {
			message: 'User not found'
		});
	}
	return json({ success: true });
}
