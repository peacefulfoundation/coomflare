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
		const url = new URL(request.url);
		const origin = request.headers.get('Origin');

		// Handle CORS preflight
		if (request.method === 'OPTIONS') {
			return handleCORS(request, origin);
		}

		// Check origin for non-preflight requests
		if (origin && !ALLOWED_ORIGINS.includes(origin)) {
			return new Response('Forbidden', { status: 403 });
		}

		const id = url.searchParams.get('id');

		try {
			if (id) {
				return await handleSinglePost(id, env, origin);
			} else {
				return await handlePostList(url, env, origin);
			}
		} catch (error) {
			console.error('Error:', error);
			return new Response(JSON.stringify({ error: 'Internal server error' }), {
				status: 500,
				headers: corsHeaders(origin),
			});
		}
	},
};

async function handleSinglePost(id: string, env: Env, origin: string | null): Promise<Response> {
	const object = await env.bucket.get(`coomer-${id.padStart(3, '0')}.jpg`);
	if (!object) {
		return new Response(JSON.stringify({ error: 'Post not found' }), {
			status: 404,
			headers: corsHeaders(origin),
		});
	}

	const post: Post = {
		id: `coomer #${id.padStart(3, '0')}`,
		imageUrl: `https://coomflare.coomer.org/coomer-${id.padStart(3, '0')}.jpg`,
	};

	return new Response(JSON.stringify({ posts: [post] }), {
		headers: corsHeaders(origin),
	});
}

async function handlePostList(url: URL, env: Env, origin: string | null): Promise<Response> {
	const limit = parseInt(url.searchParams.get('limit') || '10', 10);
	const cursor = url.searchParams.get('cursor') || undefined;

	const response: R2ObjectsResponse = await env.bucket.list({ limit, cursor });

	if (response.objects.length === 0) {
		return new Response(JSON.stringify({ error: 'No objects found' }), {
			status: 404,
			headers: corsHeaders(origin),
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

	return new Response(
		JSON.stringify({
			posts,
			cursor: response.truncated ? response.cursor : null,
		}),
		{
			headers: corsHeaders(origin),
		}
	);
}

function handleCORS(request: Request, origin: string | null): Response {
	// Return early if origin is not allowed
	if (origin && !ALLOWED_ORIGINS.includes(origin)) {
		return new Response('Forbidden', { status: 403 });
	}

	// Handle CORS pre-flight request
	if (
		origin !== null &&
		request.headers.get('Access-Control-Request-Method') !== null &&
		request.headers.get('Access-Control-Request-Headers') !== null
	) {
		// Handle CORS pre-flight request
		return new Response(null, {
			headers: corsHeaders(origin),
		});
	}

	// Handle standard OPTIONS request
	return new Response(null, {
		headers: {
			Allow: 'GET, HEAD, POST, OPTIONS',
		},
	});
}

function corsHeaders(origin: string | null): { [key: string]: string } {
	const headers: { [key: string]: string } = {
		'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
		'Access-Control-Max-Age': '86400',
		'Access-Control-Allow-Headers': 'Content-Type',
		'Content-Type': 'application/json',
	};

	// Only add Access-Control-Allow-Origin if origin is allowed
	if (origin && ALLOWED_ORIGINS.includes(origin)) {
		headers['Access-Control-Allow-Origin'] = origin;
	}

	return headers;
}
