(function(){
  const API = '/backend/api/posts.php';

  function $(sel, root=document){ return root.querySelector(sel); }
  function el(tag, attrs={}, children=[]) {
    const n = document.createElement(tag);
    for (const [k,v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v; else n.setAttribute(k, v);
    }
    children.forEach(c => n.appendChild(c));
    return n;
  }

  function getParam(name){
    const u = new URL(location.href);
    return u.searchParams.get(name) || '';
  }

  async function fetchJSON(url){
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const json = await res.json().catch(()=>({}));
    if (!res.ok || !json?.success) throw new Error(json?.message || 'Request failed');
    return json.data || {};
  }

  // Render a single post by slug into #post-root
  async function renderPostPage(){
    const root = $('#post-root');
    if (!root) return; // not on post template
    const slug = getParam('slug');
    if (!slug) {
      root.innerHTML = '<div class="alert alert-warning">No slug specified.</div>';
      return;
    }
    root.innerHTML = '<div class="text-center py-5 text-muted">Loading post...</div>';
    try {
      const data = await fetchJSON(`${API}?slug=${encodeURIComponent(slug)}`);
      const p = data.post;
      if (!p) throw new Error('Not found');

      // Build hero
      const hero = el('header', { class: 'hero position-relative', style: p.hero_image ? `background-image:url('${p.hero_image}')` : '' }, [
        el('div', { class: 'overlay d-flex flex-column justify-content-center align-items-center text-center p-5' }, [
          el('h1', { class: 'display-5 fw-bold', text: p.title || '' }),
          el('p', { class: 'lead text-light-50', text: p.summary || '' })
        ])
      ]);

      // Article content
      const article = el('article', { class: 'post container my-4' });
      const content = el('div', { class: 'post-content' });
      // content_html is trusted from admin; sanitize upstream if needed
      content.innerHTML = p.content_html || '';
      article.appendChild(content);

      // Comments mount
      const comments = el('section', { id: 'comments-root', class: 'container my-4' });

      root.innerHTML = '';
      root.appendChild(hero);
      root.appendChild(article);
      root.appendChild(comments);

      // Initialize comments widget
      if (window.initComments) window.initComments();
    } catch (e) {
      root.innerHTML = '<div class="alert alert-danger">Failed to load post.</div>';
      console.error(e);
    }
  }

  // Render list of posts into #posts-list-root (optional for blog index)
  async function renderPostList(){
    const listRoot = document.getElementById('posts-list-root');
    if (!listRoot) return; // no dynamic list placeholder present
    listRoot.innerHTML = '<div class="text-center py-4 text-muted">Loading posts...</div>';
    try {
      const data = await fetchJSON(`${API}?list=1&limit=20`);
      const posts = Array.isArray(data.posts) ? data.posts : [];
      if (!posts.length) {
        listRoot.innerHTML = '<div class="text-center py-4 text-muted">No posts yet.</div>';
        return;
      }
      const grid = el('div', { class: 'row g-4' });
      posts.forEach(p => {
        const card = el('div', { class: 'col-md-6 col-lg-4' }, [
          el('div', { class: 'card h-100 shadow-sm border-0' }, [
            p.hero_image ? el('img', { class: 'card-img-top', src: p.hero_image, alt: p.title }) : el('div', { class: 'card-img-top bg-light', style: 'height:180px;' }),
            el('div', { class: 'card-body d-flex flex-column' }, [
              el('h5', { class: 'card-title', text: p.title }),
              el('p', { class: 'card-text text-muted', text: p.summary || '' }),
              el('a', { class: 'btn btn-sm btn-primary mt-auto align-self-start', href: `/blog/post.html?slug=${encodeURIComponent(p.slug)}` , text: 'Read more' })
            ])
          ])
        ]);
        grid.appendChild(card);
      });
      listRoot.innerHTML = '';
      listRoot.appendChild(grid);
    } catch (e) {
      listRoot.innerHTML = '<div class="alert alert-danger">Failed to load posts.</div>';
      console.error(e);
    }
  }

  window.GisuBlog = { renderPostPage, renderPostList };

  document.addEventListener('DOMContentLoaded', () => {
    renderPostPage();
    renderPostList();
  });
})();
