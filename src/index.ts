export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const page = parseInt(url.searchParams.get('page') || '1', 10);
		const limit = parseInt(url.searchParams.get('limit') || '10', 10);

		const objects = await env.bucket.list({ limit });

		if (objects.objects.length === 0) {
			return new Response(JSON.stringify({ error: 'No objects found' }), { status: 404 });
		}

		const posts = objects.objects.slice((page - 1) * limit, page * limit).map((obj, index) => ({
			id: `post-${(page - 1) * limit + index + 1}`,
			title: `Post ${(page - 1) * limit + index + 1}`,
			imageUrl: `https://coomflare.coomer.org/${obj.key}`,
		}));

		return new Response(JSON.stringify(posts), {
			headers: { 'Content-Type': 'application/json' },
		});
	},
} satisfies ExportedHandler<Env>;
