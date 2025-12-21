import { error, json } from '@sveltejs/kit';

export async function POST({ request }) {
	const { email } = await request.json();
	if (email !== 'example@test.com') {
		error(404, {
			message: 'User not found'
		});
	}
	return json({ success: true });
}
