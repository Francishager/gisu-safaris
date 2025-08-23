/* Comments widget with backend + local fallback
 * Usage: include this script and add <div id="comments-root"></div> on the page.
 * - Primary: uses backend API /backend/api/comments.php (POST, GET)
 * - Fallback: localStorage if offline or backend unavailable
 */
(function () {
  const STORAGE_PREFIX = "gisusafaris_comments:";
  const API_URL = "/backend/api/comments.php";

  function getKey() {
    return STORAGE_PREFIX + (location.pathname || "post");
  }

  function loadComments() {
    try {
      const raw = localStorage.getItem(getKey());
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn("Failed to load comments", e);
      return [];
    }
  }

  function saveComments(list) {
    try {
      localStorage.setItem(getKey(), JSON.stringify(list));
    } catch (e) {
      console.warn("Failed to save comments", e);
    }
  }

  async function fetchApprovedFromServer(pagePath) {
    try {
      const res = await fetch(`${API_URL}?page=${encodeURIComponent(pagePath)}`, {
        method: "GET",
        headers: { "Accept": "application/json" },
      });
      if (!res.ok) throw new Error("bad status");
      const json = await res.json();
      if (!json?.success) throw new Error("api error");
      const srv = Array.isArray(json?.data?.comments) ? json.data.comments : [];
      // Normalize to widget shape
      return srv.map((c) => ({
        id: c.id,
        name: c.name || "Anonymous",
        email: undefined,
        message: c.comment || c.message || "",
        time: c.created_at ? Date.parse(c.created_at) : Date.now(),
        source: "server",
      }));
    } catch (e) {
      return null; // signal failure so we can fallback
    }
  }

  async function postToServer(payload) {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.success) {
      const msg = json?.message || "Failed to submit comment";
      throw new Error(msg);
    }
    return json;
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else node.setAttribute(k, v);
    });
    children.forEach((c) => node.appendChild(c));
    return node;
  }

  function renderList(root, comments) {
    const list = el("div", { class: "list-group" });
    if (!comments.length) {
      list.appendChild(
        el("div", { class: "text-muted small py-3 text-center", text: "No comments yet. Be the first to share your thoughts!" })
      );
    } else {
      comments
        .sort((a, b) => b.time - a.time)
        .forEach((c, idx) => {
          const item = el("div", { class: "list-group-item" });
          const head = el("div", { class: "d-flex justify-content-between align-items-center mb-1" });
          head.appendChild(el("strong", { text: c.name || "Anonymous" }));
          head.appendChild(el("small", { class: "text-muted", text: new Date(c.time).toLocaleString() }));

          const body = el("p", { class: "mb-1", text: c.message });
          const actions = el("div", { class: "d-flex gap-2 align-items-center" });
          if (c.source !== "server") {
            const delBtn = el("button", { class: "btn btn-sm btn-outline-danger", type: "button" });
            delBtn.textContent = "Delete";
            delBtn.addEventListener("click", () => {
              const ok = confirm("Delete this local comment?");
              if (!ok) return;
              const current = loadComments();
              const filtered = current.filter((x) => x.id !== c.id);
              saveComments(filtered);
              mount(root); // re-render
            });
            actions.appendChild(delBtn);
          }
          if (c.pending === true) {
            actions.appendChild(el("span", { class: "badge text-bg-warning", text: "Awaiting moderation" }));
          }

          item.appendChild(head);
          item.appendChild(body);
          item.appendChild(actions);
          list.appendChild(item);
        });
    }
    return list;
  }

  function renderForm(root) {
    const form = el("form", { class: "card border-0 shadow-sm mb-3" });
    const body = el("div", { class: "card-body" });

    const row = el("div", { class: "row g-3" });

    const nameCol = el("div", { class: "col-md-6" });
    const nameInput = el("input", { class: "form-control", type: "text", placeholder: "First name (required)", id: "cmt-name", required: "true" });
    nameCol.appendChild(nameInput);

    const emailCol = el("div", { class: "col-md-6" });
    const emailInput = el("input", { class: "form-control", type: "email", placeholder: "Email (required, kept private)", id: "cmt-email", required: "true" });
    emailCol.appendChild(emailInput);

    const msgCol = el("div", { class: "col-12" });
    const msgInput = el("textarea", { class: "form-control", rows: "4", placeholder: "Share your thoughts...", required: "true", id: "cmt-message" });
    msgCol.appendChild(msgInput);

    const consentCol = el("div", { class: "col-12 form-check" });
    const consentInput = el("input", { class: "form-check-input", type: "checkbox", id: "comments-consent" });
    const consentLabel = el("label", { class: "form-check-label small text-muted", for: "comments-consent" });
    consentLabel.textContent = "I consent to having my email stored privately for admin use and notifications.";
    consentCol.appendChild(consentInput);
    consentCol.appendChild(consentLabel);

    const submitCol = el("div", { class: "col-12 d-flex justify-content-between align-items-center" });
    const note = el("small", { class: "text-muted", text: "Be respectful and on topic. First name and email are required. Email is stored privately; comments may be moderated." });
    const btn = el("button", { class: "btn btn-primary" });
    btn.textContent = "Post Comment";

    submitCol.appendChild(note);
    submitCol.appendChild(btn);

    row.appendChild(nameCol);
    row.appendChild(emailCol);
    row.appendChild(msgCol);
    row.appendChild(consentCol);
    row.appendChild(submitCol);

    body.appendChild(row);
    form.appendChild(body);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const message = msgInput.value.trim();
      const consent = !!consentInput.checked;
      if (!name) { alert("Please enter your first name."); return; }
      if (!email) { alert("Please enter your email (kept private)." ); return; }
      if (!message) return;
      const pagePath = location.pathname || "/";

      // Email is required; enforce consent
      if (!consent) {
        alert("Consent is required to store your email for admin use.");
        return;
      }

      // Try backend first
      try {
        await postToServer({ pagePath, name, email, comment: message, consent });
        msgInput.value = "";
        // Add a local pending record for immediate UX feedback
        const current = loadComments();
        const entry = { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()), name, email, message, time: Date.now(), pending: true };
        current.push(entry);
        saveComments(current);
        mount(root);
        alert("Thanks! Your comment was submitted and is awaiting moderation.");
      } catch (err) {
        // Fallback to local-only storage
        const current = loadComments();
        const entry = { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()), name, email, message, time: Date.now(), pending: true };
        current.push(entry);
        saveComments(current);
        msgInput.value = "";
        mount(root);
        console.warn("Backend unavailable, saved comment locally.", err);
        alert("You're offline or the server is unavailable. Your comment is saved locally.");
      }
    });

    return form;
  }

  async function mount(root) {
    root.innerHTML = "";
    root.appendChild(el("h3", { class: "h5 fw-bold mb-3" , text: "Comments" }));
    root.appendChild(renderForm(root));
    const pagePath = location.pathname || "/";
    const serverComments = await fetchApprovedFromServer(pagePath);
    const localComments = loadComments();
    const merged = serverComments ? [...serverComments, ...localComments] : localComments;
    root.appendChild(renderList(root, merged));
  }

  window.initComments = function () {
    const root = document.getElementById("comments-root");
    if (!root) return;
    mount(root);
  };

  // Auto-init after DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => window.initComments());
  } else {
    window.initComments();
  }
})();
