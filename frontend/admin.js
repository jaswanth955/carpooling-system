// admin.js — safely handles admin-only features so missing file errors stop breaking the app
// This file intentionally lightweight because main logic lives in rides.js

console.log('admin.js loaded');

// Ensure only admin can access this page
document.addEventListener('DOMContentLoaded', ()=>{
  const cur = window.app?.currentUser?.();
  if(!cur || cur.role !== 'admin'){
    window.location = 'login.html';
    return;
  }

  // the actual admin actions (delete user, delete ride, cancel, reset) are
  // already implemented globally from rides.js. This file ensures the page
  // loads without JS 404 issues.
});
