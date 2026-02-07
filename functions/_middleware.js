// 替换你刚创建的 /functions/_middleware.js 内容为：

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  
  console.log(`🌐 请求路径: ${url.pathname}`);
  
  // 1. 只缓存图片请求
  const isImageRequest = 
    // 图片文件后缀
    /\.(jpg|jpeg|png|gif|webp|bmp|ico|svg|avif)$/i.test(url.pathname) ||
    // 或者路径包含特定关键词
    url.pathname.startsWith('/i/') ||
    url.pathname.startsWith('/img/') ||
    url.pathname.startsWith('/image/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/file/');  // 你的图床可能使用 /file/ 路径
  
  if (!isImageRequest) {
    console.log('📄 非图片请求，跳过缓存');
    return await next();
  }
  
  console.log(`🖼️ 识别为图片请求: ${url.pathname}`);
  
  // 2. 缓存逻辑
  const cache = caches.default;
  const cacheKey = new Request(url.toString(), request);
  
  // 检查缓存
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    console.log('✅ 缓存命中！直接返回');
    
    // 添加缓存状态头用于调试
    const headers = new Headers(cachedResponse.headers);
    headers.set('X-Cache-Status', 'HIT');
    headers.set('X-Cache-Source', 'Cloudflare-ImgBed-Middleware');
    
    return new Response(cachedResponse.body, {
      status: cachedResponse.status,
      statusText: cachedResponse.statusText,
      headers: headers
    });
  }
  
  console.log('🔄 缓存未命中，继续处理...');
  
  // 3. 执行后续处理
  const response = await next();
  
  // 4. 只缓存成功的图片响应
  if (response.status === 200) {
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.startsWith('image/')) {
      console.log(`💾 缓存图片: ${url.pathname} (${contentType})`);
      
      // 复制响应
      const responseToCache = new Response(response.body, {
        headers: new Headers(response.headers)
      });
      
      // 设置缓存头
      // 静态图片可以缓存很长时间
      responseToCache.headers.set('Cache-Control', 'public, max-age=31536000'); // 1年
      responseToCache.headers.set('CDN-Cache-Control', 'public, max-age=31536000');
      
      // 添加缓存标记
      responseToCache.headers.set('X-Cache-Status', 'MISS-BUT-CACHED');
      
      // 异步存储到缓存
      context.waitUntil(cache.put(cacheKey, responseToCache.clone()));
      
      // 返回给客户端
      return new Response(response.body, {
        headers: responseToCache.headers
      });
    } else {
      console.log('⚠️ 不是图片类型，不缓存:', contentType);
    }
  } else {
    console.log('⚠️ 响应状态不是200，不缓存:', response.status);
  }
  
  // 添加缓存状态头
  const finalHeaders = new Headers(response.headers);
  finalHeaders.set('X-Cache-Status', 'BYPASS');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: finalHeaders
  });
}
