// 在你的GitHub仓库中新建文件：functions/_middleware.js
// 路径：https://github.com/你的用户名/CloudFlare-ImgBed/new/main?filename=functions/_middleware.js

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  
  // 1. 只处理图片请求
  const isImageRequest = 
    // 图片文件后缀
    /\.(jpg|jpeg|png|gif|webp|bmp|ico|svg|avif)$/i.test(url.pathname) ||
    // 或者图片路径包含这些关键词
    url.pathname.includes('/i/') ||
    url.pathname.includes('/img/') ||
    url.pathname.includes('/image/') ||
    url.pathname.includes('/images/');
  
  if (!isImageRequest) {
    return await next();
  }
  
  console.log(`🖼️ 图片请求: ${url.pathname}`);
  
  // 2. 缓存逻辑
  const cache = caches.default;
  const cacheKey = new Request(url.toString(), request);
  
  // 检查是否有缓存
  let cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    console.log('✅ 缓存命中！直接返回缓存');
    return cachedResponse;
  }
  
  console.log('🔄 缓存未命中，处理原请求...');
  
  // 3. 执行原处理逻辑
  const response = await next();
  
  // 4. 如果是成功的图片响应，就缓存
  if (response.status === 200) {
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.startsWith('image/')) {
      console.log('💾 缓存图片响应');
      
      // 复制响应并添加缓存头
      const responseToCache = new Response(response.body, {
        headers: new Headers(response.headers)
      });
      
      // 设置缓存时间（7天）
      responseToCache.headers.set('Cache-Control', 'public, max-age=604800');
      responseToCache.headers.set('CDN-Cache-Control', 'public, max-age=604800');
      
      // 异步存储到缓存
      context.waitUntil(cache.put(cacheKey, responseToCache));
      
      // 返回给客户端
      return new Response(response.body, {
        headers: responseToCache.headers
      });
    }
  }
  
  return response;
}
