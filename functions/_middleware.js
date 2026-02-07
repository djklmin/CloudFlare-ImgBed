export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  
  // 判断是否为图片请求
  const isImageRequest = 
    /\.(jpg|jpeg|png|gif|webp|bmp|ico|svg|avif)$/i.test(url.pathname) ||
    url.pathname.startsWith('/file/');
  
  if (!isImageRequest) {
    return await next();
  }
  
  // ========== 关键修改：使用 fetch() 而不是 next() ==========
  // 直接使用 fetch() 可以让 Cloudflare 缓存生效
  const cache = caches.default;
  const cacheKey = new Request(url.toString(), request);
  
  // 检查缓存
  let response = await cache.match(cacheKey);
  if (response) {
    console.log('✅ 缓存命中');
    return response;
  }
  
  console.log('🔄 缓存未命中，重新获取');
  
  // 重要：直接 fetch 原始请求，不要用 next()
  // 这样才能让 Cloudflare 边缘缓存工作
  response = await fetch(url.toString(), {
    cf: {
      // 告诉 Cloudflare 缓存这个响应
      cacheTtl: 31536000, // 1年
      cacheEverything: true,
    }
  });
  
  // 如果是图片响应
  if (response.status === 200) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.startsWith('image/')) {
      // 克隆响应以便缓存
      const responseToCache = new Response(response.body, {
        headers: new Headers(response.headers)
      });
      
      // 设置缓存头
      responseToCache.headers.set('Cache-Control', 'public, max-age=31536000');
      responseToCache.headers.set('CDN-Cache-Control', 'public, max-age=31536000');
      responseToCache.headers.set('X-Cache-Source', 'Cloudflare-ImgBed-Optimized');
      
      // 存储到缓存
      context.waitUntil(cache.put(cacheKey, responseToCache.clone()));
      
      return new Response(responseToCache.body, {
        headers: responseToCache.headers
      });
    }
  }
  
  return response;
}
