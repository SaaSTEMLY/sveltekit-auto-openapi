import z from 'zod';
import type { RouteConfig } from 'sveltekit-auto-openapi/types';

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
					schema: z.looseObject({ 'x-api-key': z.string() }).toJSONSchema()
				},
				content: {
					'application/json': {
						$_returnDetailedError: true,
						$_skipValidation: false,
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
							$_returnDetailedError: true,
							schema: z
								.object({
									success: z.literal(true)
								})
								.toJSONSchema()
						}
					}
				},
				'404': {
					description: 'Success',
					content: {
						'application/json': {
							$_returnDetailedError: true,
							schema: z
								.object({
									message: z.string()
								})
								.toJSONSchema()
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
