import { error, json } from '@sveltejs/kit';

export const POST = async ({ request }) => {
	const { email }: { email: string } = await request.json();
	// Request is already validated by the hook!
	console.log('🚀 ~ POST ~ email:', email);
	error(404, {
		message: 'User not found'
	});
	return json({ success: true });
};
