console.log('admin.js loaded');

document.addEventListener('DOMContentLoaded', ()=>{
  const cur = window.app?.currentUser?.();
  if(!cur || cur.role !== 'admin'){
    window.location = 'login.html';
    return;
  }

});
