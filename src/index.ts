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

const ALLOWED_ORIGINS = ['https://coomer.org', 'https://www.coomer.org', 'http://localhost:3000'];

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const origin = request.headers.get('Origin') || '';
		const accessControlAllowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

		// Handle CORS preflight requests
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Origin': accessControlAllowOrigin,
					'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type',
				},
			});
		}

		const url = new URL(request.url);
		const limit = parseInt(url.searchParams.get('limit') || '10', 10);
		const cursor = url.searchParams.get('cursor') || undefined;

		const response: R2ObjectsResponse = await env.bucket.list({ limit, cursor });

		if (response.objects.length === 0) {
			return new Response(JSON.stringify({ error: 'No objects found' }), {
				status: 404,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': accessControlAllowOrigin,
				},
			});
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
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': accessControlAllowOrigin,
			},
		});
	},
} satisfies ExportedHandler<Env>;
