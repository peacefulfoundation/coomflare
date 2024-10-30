interface Env {
	bucket: R2Bucket;
}

interface R2Object {
	key: string;
}

interface R2ObjectsResponse {
	objects: R2Object[];
	truncated: boolean;
	cursor?: string;
}

interface Post {
	id: string;
	imageUrl: string;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const limit = parseInt(url.searchParams.get('limit') || '10', 10);
		const cursor = url.searchParams.get('cursor') || undefined;

		const response: R2ObjectsResponse = await env.bucket.list({ limit, cursor });

		if (response.objects.length === 0) {
			return new Response(JSON.stringify({ error: 'No objects found' }), { status: 404 });
		}

		const posts: Post[] = response.objects.map((obj) => {
			const match = obj.key.match(/\d+/);
			const formattedNumber = match ? match[0].padStart(3, '0') : '000';

			return {
				id: `coomer #${formattedNumber}`,
				imageUrl: `https://coomflare.coomer.org/${obj.key}`,
			};
		});

		return new Response(JSON.stringify({ posts, cursor: response.truncated ? response.cursor : null }), {
			headers: { 'Content-Type': 'application/json' },
		});
	},
} satisfies ExportedHandler<Env>;
